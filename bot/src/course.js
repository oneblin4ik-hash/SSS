/* Выдача курса: четырнадцать уроков в 8:00 и чек-ины в 20:00 по времени
   человека.
 *
 * Часовой пояс спрашиваем один раз, сразу после того как Эдуард нажал
 * «Включить курс». Спрашиваем не «какой у тебя пояс» — половина людей
 * не знает ответа, — а «сколько сейчас на часах». Бот знает UTC, человек
 * знает своё время, разница и есть смещение. Ошибиться тут невозможно.
 */
import { sendMessage, answerCallback, call } from "./telegram.js";
import { logEvent, getQuiz } from "./db.js";
import { LESSONS, FINALE, UPSELL } from "./lessons.js";
import { sendPdf, daySlug, programSlug, RAZBOR_SLUG } from "./files.js";
import { g } from "./texts.js";

const HOUR = 3600e3;
const DAY = 24 * HOUR;
const now = () => new Date().toISOString();

/* Россия и соседи укладываются в UTC+2…+12. Показываем не пояса,
   а часы — человек просто находит своё время. */
const OFFSETS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export const TZ_ASK =
  "Последнее, и дальше я от тебя отстану.\n\n" +
  "Уроки приходят в 8 утра по твоему времени. Чтобы не будить тебя " +
  "среди ночи — нажми, сколько сейчас на твоих часах.";

export function tzKeyboard() {
  const utcHour = new Date().getUTCHours();
  const rows = [];
  for (let i = 0; i < OFFSETS.length; i += 3) {
    rows.push(OFFSETS.slice(i, i + 3).map((off) => ({
      text: `${String((utcHour + off) % 24).padStart(2, "0")}:00`,
      callback_data: `tz:${off}`,
    })));
  }
  return { reply_markup: { inline_keyboard: rows } };
}

/** Эдуард включил курс — спрашиваем время и ждём ответа. */
export async function askTimezone(env, userId) {
  await sendMessage(env.BOT_TOKEN, userId, TZ_ASK, tzKeyboard());
}

export async function onTimezone(env, cq, offset) {
  const uid = cq.from.id;
  await env.DB.prepare(`UPDATE users SET tz = ?2 WHERE user_id = ?1`)
    .bind(uid, String(offset)).run();
  await answerCallback(env.BOT_TOKEN, cq.id, "");
  await scheduleCourse(env.DB, uid, offset);
  await logEvent(env.DB, uid, "course_scheduled", { tz: offset });

  const q = await getQuiz(env.DB, uid);
  const name = q?.n ? `${q.n}, ` : "";
  const first = await firstLessonAt(env.DB, uid);
  await sendMessage(env.BOT_TOKEN, cq.message.chat.id,
    `${name}ты в деле.\n\n` +
    `Первый урок придёт ${first}. Ничего сегодня не начинай — серьёзно, ` +
    `не начинай. День 1 идёт без диеты и без зала, и это не подарок, ` +
    `а часть метода: пять изменений одновременно не выдерживает никто.\n\n` +
    `Терпение + Дисциплина = Результат.`);

  // Человек только что заплатил, и до первого урока может остаться
  // почти сутки. Отдаём сразу то, что не привязано ко дню: обложку,
  // оглавление и страницу «Перед стартом». Иначе оплата заканчивается
  // обещанием подождать, а это худшая минута во всей воронке.
  await sendPdf(env, uid, "kurs-00-oblozhka");
  await sendPdf(env, uid, "kurs-00-oglavlenie",
                "Оглавление: что и в какой день.");
  await sendPdf(env, uid, "kurs-00-pered-startom",
                "Прочитай сегодня. Делать пока ничего не надо.");
}

/**
 * Четырнадцать уроков на 8:00 и четырнадцать чек-инов на 20:00.
 *
 * Первый урок — ближайшее наступающее 8:00. Если человек включился
 * утром до восьми, урок придёт сегодня же; если днём — завтра. Слать
 * первый урок сразу нельзя: день 1 просит не начинать ничего сегодня,
 * и сообщение в восемь вечера этому противоречит.
 */
