import type { PrismaClient } from "@prisma/client";
import { decrypt } from "@/lib/crypto";
import { proxyToInput } from "@/lib/telegram/account";
import { tg, TgError } from "@/lib/telegram/service";
import { draftComment } from "@/lib/ai";
import { applyErrorOutcome, actionsLast24h } from "./health";
import { scanSource } from "./scan";
import { fromJsonArray } from "@/lib/jsonArray";
import {
  autoCommentDailyCap, commentPause, RELEVANCE_MIN, CONFIDENCE_MIN, type Mode,
} from "./limits";

function startOfDay(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * One auto-neurocommenting step for a source: refresh recent posts, pick one
 * un-commented post, run the relevance gate, and (if it passes) comment under
 * it from a rotating account. Reuses the campaign/health safety machinery.
 */
export async function tickAutoCommentSource(prisma: PrismaClient, sourceId: string): Promise<{
  ok: boolean;
  detail: string;
}> {
  const source = await prisma.monitoredSource.findUnique({
    where: { id: sourceId },
    include: { user: true },
  });
  if (!source) return { ok: false, detail: "source not found" };
  if (!source.autoComment || !source.isActive) return { ok: false, detail: "auto off" };

  const mode = source.user.safetyMode as Mode;
  const reschedule = (secs: number) =>
    prisma.monitoredSource.update({
      where: { id: sourceId },
      data: { autoNextScanAt: new Date(Date.now() + secs * 1000) },
    });

  const cap = Math.min(source.autoDailyLimit, autoCommentDailyCap(mode));
  const todayCount = await prisma.draftReply.count({
    where: { status: "PUBLISHED", publishedAt: { gte: startOfDay() }, foundMessage: { sourceId } },
  });
  if (todayCount >= cap) {
    await reschedule(3600);
    return { ok: true, detail: `дневной лимит источника (${cap}) исчерпан` };
  }

  const account = await pickAccount(prisma, source.userId, fromJsonArray(source.autoAccountIds));
  if (!account) {
    await reschedule(600);
    return { ok: false, detail: "нет доступного аккаунта" };
  }
  const session = await decrypt(account.sessionEnc!);
  const proxy = proxyToInput(account.proxy);
  const channel = source.username || source.tgId;
  if (!channel) {
    await reschedule(3600);
    return { ok: false, detail: "у источника нет @username" };
  }

  const keywords = (
    await prisma.keyword.findMany({ where: { userId: source.userId, isActive: true } })
  ).map((k: { text: string }) => k.text);

  try {
    await scanSource(prisma, sourceId, { session, proxy, keywords: [], sinceHours: 24, limit: 30 });
  } catch (e: any) {
    if (e instanceof TgError && ["FLOOD_WAIT", "AUTH_DEAD"].includes(e.code)) {
      await applyErrorOutcome(prisma, { accountId: account.id, code: e.code, retryAfter: e.retryAfter, autoPauseOnRisk: source.user.autoPauseOnRisk });
    }
    await reschedule(600);
    return { ok: false, detail: `скан: ${e?.message || "ошибка"}` };
  }

  // One comment per post ever: pick a NEW post with no draft yet, newest first.
  const post = await prisma.foundMessage.findFirst({
    where: { sourceId, status: "NEW", drafts: { none: {} } },
    orderBy: { postedAt: "desc" },
  });
  if (!post) {
    await reschedule(commentPause(mode));
    return { ok: true, detail: "нет новых постов для комментария" };
  }

  let decision;
  try {
    decision = await draftComment({
      postText: post.text,
      channelTitle: source.title,
      tone: source.autoTone || account.toneStyle || source.user.defaultTone,
      targetChannel: source.user.targetChannel,
      keywords,
      extraGuidance: account.systemPrompt,
    });
  } catch (e: any) {
    await reschedule(600);
    return { ok: false, detail: `AI: ${e?.message || "ошибка"}` };
  }

  const pass =
    decision.shouldComment &&
    !!decision.commentText &&
    decision.relevanceScore >= RELEVANCE_MIN &&
    decision.confidence >= CONFIDENCE_MIN &&
    decision.matchedTriggers.length >= 1;

  if (!pass) {
    await prisma.foundMessage.update({ where: { id: post.id }, data: { status: "SKIPPED" } });
    await reschedule(commentPause(mode));
    return { ok: true, detail: `пропуск (score ${decision.relevanceScore}): ${decision.reason}` };
  }

  const draft = await prisma.draftReply.create({
    data: {
      foundMessageId: post.id,
      accountId: account.id,
      content: decision.commentText!,
      status: "PENDING",
      aiModel: "claude-opus-4-8",
    },
  });
  await prisma.foundMessage.update({ where: { id: post.id }, data: { status: "DRAFTED" } });

  try {
    const { tgMessageId } = await tg.comment({
      session,
      proxy,
      channel,
      postId: post.tgMessageId,
      text: decision.commentText!,
    });
    await prisma.draftReply.update({
      where: { id: draft.id },
      data: { status: "PUBLISHED", publishedAt: new Date(), tgMessageId },
    });
    await prisma.analyticsEvent.create({
      data: { type: "REPLY_PUBLISHED", accountId: account.id, draftReplyId: draft.id, meta: { auto: true, sourceId } },
    });
    await prisma.telegramAccount.update({ where: { id: account.id }, data: { lastCheckedAt: new Date() } });
    await reschedule(commentPause(mode));
    return { ok: true, detail: `комментарий под постом ${post.tgMessageId} (${channel})` };
  } catch (e: any) {
    await prisma.draftReply.update({ where: { id: draft.id }, data: { status: "FAILED" } });
    if (e instanceof TgError) {
      if (["PEER_FLOOD", "FLOOD_WAIT", "AUTH_DEAD"].includes(e.code)) {
        await applyErrorOutcome(prisma, { accountId: account.id, code: e.code, retryAfter: e.retryAfter, autoPauseOnRisk: source.user.autoPauseOnRisk });
      }
      if (["NO_COMMENTS", "CANT_WRITE", "SLOWMODE"].includes(e.code)) {
        await prisma.foundMessage.update({ where: { id: post.id }, data: { status: "SKIPPED" } }).catch(() => {});
      }
    }
    await reschedule(commentPause(mode));
    return { ok: false, detail: `публикация: ${e?.message || "ошибка"}` };
  }
}

/** Choose a rotating eligible account (ACTIVE/WARMING, not flooded, under daily limit). */
async function pickAccount(prisma: PrismaClient, userId: string, accountIds: string[]) {
  const accounts = await prisma.telegramAccount.findMany({
    where: {
      userId,
      ...(accountIds.length ? { id: { in: accountIds } } : {}),
      status: { in: ["ACTIVE", "WARMING"] },
      sessionEnc: { not: null },
    },
    include: { proxy: true },
    orderBy: { lastCheckedAt: "asc" },
  });
  for (const a of accounts) {
    if (a.floodUntil && a.floodUntil.getTime() > Date.now()) continue;
    if ((await actionsLast24h(prisma, a.id)) >= a.dailyReplyLimit) continue;
    return a;
  }
  return null;
}

/** Worker entrypoint: tick all due auto-comment sources. */
export async function tickDueAutoComments(prisma: PrismaClient, limit = 10): Promise<number> {
  const due = await prisma.monitoredSource.findMany({
    where: { autoComment: true, isActive: true, autoNextScanAt: { lte: new Date() } },
    select: { id: true },
    take: limit,
  });
  let n = 0;
  for (const s of due) {
    await tickAutoCommentSource(prisma, s.id).catch(() => {});
    n++;
  }
  return n;
}
