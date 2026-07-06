const BASE = process.env.TELEGRAM_SERVICE_URL || "http://localhost:4000";
const SECRET = process.env.INTERNAL_SECRET || "";

export type ProxyInput = {
  type?: "SOCKS5" | "HTTP" | "MTPROTO";
  host: string;
  port: number;
  username?: string | null;
  password?: string | null;
  secret?: string | null;
} | null | undefined;

/** Error carrying the telegram-service classification so engines can react. */
export class TgError extends Error {
  code: string;
  retryAfter: number;
  constructor(message: string, code = "ERROR", retryAfter = 0) {
    super(message);
    this.name = "TgError";
    this.code = code;
    this.retryAfter = retryAfter;
  }
}

async function call<T>(path: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-internal-secret": SECRET },
      body: JSON.stringify(body),
    });
  } catch {
    throw new TgError("Telegram-сервис недоступен. Проверьте, что он запущен.", "SERVICE_DOWN");
  }
  const data = (await res.json().catch(() => ({}))) as any;
  if (!res.ok) {
    throw new TgError(data.error || "Ошибка telegram-сервиса", data.code || "ERROR", data.retryAfter || 0);
  }
  return data as T;
}

export const tg = {
  requestCode: (phone: string, proxy?: ProxyInput) =>
    call<{ phoneCodeHash: string }>("/tg/request-code", { phone, proxy }),
  signInWithCode: (phone: string, code: string) =>
    call<{ needs2fa?: boolean; session?: string; name?: string | null; username?: string | null }>(
      "/tg/sign-in",
      { phone, code }
    ),
  signInWith2fa: (phone: string, password: string) =>
    call<{ session: string; name?: string | null; username?: string | null }>("/tg/2fa", { phone, password }),
  check: (session: string, proxy?: ProxyInput) =>
    call<{ ok: boolean; name?: string | null; username?: string | null }>("/tg/check", { session, proxy }),
  checkProxy: (proxy: ProxyInput) => call<{ ok: boolean; error?: string }>("/tg/check-proxy", { proxy }),
  scan: (input: { session: string; proxy?: ProxyInput; channel: string; keywords?: string[]; sinceHours?: number; limit?: number }) =>
    call<{
      messages: {
        tgChatId: string; tgMessageId: string; text: string; postedAt: string;
        matchedKeywords: string[]; authorName: string | null; authorUsername: string | null; authorTgId: string | null;
      }[];
      chatId: string; title: string;
    }>("/tg/scan", input),
  post: (input: { session: string; proxy?: ProxyInput; chatId: string; replyToMsgId?: string; text: string }) =>
    call<{ tgMessageId: string }>("/tg/post", input),
  parseMembers: (input: { session: string; proxy?: ProxyInput; target: string; limit?: number }) =>
    call<{ contacts: { tgUserId: string; username: string | null; name: string | null }[]; title: string }>(
      "/tg/parse-members",
      input
    ),
  parseCommenters: (input: { session: string; proxy?: ProxyInput; target: string; limit?: number }) =>
    call<{ contacts: { tgUserId: string; username: string | null; name: string | null }[]; title: string }>(
      "/tg/parse-commenters",
      input
    ),
  join: (input: { session: string; proxy?: ProxyInput; target: string }) =>
    call<{ ok: boolean; chatId: string; title: string }>("/tg/join", input),
  read: (input: { session: string; proxy?: ProxyInput; target: string }) =>
    call<{ ok: boolean }>("/tg/read", input),
  react: (input: { session: string; proxy?: ProxyInput; target: string; count?: number; emoji?: string }) =>
    call<{ ok: boolean; reacted: number }>("/tg/react", input),
  sendDirect: (input: { session: string; proxy?: ProxyInput; target: string; text: string }) =>
    call<{ ok: boolean; tgMessageId: string }>("/tg/send-direct", input),
  invite: (input: { session: string; proxy?: ProxyInput; channel: string; user: string }) =>
    call<{ ok: boolean }>("/tg/invite", input),
  viewStories: (input: { session: string; proxy?: ProxyInput; target: string }) =>
    call<{ ok: boolean; viewed: number }>("/tg/view-stories", input),
  spamStatus: (input: { session: string; proxy?: ProxyInput }) =>
    call<{ ok: boolean; verdict: "free" | "limited" | "unknown"; message: string }>("/tg/spam-status", input),
  comment: (input: { session: string; proxy?: ProxyInput; channel: string; postId: string; text: string }) =>
    call<{ ok: boolean; tgMessageId: string }>("/tg/comment", input),
};
