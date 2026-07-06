import { TelegramClient, Api } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import bigInt from "big-integer";

const API_ID = Number(process.env.TELEGRAM_API_ID);
const API_HASH = process.env.TELEGRAM_API_HASH;

export function assertCreds() {
  if (!API_ID || !API_HASH) {
    throw new Error("TELEGRAM_API_ID / TELEGRAM_API_HASH must be set (get them at my.telegram.org)");
  }
}

function buildProxy(proxy) {
  if (!proxy) return undefined;
  const base = { ip: proxy.host, port: proxy.port };
  if (proxy.type === "SOCKS5") {
    return { socksType: 5, ip: proxy.host, port: proxy.port, username: proxy.username || undefined, password: proxy.password || undefined };
  }
  if (proxy.type === "MTPROTO") {
    return { MTProxy: true, secret: proxy.secret, ...base };
  }
  return base;
}

function clientFromSession(session, proxy) {
  return new TelegramClient(new StringSession(session || ""), API_ID, API_HASH, {
    connectionRetries: 3,
    proxy: buildProxy(proxy),
    floodSleepThreshold: 0,
  });
}

async function withClient(session, proxy, fn) {
  const client = clientFromSession(session, proxy);
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.disconnect().catch(() => {});
  }
}

/* ---- auth flow (no stored session yet) ---- */
const pendingLogins = new Map(); // phone -> StringSession (in-memory, single-instance)

export async function requestCode(phone, proxy) {
  const client = new TelegramClient(new StringSession(""), API_ID, API_HASH, {
    connectionRetries: 3,
    proxy: buildProxy(proxy),
  });
  await client.connect();
  const result = await client.invoke(
    new Api.auth.SendCode({
      phoneNumber: phone,
      apiId: API_ID,
      apiHash: API_HASH,
      settings: new Api.CodeSettings({}),
    })
  );
  pendingLogins.set(phone, { session: client.session.save(), client, phoneCodeHash: result.phoneCodeHash });
  return { phoneCodeHash: result.phoneCodeHash };
}

export async function signInWithCode(phone, code) {
  const pending = pendingLogins.get(phone);
  if (!pending) throw new Error("Сессия входа истекла, запросите код заново");
  try {
    await pending.client.invoke(
      new Api.auth.SignIn({ phoneNumber: phone, phoneCodeHash: pending.phoneCodeHash, phoneCode: code })
    );
  } catch (e) {
    if (e?.errorMessage === "SESSION_PASSWORD_NEEDED") return { needs2fa: true };
    throw e;
  }
  const session = pending.client.session.save();
  await pending.client.disconnect().catch(() => {});
  pendingLogins.delete(phone);
  const me = await getMeFromSession(session);
  return { session, ...me };
}

export async function signInWith2fa(phone, password) {
  const pending = pendingLogins.get(phone);
  if (!pending) throw new Error("Сессия входа истекла, запросите код заново");
  const { computeCheck } = await import("telegram/Password.js");
  const pwd = await pending.client.invoke(new Api.account.GetPassword());
  const check = await computeCheck(pwd, password);
  await pending.client.invoke(new Api.auth.CheckPassword({ password: check }));
  const session = pending.client.session.save();
  await pending.client.disconnect().catch(() => {});
  pendingLogins.delete(phone);
  const me = await getMeFromSession(session);
  return { session, ...me };
}

async function getMeFromSession(session) {
  return withClient(session, null, async (client) => {
    const me = await client.getMe();
    return { name: [me.firstName, me.lastName].filter(Boolean).join(" ") || null, username: me.username || null };
  });
}

/** Verify a session is still alive; returns basic account info. */
export async function checkSession(session, proxy) {
  return withClient(session, proxy, async (client) => {
    const me = await client.getMe();
    return { ok: true, name: [me.firstName, me.lastName].filter(Boolean).join(" ") || null, username: me.username || null };
  });
}

export async function importSession({ session, proxy }) {
  return checkSession(session, proxy);
}

export async function checkProxy({ proxy }) {
  const client = new TelegramClient(new StringSession(""), API_ID, API_HASH, {
    connectionRetries: 1,
    proxy: buildProxy(proxy),
  });
  try {
    await client.connect();
    await client.disconnect().catch(() => {});
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e?.message || "proxy failed" };
  }
}

