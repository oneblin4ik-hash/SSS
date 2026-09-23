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
import { lessonText, sendLesson } from "./src/course.js";
import { daySlug, programSlug } from "./src/files.js";
import { preLaunch } from "./src/launch.js";

/* ── база: настоящий SQLite за фасадом D1 ─────────────────────────────── */
/* Пустая, как в проде сразу после создания. Таблицы поднимет сам бот
   через ensureSchema — если миграция чего-то не умеет, прогон встанет
   на первом же запросе, а не через неделю в бою. */
const sqlite = new DatabaseSync(":memory:");

const wrap = (sql) => ({
  args: [],
  bind(...a) { this.args = a.map((v) => (v === undefined ? null : v)); return this; },
  // Форма ответа как у настоящего D1: код смотрит в meta.changes.
  async run() {
    const r = sqlite.prepare(sql).run(...this.args);
    return { success: true, meta: { changes: Number(r.changes) } };
  },
  async first() { return sqlite.prepare(sql).get(...this.args) ?? null; },
  async all() { return { results: sqlite.prepare(sql).all(...this.args) }; },
});
const DB = {
  prepare: wrap,
  async batch(list) { for (const s of list) await s.run(); },
};

/* Миграция в коде и schema.sql — две копии одной схемы, и разъехаться
   они могут молча: добавил таблицу в файл, забыл в migrate.js, и в проде
   её нет. Сверяем списки сразу, до всех сценариев. */
function schemaDrift() {
  const declared = [...readFileSync("schema.sql", "utf8")
    .matchAll(/CREATE TABLE IF NOT EXISTS (\w+)/g)].map((m) => m[1]);
  const live = sqlite.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
    .all().map((r) => r.name);
  return declared.filter((t) => !live.includes(t));
}