export async function scheduleCourse(db, userId, offset) {
  const base = nextEight(offset);
  const rows = [];
  for (let d = 1; d <= 14; d++) {
    const day = base + (d - 1) * DAY;
    rows.push(db.prepare(
      `INSERT INTO jobs (user_id, kind, due_at) VALUES (?1, ?2, ?3)`)
      .bind(userId, `lesson_${d}`, new Date(day).toISOString()));
    rows.push(db.prepare(
      `INSERT INTO jobs (user_id, kind, due_at) VALUES (?1, ?2, ?3)`)
      .bind(userId, `checkin_${d}`, new Date(day + 12 * HOUR).toISOString()));
  }
  // Допродажа ведения: дни 15, 18 и 25 от первого урока.
  for (const d of [15, 18, 25]) {
    rows.push(db.prepare(
      `INSERT INTO jobs (user_id, kind, due_at) VALUES (?1, ?2, ?3)`)
      .bind(userId, `upsell_${d}`,
            new Date(base + (d - 1) * DAY).toISOString()));
  }
  await db.batch(rows);
}

/** Ближайшее 8:00 по времени человека, в миллисекундах UTC. */
function nextEight(offset, from = Date.now()) {
  const local = new Date(from + offset * HOUR);
  const eight = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(),
                         local.getUTCDate(), 8) - offset * HOUR;
  return eight > from ? eight : eight + DAY;
}

async function firstLessonAt(db, userId) {
  const row = await db.prepare(
    `SELECT due_at FROM jobs WHERE user_id = ?1 AND kind = 'lesson_1'`)
    .bind(userId).first();
  if (!row) return "завтра в 8 утра";
  const hours = (Date.parse(row.due_at) - Date.now()) / HOUR;
  return hours < 14 ? "сегодня в 8 утра" : "завтра в 8 утра";
}

/* ── урок дня ─────────────────────────────────────────────────────────── */

/** Абзацы под конкретного человека: общие плюс его ветка. */
export function lessonText(day, q) {
  const l = LESSONS[day];
  const gain = q.gl === "mass";
  const place = q.pl === "gym" ? "zal" : "dom";
  const keep = new Set(["all", gain ? "gain" : "cut", place, q.g]);
  const kept = l.parts.filter((p) => keep.has(p.tag)).map((p) => p.text);

  // Пункты списка склеиваем обратно. Развилка разрезала абзац по метке,
  // и без этого соседние строки «•» разъезжаются пустой строкой — список
  // перестаёт читаться как список.
  const body = kept.reduce((acc, text) => {
    const prev = acc.at(-1);
    const bullets = text.startsWith("•") && prev?.split("\n").at(-1).startsWith("•");
    if (bullets) acc[acc.length - 1] = `${prev}\n${text}`;
    else acc.push(text);
    return acc;
  }, []);

  return `*День ${day}. ${l.title}*\n\n${body.join("\n\n")}\n\n` +
         `*Задание:* ${l.task}`;
}

export async function sendLesson(env, userId, day) {
  const q = await getQuiz(env.DB, userId);
  if (!q) return;
  const l = LESSONS[day];

  const markup = l.buttons.length
    ? { reply_markup: { inline_keyboard: l.buttons.map((b) => [b]) } }
    : {};
  await sendMessage(env.BOT_TOKEN, userId, lessonText(day, q),
                    { parse_mode: "Markdown", ...markup });
  await sendPdf(env, userId, daySlug(day, l.slug, q));

  await env.DB.prepare(
    `INSERT INTO progress (user_id, day, sent_at) VALUES (?1, ?2, ?3)
     ON CONFLICT(user_id, day) DO UPDATE SET sent_at = excluded.sent_at`)
    .bind(userId, day, now()).run();
  await logEvent(env.DB, userId, `day_${day}_read`);

  if (day === 14) await finale(env, userId, q);
}

/* После четырнадцатого дня остаётся то, что не уроки: экран «Курс
   пройден», своя программа тренировок и страница разбора. */
