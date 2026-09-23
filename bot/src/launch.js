/* Предзапуск: пока идёт первый поток, бот не продаёт.
 *
 * Зачем. Человек проходит тест и через пять минут видит цену — а Эдуард
 * в это время две недели говорит в сторис «продажу открою, когда закончим».
 * Прогрев и бот работают друг против друга, и это замечает каждый, кто
 * сделал и то, и другое.
 *
 * Хуже другое: догрев успевает выстрелить четыре раза до того, как история
 * дойдёт до развязки. К дню открытия человек уже отработанный материал.
 *
 * Поэтому до даты открытия бот отдаёт всё ценное — тест, «День 0»,
 * карточку стартовой точки — и говорит, когда откроется. Кнопка «Написать
 * Эдуарду» остаётся: кто готов купить сейчас, тот напишет.
 *
 * В день открытия накопившиеся получают настоящий оффер одной волной.
 * Это и есть запуск.
 */
import { sendMessage } from "./telegram.js";
import { logEvent, getQuiz } from "./db.js";
import { offerBody, offerText, OFFER_FOOTNOTE, BTN_CONTACT } from "./offer.js";
import { sendPdf } from "./files.js";
import { scheduleWarmup } from "./warmup.js";

const MONTHS = ["января", "февраля", "марта", "апреля", "мая", "июня",
                "июля", "августа", "сентября", "октября", "ноября", "декабря"];

/**
 * Идёт ли предзапуск.
 *
 * Пустая или кривая дата означает обычную работу — бот продаёт. Так
 * специально: забытая настройка не должна тихо выключить продажу
 * навсегда. Сломаться в сторону «продаём» дешевле, чем в сторону «молчим».
 */
export function preLaunch(env) {
  const at = Date.parse(env.LAUNCH_AT || "");
  return Number.isFinite(at) && Date.now() < at;
}

export const launchDate = (env) => {
  const d = new Date(Date.parse(env.LAUNCH_AT));
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
};

/** Что человек видит вместо цены. */
export const preLaunchText = (payload, when) =>
  `${offerBody(payload)}\n\n` +
  `*Курс откроется ${when}.* Сейчас его проходят пятеро, и я иду вместе ` +
  `с ними — смотрю, что работает, а что надо переписать до того, ` +
  `как продавать.\n\n` +
  `Ты уже в списке. Напишу первым, как откроется, — искать ничего не надо.`;

export const PRE_FOOTNOTE =
  "Не хочешь ждать — напиши мне, разберёмся отдельно. " +
  "Отвечаю сам, не бот и не менеджер.";

/** Один джоб на дату открытия вместо всей цепочки догрева. */
export async function scheduleLaunch(db, userId, whenISO) {
  // Один джоб на человека, сколько бы раз он ни проходил тест. Иначе
  // в день открытия он получил бы оффер столько раз, сколько тестов прошёл.
  await db.prepare(
    `DELETE FROM jobs WHERE user_id = ?1 AND sent_at IS NULL AND kind = 'launch'`)
    .bind(userId).run();
  await db.prepare(
    `INSERT INTO jobs (user_id, kind, due_at) VALUES (?1, 'launch', ?2)`)
    .bind(userId, whenISO).run();
}

/**
 * День открытия. Накопившийся за две недели человек получает настоящий
 * оффер, и от этого момента начинается обычный догрев — он наконец
 * попадает в цель, потому что покупать теперь есть что.
 */
export async function sendLaunchOffer(env, userId) {
  const payload = await getQuiz(env.DB, userId);
  if (!payload) return;

  const o = await env.DB.prepare(
    `SELECT status FROM orders WHERE user_id = ?1`).bind(userId).first();
  if (o) return;   // уже написал и купил — не толкаем второй раз

  await sendMessage(env.BOT_TOKEN, userId,
    `Открыл.\n\n${offerText(payload)}\n\n_${OFFER_FOOTNOTE}_`, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [[{ text: BTN_CONTACT, callback_data: "contact" }]],
      },
    });
  await sendPdf(env, userId, "offer",
                "Тот же оффер тремя слайдами — чтобы было что перечитать.");
  await logEvent(env.DB, userId, "launch_offer");
  await scheduleWarmup(env.DB, userId);
}
