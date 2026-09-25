/* Витрина бота: описание в пустом чате, короткое описание в профиле
 * и меню команд.
 *
 * Всё это живёт не в сообщениях, а в настройках бота у Telegram, и раньше
 * там стояло наследство старого конструктора: приветствие про «гайд» и
 * команда /command1 «ПОДПИСАТЬСЯ», которая ничего не делала. Первое, что
 * видел человек, открыв бота, было не про наш тест.
 *
 * Настройки выставляет сам бот, при первом обращении после выкладки, —
 * как и схему базы. Руками через BotFather ничего делать не надо: поменял
 * тексты здесь, поднял PROFILE_VERSION — и после выкладки они на месте.
 *
 * Картинку над описанием API менять не умеет, это только BotFather
 * (/setdescriptionpic). Там стоит мультяшный Эдуард — его не трогаем.
 * Аватарку бот ставит сам: setMyProfilePhoto появился в Bot API 10. */
import { call } from "./telegram.js";

const PROFILE_VERSION = "2026-09-25";

/* Имя в списке чатов. Телефон показывает около 22 знаков — остальное
   обрезает, как было со старым «Mr. Serbolin - ПОЛЕЗ…». Выбор владельца,
   вариант 1: кто и что за продукт. */
export const NAME = "Серболин · Первые шаги";

/* Аватарка: мультяшный Эдуард на тёмном фоне с золотым кольцом. Мультяшный
   намеренно — бот не должен выглядеть как личный аккаунт Эдуарда, иначе
   ему пишут как человеку и ждут ответа, а бот на обычный текст молчит.
   Файл лежит на Pages рядом с квизом: quiz-test/dist/bot/avatar.jpg. */
const AVATAR_URL = "https://serbolin-kviz.pages.dev/bot/avatar.jpg";

/* Пустой чат, до первого нажатия. Предел Telegram — 512 знаков. */
export const DESCRIPTION =
  "Всем привет кто здоров и болен, на базе Эдуард Серболин 👋\n\n" +
  "Тест на две минуты: твой тип старта и с чего начать. Дальше — День 0 " +
  "и курс «Первые шаги к форме».\n\n" +
  "12 лет тренирую людей онлайн, через меня прошло больше тысячи человек.\n\n" +
  "Жми кнопку внизу 👇";

/* Профиль бота и превью ссылки при пересылке. Предел — 120 знаков. */
export const SHORT_DESCRIPTION =
  "Тест на две минуты: твой тип старта и с чего начать. " +
  "Курс «Первые шаги к форме» от Эдуарда Серболина.";

/* Меню для всех. Одна команда — больше человеку и не нужно: всё остальное
   бот предлагает сам, кнопками. */
export const COMMANDS = [
  { command: "start", description: "Начать: тест и День 0" },
];

/* Меню владельца — только в его чате. Служебные команды на виду у всех
   путали бы людей, а самому Эдуарду их иначе негде вспомнить. */
const ADMIN_COMMANDS = [
  ...COMMANDS,
  { command: "waiting", description: "Кто ждёт ответа по заявке" },
  { command: "tick", description: "Протолкнуть очередь рассылок" },
  { command: "probeg", description: "Прогнать весь курс себе" },
  { command: "id", description: "Мой Telegram id" },
];

let done = false;

export async function ensureProfile(env) {
  if (done) return;
  const applied = await env.DB.prepare(
    `SELECT 1 a FROM events WHERE user_id = 0 AND event = 'bot_profile' AND meta = ?1`)
    .bind(PROFILE_VERSION).first();
  if (applied) { done = true; return; }

  const t = env.BOT_TOKEN;
  // Ставим и без языка, и для русского. Старый конструктор мог записать
  // тексты под language_code=ru — такие у русскоязычного человека
  // перекрывают общие, и без явной перезаписи он видел бы старьё.
  for (const lang of [{}, { language_code: "ru" }]) {
    await call(t, "setMyName", { name: NAME, ...lang });
    await call(t, "setMyDescription", { description: DESCRIPTION, ...lang });
    await call(t, "setMyShortDescription", { short_description: SHORT_DESCRIPTION, ...lang });
    await call(t, "setMyCommands", { commands: COMMANDS, ...lang });
    // Меню «для всех личных чатов» перекрывает общее. Если конструктор
    // клал /command1 туда — удаляем, иначе наше меню не будет видно.
    await call(t, "deleteMyCommands", { scope: { type: "all_private_chats" }, ...lang });
  }
  if (env.ADMIN_ID) {
    await call(t, "setMyCommands", {
      commands: ADMIN_COMMANDS,
      scope: { type: "chat", chat_id: Number(env.ADMIN_ID) },
    });
  }

  // Аватарка отдельно и без права уронить остальное: тексты уже стоят,
  // и если картинка не встала, пусть это не откатывает их в «не сделано».
  // Не встала — запишем причину в ленту и попробуем на следующей версии.
  try {
    await setAvatar(env);
  } catch (e) {
    await env.DB.prepare(
      `INSERT INTO events (user_id, event, meta, at) VALUES (0, 'bot_avatar_failed', ?1, ?2)`)
      .bind(String(e?.message || e).slice(0, 300), new Date().toISOString()).run();
  }

  await env.DB.prepare(
    `INSERT INTO events (user_id, event, meta, at) VALUES (0, 'bot_profile', ?1, ?2)`)
    .bind(PROFILE_VERSION, new Date().toISOString()).run();
  done = true;
}

/* setMyProfilePhoto принимает только загрузку файла, не ссылку: фото
   профиля нельзя переиспользовать по file_id. Поэтому забираем картинку
   с Pages и отдаём её Telegram как multipart. */
async function setAvatar(env) {
  const img = await fetch(AVATAR_URL);
  if (!img.ok) throw new Error(`аватарка не скачалась: HTTP ${img.status}`);
  const form = new FormData();
  form.append("photo", JSON.stringify({ type: "static", photo: "attach://avatar" }));
  form.append("avatar", new Blob([await img.arrayBuffer()], { type: "image/jpeg" }), "avatar.jpg");
  const res = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/setMyProfilePhoto`,
                          { method: "POST", body: form });
  const data = await res.json();
  if (!data.ok) throw new Error(`setMyProfilePhoto: ${data.description || res.status}`);
}
