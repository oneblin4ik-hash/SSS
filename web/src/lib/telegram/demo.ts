import type { ProxyInput } from "./service";

/**
 * Demo-mode telegram-service stand-in. GramJS/MTProto can't run inside a
 * Cloudflare Worker (raw TCP to Telegram's data centers, long-lived
 * connections), and this deployment has no real TELEGRAM_API_ID/HASH anyway —
 * so DEMO_MODE swaps every `tg.*` call for canned, believable responses,
 * keeping the whole UI clickable end-to-end without a live Telegram account.
 */

function fakeId(): string {
  return String(Math.floor(1_000_000 + Math.random() * 9_000_000));
}

const DEMO_POSTS = [
  { text: "Запустили новый поток обучения — старт через неделю, места ограничены.", keywords: ["обучение", "курс", "старт"] },
  { text: "Как вы находите клиентов в нише без рекламного бюджета? Делитесь опытом.", keywords: ["клиенты", "маркетинг"] },
  { text: "Сделали разбор 10 лучших связок для привлечения подписчиков в Telegram.", keywords: ["telegram", "подписчики"] },
  { text: "Знакомство: меня зовут Игорь, развиваю канал про инвестиции третий год.", keywords: [] },
  { text: "Спасибо всем, кто пришёл на вчерашний эфир — запись уже в закрытом канале.", keywords: ["эфир", "канал"] },
];

const DEMO_NAMES = ["Анна Смирнова", "Игорь Петров", "Мария Ковалёва", "Дмитрий Волков", "Елена Соколова", "Сергей Иванов"];

export const demoTg = {
  requestCode: async (_phone: string, _proxy?: ProxyInput) => ({ phoneCodeHash: "demo-hash" }),

  signInWithCode: async (phone: string, _code: string) => ({
    session: `demo-session-${phone}`,
    name: "Демо Аккаунт",
    username: null,
  }),

  signInWith2fa: async (phone: string, _password: string) => ({
    session: `demo-session-${phone}`,
    name: "Демо Аккаунт",
    username: null,
  }),

  check: async (_session: string, _proxy?: ProxyInput) => ({ ok: true, name: "Демо Аккаунт", username: null }),

  checkProxy: async (_proxy: ProxyInput) => ({ ok: true }),

  scan: async (input: { channel: string; keywords?: string[]; limit?: number }) => {
    const kw = (input.keywords ?? []).map((k) => k.toLowerCase());
    const chatId = `-100${fakeId()}`;
    const messages = DEMO_POSTS.map((p, i) => {
      const matched = kw.length ? p.keywords.filter((k) => kw.includes(k.toLowerCase())) : [];
      return {
        tgChatId: chatId,
        tgMessageId: `demo-${input.channel}-${i}`,
        text: p.text,
        postedAt: new Date(Date.now() - i * 3600_000).toISOString(),
        matchedKeywords: matched,
        authorName: DEMO_NAMES[i % DEMO_NAMES.length],
        authorUsername: null,
        authorTgId: fakeId(),
      };
    }).filter((m) => !kw.length || m.matchedKeywords.length);
    return { messages, chatId, title: input.channel.replace(/^@/, "") };
  },

  post: async (_input: unknown) => ({ tgMessageId: fakeId() }),

  parseMembers: async (input: { target: string; limit?: number }) => ({
    contacts: DEMO_NAMES.map((name, i) => ({ tgUserId: fakeId(), username: `demo_user_${i}`, name })),
    title: input.target.replace(/^@/, ""),
  }),

  parseCommenters: async (input: { target: string; limit?: number }) => ({
    contacts: DEMO_NAMES.slice(0, 4).map((name, i) => ({ tgUserId: fakeId(), username: `demo_commenter_${i}`, name })),
    title: input.target.replace(/^@/, ""),
  }),

  join: async (input: { target: string }) => ({ ok: true, chatId: `-100${fakeId()}`, title: input.target.replace(/^@/, "") }),

  read: async (_input: unknown) => ({ ok: true }),

  react: async (input: { count?: number }) => ({ ok: true, reacted: input.count ?? 1 }),

  sendDirect: async (_input: unknown) => ({ ok: true, tgMessageId: fakeId() }),

  invite: async (_input: unknown) => ({ ok: true }),

  viewStories: async (_input: unknown) => ({ ok: true, viewed: Math.floor(Math.random() * 3) }),

  spamStatus: async (_input: unknown) => ({ ok: true as const, verdict: "free" as const, message: "Ограничений не найдено (демо-режим)." }),

  comment: async (_input: unknown) => ({ ok: true, tgMessageId: fakeId() }),

  // A single fixed seeded lead — deduped naturally by the caller's own
  // [conversation, tgMessageId] tracking once it's been processed.
  inbox: async (_input: unknown) => ({
    items: [
      {
        peerTgId: "demo-lead-1",
        peerAccessHash: "demo-access-hash",
        peerUsername: "demo_lead",
        peerName: "Иван (демо-лид)",
        tgMessageId: "demo-msg-1",
        text: "Привет! Как попасть в закрытый канал?",
        postedAt: new Date().toISOString(),
      },
    ],
  }),

  sendToPeer: async (_input: unknown) => ({ ok: true, tgMessageId: fakeId() }),
};