/* ── Bot API: только запоминаем вызовы ────────────────────────────────── */
let calls = [];
let subscribed = false;
import { LESSONS, UPSELL } from "./src/lessons.js";
import { RAZBOR_SLUG, sendPdf } from "./src/files.js";
import { PDF_VER } from "./src/pdfver.js";
import { sendMessage } from "./src/telegram.js";

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
  if (method === "sendDocument") {
    return json({ ok: true, result: { document: { file_id: "FID_" + body.document } } });
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

/* ── 0. схема ─────────────────────────────────────────────────────────── */
head("Миграция поднимает базу с нуля:");
// Отдельным человеком, чтобы не занять источник у того, на ком дальше
// проверяется запись диплинка.
await send({ message: { from: { id: 1000, first_name: "Схема" },
                        chat: { id: 1000 }, text: "/start" } });
const firstCalls = calls.map((c) => c.method);
const drift = schemaDrift();
check(drift.length === 0,
      drift.length ? `в migrate.js нет таблиц: ${drift.join(", ")}`
                   : "все таблицы из schema.sql на месте");

head("Витрина бота выставляется сама:");
check(firstCalls.filter((m) => m === "setMyDescription").length === 2,
      "описание — и общее, и для русского языка");
check(firstCalls.includes("deleteMyCommands"),
      "старое меню конструктора (/command1) снято");
check(firstCalls.filter((m) => m === "setMyCommands").length === 3,
      "меню для всех, для русского и отдельное — владельцу");
check(!!row("SELECT 1 a FROM events WHERE event='bot_profile'"), "отметка, что выставлено");
await send({ message: { from: { id: 1002 }, chat: { id: 1002 }, text: "/start" } });
check(!calls.some((c) => c.method === "setMyDescription"),
      "второй раз не выставляется — один раз на версию");
const { DESCRIPTION, SHORT_DESCRIPTION } = await import("./src/botprofile.js");
check(DESCRIPTION.length <= 512 && SHORT_DESCRIPTION.length <= 120,
      `тексты в пределах Telegram (${DESCRIPTION.length}/512, ${SHORT_DESCRIPTION.length}/120)`);

/* ── 1. чужой запрос ──────────────────────────────────────────────────── */
head("Чужой запрос без секрета:");
const bad = await send(text("/start"), "wrong");
check(bad.status === 403, "отбит с кодом 403");
check(calls.length === 0, "в Bot API ничего не ушло");

/* ── 2. вход ─────────────────────────────────────────────────────────── */
head("/start, человек не подписан:");
subscribed = false;
await send(text("/start q_ig"));
check(row("SELECT source FROM users WHERE user_id=777")?.source === "q_ig",
      "источник q_ig записан");
const hello = sent()[0].body;
check(hello.reply_markup.keyboard?.[0]?.[0]?.web_app?.url === env.QUIZ_URL,
      "тест открыт сразу, без подписки");
check(!hello.reply_markup.inline_keyboard, "кнопок подписки на входе нет");
check(hello.text.includes("тип старта"), "концовка — про то, что даёт тест");
check(!hello.text.includes("сходишь с дистанции"),
      "старое обещание про срывы ушло: этих вопросов в тесте давно нет");

head("Повторный /start с другой меткой:");
await send(text("/start q_yt"));
check(row("SELECT source FROM users WHERE user_id=777")?.source === "q_ig",
      "источник не перетёрся, остался настоящий");

/* ── 3. гейт после теста ──────────────────────────────────────────────── */
const payload = {
  v: 2, n: "Галина", g: "f", a: 36, h: 165, w: 78, wg: 66,
  gl: "loss", zn: "belly", fn: 4, fg: 2, ex: "quit", ls: "m1",
  pl: "home", mn: "30", fq: "2", hl: ["knee"], t: "onoff",
  wk: 27, tr: 2, bmi: 28.7, cm: "weight",
};
head("Тест пройден, подписки нет:");
await send({ message: { from, chat, web_app_data: { data: JSON.stringify(payload) } } });
check(!!row("SELECT 1 a FROM quiz WHERE user_id=777"), "результат сохранён сразу");
check(!!row("SELECT 1 a FROM events WHERE event='sub_required'"), "событие sub_required");
const gate = sent().at(-1).body;
check(!!gate.reply_markup.inline_keyboard, "показаны кнопки подписки");
check(gate.text.includes("День 0") && gate.text.includes("подписчикам канала"),
      "объяснено, ради чего подписываться");
check(!sent().some((c) => c.body.text.startsWith("*День 0.")), "День 0 не начат");
check(row("SELECT state FROM users WHERE user_id=777")?.state == null,
      "человек не застрял в диалоге");

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
check(sent()[0].body.text.startsWith("*День 0."), "сразу пошёл День 0");
check(row("SELECT state FROM users WHERE user_id=777")?.state === "day0_1",
      "состояние — первый вопрос");

head("Второе нажатие не сбрасывает диалог:");
await send(text("встала в 7:30, легла в 23:00"));
await send(cb("sub_check"));
check(row("SELECT state FROM users WHERE user_id=777")?.state === "day0_2",
      "остались на втором вопросе, а не вернулись к первому");
check(!sent().some((c) => c.body.text.startsWith("*День 0.")),
      "вступление второй раз не пришло");

head("Подписан заранее — гейта нет вовсе:");
await send({ message: { from: { id: 1001, first_name: "Олег" }, chat: { id: 1001 },
                        web_app_data: { data: JSON.stringify({ ...payload, g: "m" }) } } });
check(sent()[0].body.text.startsWith("*День 0."), "сразу День 0");
check(!sent().some((c) => c.body.reply_markup?.inline_keyboard?.[1]?.[0]?.callback_data === "sub_check"),
      "экрана подписки не было");

/* ── 4. результат теста → «День 0» ────────────────────────────────────── */
head("Результат теста пришёл (перепрошёл, уже подписан):");
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
const offerPdf = calls.find((c) => c.method === "sendDocument");
check(!!offerPdf && /\/offer\.pdf(\?v=|$)/.test(String(offerPdf.body.document)),
      "следом ушли три слайда файлом — его пересылают и показывают мужу");

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

/* ── 11. выдача курса ─────────────────────────────────────────────────── */
head("Эдуард включил курс — что приходит человеку:");
const from5 = { id: 444, username: "zhanna", first_name: "Жанна" };
const chat5 = { id: 444 };
// Женщина, похудение, дома — самый частый случай в воронке.
const p5 = { ...payload, n: "Жанна", g: "f", gl: "loss", pl: "home", hl: ["none"] };
await send({ message: { from: from5, chat: chat5, text: "/start" } });
await send({ message: { from: from5, chat: chat5,
  web_app_data: { data: JSON.stringify(p5) } } });
for (const a of ["7:00 и 23:00", "утро и вечер", "вечером", "суп"]) {
  await send({ message: { from: from5, chat: chat5, text: a } });
}
await send({ callback_query: { id: "20", from: from5, message: { chat: chat5 },
                               data: "contact" } });
calls = [];
await send({ callback_query: { id: "21", from: adminFrom,
  message: { chat: { id: 1 }, message_id: 7 }, data: "grant:444" } });
const tzAsk = sent().find((c) => c.body.chat_id === 444);
check(!!tzAsk && tzAsk.body.text.includes("сколько сейчас на твоих часах"),
      "человека спросили про время, а не про часовой пояс");
check(tzAsk.body.reply_markup.inline_keyboard.flat().length === 11,
      "одиннадцать вариантов часов, от UTC+2 до +12");

head("Человек выбрал своё время:");
calls = [];
await send({ callback_query: { id: "22", from: from5, message: { chat: chat5 },
                               data: "tz:3" } });
check(row("SELECT tz FROM users WHERE user_id=444")?.tz === "3", "пояс записан");
const jobs5 = sqlite.prepare(
  "SELECT kind FROM jobs WHERE user_id=444 AND sent_at IS NULL").all()
  .map((r) => r.kind);
check(jobs5.filter((k) => k.startsWith("lesson_")).length === 14, "14 уроков в очереди");
check(jobs5.filter((k) => k.startsWith("checkin_")).length === 14, "14 чек-инов");
check(jobs5.filter((k) => k.startsWith("upsell_")).length === 3, "три касания допродажи");
const docs = calls.filter((c) => c.method === "sendDocument");
check(docs.length === 3, `сразу пришли три файла (пришло ${docs.length})`);
check(docs.some((d) => String(d.body.document).includes("kurs-00-pered-startom")),
      "среди них «Перед стартом» — оплата не заканчивается обещанием подождать");

head("Первый урок по расписанию:");
sqlite.prepare("UPDATE jobs SET due_at='2000-01-01T00:00:00.000Z' " +
               "WHERE user_id=444 AND kind='lesson_1'").run();
calls = [];
await runDue(env);
const lesson = sent().find((c) => c.body.chat_id === 444);
check(lesson.body.text.startsWith("*День 1. Аудит режима*"), "заголовок дня");
check(lesson.body.text.includes("*Задание:*"), "задание на месте");
check(lesson.body.reply_markup.inline_keyboard[0][0].url.includes("MoyaNormaBot"),
      "кнопка калькулятора КБЖУ");
const pdf1 = calls.find((c) => c.method === "sendDocument");
check(String(pdf1.body.document) ===
      "https://serbolin-kviz.pages.dev/kurs/kurs-01-audit-rezhima.pdf" +
      `?v=${PDF_VER["kurs-01-audit-rezhima"]}`,
      "страница дня ушла ссылкой, с отпечатком версии");
check(row("SELECT file_id FROM files WHERE slug='kurs-01-audit-rezhima'") !== null,
      "file_id закэширован — второй раз файл по сети не пойдёт");

head("Развилки в текстах:");
// День 6 расходится по цели, день 4 — по полу и месту, день 7 — по полу.
const six = lessonText(6, p5);
check(six.includes("за день выходит дефицит"), "худеющей ушёл абзац про дефицит");
check(!six.includes("за день выходит плюс"), "абзац про набор не ушёл");
const sixGain = lessonText(6, { ...p5, gl: "mass" });
check(sixGain.includes("за день выходит плюс"), "на наборе всё наоборот");
check(!sixGain.includes("за день выходит дефицит"), "и дефицита нет");
const four = lessonText(4, p5);
check(four.includes("Дома, без оборудования"), "дома — домашний абзац");
check(!four.includes("Если идёшь туда впервые"), "зала в нём нет");
check(lessonText(7, p5).includes("Вес гуляет по циклу"), "женщине — абзац про цикл");
check(!lessonText(7, { ...p5, g: "m" }).includes("Вес гуляет по циклу"),
      "мужчине он не нужен");

head("Варианты PDF:");
check(daySlug(6, "kurs-06-golodat-ne-nuzhno", p5) === "kurs-06-golodat-ne-nuzhno",
      "похудение — базовая страница");
check(daySlug(6, "kurs-06-golodat-ne-nuzhno", { ...p5, gl: "mass" })
      === "kurs-06-golodat-ne-nuzhno-nabor", "набор — своя");
check(daySlug(4, "kurs-04-pervaya-trenirovka", p5)
      === "kurs-04-pervaya-trenirovka-zh-dom", "женщина дома");
check(daySlug(4, "kurs-04-pervaya-trenirovka", { ...p5, g: "m", pl: "gym" })
      === "kurs-04-pervaya-trenirovka-m-zal", "мужчина в зале");
check(programSlug(p5) === "kurs-15-programma-dom-pohudenie-zh", "программа под неё");
check(programSlug({ ...p5, pl: "any" }) === "kurs-15-programma-dom-pohudenie-zh",
      "«ещё не решил» уходит в домашнюю");

head("Вечерний чек-ин:");
sqlite.prepare("UPDATE jobs SET due_at='2000-01-01T00:00:00.000Z' " +
               "WHERE user_id=444 AND kind='checkin_1'").run();
// Урок ушёл только что — спрашивать «сделал?» ещё не о чем.
calls = [];
await runDue(env);
check(!sent().some((c) => c.body.text.startsWith("День 1. Задание сделано?")),
      "через минуту после урока не спрашиваем");
check(!!row("SELECT 1 a FROM jobs WHERE user_id=444 AND kind='checkin_1' " +
            "AND sent_at IS NOT NULL"), "джоб при этом закрыт, второй раз не придёт");

// А теперь по-настоящему: урок прочитан утром, чек-ин вечером.
sqlite.prepare("UPDATE progress SET sent_at='2000-01-01T00:00:00.000Z' " +
               "WHERE user_id=444 AND day=1").run();
sqlite.prepare("UPDATE jobs SET sent_at=NULL, due_at='2000-01-01T00:00:00.000Z' " +
               "WHERE user_id=444 AND kind='checkin_1'").run();
calls = [];
await runDue(env);
const ask = sent().find((c) => c.body.text.startsWith("День 1. Задание сделано?"));
check(!!ask, "вечером спросили");
calls = [];
await send({ callback_query: { id: "23", from: from5, message: { chat: chat5, message_id: 9 },
                               data: "ci:1:done" } });
check(row("SELECT checkin FROM progress WHERE user_id=444 AND day=1")?.checkin === "done",
      "ответ записан");
check(lastText() === "Отметил. 1 день подряд. Так и держим.", "стрик и склонение");

head("«Не вышло» — тон без упрёка:");
calls = [];
await send({ callback_query: { id: "24", from: from5, message: { chat: chat5, message_id: 9 },
                               data: "ci:2:failed" } });
check(lastText().startsWith("Бывает."), "без морали");
check(lastText().includes("Один пропущенный день ничего не решает"),
      "совпадает с уроком двенадцатого дня");

head("Четырнадцатый день закрывает курс:");
sqlite.prepare("UPDATE progress SET sent_at='x' WHERE user_id=444").run();
calls = [];
await sendLesson(env, 444, 14);
const texts14 = sent().map((c) => c.body.text);
check(texts14.some((t) => t.includes("Курс пройден")), "экран «Курс пройден»");
check(texts14.some((t) => t.includes("Жанна, 14 дней из 14")), "имя подставлено");
const docs14 = calls.filter((c) => c.method === "sendDocument")
  .map((c) => String(c.body.document));
check(docs14.some((d) => d.includes("kurs-15-programma-dom-pohudenie-zh")),
      "программа тренировок ушла");
check(docs14.some((d) => d.includes("kurs-16-razbor")), "страница разбора ушла");
check(!!row("SELECT 1 a FROM events WHERE event='course_finished'"), "событие записано");

head("Допродажа ведения:");
sqlite.prepare("UPDATE jobs SET due_at='2000-01-01T00:00:00.000Z' " +
               "WHERE user_id=444 AND kind LIKE 'upsell_%'").run();
calls = [];
await runDue(env);
const ups = sent().filter((c) => c.body.chat_id === 444).map((c) => c.body.text);
check(ups.length === 3, "три касания");
check(ups.some((t) => t.startsWith("Первый день без урока")), "день 15");
check(ups.some((t) => t.startsWith("Жанна, разбор всё ещё за тобой")), "день 18, с именем");
check(ups.some((t) => t.startsWith("Не буду напоминать больше")), "день 25 — последний");

head("Оплатил, но курс не запустился:");
// Ровно случай Жанны: кнопку «Включить курс» нажали, когда выдачи
// ещё не было. Человек заплатил и не получил ничего.
sqlite.prepare("INSERT INTO users (user_id, name, created_at) VALUES (333,'Жанна','x')").run();
sqlite.prepare("INSERT INTO quiz (user_id, payload, quiz_at) VALUES (333, ?, 'x')")
  .run(JSON.stringify({ ...payload, n: "Жанна", g: "f" }));
sqlite.prepare("INSERT INTO orders (user_id, code, status, at) VALUES (333,'6A97','paid','x')").run();
calls = [];
await runDue(env);
const rescue = sent().find((c) => c.body.chat_id === 333);
check(!!rescue && rescue.body.text.includes("сколько сейчас на твоих часах"),
      "подобрали и спросили время");
check(sent().some((c) => c.body.chat_id === "1" && c.body.text.includes("был оплачен")),
      "Эдуарду сказали, что так вышло");

head("Второй раз не дёргаем:");
calls = [];
await runDue(env);
check(!sent().some((c) => c.body.chat_id === 333), "человека повторно не беспокоим");

/* ── 12. предзапуск ───────────────────────────────────────────────────── */
head("Продажа закрыта, идёт первый поток:");
// Дата открытия в будущем — бот не продаёт.
const future = new Date(Date.now() + 10 * 24 * 3600e3);
const pre = { ...env, LAUNCH_AT: future.toISOString() };
const from6 = { id: 222, first_name: "Ольга" };
const chat6 = { id: 222 };
const p6 = { ...payload, n: "Ольга", g: "f", hl: ["none"] };

async function sendPre(update) {
  calls = []; waited.length = 0;
  const res = await worker.fetch(new Request("https://bot/", {
    method: "POST",
    headers: { "x-telegram-bot-api-secret-token": "s3cret" },
    body: JSON.stringify(update),
  }), pre, ctx);
  await Promise.all(waited);
  return res;
}

await sendPre({ message: { from: from6, chat: chat6, text: "/start" } });
await sendPre({ message: { from: from6, chat: chat6,
  web_app_data: { data: JSON.stringify(p6) } } });
for (const a of ["7:00 и 23:00", "утро и вечер", "вечером", "суп"]) {
  await sendPre({ message: { from: from6, chat: chat6, text: a } });
}
const pitch = sent().find((c) => c.body.text.includes("Первые шаги к форме"));
check(!!pitch, "предложение пришло");
check(!pitch.body.text.includes("1 890"), "цены в нём НЕТ");
check(pitch.body.text.includes("Курс откроется"), "вместо цены — дата");
check(calls.some((c) => c.method === "sendDocument" &&
                        String(c.body.document).includes("offer-pre")),
      "и файл следом тоже без цены, предзапускный");
check(!calls.some((c) => c.method === "sendDocument" &&
                         /\/offer\.pdf/.test(String(c.body.document))),
      "обычный оффер с ценой в это время не уходит");
await sendPre({ message: { from: from6, chat: chat6,
  web_app_data: { data: JSON.stringify(p6) } } });
check(sqlite.prepare("SELECT COUNT(*) c FROM jobs WHERE user_id=222 AND kind='launch' " +
                     "AND sent_at IS NULL").get().c === 1,
      "прошла тест второй раз — оффер в день открытия всё равно один");
check(pitch.body.text.includes("Ты уже в списке"), "человек знает, что его не забудут");
check(pitch.body.text.includes("библиотека из 9 блюд"),
      "ценность видна целиком — скрыта одна строка");
check(pitch.body.reply_markup.inline_keyboard[0][0].callback_data === "contact",
      "кнопка написать осталась: кто готов сейчас — напишет");
check(!!row("SELECT 1 a FROM events WHERE event='prelaunch_shown'"), "событие записано");

head("Догрев не ставится, ставится один джоб:");
const j6 = sqlite.prepare(
  "SELECT kind FROM jobs WHERE user_id=222 AND sent_at IS NULL").all()
  .map((r) => r.kind);
check(!j6.some((k) => k.startsWith("warm_")), "касаний догрева нет");
check(j6.filter((k) => k === "launch").length === 1, "ровно один джоб на открытие");
check(sqlite.prepare("SELECT due_at FROM jobs WHERE user_id=222 AND kind='launch'")
  .get().due_at === future.toISOString(), "и он стоит на дату открытия");

head("Наступил день открытия:");
sqlite.prepare("UPDATE jobs SET due_at='2000-01-01T00:00:00.000Z' " +
               "WHERE user_id=222 AND kind='launch'").run();
calls = [];
await runDue(env);
const open = sent().find((c) => c.body.chat_id === 222);
check(!!open && open.body.text.startsWith("Открыл."), "оффер пришёл");
check(open.body.text.includes("1 890 ₽"), "теперь с ценой");
check(calls.some((c) => c.method === "sendDocument"), "и файлом следом");
check(!!row("SELECT 1 a FROM events WHERE event='launch_offer'"), "событие записано");
const after = sqlite.prepare(
  "SELECT kind FROM jobs WHERE user_id=222 AND sent_at IS NULL").all()
  .map((r) => r.kind);
check(after.filter((k) => k.startsWith("warm_")).length === 6,
      "догрев начался от момента открытия, а не двумя неделями раньше");

head("Кто уже написал — второй раз не трогаем:");
sqlite.prepare("INSERT INTO orders (user_id, code, status, at) " +
               "VALUES (111,'ZZZZ','awaiting','x')").run();
sqlite.prepare("INSERT INTO users (user_id, created_at) VALUES (111,'x')").run();
sqlite.prepare("INSERT INTO quiz (user_id, payload, quiz_at) VALUES (111, ?, 'x')")
  .run(JSON.stringify(p6));
sqlite.prepare("INSERT INTO jobs (user_id, kind, due_at) " +
               "VALUES (111,'launch','2000-01-01T00:00:00.000Z')").run();
calls = [];
await runDue(env);
check(!sent().some((c) => c.body.chat_id === 111),
      "человеку с заявкой оффер не дублируется");

head("Дата не заполнена — бот продаёт как обычно:");
check(!preLaunch({ LAUNCH_AT: "" }), "пустое значение — продаём");
check(!preLaunch({ LAUNCH_AT: "когда-нибудь" }), "кривое значение — продаём");
check(!preLaunch({ LAUNCH_AT: "2020-01-01T00:00:00Z" }), "прошедшая дата — продаём");
check(preLaunch({ LAUNCH_AT: future.toISOString() }), "будущая — предзапуск");

/* ── 13. битый payload ────────────────────────────────────────────────── */
head("Битый payload:");
await send({ message: { from, chat, web_app_data: { data: "{не json" } } });
check(!!row("SELECT 1 a FROM events WHERE event='quiz_broken'"), "записан как quiz_broken");

/* ── 13a. чужой текст с разметкой ─────────────────────────────────────── */
head("Имя и юзернейм со звёздочками и подчёркиванием:");
// @ivan_petrov — обычный юзернейм, и в нём нечётное подчёркивание.
// Раньше такая карточка заявки не приходила вообще: Telegram отвечал
// ошибкой разбора и НЕ отправлял сообщение.
const from7 = { id: 1234, username: "ivan_petrov", first_name: "Ва_ся" };
const chat7 = { id: 1234 };
const p7 = { ...payload, n: "Ан*на_", g: "f" };

const marks = (t, ch) => (t.split(ch).length - 1) % 2 === 0;
const wellFormed = (c) =>
  !c.body.parse_mode ||
  (marks(c.body.text, "*") && marks(c.body.text, "_") && marks(c.body.text, "`"));

let markup = [];
const sendMark = async (u) => { await send(u); markup.push(...sent()); };

await sendMark({ message: { from: from7, chat: chat7, text: "/start" } });
await sendMark({ message: { from: from7, chat: chat7,
                            web_app_data: { data: JSON.stringify(p7) } } });
for (const a of ["7:00 и 23_00", "утро и *вечер*", "вечером_", "суп [овощной]"]) {
  await sendMark({ message: { from: from7, chat: chat7, text: a } });
}
await sendMark({ callback_query: { id: "77", from: from7,
                                   message: { chat: chat7, message_id: 9 },
                                   data: "contact" } });

check(JSON.parse(row("SELECT payload FROM quiz WHERE user_id=1234").payload).n === "Анна",
      "маркеры из имени убраны на входе");
check(row("SELECT hunger_time FROM day0 WHERE user_id=1234").hunger_time === "вечером",
      "и из ответа своими словами тоже");
check(markup.every(wellFormed),
      "ни одного сообщения с разметкой вразнос");

const startCard = markup.find((c) => c.body.text.startsWith("*Анна,"));
check(!!startCard, "карточка стартовой точки собралась с жирным именем");

const orderCard = markup.find((c) => c.body.text.startsWith("🔔 Заявка"));
check(!!orderCard, "карточка заявки ушла Эдуарду");
check(orderCard.body.text.includes("@ivan_petrov"), "юзернейм в ней целый");
check(!orderCard.body.parse_mode, "и отправлена без разметки — ломаться нечему");

head("Если разметка всё же разъехалась — сообщение не теряем:");
calls = [];
await sendMessage("TEST", 42, "сломан*ная разметка", { parse_mode: "Markdown" });
check(!sent()[0].body.parse_mode, "parse_mode снят, текст ушёл как есть");
calls = [];
await sendMessage("TEST", 42, "*целая* разметка", { parse_mode: "Markdown" });
check(sent()[0].body.parse_mode === "Markdown", "целую разметку не трогаем");

/* ── 13ter. очередь без крона ─────────────────────────────────────────── */
head("Очередь двигается и без крона:");
sqlite.prepare("UPDATE jobs SET sent_at='x' WHERE sent_at IS NULL").run();
sqlite.prepare("INSERT INTO jobs (user_id, kind, due_at) " +
               "VALUES (777,'upsell_15','2000-01-01T00:00:00.000Z')").run();
// Обычное сообщение боту от постороннего — очередь всё равно шевельнулась.
await send(text("привет"));
check(!row("SELECT 1 a FROM jobs WHERE kind='upsell_15' AND sent_at IS NULL"),
      "джоб ушёл на попутном обращении к боту");

head("/tick — протолкнуть руками:");
sqlite.prepare("INSERT INTO jobs (user_id, kind, due_at) " +
               "VALUES (777,'upsell_18','2000-01-01T00:00:00.000Z')").run();
calls = [];
await send({ message: { from: adminFrom, chat: { id: 1 }, text: "/tick" } });
check(lastText().startsWith("Отправлено: 1"), "отчитался, сколько ушло");
await send({ message: { from: adminFrom, chat: { id: 1 }, text: "/tick" } });
check(lastText() === "Отправлять нечего.", "второй раз отправлять нечего");
calls = [];
await send({ message: { from, chat, text: "/tick" } });
check(!sent().some((c) => String(c.body.text).startsWith("Отправ")),
      "постороннему команда не отвечает");

head("Два прохода разом не шлют одно и то же дважды:");
sqlite.prepare("INSERT INTO jobs (user_id, kind, due_at) " +
               "VALUES (777,'upsell_25','2000-01-01T00:00:00.000Z')").run();
calls = [];
await Promise.all([runDue(env), runDue(env)]);
check(sent().filter((c) => String(c.body.text).includes("Не буду напоминать")).length === 1,
      "касание ушло ровно один раз");

/* ── 13bis. след крона ────────────────────────────────────────────────── */
head("Крон оставляет след:");
await worker.scheduled({}, env, ctx);
await Promise.all(waited);
check(!!row("SELECT 1 a FROM events WHERE user_id=0 AND event='cron'"),
      "запись о срабатывании есть — видно, что крон живой");

/* ── 13d. пересобранный PDF доезжает до людей ───────────────────────── */
head("Пересобранный файл уходит заново, а не из памяти Telegram:");
sqlite.prepare("DELETE FROM files WHERE slug LIKE 'offer@%'").run();   // холодный кэш
calls = [];
await sendPdf(env, 42, "offer");
check(calls.at(-1).body.document.startsWith("https://"), "первый раз — по ссылке");
calls = [];
await sendPdf(env, 42, "offer");
check(calls.at(-1).body.document.startsWith("FID_"), "второй — из кэша, по file_id");

// Файл пересобрали: отпечаток другой.
const oldVer = PDF_VER.offer;
PDF_VER.offer = "0000000000";
calls = [];
await sendPdf(env, 42, "offer");
check(calls.at(-1).body.document.includes("?v=0000000000"),
      "после пересборки — снова по ссылке, с новым отпечатком");
PDF_VER.offer = oldVer;

/* ── 13c. страница дня не ушла ────────────────────────────────────────── */
head("Telegram не забрал файл страницы:");
sqlite.prepare("INSERT INTO users (user_id, tz, created_at) VALUES (4242, 3, 'x')").run();
sqlite.prepare("INSERT INTO quiz (user_id, payload, quiz_at) VALUES (4242, ?, 'x')")
  .run(JSON.stringify({ ...payload, n: "Пётр", g: "m" }));

const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  const method = String(url).split("/").pop();
  if (method === "sendDocument") {
    calls.push({ method, body: JSON.parse(init.body) });
    return { json: async () => ({ ok: false, description: "wrong file identifier" }),
             status: 400 };
  }
  return realFetch(url, init);
};
calls = [];
await sendLesson(env, 4242, 3);
globalThis.fetch = realFetch;