function normUser(u) {
  return {
    tgUserId: String(u.id),
    username: u.username || null,
    name: [u.firstName, u.lastName].filter(Boolean).join(" ") || null,
  };
}

/** Parse chat/channel member list into normalized contacts. */
export async function parseMembers({ session, proxy, target, limit = 300 }) {
  return withClient(session, proxy, async (client) => {
    const entity = await client.getEntity(target);
    const out = [];
    for await (const user of client.iterParticipants(entity, { limit })) {
      if (!user.bot && !user.deleted) out.push(normUser(user));
    }
    return { contacts: out, title: entity.title || target };
  });
}

/** Parse people who wrote in a channel's linked discussion group (commenters). */
export async function parseCommenters({ session, proxy, target, limit = 300 }) {
  return withClient(session, proxy, async (client) => {
    let entity = await client.getEntity(target);
    try {
      const full = await client.invoke(new Api.channels.GetFullChannel({ channel: entity }));
      const linked = full?.fullChat?.linkedChatId;
      if (linked) entity = await client.getEntity(linked);
    } catch { /* not a broadcast channel, parse as-is */ }

    const seen = new Map();
    for await (const msg of client.iterMessages(entity, { limit })) {
      if (seen.size >= limit) break;
      try {
        const sender = await msg.getSender();
        if (sender && !sender.bot && !sender.deleted && !seen.has(String(sender.id))) {
          seen.set(String(sender.id), normUser(sender));
        }
      } catch { /* skip */ }
    }
    return { contacts: [...seen.values()], title: entity.title || target };
  });
}

/**
 * Scan a channel/group for recent messages matching keywords.
 * Returns normalized message objects for the web app to persist.
 */
export async function scanChannel({ session, proxy, channel, keywords = [], sinceHours = 48, limit = 100 }) {
  return withClient(session, proxy, async (client) => {
    const entity = await client.getEntity(channel);
    const cutoff = Date.now() / 1000 - sinceHours * 3600;
    const kw = keywords.map((k) => k.toLowerCase()).filter(Boolean);

    const out = [];
    for await (const msg of client.iterMessages(entity, { limit })) {
      if (!msg.message) continue;
      if (msg.date && msg.date < cutoff) break;
      const text = msg.message;
      const lower = text.toLowerCase();
      const matched = kw.length ? kw.filter((k) => lower.includes(k)) : [];
      if (kw.length && matched.length === 0) continue;

      let authorName = null, authorUsername = null, authorTgId = null;
      try {
        const sender = await msg.getSender();
        if (sender) {
          authorTgId = String(sender.id);
          authorName = [sender.firstName, sender.lastName].filter(Boolean).join(" ") || sender.title || null;
          authorUsername = sender.username || null;
        }
      } catch { /* sender may be unavailable */ }

      out.push({
        tgChatId: String(entity.id),
        tgMessageId: String(msg.id),
        text,
        postedAt: new Date((msg.date || 0) * 1000).toISOString(),
        matchedKeywords: matched,
        authorName,
        authorUsername,
        authorTgId,
      });
    }
    return { messages: out, chatId: String(entity.id), title: entity.title || channel };
  });
}

/** Post a reply (or message) from an owned account. */
export async function postReply({ session, proxy, chatId, replyToMsgId, text }) {
  return withClient(session, proxy, async (client) => {
    const entity = await client.getEntity(chatId);
    const sent = await client.sendMessage(entity, {
      message: text,
      replyTo: replyToMsgId ? Number(replyToMsgId) : undefined,
    });
    return { tgMessageId: String(sent.id) };
  });
}

/* ─── warming / reactions / mailing executors ─── */

/** Join a public channel or group. */
export async function joinChat({ session, proxy, target }) {
  return withClient(session, proxy, async (client) => {
    const entity = await client.getEntity(target);
    await client.invoke(new Api.channels.JoinChannel({ channel: entity }));
    return { ok: true, chatId: String(entity.id), title: entity.title || target };
  });
}

/** Read history (mark messages as read) — a low-risk "activity" signal. */
export async function readChat({ session, proxy, target }) {
  return withClient(session, proxy, async (client) => {
    const entity = await client.getEntity(target);
    await client.markAsRead(entity).catch(() => {});
    return { ok: true };
  });
}

const DEFAULT_REACTIONS = ["👍", "🔥", "❤️", "👏", "🙏"];

