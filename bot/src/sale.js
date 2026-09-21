/* Продажа в личке, §6. Платёжной системы нет: кнопка ведёт в диалог
   с Эдуардом, он называет реквизиты и включает курс руками.
 *
 * ВАЖНОЕ РАСХОЖДЕНИЕ СО СПЕКОЙ, и оно вынужденное.
 *
 * Спека предлагает url-кнопку прямо в оффере: `t.me/Mr_Serbolin?text=…`.
 * Так человеку не надо придумывать, с чего начать разговор, — и это верно.
 * Но у url-кнопки нет обратной связи: Telegram не сообщает боту, что по ней
 * нажали. А на этом событии держится вся ручная продажа — карточка заявки
 * Эдуарду, список `/waiting`, напоминание через два часа и остановка догрева.
 *
 * Поэтому кнопка в оффере обычная, с callback. По нажатию бот заводит
 * заявку, шлёт Эдуарду карточку, гасит догрев — и только потом отдаёт
 * человеку ссылку в личку, уже с набранным текстом. Лишнее касание
 * взамен на то, что ни одна заявка не потеряется.
 */
import { sendMessage, answerCallback, call } from "./telegram.js";
import { logEvent, getQuiz } from "./db.js";
import { shortCode, contactUrl, BTN_CONTACT } from "./offer.js";
import { askTimezone } from "./course.js";

const now = () => new Date().toISOString();
const TYPE_LABEL = { never: "🌱 Чистый лист", quit: "🔁 Второй заход", onoff: "⚡ Рывками" };

export const BTN_OPEN_CHAT = "Открыть переписку";

const HANDOFF =
  "Открывай переписку — сообщение уже набрано, останется отправить.\n\n" +
  "Отвечаю сам. Скажу реквизиты, отвечу на вопросы, включу курс.";

/** Человек нажал «Написать Эдуарду». */
export async function onContact(env, cq) {
  const uid = cq.from.id;
  const code = await shortCode(uid);

  // Повторное нажатие не плодит заявки и не будит Эдуарда второй раз.
  const existing = await env.DB.prepare(
    `SELECT status FROM orders WHERE user_id = ?1`).bind(uid).first();

  if (!existing) {
    await env.DB.prepare(
      `INSERT INTO orders (user_id, code, status, at) VALUES (?1, ?2, 'awaiting', ?3)`)
      .bind(uid, code, now()).run();
    await logEvent(env.DB, uid, "contact_clicked", { code });
    await cancelWarmup(env.DB, uid);
    await notifyAdmin(env, uid, code, cq.from);
    await scheduleReminder(env.DB, uid);
  }

  await answerCallback(env.BOT_TOKEN, cq.id, "");
  await sendMessage(env.BOT_TOKEN, cq.message.chat.id, HANDOFF, {
    reply_markup: {
      inline_keyboard: [[{ text: BTN_OPEN_CHAT, url: contactUrl(code) }]],
    },
  });
}

/** Догрев после заявки только мешает: дальше разговор идёт в личке. */
export async function cancelWarmup(db, userId) {
  await db.prepare(
    `UPDATE jobs SET sent_at = ?2 WHERE user_id = ?1 AND sent_at IS NULL
       AND kind LIKE 'warm_%'`).bind(userId, now()).run();
}

/* Карточка Эдуарду: всё, что нужно для разговора, сразу под рукой. */
async function notifyAdmin(env, uid, code, from) {
  if (!env.ADMIN_ID) return;
  const q = await getQuiz(env.DB, uid);
  const d = await env.DB.prepare(`SELECT * FROM day0 WHERE user_id = ?1`)
    .bind(uid).first();
  const at = await env.DB.prepare(`SELECT quiz_at FROM quiz WHERE user_id = ?1`)
    .bind(uid).first();

  const who = from.username ? `@${from.username}` : "без юзернейма";
  const windows = d?.window1 && d?.window2
    ? `${d.window1} и ${d.window2}` : d?.windows_raw || "не ответил";

  const lines = [
    `🔔 Заявка · код *${code}*`,
    ``,
    `${q?.n || from.first_name || "—"}, ${who}${q?.a ? `, ${q.a} лет` : ""}`,
    `Тип: ${TYPE_LABEL[q?.t] || "—"}`,
  ];
  if (q?.h && q?.w) {
    lines.push(`Рост ${q.h}, вес ${q.w}${q.wg ? ` → ${q.wg}` : ""}` +
               `${q.bmi ? `. ИМТ ${q.bmi}` : ""}`);
  }
  lines.push(`Окна: ${windows} · зона риска: ${d?.hunger_time || "не ответил"}`);
  if (q?.hl?.some((h) => h === "heart" || h === "diab")) {
    lines.push(`⚠️ В здоровье: ${q.hl.join(", ")} — нагрузка после врача`);
  }
  lines.push(`Тест ${when(at?.quiz_at)}`);

  await sendMessage(env.BOT_TOKEN, env.ADMIN_ID, lines.join("\n"), {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [[
        { text: "Включить курс", callback_data: `grant:${uid}` },
        { text: "Отказался", callback_data: `decline:${uid}` },
      ]],
    },
  });
}

