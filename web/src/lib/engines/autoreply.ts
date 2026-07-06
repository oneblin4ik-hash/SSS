import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { proxyToInput } from "@/lib/telegram/account";
import { tg, TgError } from "@/lib/telegram/service";
import { draftChatReply } from "@/lib/ai";
import { applyErrorOutcome, actionsLast24h } from "./health";
import { autoReplyPoll, type Mode } from "./limits";

/**
 * One auto-responder ("Нейрочат") step for an account: poll its DM inbox for
 * the newest inbound message per peer, persist it, and — if auto-reply is on
 * for that conversation and the account is still under its daily limit —
 * draft and send an AI reply. Reuses the same anti-ban machinery
 * (applyErrorOutcome/actionsLast24h) the campaign/autocomment engines use.
 */
export async function tickAutoReplyAccount(accountId: string): Promise<{ ok: boolean; detail: string }> {
  const account = await prisma.telegramAccount.findUnique({
    where: { id: accountId },
    include: { user: true, proxy: true },
  });
  if (!account) return { ok: false, detail: "account not found" };
  if (!account.autoReplyEnabled) return { ok: false, detail: "auto off" };

  const mode = account.user.safetyMode as Mode;
  const reschedule = (secs: number) =>
    prisma.telegramAccount.update({ where: { id: accountId }, data: { autoReplyNextTickAt: new Date(Date.now() + secs * 1000) } });

  if (!["ACTIVE", "WARMING"].includes(account.status) || !account.sessionEnc) {
    await reschedule(300);
    return { ok: false, detail: "аккаунт недоступен" };
  }
  if (account.floodUntil && account.floodUntil.getTime() > Date.now()) {
    await reschedule(300);
    return { ok: true, detail: "аккаунт на кулдауне" };
  }

  const session = await decrypt(account.sessionEnc);
  const proxy = proxyToInput(account.proxy);

  let items;
  try {
    items = (await tg.inbox({ session, proxy, limit: 30 })).items;
  } catch (e: any) {
    if (e instanceof TgError && ["FLOOD_WAIT", "AUTH_DEAD"].includes(e.code)) {
      await applyErrorOutcome({ accountId, code: e.code, retryAfter: e.retryAfter, autoPauseOnRisk: account.user.autoPauseOnRisk });
    }
    await reschedule(300);
    return { ok: false, detail: `inbox: ${e?.message || "ошибка"}` };
  }

  let fresh = 0;
  let replied = 0;
  for (const item of items) {
    const conv = await prisma.conversation.upsert({
      where: { accountId_peerTgId: { accountId, peerTgId: item.peerTgId } },
      create: {
        accountId,
        peerTgId: item.peerTgId,
        peerUsername: item.peerUsername,
        peerName: item.peerName,
        peerAccessHash: item.peerAccessHash,
        lastMessageAt: new Date(item.postedAt),
      },
      update: { peerUsername: item.peerUsername, peerName: item.peerName, peerAccessHash: item.peerAccessHash },
    });

    const existingIn = await prisma.chatMessage.findUnique({
      where: { conversationId_tgMessageId: { conversationId: conv.id, tgMessageId: item.tgMessageId } },
    });
    if (!existingIn) {
      await prisma.chatMessage.create({
        data: { conversationId: conv.id, direction: "IN", text: item.text, tgMessageId: item.tgMessageId },
      });
      await prisma.conversation.update({
        where: { id: conv.id },
        data: { lastMessageAt: new Date(item.postedAt), unread: true },
      });
      fresh++;
    }

    // A reply is owed iff the newest stored message is still inbound — true
    // both for a brand-new message and a retry after a previous send failed.
    const last = await prisma.chatMessage.findFirst({ where: { conversationId: conv.id }, orderBy: { createdAt: "desc" } });
    if (!last || last.direction !== "IN") continue;
    if (!conv.autoReply) continue;
    if ((await actionsLast24h(accountId)) >= account.dailyReplyLimit) continue;

    const history = await prisma.chatMessage.findMany({
      where: { conversationId: conv.id },
      orderBy: { createdAt: "asc" },
      take: 20,
    });

    let replyText: string;
    try {
      replyText = await draftChatReply({
        history: history.map((m) => ({ role: m.direction === "IN" ? "user" : "assistant", text: m.text })),
        peerName: item.peerName,
        tone: account.toneStyle || account.user.defaultTone,
        targetChannel: account.user.targetChannel,
        extraGuidance: account.systemPrompt,
      });
    } catch {
      continue; // AI unavailable — leave unanswered, retry next tick
    }
    if (!replyText) continue;

    try {
      const { tgMessageId } = await tg.sendToPeer({
        session, proxy, tgUserId: item.peerTgId, accessHash: item.peerAccessHash, username: item.peerUsername, text: replyText,
      });
      await prisma.chatMessage.create({
        data: { conversationId: conv.id, direction: "OUT", text: replyText, tgMessageId, aiGenerated: true },
      });
      await prisma.conversation.update({ where: { id: conv.id }, data: { lastMessageAt: new Date(), unread: false } });
      await prisma.telegramAccount.update({ where: { id: accountId }, data: { lastCheckedAt: new Date() } });
      replied++;
    } catch (e: any) {
      if (e instanceof TgError && ["PEER_FLOOD", "FLOOD_WAIT", "AUTH_DEAD"].includes(e.code)) {
        await applyErrorOutcome({ accountId, code: e.code, retryAfter: e.retryAfter, autoPauseOnRisk: account.user.autoPauseOnRisk });
      }
      // leave the conversation unread/unanswered — next tick retries the send
    }
  }

  await reschedule(autoReplyPoll(mode));
  return { ok: true, detail: `новых сообщений: ${fresh}, отправлено ответов: ${replied}` };
}

/** Worker entrypoint: tick all due auto-reply accounts. */
export async function tickDueAutoReplies(limit = 10): Promise<number> {
  const due = await prisma.telegramAccount.findMany({
    where: { autoReplyEnabled: true, status: { in: ["ACTIVE", "WARMING"] }, autoReplyNextTickAt: { lte: new Date() } },
    select: { id: true },
    take: limit,
  });
  let n = 0;
  for (const a of due) {
    await tickAutoReplyAccount(a.id).catch(() => {});
    n++;
  }
  return n;
}