/**
 * React to recent messages in a chat/channel.
 * `count` = how many recent messages to react to. Returns how many succeeded.
 */
export async function reactRecent({ session, proxy, target, count = 1, emoji }) {
  return withClient(session, proxy, async (client) => {
    const entity = await client.getEntity(target);
    let done = 0;
    for await (const msg of client.iterMessages(entity, { limit: Math.min(count * 3, 30) })) {
      if (done >= count) break;
      if (!msg.id) continue;
      const e = emoji || DEFAULT_REACTIONS[Math.floor(Math.random() * DEFAULT_REACTIONS.length)];
      try {
        await client.invoke(
          new Api.messages.SendReaction({
            peer: entity,
            msgId: msg.id,
            reaction: [new Api.ReactionEmoji({ emoticon: e })],
          })
        );
        done++;
      } catch { /* reactions may be disabled on this message */ }
    }
    return { ok: true, reacted: done };
  });
}

/** Send a direct message to a user (mailing). */
export async function sendDirect({ session, proxy, target, text }) {
  return withClient(session, proxy, async (client) => {
    const entity = await client.getEntity(target);
    const sent = await client.sendMessage(entity, { message: text });
    return { ok: true, tgMessageId: String(sent.id) };
  });
}

/** Invite a user into your own channel/supergroup (or basic group). */
export async function inviteToChannel({ session, proxy, channel, user }) {
  return withClient(session, proxy, async (client) => {
    const dest = await client.getEntity(channel);
    const u = await client.getEntity(user);
    try {
      await client.invoke(new Api.channels.InviteToChannel({ channel: dest, users: [u] }));
    } catch (e) {
      if (String(e?.errorMessage).includes("CHANNEL_INVALID")) {
        await client.invoke(new Api.messages.AddChatUser({ chatId: dest.id, userId: u, fwdLimit: 50 }));
      } else throw e;
    }
    return { ok: true };
  });
}

/** View + read a user's stories (masslooking). Returns whether stories existed. */
export async function viewStories({ session, proxy, user }) {
  return withClient(session, proxy, async (client) => {
    const peer = await client.getEntity(user);
    let ids = [];
    try {
      const res = await client.invoke(new Api.stories.GetPeerStories({ peer }));
      ids = (res?.stories?.stories || []).map((s) => s.id).filter(Boolean);
    } catch {
      return { ok: true, viewed: 0 };
    }
    if (ids.length === 0) return { ok: true, viewed: 0 };
    try {
      await client.invoke(new Api.stories.ReadStories({ peer, maxId: Math.max(...ids) }));
    } catch { /* read is best-effort */ }
    try {
      await client.invoke(new Api.stories.IncrementStoryViews({ peer, id: ids }));
    } catch { /* view is best-effort */ }
    return { ok: true, viewed: ids.length };
  });
}

/** Ask @SpamBot for the account's status; parse a coarse verdict. */
export async function checkSpamStatus({ session, proxy }) {
  return withClient(session, proxy, async (client) => {
    const bot = await client.getEntity("SpamBot");
    await client.sendMessage(bot, { message: "/start" });
    await new Promise((r) => setTimeout(r, 2500));
    let text = "";
    for await (const msg of client.iterMessages(bot, { limit: 1 })) {
      text = msg.message || "";
    }
    const lower = text.toLowerCase();
    let verdict = "unknown";
    if (/no limits|not limited|свободен|нет ограничени|good news/.test(lower)) verdict = "free";
    else if (/limited|ограничен|restricted|blocked/.test(lower)) verdict = "limited";
    return { ok: true, verdict, message: text.slice(0, 400) };
  });
}

/**
 * Post a COMMENT under a channel post (in the channel's linked discussion group).
 * GramJS `commentTo` resolves the linked group + thread head internally.
 * Joins the discussion group and retries once on CHAT_WRITE_FORBIDDEN.
 */