function when(iso) {
  if (!iso) return "—";
  const mins = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (mins < 60) return `${mins} минут назад`;
  const h = Math.round(mins / 60);
  return h < 24 ? `${h} ч назад` : `${Math.round(h / 24)} дн назад`;
}

/* Ручная выдача ломается не на технике, а на памяти. Напоминание через
   два часа — не человеку, а себе. */
async function scheduleReminder(db, userId) {
  const due = new Date(Date.now() + 2 * 3600e3).toISOString();
  await db.prepare(
    `INSERT INTO jobs (user_id, kind, due_at) VALUES (?1, 'admin_ping', ?2)`)
    .bind(userId, due).run();
}

/** Эдуард нажал «Включить курс» или «Отказался». */
export async function onAdminDecision(env, cq, action, uid) {
  if (String(cq.from.id) !== String(env.ADMIN_ID)) {
    await answerCallback(env.BOT_TOKEN, cq.id, "Это не твоя кнопка.", true);
    return;
  }
  const status = action === "grant" ? "paid" : "declined";
  await env.DB.prepare(
    `UPDATE orders SET status = ?2, closed_at = ?3 WHERE user_id = ?1`)
    .bind(uid, status, now()).run();
  // Напоминание больше не нужно: по заявке ответили.
  await env.DB.prepare(
    `UPDATE jobs SET sent_at = ?2 WHERE user_id = ?1 AND kind = 'admin_ping'
       AND sent_at IS NULL`).bind(uid, now()).run();
  await logEvent(env.DB, uid, status === "paid" ? "course_granted" : "declined");

  await answerCallback(env.BOT_TOKEN, cq.id,
                       status === "paid" ? "Курс включён" : "Отмечено");
  await call(env.BOT_TOKEN, "editMessageReplyMarkup", {
    chat_id: cq.message.chat.id,
    message_id: cq.message.message_id,
    reply_markup: { inline_keyboard: [] },
  });
  await sendMessage(env.BOT_TOKEN, cq.message.chat.id,
    status === "paid"
      ? "Отметил: курс включён. Спросил у человека часовой пояс, " +
        "дальше уроки пойдут сами."
      : "Отметил: отказался. Из списка ожидающих убрал.");

  // Человеку — вопрос про время. Без него не с чем ставить расписание,
  // и курс, за который заплатили, просто не начнётся.
  if (status === "paid") await askTimezone(env, uid);
}

/** `/waiting` — кто нажал кнопку и ещё не получил ответа. */
export async function onWaiting(env, msg) {
  if (String(msg.from.id) !== String(env.ADMIN_ID)) return;
  const { results } = await env.DB.prepare(
    `SELECT o.user_id, o.code, o.at, u.name, u.username
       FROM orders o LEFT JOIN users u ON u.user_id = o.user_id
      WHERE o.status = 'awaiting' ORDER BY o.at`).all();

  if (!results.length) {
    await sendMessage(env.BOT_TOKEN, msg.chat.id, "Никто не ждёт. Пусто.");
    return;
  }
  const lines = results.map((r) =>
    `*${r.code}* · ${r.name || "—"}` +
    `${r.username ? ` @${r.username}` : ""} · ${when(r.at)}`);
  await sendMessage(env.BOT_TOKEN, msg.chat.id,
    `Ждут ответа: ${results.length}\n\n${lines.join("\n")}`,
    { parse_mode: "Markdown" });
}
