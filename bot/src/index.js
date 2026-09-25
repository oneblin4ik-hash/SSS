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
import { welcome, SUB_GATE, SUB_MISSING, SUB_OK_NO_QUIZ, BTN_SUBSCRIBE,
         BTN_SUB_CHECK, BTN_QUIZ } from "./texts.js";
import { sendMessage, answerCallback, isSubscribed } from "./telegram.js";
import { upsertUser, logEvent, saveQuiz, getUser, getQuiz } from "./db.js";
import * as day0 from "./day0.js";
import * as sale from "./sale.js";
import { runDue } from "./cron.js";
import { scheduleWarmup } from "./warmup.js";
import { UNSUB_DONE } from "./warmup.js";
import { onTimezone, onCheckin } from "./course.js";
import { ensureSchema } from "./migrate.js";
import { preLaunch, scheduleLaunch } from "./launch.js";
import { onProbeg } from "./probeg.js";
import { ensureProfile } from "./botprofile.js";
import { onLeads } from "./leads.js";

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

  // Тест открыт всем. Подписку спрашиваем после него, перед «Днём 0»:
  // там у человека уже есть ради чего подписываться. См. texts.js, SUB_GATE.
  await sendMessage(env.BOT_TOKEN, msg.chat.id, welcome(), quizKeyboard(env.QUIZ_URL));
}

/* Экран подписки после теста. Приветствие не повторяем — человек его
   уже видел; только зачем подписываться и две кнопки. */
async function showGate(env, chatId, uid) {
  await logEvent(env.DB, uid, "sub_required");
  await sendMessage(env.BOT_TOKEN, chatId, SUB_GATE, {
    parse_mode: "Markdown",
    ...gateKeyboard(env.CHANNEL_URL),
  });
}

async function onSubCheck(env, cq) {
  const uid = cq.from.id;
  const ok = await isSubscribed(env.BOT_TOKEN, env.CHANNEL, uid);

  if (!ok) {
    // Отказ показываем всплывашкой, а не сообщением: кнопка остаётся
    // на месте, чат не засоряется, повторное нажатие ничего не стоит.
    // Считать нажатия и попрекать ими не нужно — человек может искренне
    // не понимать, куда жать.
    await answerCallback(env.BOT_TOKEN, cq.id, SUB_MISSING, true);
    return;
  }

  await logEvent(env.DB, uid, "sub_ok");
  const chatId = cq.message.chat.id;
  const payload = await getQuiz(env.DB, uid);

  if (!payload) {
    // Кнопка из старой переписки, до переезда гейта: теста ещё нет.
    await answerCallback(env.BOT_TOKEN, cq.id, "");
    await sendMessage(env.BOT_TOKEN, chatId, SUB_OK_NO_QUIZ, quizKeyboard(env.QUIZ_URL));
    return;
  }

  // «День 0» запускаем только если он не идёт и не пройден. Второе нажатие
  // на «Я подписался» не должно сбрасывать человека на первый вопрос.
  const user = await getUser(env.DB, uid);
  const d0 = await env.DB.prepare(`SELECT done_at FROM day0 WHERE user_id = ?1`)
    .bind(uid).first();
  await answerCallback(env.BOT_TOKEN, cq.id, "Вижу, спасибо! Поехали.");
  if (day0.stepOf(user?.state) || d0?.done_at) return;
  await day0.begin(env, chatId, uid, payload);
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

  // Пока продажа закрыта, догрев не ставим: толкать к покупке того, кому
  // нечего покупать, — верный способ сжечь человека до запуска. Вместо
  // шести касаний одно, в день открытия.
  //
  // Вешаем прямо здесь, от момента окончания теста, а не после «Дня 0»:
  // человек может бросить диалог на первом же вопросе — и тогда он тем
  // более тот, кому надо написать.
  if (preLaunch(env)) await scheduleLaunch(env.DB, uid, env.LAUNCH_AT);
  else await scheduleWarmup(env.DB, uid);

  // Дальше «День 0» — но сначала подписка на канал. Кто уже подписан,
  // проходит без остановки: для него гейта как будто нет.
  if (!(await isSubscribed(env.BOT_TOKEN, env.CHANNEL, uid))) {
    return showGate(env, msg.chat.id, uid);
  }
  await logEvent(env.DB, uid, "sub_ok");

  // Пауза между тестом и первым заданием — это место, где человек
  // закрывает чат и не возвращается. Поэтому сразу.
  await day0.begin(env, msg.chat.id, uid, payload);
}

async function onUnsub(env, cq) {
  await env.DB.prepare(`UPDATE users SET unsub = 1 WHERE user_id = ?1`)
    .bind(cq.from.id).run();
  await sale.cancelWarmup(env.DB, cq.from.id);
  await logEvent(env.DB, cq.from.id, "unsub");
  await answerCallback(env.BOT_TOKEN, cq.id, "");
  await sendMessage(env.BOT_TOKEN, cq.message.chat.id, UNSUB_DONE);
}

