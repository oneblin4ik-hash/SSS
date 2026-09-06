/* Прогон бота без Telegram и без Cloudflare.
 *
 * Развернуть воркер отсюда нельзя, а сдавать код, который ни разу
 * не запускали, нельзя тем более. Поэтому:
 *
 *   • Bot API подменяем заглушкой и смотрим, что именно ушло бы в Telegram;
 *   • база — настоящая. node:sqlite поднимает SQLite в памяти, на неё
 *     накатывается тот же schema.sql, и запросы выполняются по-честному.
 *     Заглушка вместо базы пропустила бы ровно те ошибки, которые
 *     и случаются: опечатку в имени колонки, забытый ON CONFLICT.
 *
 *   node test_bot.mjs
 */
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import worker from "./src/index.js";
import { runDue } from "./src/cron.js";

/* ── база: настоящий SQLite за фасадом D1 ─────────────────────────────── */
const sqlite = new DatabaseSync(":memory:");
for (const stmt of readFileSync("schema.sql", "utf8").split(";")) {
  if (stmt.trim()) sqlite.exec(stmt);
}

const wrap = (sql) => ({
  args: [],
  bind(...a) { this.args = a.map((v) => (v === undefined ? null : v)); return this; },
  async run() { return sqlite.prepare(sql).run(...this.args); },
  async first() { return sqlite.prepare(sql).get(...this.args) ?? null; },
  async all() { return { results: sqlite.prepare(sql).all(...this.args) }; },
});
const DB = {
  prepare: wrap,
  async batch(list) { for (const s of list) await s.run(); },
};

/* ── Bot API: только запоминаем вызовы ────────────────────────────────── */
let calls = [];
let subscribed = false;
const json = (o) => ({ json: async () => o, status: 200 });
globalThis.fetch = async (url, init) => {
  const method = String(url).split("/").pop();
  const body = JSON.parse(init.body);
  calls.push({ method, body });
  if (method === "getChatMember") {
    return json(subscribed
      ? { ok: true, result: { status: "member" } }
      : { ok: false, description: "user not found" });
  }
  return json({ ok: true, result: {} });
};

const env = {
  DB,
  BOT_TOKEN: "TEST",
  WEBHOOK_SECRET: "s3cret",
  CHANNEL: "@Serbolin",
  CHANNEL_URL: "https://t.me/Serbolin",
  QUIZ_URL: "https://serbolin-kviz.pages.dev/",
  ADMIN_ID: "1",
};

const waited = [];
const ctx = { waitUntil: (p) => waited.push(p) };

async function send(update, secret = "s3cret") {
  calls = []; waited.length = 0;
  const res = await worker.fetch(
    new Request("https://bot/", {
      method: "POST",
      headers: { "x-telegram-bot-api-secret-token": secret },
      body: JSON.stringify(update),
    }),
    env, ctx);
  await Promise.all(waited);
  return res;
}

const sent = () => calls.filter((c) => c.method === "sendMessage");
const lastText = () => sent().at(-1)?.body.text ?? "";
const row = (sql, ...a) => sqlite.prepare(sql).get(...a);

const from = { id: 777, username: "edik", first_name: "Пётр" };
const chat = { id: 777 };
const text = (t) => ({ message: { from, chat, text: t } });

let failed = 0;
const check = (ok, what) => {
  console.log(`${ok ? "  ok  " : "  ПРОВАЛ "}${what}`);
  if (!ok) failed++;
};
const head = (t) => console.log(`\n${t}`);

/* ── 1. чужой запрос ──────────────────────────────────────────────────── */
head("Чужой запрос без секрета:");
const bad = await send(text("/start"), "wrong");
check(bad.status === 403, "отбит с кодом 403");
check(calls.length === 0, "в Bot API ничего не ушло");

/* ── 2. вход без подписки ─────────────────────────────────────────────── */
head("/start, человек не подписан:");
subscribed = false;
await send(text("/start q_ig"));
check(row("SELECT source FROM users WHERE user_id=777")?.source === "q_ig",
      "источник q_ig записан");
check(!!row("SELECT 1 a FROM events WHERE event='sub_required'"), "событие sub_required");
const gate = sent()[0].body;
check(!!gate.reply_markup.inline_keyboard, "показаны кнопки подписки");
check(!gate.reply_markup.keyboard, "кнопки теста нет");
check(gate.text.includes("Тест живёт в моём канале"), "концовка про канал");

