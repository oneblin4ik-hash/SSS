/* Прогон трёх сценариев без Telegram и без Cloudflare.
 *
 * Развернуть воркер отсюда нельзя, а сдавать код, который ни разу
 * не запускали, нельзя тем более. Поэтому подменяем fetch и D1 заглушками
 * и смотрим, что бот действительно делает: какие методы Bot API дёргает,
 * с какими клавиатурами и что кладёт в базу.
 *
 *   node test_bot.mjs
 */
import worker from "./src/index.js";

const calls = [];   // что ушло в Bot API
const rows = [];    // что легло в базу

/* --- заглушка Bot API ------------------------------------------------- */
let subscribed = false;
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
const json = (o) => ({ json: async () => o, status: 200 });

/* --- заглушка D1 ------------------------------------------------------ */
const stmt = (sql) => ({
  sql,
  bind(...args) { this.args = args; return this; },
  async run() { rows.push({ sql: sql.trim().split("\n")[0], args: this.args }); },
});
const DB = { prepare: stmt, async batch(list) { for (const s of list) await s.run(); } };

const env = {
  DB,
  BOT_TOKEN: "TEST",
  WEBHOOK_SECRET: "s3cret",
  CHANNEL: "@Serbolin",
  CHANNEL_URL: "https://t.me/Serbolin",
  QUIZ_URL: "https://serbolin-kviz.pages.dev/",
};

const waited = [];
const ctx = { waitUntil: (p) => waited.push(p) };

async function send(update, secret = "s3cret") {
  calls.length = 0; rows.length = 0; waited.length = 0;
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

const from = { id: 777, username: "edik", first_name: "Пётр" };
const chat = { id: 777 };
let failed = 0;
const check = (ok, what) => {
  console.log(`${ok ? "  ok " : "  ПРОВАЛ "} ${what}`);
  if (!ok) failed++;
};

/* --- 1. чужой запрос без секрета -------------------------------------- */
console.log("\nЧужой запрос без секрета:");
const bad = await send({ message: { from, chat, text: "/start" } }, "wrong");
check(bad.status === 403, "отбит с кодом 403");
check(calls.length === 0, "в Bot API ничего не ушло");

/* --- 2. /start без подписки ------------------------------------------- */
console.log("\n/start, человек не подписан:");
subscribed = false;
await send({ message: { from, chat, text: "/start q_ig" } });
const gate = calls.find((c) => c.method === "sendMessage");
check(rows.some((r) => r.args?.includes("q_ig")), "источник q_ig записан");
check(rows.some((r) => r.args?.includes("sub_required")), "событие sub_required");
check(!!gate.body.reply_markup.inline_keyboard, "показаны кнопки подписки");
check(!gate.body.reply_markup.keyboard, "кнопки теста нет");
check(gate.body.text.includes("Тест живёт в моём канале"), "концовка про канал");

/* --- 3. «Я подписался», а подписки нет -------------------------------- */
console.log("\n«Я подписался» без подписки:");
await send({ callback_query: { id: "1", from, message: { chat }, data: "sub_check" } });
const alert = calls.find((c) => c.method === "answerCallbackQuery");
check(alert.body.show_alert === true, "ответ всплывашкой, чат не засорён");
check(alert.body.text.startsWith("Пока не вижу"), "текст без упрёка");
check(!calls.some((c) => c.method === "sendMessage"), "лишних сообщений нет");

/* --- 4. подписался и нажал заново ------------------------------------- */
console.log("\n«Я подписался», подписка есть:");
subscribed = true;
await send({ callback_query: { id: "2", from, message: { chat }, data: "sub_check" } });
const opened = calls.find((c) => c.method === "sendMessage");
check(rows.some((r) => r.args?.includes("sub_ok")), "событие sub_ok");
check(opened.body.text === "Вижу. Погнали: 14 вопросов, две с половиной минуты.",
      "текст ровно из спеки");
const kb = opened.body.reply_markup.keyboard[0][0];
check(kb.web_app.url === env.QUIZ_URL, "кнопка ведёт на выложенный квиз");

/* --- 5. результат теста ------------------------------------------------ */
console.log("\nРезультат теста пришёл:");
const payload = { v: 2, n: "Галина", g: "f", t: "onoff", ex: "quit", bmi: 28.7 };
await send({ message: { from, chat, web_app_data: { data: JSON.stringify(payload) } } });
check(rows.some((r) => r.sql.startsWith("INSERT INTO quiz")), "payload лёг в quiz");
check(rows.some((r) => r.args?.includes("onoff")), "тип старта сохранён отдельным полем");
check(rows.some((r) => r.sql.startsWith("UPDATE users")), "имя и пол переехали в users");
check(calls.at(-1).body.text.startsWith("Галина"), "ответ по имени из теста");

/* --- 6. битый payload -------------------------------------------------- */
console.log("\nБитый payload:");
await send({ message: { from, chat, web_app_data: { data: "{не json" } } });
check(rows.some((r) => r.args?.includes("quiz_broken")), "записан как quiz_broken");
check(!rows.some((r) => r.sql.startsWith("INSERT INTO quiz")), "в quiz не попал");

console.log(failed ? `\nПровалов: ${failed}` : "\nВсё чисто.");
process.exit(failed ? 1 : 0);