check(sent().some((c) => c.body.chat_id === 4242), "урок человеку всё равно ушёл");
check(!!row("SELECT 1 a FROM progress WHERE user_id=4242 AND day=3"),
      "прогресс записан — значит вечерний чек-ин придёт");
check(!!row("SELECT 1 a FROM events WHERE user_id=4242 AND event='day_3_pdf_failed'"),
      "осечка записана в ленту событий");
check(sent().some((c) => String(c.body.chat_id) === "1" &&
                         c.body.text.includes("не ушла")),
      "Эдуарду сказано, что файл надо дослать руками");

/* ── 13b. бюджет крона ────────────────────────────────────────────────── */
head("Крон считает запросы, а не строки:");
// Всё, что накопилось выше, закрываем — считаем с чистого листа.
sqlite.prepare("UPDATE jobs SET sent_at='x' WHERE sent_at IS NULL").run();
for (let i = 0; i < 25; i++) {
  sqlite.prepare("INSERT INTO jobs (user_id, kind, due_at) " +
                 "VALUES (?, 'lesson_2', '2000-01-01T00:00:00.000Z')").run(20000 + i);
}
const waiting = () => sqlite.prepare(
  "SELECT COUNT(*) c FROM jobs WHERE sent_at IS NULL AND kind='lesson_2'").get().c;

