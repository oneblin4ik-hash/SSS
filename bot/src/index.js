/* Бот @serbolin_bot. Первый заход: вход, проверка подписки, приём результата
   теста в базу.
 *
 * Работает вебхуком, а не опросом: воркер живёт только пока обрабатывает
 * запрос, держать долгое соединение ему нечем. Telegram сам стучится сюда
 * при каждом обновлении.
 *
 * Что дальше по спеке: «День 0» на четыре вопроса, карточка стартовой точки,
 * оффер, заявка в личку, выдача курса и четырнадцать джобов на 8:00.
 */
import { welcome, SUB_OK, SUB_MISSING, BTN_SUBSCRIBE, BTN_SUB_CHECK,
         BTN_QUIZ, QUIZ_RECEIVED_STUB } from "./texts.js";
import { sendMessage, answerCallback, isSubscribed } from "./telegram.js";
import { upsertUser, logEvent, saveQuiz } from "./db.js";

/* Клавиатура с кнопкой Mini App. Именно reply-keyboard, а не меню и не
   inline: только из неё работает sendData, и результат теста приходит
   сам, без отдельного бэкенда под приём. */
const quizKeyboard = (url) => ({
  reply_markup: {
    keyboard: [[{ text: BTN_QUIZ, web_app: { url } }]],
    resize_keyboard: true,
    is_persistent: true,
  },
});

const gateKeyboard = (channelUrl) => ({
  reply_markup: {
    inline_keyboard: [
      [{ text: BTN_SUBSCRIBE, url: channelUrl }],
      [{ text: BTN_SUB_CHECK, callback_data: "sub_check" }],
    ],
  },
});

/* Источник из диплинка: t.me/serbolin_bot?start=q_ig. Чужое, поэтому
   подрезаем и пропускаем только безобидные символы — эта строка попадёт
   в базу и потом в отчёты. */
function parseSource(text) {
  const arg = (text || "").split(/\s+/)[1] || "";
  const clean = arg.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32);
  return clean || null;
}

async function onStart(env, msg) {
  const uid = msg.from.id;
  const source = parseSource(msg.text);

  await upsertUser(env.DB, {
    userId: uid,
    username: msg.from.username,
    name: msg.from.first_name,
    source,
  });
  await logEvent(env.DB, uid, "start", source ? { source } : null);

  const ok = await isSubscribed(env.BOT_TOKEN, env.CHANNEL, uid);
  await logEvent(env.DB, uid, ok ? "sub_ok" : "sub_required");

  await sendMessage(
    env.BOT_TOKEN,
    msg.chat.id,
    welcome(ok),
    ok ? quizKeyboard(env.QUIZ_URL) : gateKeyboard(env.CHANNEL_URL),
  );
}

async function onSubCheck(env, cq) {
  const uid = cq.from.id;
  const ok = await isSubscribed(env.BOT_TOKEN, env.CHANNEL, uid);

  if (!ok) {
    // Отказ показываем всплывающим окном, а не сообщением: кнопка остаётся
    // на месте, чат не засоряется, повторное нажатие ничего не стоит.
    // Считать нажатия и попрекать ими не нужно — человек может искренне
    // не понимать, куда жать.
    await answerCallback(env.BOT_TOKEN, cq.id, SUB_MISSING, true);
    return;
  }

  await logEvent(env.DB, uid, "sub_ok");
  await answerCallback(env.BOT_TOKEN, cq.id, "");
  await sendMessage(env.BOT_TOKEN, cq.message.chat.id, SUB_OK,
                    quizKeyboard(env.QUIZ_URL));
}

async function onQuizDone(env, msg) {
  const uid = msg.from.id;
  let payload;
  try {
    payload = JSON.parse(msg.web_app_data.data);
  } catch {
    await logEvent(env.DB, uid, "quiz_broken", { raw: msg.web_app_data.data.slice(0, 200) });
    return;
  }
  // Схему квиза ещё будут менять. Версию проверяем, но результат всё равно
  // сохраняем: потерять ответы живого человека хуже, чем разобрать их потом.
  if (payload.v !== 2) {
    await logEvent(env.DB, uid, "quiz_version", { v: payload.v ?? null });
  }

  await saveQuiz(env.DB, uid, payload);
  await logEvent(env.DB, uid, "quiz_done", { t: payload.t ?? null, ex: payload.ex ?? null });

  const name = payload.n || msg.from.first_name || "";
  await sendMessage(env.BOT_TOKEN, msg.chat.id, QUIZ_RECEIVED_STUB(name));
}

async function handleUpdate(env, update) {
  const msg = update.message;
  if (msg?.web_app_data) return onQuizDone(env, msg);
  if (msg?.text?.startsWith("/start")) return onStart(env, msg);
  if (update.callback_query?.data === "sub_check") {
    return onSubCheck(env, update.callback_query);
  }
}

export default {
  async fetch(request, env, ctx) {
    if (request.method !== "POST") return new Response("ok");

    // Адрес воркера рано или поздно окажется в чужих руках. Без этой
    // проверки кто угодно сможет присылать выдуманные обновления от имени
    // любого человека. Секрет задаётся при setWebhook и приходит заголовком.
    const secret = request.headers.get("x-telegram-bot-api-secret-token");
    if (secret !== env.WEBHOOK_SECRET) return new Response("no", { status: 403 });

    let update;
    try {
      update = await request.json();
    } catch {
      return new Response("bad json", { status: 400 });
    }

    // Telegram повторяет обновление, если не получил 200 быстро. Поэтому
    // отвечаем сразу, а работу доделываем в фоне: иначе на медленном ответе
    // Bot API человек получит одно и то же сообщение дважды.
    ctx.waitUntil(
      handleUpdate(env, update).catch((e) =>
        console.error("update failed:", e?.stack || e),
      ),
    );
    return new Response("ok");
  },
};