head("Повторный /start с другой меткой:");
await send(text("/start q_yt"));
check(row("SELECT source FROM users WHERE user_id=777")?.source === "q_ig",
      "источник не перетёрся, остался настоящий");

/* ── 3. гейт ──────────────────────────────────────────────────────────── */
head("«Я подписался» без подписки:");
const cb = (data) => ({ callback_query: { id: "1", from, message: { chat }, data } });
await send(cb("sub_check"));
const alert = calls.find((c) => c.method === "answerCallbackQuery").body;
check(alert.show_alert === true, "ответ всплывашкой, чат не засорён");
check(alert.text.startsWith("Пока не вижу"), "текст без упрёка");
check(sent().length === 0, "лишних сообщений нет");

head("«Я подписался», подписка есть:");
subscribed = true;
await send(cb("sub_check"));
check(!!row("SELECT 1 a FROM events WHERE event='sub_ok'"), "событие sub_ok");
check(lastText() === "Вижу. Погнали: 14 вопросов, две с половиной минуты.",
      "текст ровно из спеки");
check(sent()[0].body.reply_markup.keyboard[0][0].web_app.url === env.QUIZ_URL,
      "кнопка ведёт на выложенный квиз");

/* ── 4. результат теста → «День 0» ────────────────────────────────────── */
head("Результат теста пришёл:");
const payload = {
  v: 2, n: "Галина", g: "f", a: 36, h: 165, w: 78, wg: 66,
  gl: "loss", zn: "belly", fn: 4, fg: 2, ex: "quit", ls: "m1",
  pl: "home", mn: "30", fq: "2", hl: ["knee"], t: "onoff",
  wk: 27, tr: 2, bmi: 28.7, cm: "weight",
};
await send({ message: { from, chat, web_app_data: { data: JSON.stringify(payload) } } });
const q = row("SELECT * FROM quiz WHERE user_id=777");
check(!!q && JSON.parse(q.payload).n === "Галина", "payload лёг в quiz целиком");
check(q.type === "onoff" && q.exp === "quit", "тип и опыт продублированы отдельно");
check(row("SELECT gender FROM users WHERE user_id=777")?.gender === "f",
      "пол переехал в users");
check(sent()[0].body.text.startsWith("*День 0."), "сразу пошёл День 0");
check(sent()[1].body.text.includes("встала"), "вопрос в женском роде");
check(row("SELECT state FROM users WHERE user_id=777")?.state === "day0_1",
      "состояние — первый вопрос");

/* ── 5. четыре ответа ─────────────────────────────────────────────────── */
head("Отвечает на четыре вопроса:");
await send(text("встала в 7:30, легла в 23:00"));
check(row("SELECT state FROM users WHERE user_id=777")?.state === "day0_2",
      "перешли ко второму вопросу");
const d1 = row("SELECT * FROM day0 WHERE user_id=777");
check(d1.wake === "7:30" && d1.sleep === "23:00", "время разобрано");
check(d1.hours === 8.5, "часы сна посчитаны через полночь");

await send(text("7:00 утра и 20:30 вечером"));
const d2 = row("SELECT * FROM day0 WHERE user_id=777");
check(d2.window1 === "7:00 утра" && d2.window2 === "20:30 вечером", "окна разъехались на два");

await send(text("вечером, часов в девять"));
await send(text("макароны и половину шоколадки"));
check(row("SELECT state FROM users WHERE user_id=777")?.state === null,
      "диалог закрыт");
check(!!row("SELECT 1 a FROM events WHERE event='day0_done'"), "событие day0_done");

/* ── 6. карточка и оффер ──────────────────────────────────────────────── */
head("Карточка стартовой точки:");
const card = sent()[0].body.text;
check(card.startsWith("*Галина, твоя стартовая точка*"), "имя из теста");
check(card.includes("подъём 7:30, отбой 23:00 → 8 с половиной ч сна"),
      "режим собран из ответа человека");
check(card.includes("Нормально. С таким сном работать проще."), "вывод про сон верный");
check(card.includes("7:00 утра и 20:30 вечером"), "окна на месте");
check(card.includes("макароны и половину шоколадки"), "вчерашний ужин на месте");
check(card.includes("не села на диету"), "род согласован");
check(!card.includes("врач"), "приписки про врача нет — в здоровье только колени");

head("Оффер следом:");
const offer = sent()[1].body;
check(offer.text.includes("*Галина, по тесту твой старт — ⚡ Рывками.*"),
      "тип старта подставлен");