calls = [];
const first = await runDue(env);
check(first === 20,
      `за раз ушло 20 уроков — это 40 запросов из 40, а не 25 строк (ушло ${first})`);
check(waiting() === 5, "остальные ждут следующего крона, а не помечены отправленными");
await runDue(env);
check(waiting() === 0, "следующий крон их забрал");

/* ── 14. прогон всего пути ────────────────────────────────────────────── */
head("Прогон курса в личку владельцу:");
const probegFrom = { id: 1, username: "serbolin", first_name: "Эдуард" };
const probeg = (arg) =>
  send({ message: { from: probegFrom, chat: { id: 1 },
                    text: arg ? `/probeg ${arg}` : "/probeg" } });

await send(text("/probeg"));
check(sent().length === 0, "постороннему команда не отвечает ничем");

await probeg("0");
check(lastText().startsWith("Прогон сброшен"), "/probeg 0 обнуляет позицию");

// Семь кусков плюс восьмое обращение — то, что приходит после конца.
const runAll = [];
let worst = 0;
for (let n = 0; n < 8; n++) {
  await probeg();
  worst = Math.max(worst, calls.length);
  runAll.push(...calls);
}
const runText = runAll.filter((c) => c.method === "sendMessage")
                      .map((c) => c.body.text);
const runDocs = runAll.filter((c) => c.method === "sendDocument")
                      .map((c) => String(c.body.document));
