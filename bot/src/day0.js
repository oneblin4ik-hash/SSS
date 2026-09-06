/* «День 0»: четыре вопроса свободным текстом, потом карточка стартовой
   точки и сразу оффер.
 *
 * Вопросы задаём по одному и ждём каждый ответ. Состояние — одна колонка
 * в users: заводить ради четырёх шагов отдельную машину состояний дороже,
 * чем она стоит.
 */
import { sendMessage } from "./telegram.js";
import { logEvent } from "./db.js";
import { times, sleepHours, windows, hoursWord } from "./parse.js";
import * as T from "./texts.js";
import { offerText, OFFER_FOOTNOTE, BTN_CONTACT, shortCode } from "./offer.js";

const STEPS = 4;
export const stateFor = (step) => `day0_${step}`;   // day0_1 … day0_4
export const stepOf = (state) =>
  state?.startsWith("day0_") ? Number(state.slice(5)) : null;

/** Запускается сразу после теста. Присылает вступление и первый вопрос. */
export async function begin(env, chatId, userId, payload) {
  await env.DB.prepare(`UPDATE users SET state = ?2 WHERE user_id = ?1`)
    .bind(userId, stateFor(1)).run();
  await sendMessage(env.BOT_TOKEN, chatId, T.DAY0_INTRO, { parse_mode: "Markdown" });
  await sendMessage(env.BOT_TOKEN, chatId, T.day0Questions(payload.g)[0]);
}

/** Ответ на очередной вопрос. Возвращает true, если сообщение съедено
 *  диалогом, — тогда остальные обработчики его не трогают. */
export async function answer(env, msg, state, payload) {
  const step = stepOf(state);
  if (!step) return false;

  const uid = msg.from.id;
  const text = (msg.text || "").trim();
  if (!text) return true;                    // стикер вместо ответа — ждём дальше

  await store(env.DB, uid, step, text);

  if (step < STEPS) {
    await env.DB.prepare(`UPDATE users SET state = ?2 WHERE user_id = ?1`)
      .bind(uid, stateFor(step + 1)).run();
    await sendMessage(env.BOT_TOKEN, msg.chat.id, T.day0Questions(payload.g)[step]);
    return true;
  }

  await env.DB.prepare(`UPDATE users SET state = NULL WHERE user_id = ?1`)
    .bind(uid).run();
  await logEvent(env.DB, uid, "day0_done");
  await finish(env, msg.chat.id, uid, payload);
  return true;
}

/* Каждый ответ пишем и сырым, и разобранным. Сырой — чтобы в карточке
   стояли слова человека; разобранный — чтобы считать часы сна и подставлять
   окна в догрев. */
async function store(db, uid, step, text) {
  const row = { user_id: uid };
  if (step === 1) {
    const [wake, bed] = times(text);
    Object.assign(row, {
      sleep_raw: text,
      wake: wake?.raw ?? null,
      sleep: bed?.raw ?? null,
      hours: sleepHours(wake, bed),
    });
  } else if (step === 2) {
    const w = windows(text);
    Object.assign(row, {
      windows_raw: text,
      window1: w?.[0] ?? null,
      window2: w?.[1] ?? null,
    });
  } else if (step === 3) {
    row.hunger_time = text;
  } else {
    row.dinner_txt = text;
    row.done_at = new Date().toISOString();
  }

  const cols = Object.keys(row).filter((k) => k !== "user_id");
  const set = cols.map((c, i) => `${c} = ?${i + 2}`).join(", ");
  await db
    .prepare(
      `INSERT INTO day0 (user_id, ${cols.join(", ")})
       VALUES (?1, ${cols.map((_, i) => `?${i + 2}`).join(", ")})
       ON CONFLICT(user_id) DO UPDATE SET ${set}`,
    )
    .bind(uid, ...cols.map((c) => row[c]))
    .run();
}

/** Карточка и следом оффер — двумя сообщениями, как в спеке. */
export async function finish(env, chatId, uid, payload) {
  const d = await env.DB.prepare(`SELECT * FROM day0 WHERE user_id = ?1`)
    .bind(uid).first();

  const card = T.startCard({
    name: payload.n || "",
    gender: payload.g,
    sleepLine: sleepLine(d),
    windowsLine: windowsLine(d),
    hunger: d?.hunger_time || "—",
    dinner: d?.dinner_txt || "—",
  });

  const medic = T.medicWarning(payload.g, payload.hl || []);
  await sendMessage(env.BOT_TOKEN, chatId,
                    medic ? `${card}\n\n${medic}` : card,
                    { parse_mode: "Markdown" });

  const code = await shortCode(uid);
  // Кнопка с callback, а не ссылкой: по url-кнопке Telegram боту ничего
  // не сообщает, и заявка потерялась бы. Почему так — в sale.js.
  await sendMessage(env.BOT_TOKEN, chatId,
    `${offerText(payload)}\n\n_${OFFER_FOOTNOTE}_`, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [[{ text: BTN_CONTACT, callback_data: "contact" }]],
      },
    });
  await logEvent(env.DB, uid, "offer_shown", { code });
}

/* Разобралось время — показываем вывод про сон. Не разобралось — ставим
   фразу человека и молчим про часы: придумывать за него число нельзя. */
function sleepLine(d) {
  if (d?.hours && d.wake && d.sleep) {
    return `подъём ${d.wake}, отбой ${d.sleep} → ${hoursWord(d.hours)} ч сна. ` +
           T.sleepVerdict(d.hours);
  }
  return d?.sleep_raw || "—";
}

function windowsLine(d) {
  if (d?.window1 && d?.window2) return `${d.window1} и ${d.window2}.`;
  return `${d?.windows_raw || "—"}.`;
}