check(offer.text.includes("с щадящим вариантом под колени"),
      "щадящий вариант обещан — человек отметил колени");
check(offer.text.includes("1 890 ₽"), "цена на месте");
const btn = offer.reply_markup.inline_keyboard[0][0];
// Кнопка с callback, а не ссылкой: по url-кнопке Telegram боту ничего
// не сообщает, и заявка потерялась бы вместе со всей ручной продажей.
check(btn.callback_data === "contact", "кнопка даёт боту событие, а не уводит молча");
check(!!row("SELECT 1 a FROM events WHERE event='offer_shown'"), "событие offer_shown");

/* ── 7. здоровье: сердце и диабет ─────────────────────────────────────── */
head("Человек с сердцем и диабетом:");
const from2 = { id: 888, first_name: "Пётр" };
const chat2 = { id: 888 };
const p2 = { ...payload, n: "Пётр", g: "m", hl: ["heart", "diab"], t: "never" };
await send({ message: { from: from2, chat: chat2, text: "/start" } });
await send({ message: { from: from2, chat: chat2,
                        web_app_data: { data: JSON.stringify(p2) } } });
for (const a of ["встал в 6, лёг в 1", "утром, вечером", "ночью", "ничего"]) {
  await send({ message: { from: from2, chat: chat2, text: a } });
}
const card2 = sent()[0].body.text;
check(card2.includes("Тренер здесь второй, а первый — врач"),
      "приписка про врача дописана");
check(card2.includes("Ты отметил сердце и диабет"), "названо и то, и другое, в мужском роде");
check(card2.includes("не сел на диету"), "род согласован");
check(sent()[1].body.text.includes("🌱 Чистый лист"), "тип старта — чистый лист");
check(!sent()[1].body.text.includes("щадящим"),
      "щадящий вариант не обещан — про колени человек не говорил");

/* ── 8. неразборчивый ответ про сон ───────────────────────────────────── */
head("Время написано словами:");
const from3 = { id: 999, first_name: "Аня" };
const chat3 = { id: 999 };
const p3 = { ...payload, n: "Аня", g: "f", hl: ["none"] };
await send({ message: { from: from3, chat: chat3, text: "/start" } });
await send({ message: { from: from3, chat: chat3,
                        web_app_data: { data: JSON.stringify(p3) } } });
for (const a of ["встала рано, легла поздно", "утро", "вечер", "чай"]) {
  await send({ message: { from: from3, chat: chat3, text: a } });
}
const card3 = sent()[0].body.text;
check(card3.includes("встала рано, легла поздно"), "стоит фраза человека");
check(!card3.includes("ч сна"), "часы не выдуманы");

/* ── 9. заявка ────────────────────────────────────────────────────────── */
head("Догрев поставлен:");
const jobs = sqlite.prepare(
  "SELECT kind FROM jobs WHERE user_id=777 AND sent_at IS NULL ORDER BY due_at").all();
check(jobs.length === 6, `шесть касаний в очереди (нашлось ${jobs.length})`);
check(jobs[0].kind === "warm_4h" && jobs.at(-1).kind === "warm_30d",
      "порядок от четырёх часов до месяца");

head("Человек нажал «Написать Эдуарду»:");
calls = [];
await send({ callback_query: { id: "9", from, message: { chat }, data: "contact" } });
const order = row("SELECT * FROM orders WHERE user_id=777");
check(order?.status === "awaiting", "заявка заведена");
check(!!row("SELECT 1 a FROM events WHERE event='contact_clicked'"), "событие записано");
check(sqlite.prepare(
  "SELECT count(*) c FROM jobs WHERE user_id=777 AND kind LIKE 'warm_%' AND sent_at IS NULL")
  .get().c === 0, "догрев погашен — дальше разговор в личке");
const admin = sent().find((c) => c.body.chat_id === "1");
check(!!admin, "карточка ушла Эдуарду");
check(admin.body.text.includes("Галина"), "имя из теста");
check(admin.body.text.includes("Окна: 7:00 утра и 20:30 вечером"), "окна в карточке");
check(admin.body.reply_markup.inline_keyboard[0].length === 2, "две кнопки решения");
const toUser = sent().find((c) => c.body.chat_id === 777);
check(toUser.body.reply_markup.inline_keyboard[0][0].url.includes("Mr_Serbolin"),
      "человеку отдана ссылка в личку");
check(!!row("SELECT 1 a FROM jobs WHERE kind='admin_ping' AND sent_at IS NULL"),
      "напоминание через два часа поставлено");

