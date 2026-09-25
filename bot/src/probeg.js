/* Команда `/probeg` — весь путь ученика одним потоком, в личку владельцу.
 *
 * Зачем отдельная команда, а не «посмотреть в файлах»: увидеть курс глазами
 * покупателя можно только в том виде, в каком он приходит. Разметка,
 * порядок, длина сообщения, как выглядит PDF рядом с текстом, не режется ли
 * абзац — всё это видно в Telegram и не видно в редакторе.
 *
 * Тексты и файлы берутся из тех же функций, что работают в бою. Это не
 * макет: если развилка соберётся неправильно, здесь это будет видно.
 *
 * ПОЧЕМУ ПО ЧАСТЯМ. У воркера на бесплатном тарифе не больше пятидесяти
 * исходящих запросов на одно обращение, а весь путь — это под семьдесят
 * сообщений и файлов. Поэтому команда шлёт кусок и запоминает, где
 * остановилась: отправляешь `/probeg` снова — идёт дальше. `/probeg 0`
 * начинает сначала.
 */
import { sendMessage } from "./telegram.js";
import { getQuiz, upsertUser } from "./db.js";
import { lessonText } from "./course.js";
import { LESSONS, FINALE, UPSELL } from "./lessons.js";
import { sendPdf, daySlug, programSlug, RAZBOR_SLUG } from "./files.js";

/* Человек, который ничего не проходил, всё равно должен что-то увидеть.
   Мужчина, похудение, дома — самый частый случай в воронке. */
const DEFAULT_Q = { n: "Эдуард", g: "m", gl: "loss", pl: "home", hl: ["none"] };

/* Куски по три дня: так в одно обращение укладывается десяток запросов
   с запасом. */
const CHUNKS = [
  { title: "Оплата прошла", days: [] },
  { title: "Дни 1–3", days: [1, 2, 3] },
  { title: "Дни 4–6", days: [4, 5, 6] },
  { title: "Дни 7–9", days: [7, 8, 9] },
  { title: "Дни 10–12", days: [10, 11, 12] },
  { title: "Дни 13–14", days: [13, 14] },
  { title: "После курса", days: [] },
];

const pos = (state) =>
  state?.startsWith("probeg_") ? Number(state.slice(7)) : 0;

export async function onProbeg(env, msg) {
  if (String(msg.from.id) !== String(env.ADMIN_ID)) return;
  const uid = msg.from.id;
  const chat = msg.chat.id;

  // Владелец мог ни разу не нажать /start у собственного бота. Без строки
  // в users позиция прогона некуда записаться, и первый кусок будет
  // приходить бесконечно.
  await upsertUser(env.DB, { userId: uid, username: msg.from.username,
                             name: msg.from.first_name, source: null });

  const arg = (msg.text || "").split(/\s+/)[1];
  if (arg === "0") {
    await env.DB.prepare(`UPDATE users SET state = NULL WHERE user_id = ?1`)
      .bind(uid).run();
    await sendMessage(env.BOT_TOKEN, chat,
      "Прогон сброшен. Отправь /probeg — начну сначала.");
    return;
  }

  const user = await env.DB.prepare(`SELECT state FROM users WHERE user_id = ?1`)
    .bind(uid).first();
  const i = pos(user?.state);

  if (i >= CHUNKS.length) {
    await env.DB.prepare(`UPDATE users SET state = NULL WHERE user_id = ?1`)
      .bind(uid).run();
    await sendMessage(env.BOT_TOKEN, chat,
      "Это был весь путь, от оплаты до последнего касания.\n\n" +
      "Начать заново — /probeg 0");
    return;
  }

  const q = (await getQuiz(env.DB, uid)) || DEFAULT_Q;
  await part(env, chat, i, q);

  await env.DB.prepare(`UPDATE users SET state = ?2 WHERE user_id = ?1`)
    .bind(uid, `probeg_${i + 1}`).run();

  const next = CHUNKS[i + 1];
  await sendMessage(env.BOT_TOKEN, chat,
    next ? `— — — конец куска. Дальше «${next.title}»: отправь /probeg — — —`
         : "— — — это был весь путь — — —");
}

async function part(env, chat, i, q) {
  if (i === 0) return purchased(env, chat, q);
  if (i === CHUNKS.length - 1) return afterCourse(env, chat, q);
  for (const d of CHUNKS[i].days) await day(env, chat, d, q);
}

/* Что приходит в минуту оплаты. */
async function purchased(env, chat, q) {
  await mark(env, chat, "Эдуард нажал «Включить курс»");
  await sendMessage(env.BOT_TOKEN, chat,
    "Уроки приходят в 8 утра по твоему времени. Чтобы не будить тебя " +
    "среди ночи — нажми, сколько сейчас на твоих часах.\n\n" +
    "_(здесь одиннадцать кнопок с часами)_", { parse_mode: "Markdown" });
  await sendMessage(env.BOT_TOKEN, chat,
    `${q.n || ""}, ты в деле.\n\nПервый урок придёт завтра в 8 утра. ` +
    `Ничего сегодня не начинай — серьёзно, не начинай. День 1 идёт без ` +
    `диеты и без зала, и это не подарок, а часть метода: пять изменений ` +
    `одновременно не выдерживает никто.\n\nТерпение + Дисциплина = Результат.`);
  await sendPdf(env, chat, "kurs-00-oblozhka");
  await sendPdf(env, chat, "kurs-00-oglavlenie", "Оглавление: что и в какой день.");
  await sendPdf(env, chat, "kurs-00-pered-startom",
                "Прочитай сегодня. Делать пока ничего не надо.");
}

/* Один день: урок, страница, вечерний чек-ин. */
async function day(env, chat, d, q) {
  await mark(env, chat, `День ${d} · 8:00`);
  const l = LESSONS[d];
  const markup = l.buttons.length
    ? { reply_markup: { inline_keyboard: l.buttons.map((b) => [b]) } }
    : {};
  await sendMessage(env.BOT_TOKEN, chat, lessonText(d, q),
                    { parse_mode: "Markdown", ...markup });
  await sendPdf(env, chat, daySlug(d, l.slug, q));
  await sendMessage(env.BOT_TOKEN, chat,
    `_20:00_ · День ${d}. Задание сделано?\n\n_(кнопки «Сделал» и «Не вышло»)_`,
    { parse_mode: "Markdown" });
}

/* Финал и три касания допродажи. */
async function afterCourse(env, chat, q) {
  await mark(env, chat, "Сразу за уроком четырнадцатого дня");
  const text = FINALE.parts.join("\n\n").replace(/\{\{name\}\}/g, q.n || "");
  await sendMessage(env.BOT_TOKEN, chat, text, {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: FINALE.buttons.map((b) => [b]) },
  });
  await sendPdf(env, chat, programSlug(q),
                "Твоя программа тренировок. Карточка упражнения — ссылка: " +
                "нажал, открылось видео с техникой.");
  await sendPdf(env, chat, RAZBOR_SLUG,
                "Как проходит разбор и что будет на выходе.");

  for (const d of [15, 18, 25]) {
    await mark(env, chat, `День ${d} · допродажа ведения`);
    await sendMessage(env.BOT_TOKEN, chat,
      (UPSELL[d] || "").replace(/\{\{name\}\}/g, q.n || ""));
  }
}

/* Разделитель: в бою его нет, здесь он нужен — иначе четырнадцать дней
   сливаются в одну ленту и непонятно, где кончается день. */
const mark = (env, chat, text) =>
  sendMessage(env.BOT_TOKEN, chat, `— — —  ${text}  — — —`);
