/* Отложенные отправки. Воркер не может «поспать четыре часа» — он живёт
   ровно один запрос. Поэтому будущие сообщения лежат строками в jobs,
   а крон раз в четверть часа забирает то, чему пришёл срок.
 *
 * Четверть часа выбрана как компромисс: точнее не нужно (сообщения
 * догрева не про минуты), а чаще — лишние запуски на ровном месте. */
import { sendMessage } from "./telegram.js";
import { logEvent, getQuiz } from "./db.js";
import { warmupText, warmupMarkup, SCHEDULE } from "./warmup.js";
import { sendLesson, sendCheckin, sendUpsell } from "./course.js";

const now = () => new Date().toISOString();
const BATCH = 50;   // за раз, чтобы уложиться в лимит бесплатного тарифа

/** Ставит всю цепочку догрева от момента окончания теста. */
export async function scheduleWarmup(db, userId, fromISO) {
  const base = Date.parse(fromISO || now());
  await db.batch(SCHEDULE.map((s) =>
    db.prepare(`INSERT INTO jobs (user_id, kind, due_at) VALUES (?1, ?2, ?3)`)
      .bind(userId, s.kind, new Date(base + s.after).toISOString())));
}

export async function runDue(env) {
  const { results } = await env.DB.prepare(
    `SELECT * FROM jobs WHERE sent_at IS NULL AND due_at <= ?1
      ORDER BY due_at LIMIT ${BATCH}`).bind(now()).all();

  for (const job of results) {
    try {
      await runOne(env, job);
    } catch (e) {
      console.error(`job ${job.id} (${job.kind}) упал:`, e?.message || e);
    }
    // Помечаем в любом случае. Повторять неудачную отправку опаснее, чем
    // потерять её: человек получит одно и то же сообщение пачкой.
    await env.DB.prepare(`UPDATE jobs SET sent_at = ?2 WHERE id = ?1`)
      .bind(job.id, now()).run();
  }
  return results.length;
}

async function runOne(env, job) {
  if (job.kind === "admin_ping") return adminPing(env, job);
  if (job.kind.startsWith("warm_")) return warmup(env, job);

  const m = /^(lesson|checkin|upsell)_(\d+)$/.exec(job.kind);
  if (!m) return;
  const day = Number(m[2]);
  if (m[1] === "lesson") return sendLesson(env, job.user_id, day);
  if (m[1] === "checkin") return sendCheckin(env, job.user_id, day);
  return sendUpsell(env, job.user_id, day);
}

/* Напоминание Эдуарду о заявке, которая висит без ответа. */
async function adminPing(env, job) {
  if (!env.ADMIN_ID) return;
  const o = await env.DB.prepare(
    `SELECT code, status FROM orders WHERE user_id = ?1`).bind(job.user_id).first();
  if (!o || o.status !== "awaiting") return;   // уже ответили
  await sendMessage(env.BOT_TOKEN, env.ADMIN_ID,
    `Заявка ${o.code} без ответа 2 часа.`);
}

async function warmup(env, job) {
  const u = await env.DB.prepare(
    `SELECT unsub FROM users WHERE user_id = ?1`).bind(job.user_id).first();
  if (u?.unsub) return;

  const o = await env.DB.prepare(
    `SELECT status FROM orders WHERE user_id = ?1`).bind(job.user_id).first();
  if (o) return;      // заявка есть — разговор идёт в личке, не мешаем

  const payload = await getQuiz(env.DB, job.user_id);
  if (!payload) return;
  const d = await env.DB.prepare(`SELECT * FROM day0 WHERE user_id = ?1`)
    .bind(job.user_id).first();

  const text = warmupText(job.kind, payload, d);
  // Сообщение, потерявшее смысл без разобранных ответов, просто не шлём.
  // Лучше пропустить касание, чем прислать фразу с дырой вместо окна.
  if (!text) return;

  await sendMessage(env.BOT_TOKEN, job.user_id, text, warmupMarkup(job.kind));
  await logEvent(env.DB, job.user_id, job.kind);
}