head("Нажал второй раз:");
calls = [];
await send({ callback_query: { id: "10", from, message: { chat }, data: "contact" } });
check(!sent().some((c) => c.body.chat_id === "1"), "Эдуарда второй раз не будим");
check(sqlite.prepare("SELECT count(*) c FROM jobs WHERE kind='admin_ping'").get().c === 1,
      "второго напоминания не завели");

head("Чужой нажал кнопку Эдуарда:");
calls = [];
await send({ callback_query: { id: "11", from, message: { chat },
                               data: "grant:777" } });
check(calls[0].body.text === "Это не твоя кнопка.", "отбито");
check(row("SELECT status FROM orders WHERE user_id=777").status === "awaiting",
      "статус не изменился");

head("Эдуард включил курс:");
calls = [];
const adminFrom = { id: 1, first_name: "Эдуард" };
await send({ callback_query: { id: "12", from: adminFrom,
                               message: { chat: { id: 1 }, message_id: 5 },
                               data: "grant:777" } });
check(row("SELECT status FROM orders WHERE user_id=777").status === "paid",
      "заявка закрыта как оплаченная");
check(!!row("SELECT 1 a FROM events WHERE event='course_granted'"), "событие записано");
check(!row("SELECT 1 a FROM jobs WHERE kind='admin_ping' AND sent_at IS NULL"),
      "напоминание снято");

head("/waiting:");
calls = [];
await send({ message: { from: adminFrom, chat: { id: 1 }, text: "/waiting" } });
check(lastText().startsWith("Никто не ждёт"), "список пуст — заявку закрыли");

/* ── 10. крон ─────────────────────────────────────────────────────────── */
head("Крон и догрев:");
// Аня заявку не оставляла — ей догрев положен.
sqlite.prepare("UPDATE jobs SET due_at='2000-01-01T00:00:00.000Z' WHERE user_id=999").run();
calls = [];
await runDue(env);
const warm = sent().filter((c) => c.body.chat_id === 999);
check(warm.length >= 1, "касания ушли");
check(warm[0].body.text.startsWith("Аня, карточка со стартовой точкой"),
      "первое — через четыре часа после теста");
const tail = warm.find((c) => c.body.text.startsWith("Аня, две недели назад"));
check(!!tail, "хвост на четырнадцатый день дошёл");
check(tail.body.reply_markup.inline_keyboard[0].some((b) => b.callback_data === "unsub"),
      "в хвосте есть кнопка отписки");
const byWindows = warm.find((c) => c.body.text.includes("Ты знаешь свою зону риска"));
check(!!byWindows && byWindows.body.text.includes("Знаешь свои окна: утро"),
      "окна не разобрались на два — подставлена фраза человека целиком");

head("Тест прошёл, «День 0» бросил:");
const from4 = { id: 555, first_name: "Олег" };
await send({ message: { from: from4, chat: { id: 555 }, text: "/start" } });
await send({ message: { from: from4, chat: { id: 555 },
  web_app_data: { data: JSON.stringify({ ...payload, n: "Олег", g: "m" }) } } });
sqlite.prepare("UPDATE jobs SET due_at='2000-01-01T00:00:00.000Z' WHERE user_id=555").run();
calls = [];
await runDue(env);
const olegTexts = sent().filter((c) => c.body.chat_id === 555).map((c) => c.body.text);
check(olegTexts.some((t) => t.startsWith("Олег, карточка")), "общие касания пришли");
check(!olegTexts.some((t) => t.includes("Знаешь свои окна")),
      "касание про окна пропущено: отвечать на «Дне 0» он не стал");
check(!olegTexts.some((t) => t.includes("с теми двумя окнами")),
      "и недельное тоже — без окон оно теряет смысл");

head("Отписка:");
calls = [];
await send({ callback_query: { id: "13", from: { id: 999 },
                               message: { chat: { id: 999 } }, data: "unsub" } });
check(row("SELECT unsub FROM users WHERE user_id=999").unsub === 1, "флаг поставлен");
check(lastText().startsWith("Понял, больше не пишу"), "ответ без обиды");

/* ── 11. битый payload ────────────────────────────────────────────────── */
head("Битый payload:");
await send({ message: { from, chat, web_app_data: { data: "{не json" } } });
check(!!row("SELECT 1 a FROM events WHERE event='quiz_broken'"), "записан как quiz_broken");

console.log(failed ? `\nПровалов: ${failed}` : "\nВсё чисто.");
process.exit(failed ? 1 : 0);