export async function commentOnPost({ session, proxy, channel, postId, text }) {
  return withClient(session, proxy, async (client) => {
    const entity = await client.getEntity(channel);
    const full = await client.invoke(new Api.channels.GetFullChannel({ channel: entity }));
    if (!full.fullChat.linkedChatId) {
      const err = new Error("NO_DISCUSSION");
      err.errorMessage = "SG_ID_INVALID";
      throw err;
    }
    try {
      const sent = await client.sendMessage(entity, { message: text, commentTo: Number(postId) });
      return { ok: true, tgMessageId: String(sent.id) };
    } catch (e) {
      if (String(e?.errorMessage || e?.message).includes("CHAT_WRITE_FORBIDDEN")) {
        const linked = full.chats.find(
          (c) => full.fullChat.linkedChatId && c.id?.eq?.(full.fullChat.linkedChatId)
        );
        if (linked) {
          await client.invoke(new Api.channels.JoinChannel({ channel: linked }));
          const sent = await client.sendMessage(entity, { message: text, commentTo: Number(postId) });
          return { ok: true, tgMessageId: String(sent.id) };
        }
      }
      throw e;
    }
  });
}

/**
 * Poll dialogs for the newest inbound DM per private chat (Нейрочат inbox).
 * Only reports a dialog when its top message is inbound (msg.out === false) —
 * if we (or the human owner, from the Telegram app itself) sent the last
 * message, there is nothing new to react to.
 */
export async function fetchInbox({ session, proxy, limit = 30 }) {
  return withClient(session, proxy, async (client) => {
    const dialogs = await client.getDialogs({ limit });
    const out = [];
    for (const d of dialogs) {
      if (!d.isUser) continue;
      const entity = d.entity;
      if (!entity || entity.bot || entity.self || entity.deleted) continue;
      const msg = d.message;
      if (!msg || !msg.message || msg.out) continue;
      out.push({
        peerTgId: String(entity.id),
        peerAccessHash: entity.accessHash != null ? String(entity.accessHash) : null,
        peerUsername: entity.username || null,
        peerName: [entity.firstName, entity.lastName].filter(Boolean).join(" ") || null,
        tgMessageId: String(msg.id),
        text: msg.message,
        postedAt: new Date((msg.date || 0) * 1000).toISOString(),
      });
    }
    return { items: out };
  });
}

/**
 * Send a DM to a peer for the auto-responder. Prefers the access_hash cached
 * from fetchInbox (works even for non-contacts with no username — a bare
 * numeric id alone isn't resolvable via getEntity without one), falling back
 * to a username lookup.
 */
export async function sendToPeer({ session, proxy, tgUserId, accessHash, username, text }) {
  return withClient(session, proxy, async (client) => {
    const entity = accessHash
      ? new Api.InputPeerUser({ userId: bigInt(tgUserId), accessHash: bigInt(accessHash) })
      : await client.getEntity(username || tgUserId);
    const sent = await client.sendMessage(entity, { message: text });
    return { ok: true, tgMessageId: String(sent.id) };
  });
}

/**
 * Classify a GramJS/Telegram error into a stable code + optional retry seconds.
 * Used by the HTTP layer so the web engines can react (auto-pause, cooldown).
 */
export function classifyError(e) {
  const msg = String(e?.errorMessage || e?.message || "");
  const seconds = Number(e?.seconds) || Number((msg.match(/FLOOD_WAIT_(\d+)/) || [])[1]) || 0;
  let code = "ERROR";
  if (e?.className === "FloodWaitError" || /FLOOD_WAIT/.test(msg)) code = "FLOOD_WAIT";
  else if (/PEER_FLOOD/.test(msg)) code = "PEER_FLOOD";
  else if (/USER_PRIVACY_RESTRICTED/.test(msg)) code = "USER_PRIVACY_RESTRICTED";
  else if (/USER_ALREADY_PARTICIPANT/.test(msg)) code = "USER_ALREADY_PARTICIPANT";
  else if (/USER_CHANNELS_TOO_MUCH/.test(msg)) code = "USER_CHANNELS_TOO_MUCH";
  else if (/SG_ID_INVALID|MSG_ID_INVALID|NO_DISCUSSION|CHANNEL_PRIVATE/.test(msg)) code = "NO_COMMENTS";
  else if (/SLOWMODE_WAIT/.test(msg)) code = "SLOWMODE";
  else if (/USER_NOT_MUTUAL_CONTACT|CHAT_WRITE_FORBIDDEN|YOU_BLOCKED_USER/.test(msg)) code = "CANT_WRITE";
  else if (/AUTH_KEY_UNREGISTERED|SESSION_REVOKED|USER_DEACTIVATED/.test(msg)) code = "AUTH_DEAD";
  return { code, retryAfter: seconds, message: msg };
}