async function finale(env, userId, q) {
  const name = q.n || "";
  const text = FINALE.parts.join("\n\n").replace(/\{\{name\}\}/g, name);
  await sendMessage(env.BOT_TOKEN, userId, text, {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: FINALE.buttons.map((b) => [b]) },
  });
  await sendPdf(env, userId, programSlug(q),
                "Твоя программа тренировок. Карточка упражнения — ссылка: " +
                "нажал, открылось видео с техникой.");
  await sendPdf(env, userId, RAZBOR_SLUG,
                "Как проходит разбор и что будет на выходе.");
  await logEvent(env.DB, userId, "course_finished");
}

/* ── вечерний чек-ин ──────────────────────────────────────────────────── */

export async function sendCheckin(env, userId, day) {
  const sent = await env.DB.prepare(
    `SELECT sent_at FROM progress WHERE user_id = ?1 AND day = ?2`)
    .bind(userId, day).first();
  if (!sent?.sent_at) return;      // урок не дошёл — спрашивать не о чем

  await sendMessage(env.BOT_TOKEN, userId,
    `День ${day}. Задание сделано?`, {
      reply_markup: {
        inline_keyboard: [[
          { text: "Сделал", callback_data: `ci:${day}:done` },
          { text: "Не вышло", callback_data: `ci:${day}:failed` },
        ]],
      },
    });
}

export async function onCheckin(env, cq, day, result) {
  const uid = cq.from.id;
  await env.DB.prepare(
    `INSERT INTO progress (user_id, day, checkin, at) VALUES (?1, ?2, ?3, ?4)
     ON CONFLICT(user_id, day) DO UPDATE SET checkin = excluded.checkin,
                                             at = excluded.at`)
    .bind(uid, day, result, now()).run();
  await logEvent(env.DB, uid, result === "done" ? "checkin_done" : "checkin_failed",
                 { day });
  await answerCallback(env.BOT_TOKEN, cq.id, "");
  await call(env.BOT_TOKEN, "editMessageReplyMarkup", {
    chat_id: cq.message.chat.id,
    message_id: cq.message.message_id,
    reply_markup: { inline_keyboard: [] },
  });

  if (result === "done") {
    const n = await streak(env.DB, uid, day);
    await sendMessage(env.BOT_TOKEN, cq.message.chat.id,
      `Отметил. ${n} ${dayWord(n)} подряд. Так и держим.`);
    return;
  }
  // Ответ на «Не вышло» ни при каких условиях не должен звучать
  // как упрёк. Именно здесь люди отваливаются от курсов, а на дне 12
  // стоит урок «Как не бросить» — тон обязан совпасть заранее.
  await sendMessage(env.BOT_TOKEN, cq.message.chat.id,
    "Бывает. Ничего не компенсируем и не догоняем: завтра просто идём " +
    "по плану. Один пропущенный день ничего не решает, решает выход " +
    "из графика на неделю.");
}

/** Сколько дней подряд закрыто, считая от сегодняшнего назад. */
async function streak(db, userId, day) {
  const { results } = await db.prepare(
    `SELECT day FROM progress WHERE user_id = ?1 AND checkin = 'done'
       AND day <= ?2 ORDER BY day DESC`).bind(userId, day).all();
  const done = new Set(results.map((r) => r.day));
  let n = 0;
  for (let d = day; d >= 1 && done.has(d); d--) n++;
  return n;
}

const dayWord = (n) => {
  const t = n % 10, h = n % 100;
  if (t === 1 && h !== 11) return "день";
  if (t >= 2 && t <= 4 && (h < 12 || h > 14)) return "дня";
  return "дней";
};

/* ── допродажа ведения ────────────────────────────────────────────────── */

export async function sendUpsell(env, userId, day) {
  const q = await getQuiz(env.DB, userId);
  const text = (UPSELL[day] || "").replace(/\{\{name\}\}/g, q?.n || "");
  if (!text) return;
  await sendMessage(env.BOT_TOKEN, userId, text, {
    reply_markup: {
      inline_keyboard: [[{
        text: "Записаться на разбор",
        url: "https://t.me/Mr_Serbolin?text=" + encodeURIComponent("РАЗБОР"),
      }]],
    },
  });
  await logEvent(env.DB, userId, `upsell_${day}`);
}
