import type { PrismaClient } from "@prisma/client";
import { decrypt } from "@/lib/crypto";
import { proxyToInput } from "@/lib/telegram/account";
import { tg, TgError } from "@/lib/telegram/service";
import { pauseRange, randInt, type Mode } from "./limits";
import { applyErrorOutcome, actionsLast24h } from "./health";
import { fromJsonArray } from "@/lib/jsonArray";

const PER_USER_TYPES = new Set(["MAILING", "INVITE", "STORY_VIEW"]);

/**
 * Run one step of a campaign (REACTION / MAILING / INVITE / STORY_VIEW).
 * Rotates across the campaign's accounts, honours per-account daily limits and
 * flood cooldowns, dedupes contacts across campaigns, and enforces anti-ban
 * outcomes (auto-pause on PEER_FLOOD, cooldown on FLOOD_WAIT).
 */
export async function tickCampaign(prisma: PrismaClient, campaignId: string): Promise<{
  ok: boolean;
  detail: string;
  cursor: number;
  done: boolean;
}> {
  const c = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: { user: true, audience: { include: { contacts: true } } },
  });
  if (!c) return { ok: false, detail: "campaign not found", cursor: 0, done: true };
  if (c.status !== "RUNNING") return { ok: false, detail: `status=${c.status}`, cursor: c.cursor, done: false };

  const targets = fromJsonArray(c.targets);
  const accountIds = fromJsonArray(c.accountIds);

  const work: { target: string; user?: string; text?: string; tgUserId?: string }[] =
    c.type === "REACTION"
      ? targets.map((t) => ({ target: t }))
      : (c.audience?.contacts ?? []).map((ct: { username: string | null; tgUserId: string }) => ({
          target: ct.username ? "@" + ct.username : ct.tgUserId,
          tgUserId: ct.tgUserId,
          text: c.message ?? "",
        }));

  const done = async (detail: string) => {
    await prisma.campaign.update({ where: { id: campaignId }, data: { status: "DONE" } });
    return { ok: true, detail, cursor: c.cursor, done: true };
  };

  if (work.length === 0) return done("пустой список целей");

  const maxTotal = Math.max(1, accountIds.length) * c.perAccountLimit;
  if (c.cursor >= work.length || c.sentCount >= maxTotal) return done("кампания завершена");

  const item = work[c.cursor];

  if (PER_USER_TYPES.has(c.type) && item.tgUserId) {
    const touched = await prisma.contactTouch.findUnique({
      where: { userId_tgUserId_action: { userId: c.userId, tgUserId: item.tgUserId, action: c.type } },
    });
    if (touched) return advance(prisma, campaignId, c, "уже обработан ранее — пропуск", false);
  }

  const accountId = accountIds[c.cursor % accountIds.length];
  const account = await prisma.telegramAccount.findFirst({
    where: { id: accountId, userId: c.userId },
    include: { proxy: true },
  });
  if (!account?.sessionEnc || !["ACTIVE", "WARMING"].includes(account.status)) {
    return advance(prisma, campaignId, c, "аккаунт недоступен — пропуск", false);
  }
  if (account.floodUntil && account.floodUntil.getTime() > Date.now()) {
    return advance(prisma, campaignId, c, "аккаунт на кулдауне — пропуск", false);
  }
  if ((await actionsLast24h(prisma, account.id)) >= account.dailyReplyLimit) {
    return advance(prisma, campaignId, c, "дневной лимит аккаунта — пропуск", false);
  }

  const session = await decrypt(account.sessionEnc);
  const proxy = proxyToInput(account.proxy);

  let ok = true;
  let detail = "";
  try {
    if (c.type === "REACTION") {
      const r = await tg.react({ session, proxy, target: item.target, count: c.reactCount, emoji: c.emoji || undefined });
      detail = `реакций ${r.reacted} в ${item.target}`;
    } else if (c.type === "MAILING") {
      await tg.sendDirect({ session, proxy, target: item.target, text: item.text || "" });
      detail = `сообщение → ${item.target}`;
    } else if (c.type === "INVITE") {
      await tg.invite({ session, proxy, channel: targets[0], user: item.target });
      detail = `приглашён ${item.target} → ${targets[0]}`;
    } else if (c.type === "STORY_VIEW") {
      const r = await tg.viewStories({ session, proxy, target: item.target });
      detail = `истории ${r.viewed} у ${item.target}`;
    }
    if (PER_USER_TYPES.has(c.type) && item.tgUserId) {
      await prisma.contactTouch.create({
        data: { userId: c.userId, tgUserId: item.tgUserId, action: c.type },
      }).catch(() => {});
    }
  } catch (e: any) {
    ok = false;
    detail = e?.message || "ошибка";
    if (e instanceof TgError) {
      await applyErrorOutcome(prisma, {
        accountId: account.id,
        code: e.code,
        retryAfter: e.retryAfter,
        autoPauseOnRisk: c.user.autoPauseOnRisk,
      });
      if (["PEER_FLOOD", "FLOOD_WAIT", "AUTH_DEAD", "SERVICE_DOWN"].includes(e.code)) {
        await prisma.campaignLog.create({
          data: { campaignId, accountId: account.id, target: item.target, action: c.type, ok: false, detail },
        });
        await prisma.campaign.update({ where: { id: campaignId }, data: { lastTickAt: new Date() } });
        return { ok: false, detail, cursor: c.cursor, done: false };
      }
    }
  }

  const { min, max } = pauseRange(c.user.safetyMode as Mode);
  const nextTick = new Date(Date.now() + randInt(c.pauseMinSec || min, c.pauseMaxSec || max) * 1000);
  const nextCursor = c.cursor + 1;
  const finished = nextCursor >= work.length;

  await prisma.$transaction([
    prisma.campaignLog.create({
      data: { campaignId, accountId: account.id, target: item.target, action: c.type, ok, detail },
    }),
    prisma.campaign.update({
      where: { id: campaignId },
      data: {
        cursor: nextCursor,
        sentCount: { increment: ok ? 1 : 0 },
        failCount: { increment: ok ? 0 : 1 },
        lastTickAt: new Date(),
        nextTickAt: nextTick,
        ...(finished ? { status: "DONE" } : {}),
      },
    }),
  ]);

  return { ok, detail, cursor: nextCursor, done: finished };
}

async function advance(
  prisma: PrismaClient,
  campaignId: string,
  c: { cursor: number },
  detail: string,
  ok: boolean
): Promise<{ ok: boolean; detail: string; cursor: number; done: boolean }> {
  const nextCursor = c.cursor + 1;
  await prisma.campaign.update({
    where: { id: campaignId },
    data: { cursor: { increment: 1 }, lastTickAt: new Date() },
  });
  return { ok, detail, cursor: nextCursor, done: false };
}

export async function tickDueCampaigns(prisma: PrismaClient, limit = 20): Promise<number> {
  const due = await prisma.campaign.findMany({
    where: { status: "RUNNING", nextTickAt: { lte: new Date() } },
    select: { id: true },
    take: limit,
  });
  let n = 0;
  for (const c of due) {
    await tickCampaign(prisma, c.id).catch(() => {});
    n++;
  }
  return n;
}