async function handleUpdate(env, update) {
  await ensureSchema(env.DB);
  await route(env, update);

  // Витрина бота — описание и меню. Один раз после выкладки, потом
  // мгновенный выход. Упала — не страшно, попробует на следующем
  // обращении; разговор с человеком это не задерживает.
  try {
    await ensureProfile(env);
  } catch (e) {
    console.error("витрина бота не выставилась:", e?.message || e);
  }

  // Любое обращение к боту заодно подталкивает очередь. Крон — отдельная
  // настройка, и сегодня выяснилось, что её может не быть: уроки пролежали
  // весь день, потому что будить их было некому. Бюджет маленький, чтобы
  // не съесть лимит запросов у того, кто сейчас разговаривает с ботом;
  // отправка идёт после ответа человеку, а не вместо него.
  try {
    await runDue(env, 8);
  } catch (e) {
    console.error("подталкивание очереди упало:", e?.message || e);
  }
}

async function route(env, update) {
  const msg = update.message;
  if (msg?.web_app_data) return onQuizDone(env, msg);
  if (msg?.text?.startsWith("/start")) return onStart(env, msg);
  if (msg?.text?.startsWith("/waiting")) return sale.onWaiting(env, msg);
  // Прогон всего пути в личку владельцу. Внутри проверка на ADMIN_ID:
  // чужому эта команда не ответит ничем.
  if (msg?.text?.startsWith("/probeg")) return onProbeg(env, msg);
  // Все, кто прошёл тест, таблицей. Внутри проверка на ADMIN_ID.
  if (msg?.text?.startsWith("/leads")) return onLeads(env, msg);
  // Протолкнуть очередь руками. Нужна, пока крон не подключён: без него
  // уроки, чек-ины и догрев просто лежат в базе и ждут.
  if (msg?.text?.startsWith("/tick") &&
      String(msg.from.id) === String(env.ADMIN_ID)) {
    // Бюджет с запасом: следом отработает ещё и подталкивание очереди,
    // а лимит на всё обращение — пятьдесят запросов.
    const n = await runDue(env, 30);
    return sendMessage(env.BOT_TOKEN, msg.chat.id,
      n ? `Отправлено: ${n}. Если осталось — жми ещё.` : "Отправлять нечего.");
  }
  // Нужна ровно один раз, при настройке: свой id иначе негде взять.
  if (msg?.text?.startsWith("/id")) {
    return sendMessage(env.BOT_TOKEN, msg.chat.id, `Твой id: ${msg.from.id}`);
  }

  const cq = update.callback_query;
  if (cq) {
    if (cq.data === "sub_check") return onSubCheck(env, cq);
    if (cq.data === "contact") return sale.onContact(env, cq);
    if (cq.data === "unsub") return onUnsub(env, cq);
    const admin = /^(grant|decline):(\d+)$/.exec(cq.data || "");
    if (admin) return sale.onAdminDecision(env, cq, admin[1], Number(admin[2]));

    const tz = /^tz:(\d+)$/.exec(cq.data || "");
    if (tz) return onTimezone(env, cq, Number(tz[1]));

    const ci = /^ci:(\d+):(done|failed)$/.exec(cq.data || "");
    if (ci) return onCheckin(env, cq, Number(ci[1]), ci[2]);
    return;
  }

  if (msg?.text) {
    const user = await getUser(env.DB, msg.from.id);
    // Обычный текст имеет смысл внутри диалога «Дня 0».
    if (day0.stepOf(user?.state)) {
      const payload = await getQuiz(env.DB, msg.from.id);
      if (payload) return day0.answer(env, msg, user.state, payload);
    }
    // Вне диалога человек просто написал боту. Отвечать автоматом
    // не будем — это разговор с Эдуардом, а не с автоответчиком. Но
    // догрев гасим: писать «ну что, надумал?» тому, кто уже пишет сам,
    // значит показать, что его не слышат.
    await sale.cancelWarmup(env.DB, msg.from.id);
  }
}

/* Метка выкладки.
 *
 * У воркера нет никакого признака, по которому снаружи видно, какой код
 * на нём живёт. Из-за этого полдня ушло на вопрос «правки доехали или
 * сборка опять упала молча»: в Telegram работала старая версия, а понять
 * это можно было только по поведению бота.
 *
 * Теперь GET на адрес воркера отвечает этой строкой. Меняй её в том же
 * коммите, что и сами правки, — и проверка сводится к одному curl. */
const VERSION = "2026-09-25 · /leads — таблица всех, кто прошёл тест";

export default {
  async fetch(request, env, ctx) {
    if (request.method !== "POST") return new Response(`ok ${VERSION}`);

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

  // Крон раз в четверть часа: догрев и напоминания о висящих заявках.
  //
  // Каждое срабатывание оставляет след в ленте событий. Причина простая:
  // крон — единственная часть бота, про которую снаружи ничего не видно.
  // Уроки не уходили целый день, и понять по базе, крон не запускается
  // или запускается и падает, было нечем. Теперь видно: нет записи —
  // не запускался; есть «упал» — запускался и вот на чём.
  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      ensureSchema(env.DB)
        .then(() => runDue(env))
        .then((n) => note(env, `ушло ${n}`))
        .catch(async (e) => {
          console.error("cron failed:", e?.stack || e);
          await note(env, `упал: ${e?.message || e}`);
        }),
    );
  },
};

/* След крона. Пишем в обход logEvent: если упала схема, лента событий
   может быть единственным, что уцелело, и ронять отчёт об ошибке
   собственной ошибкой — худшее, что можно сделать. */
async function note(env, text) {
  try {
    await env.DB.prepare(
      `INSERT INTO events (user_id, event, meta, at) VALUES (0, 'cron', ?1, ?2)`)
      .bind(text, new Date().toISOString()).run();
  } catch (e) {
    console.error("даже след крона не записался:", e?.message || e);
  }
}
