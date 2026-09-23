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
 * (/setdescriptionpic). Там стоит мультяшный Эдуард — его не трогаем. */
import { call } from "./telegram.js";

const PROFILE_VERSION = "2026-09-23";

/* Пустой чат, до первого нажатия. Предел Telegram — 512 знаков. */
export const DESCRIPTION =
  "Всем привет кто здоров и болен, на базе Эдуард Серболин 👋\n\n" +
  "12 лет тренирую людей онлайн, через меня прошло больше тысячи человек.\n\n" +
  "Здесь короткий тест — пара минут. Узнаешь свой тип старта: с нуля, " +
  "после паузы или рывками. Дальше День 0 — твоя стартовая точка: режим, " +
  "окна под тренировки и место, где обычно всё ломается.\n\n" +
  "Без жёстких диет и тренировок до упаду. Жми кнопку внизу 👇";

/* Профиль бота и превью ссылки при пересылке. Предел — 120 знаков. */
export const SHORT_DESCRIPTION =
  "Тест на пару минут: твой тип старта и с чего начать путь к форме. " +
  "Эдуард Серболин, тренер.";

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

  await env.DB.prepare(
    `INSERT INTO events (user_id, event, meta, at) VALUES (0, 'bot_profile', ?1, ?2)`)
    .bind(PROFILE_VERSION, new Date().toISOString()).run();
  done = true;
}