const anyHas = (list, s) => list.some((t) => t.includes(s));

check(worst <= 45, `в одно обращение не больше 45 запросов (худший кусок: ${worst})`);

head("Пришло всё, что приходит покупателю:");
check(anyHas(runText, "ты в деле"), "минута оплаты");
for (const slug of ["kurs-00-oblozhka", "kurs-00-oglavlenie", "kurs-00-pered-startom"]) {
  check(anyHas(runDocs, slug), `файл ${slug}`);
}
let daysOk = 0, pagesOk = 0, checkinsOk = 0;
for (let d = 1; d <= 14; d++) {
  if (anyHas(runText, `День ${d} · 8:00`)) daysOk++;
  if (anyHas(runDocs, LESSONS[d].slug)) pagesOk++;
  if (anyHas(runText, `День ${d}. Задание сделано?`)) checkinsOk++;
}
check(daysOk === 14, "все четырнадцать уроков");
check(pagesOk === 14, "все четырнадцать страниц дня");
check(checkinsOk === 14, "все четырнадцать вечерних чек-инов");
check(runText.filter((t) => t.includes("Курс пройден")).length === 1,
      "финал приходит один раз, а не дважды — внутри урока и после него");
check(!runText.some((t) => t.includes("###")), "решёток заголовков в тексте нет");
check(anyHas(runDocs, "kurs-15-programma-dom-pohudenie-m"), "программа под ответы теста");
check(anyHas(runDocs, RAZBOR_SLUG), "страница разбора");
for (const d of [15, 18, 25]) {
  check(anyHas(runText, UPSELL[d].slice(0, 30).replace("{{name}}, ", "")),
        `допродажа дня ${d}`);
}

head("Развилки собрались под мужчину, похудение, дом:");
check(anyHas(runDocs, "kurs-04-pervaya-trenirovka-m-dom"), "тренировка — мужская, домашняя");
check(!anyHas(runDocs, "kurs-03-voda-nabor"), "питание — не набор массы");
check(!runText.some((t) => t.includes("{{name}}")), "имя подставлено везде");
check(!runText.some((t) => t.includes("**")), "звёздочек Markdown-2 нет");

head("Конец прогона:");
check(anyHas(runText, "Это был весь путь"), "восьмое обращение говорит, что всё");
check(row("SELECT state FROM users WHERE user_id=1").state === null,
      "позиция сброшена — следующий /probeg начнёт сначала");
await probeg();
check(sent()[0].body.text.includes("Включить курс"), "и правда начал сначала");
await probeg("0");

console.log(failed ? `\nПровалов: ${failed}` : "\nВсё чисто.");
process.exit(failed ? 1 : 0);
