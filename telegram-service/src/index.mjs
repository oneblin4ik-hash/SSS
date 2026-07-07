/**
 * Pro Potok — Telegram MTProto service (Node).
 *
 * The web app calls these endpoints over HTTPS with a shared secret
 * (header `x-internal-secret`). This service does all GramJS work; it never
 * touches the database — it returns session strings + results for the web app
 * to encrypt/persist.
 */
import express from "express";
import cors from "cors";
import { z } from "zod";
import {
  assertCreds, requestCode, signInWithCode, signInWith2fa,
  checkSession, scanChannel, postReply,
  importSession, checkProxy, parseMembers, parseCommenters,
  joinChat, readChat, reactRecent, sendDirect,
  inviteToChannel, viewStories, checkSpamStatus, classifyError, commentOnPost,
  fetchInbox, sendToPeer,
} from "./telegram.mjs";

const proxySchema = z
  .object({
    type: z.enum(["SOCKS5", "HTTP", "MTPROTO"]).optional(),
    host: z.string(),
    port: z.number().int().positive(),
    username: z.string().optional().nullable(),
    password: z.string().optional().nullable(),
    secret: z.string().optional().nullable(),
  })
  .optional()
  .nullable();

// Every endpoint that takes a session MUST extend this base — fixes the
// original bug where /tg/scan and /tg/post schemas forgot `proxy`, so zod
// silently stripped it and requests ran unproxied.
const withSession = z.object({ session: z.string().min(1), proxy: proxySchema });

const PORT = Number(process.env.PORT) || 4000;
const SECRET = process.env.INTERNAL_SECRET || "";

if (!SECRET) {
  console.error("ERROR: INTERNAL_SECRET must be set (shared secret with the web app).");
  process.exit(1);
}
try { assertCreds(); } catch (e) { console.error("ERROR:", e.message); process.exit(1); }

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());

app.use((req, res, next) => {
  if (req.headers["x-internal-secret"] !== SECRET) {
    return res.status(401).json({ error: "unauthorized" });
  }
  next();
});

function handler(schema, fn) {
  return async (req, res) => {
    const parsed = schema.safeParse(req.body || {});
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || "bad request" });
    }
    try {
      res.json(await fn(parsed.data));
    } catch (e) {
      const { code, retryAfter, message } = classifyError(e);
      console.error(`[${req.path}]`, code, message);
      res.status(400).json({ error: message || "telegram error", code, retryAfter });
    }
  };
}

app.post("/tg/request-code", handler(
  z.object({ phone: z.string().min(5), proxy: proxySchema }),
  ({ phone, proxy }) => requestCode(phone.trim(), proxy)
));
app.post("/tg/sign-in", handler(
  z.object({ phone: z.string().min(5), code: z.string().min(3) }),
  ({ phone, code }) => signInWithCode(phone.trim(), code)
));
app.post("/tg/2fa", handler(
  z.object({ phone: z.string().min(5), password: z.string().min(1) }),
  ({ phone, password }) => signInWith2fa(phone.trim(), password)
));
app.post("/tg/check", handler(withSession, ({ session, proxy }) => checkSession(session, proxy)));
app.post("/tg/import-session", handler(withSession, (d) => importSession(d)));
app.post("/tg/check-proxy", handler(z.object({ proxy: proxySchema }), (d) => checkProxy(d)));

app.post("/tg/scan", handler(
  z.object({
    ...withSession.shape,
    channel: z.string().min(1),
    keywords: z.array(z.string()).optional(),
    sinceHours: z.number().optional(),
    limit: z.number().optional(),
  }),
  (d) => scanChannel(d)
));
app.post("/tg/post", handler(
  z.object({ ...withSession.shape, chatId: z.string().min(1), replyToMsgId: z.string().optional(), text: z.string().min(1) }),
  (d) => postReply(d)
));

const targetBase = { ...withSession.shape, target: z.string().min(1) };
app.post("/tg/parse-members", handler(
  z.object({ ...targetBase, limit: z.number().optional() }),
  (d) => parseMembers(d)
));
app.post("/tg/parse-commenters", handler(
  z.object({ ...targetBase, limit: z.number().optional() }),
  (d) => parseCommenters(d)
));
app.post("/tg/join", handler(z.object(targetBase), (d) => joinChat(d)));
app.post("/tg/read", handler(z.object(targetBase), (d) => readChat(d)));
app.post("/tg/react", handler(
  z.object({ ...targetBase, count: z.number().int().positive().max(10).optional(), emoji: z.string().optional() }),
  (d) => reactRecent(d)
));
app.post("/tg/send-direct", handler(
  z.object({ ...targetBase, text: z.string().min(1).max(4096) }),
  (d) => sendDirect(d)
));

app.post("/tg/invite", handler(
  z.object({ ...withSession.shape, channel: z.string().min(1), user: z.string().min(1) }),
  (d) => inviteToChannel(d)
));
app.post("/tg/view-stories", handler(z.object(targetBase), (d) => viewStories({ ...d, user: d.target })));
app.post("/tg/spam-status", handler(withSession, (d) => checkSpamStatus(d)));
app.post("/tg/comment", handler(
  z.object({
    ...withSession.shape,
    channel: z.string().min(1), postId: z.union([z.string(), z.number()]),
    text: z.string().min(1).max(4096),
  }),
  (d) => commentOnPost(d)
));

app.post("/tg/inbox", handler(
  z.object({ ...withSession.shape, limit: z.number().optional() }),
  (d) => fetchInbox(d)
));
app.post("/tg/send-peer", handler(
  z.object({
    ...withSession.shape,
    tgUserId: z.string().min(1),
    accessHash: z.string().optional().nullable(),
    username: z.string().optional().nullable(),
    text: z.string().min(1).max(4096),
  }),
  (d) => sendToPeer(d)
));

app.listen(PORT, () => console.log(`✓ Pro Potok telegram-service on :${PORT}`));
