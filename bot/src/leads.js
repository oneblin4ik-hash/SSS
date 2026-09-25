/* Команда `/leads` — все, кто прошёл тест, одной таблицей владельцу.
 *
 * База и так хранит каждого: профиль Telegram, ответы теста, «День 0»,
 * заявку и прогресс по курсу. Не было способа это забрать. Теперь Эдуард
 * пишет боту /leads и получает файл, который открывается в Excel или
 * Google Таблицах прямо с телефона.
 *
 * Формат — CSV с точкой с запятой и BOM в начале. Русский Excel без BOM
 * показывает кириллицу кракозябрами, а запятую не считает разделителем:
 * вся строка уезжает в одну ячейку. С этими двумя деталями файл просто
 * открывается двойным нажатием. */
import { sendMessage, upload } from "./telegram.js";

const SEX = { f: "Ж", m: "М" };
const GOAL = { loss: "Похудеть", mass: "Набрать массу", tone: "Прийти в форму" };
const ZONE = { belly: "Живот и талия", legs: "Ноги и ягодицы", top: "Руки, плечи, грудь",
               back: "Спина и осанка", all: "Всё тело" };
const EXP = { never: "Не занимался(ась)", quit: "Занимался(ась), бросил(а)",
              onoff: "То начнёт, то бросит" };
const LAST = { m1: "Меньше месяца назад", m6: "Полгода назад", y1: "Около года назад",
               long: "Больше двух лет" };
const DID = { gym: "Зал", home: "Дома", cardio: "Бег, ходьба, вело", group: "Группы",
              diet: "Только питание", sport: "Секция в юности" };
const PLACE = { home: "Дома", gym: "В зале", any: "Не решил(а)" };
const MINS = { 15: "До 15 мин", 30: "Около 30 мин", 45: "40–60 мин", 90: "Больше часа" };
const HEALTH = { back: "Спина", knee: "Колени, суставы", heart: "Сердце, давление, астма",
                 diab: "Диабет", joint: "Голеностоп, кисти", food: "Непереносимость продуктов",
                 none: "Нет" };
const TYPE = { never: "Чистый лист", quit: "Второй заход", onoff: "Рывками" };
const ORDER = { awaiting: "Ждёт ответа", paid: "Оплачено", declined: "Отказ" };

const COLUMNS = [
  "Дата теста (МСК)", "Имя", "Telegram", "Ссылка", "ID", "Пол", "Возраст", "Рост",
  "Вес", "Желаемый вес", "ИМТ", "Цель", "Зона", "Опыт", "Последний раз", "Что делал(а)",
  "Где тренироваться", "Минут на тренировку", "Раз в неделю", "Здоровье", "Тип старта",
  "Откуда пришёл", "Подписан на канал", "День 0", "Окна для тренировок", "Зона риска",
  "Заявка", "Дней курса получено",
];

const one = (map, v) => (v == null || v === "" ? "" : map[v] ?? String(v));
const many = (map, v) => (Array.isArray(v) ? v : v ? [v] : []).map((x) => one(map, x)).join(", ");

/* Дата в московском времени: так её читает Эдуард, а в базе всё в UTC. */
function msk(iso) {
  const t = Date.parse(iso || "");
  if (!Number.isFinite(t)) return "";
  const d = new Date(t + 3 * 3600e3);
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getUTCDate())}.${p(d.getUTCMonth() + 1)}.${d.getUTCFullYear()} ` +
         `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

/* Ячейка CSV. Кавычки удваиваем, а текст, который начинается с = + - @,
   гасим апострофом: иначе Excel примет ответ человека за формулу. Имя
   и «зона риска» — свободный текст, и написать туда можно что угодно. */
function cell(v) {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
}

export function buildCsv(rows) {
  const lines = [COLUMNS.map(cell).join(";")];
  for (const r of rows) {
    let q = {};
    try { q = JSON.parse(r.payload); } catch { /* битый payload — выведем, что есть */ }
    lines.push([
      msk(r.quiz_at), q.n || r.name || "", r.username || "",
      // Без юзернейма ссылка по id: в приложении Telegram она открывает
      // профиль того, кто уже писал тебе, — а все из таблицы писали боту.
      r.username ? `https://t.me/${r.username}` : `tg://user?id=${r.user_id}`, r.user_id,
      // ИМТ через запятую: «23.4» русский Excel превращает в дату, 23 апреля.
      one(SEX, q.g), q.a ?? "", q.h ?? "", q.w ?? "", q.wg ?? "",
      q.bmi == null ? "" : String(q.bmi).replace(".", ","),
      one(GOAL, q.gl), one(ZONE, q.zn), one(EXP, q.ex), one(LAST, q.ls), many(DID, q.dd),
      one(PLACE, q.pl), one(MINS, q.mn), q.fq ?? "", many(HEALTH, q.hl), one(TYPE, q.t),
      r.source || "", r.sub_ok ? "да" : "нет", r.day0_done ? "да" : "нет",
      r.windows_raw || "", r.hunger_time || "",
      r.order_status ? one(ORDER, r.order_status) : "Не писал(а)", r.days ?? 0,
    ].map(cell).join(";"));
  }
  return "﻿" + lines.join("\r\n") + "\r\n";
}

export async function onLeads(env, msg) {
  if (String(msg.from.id) !== String(env.ADMIN_ID)) return;

  const { results } = await env.DB.prepare(`
    SELECT u.user_id, u.username, u.name, u.source, q.payload, q.quiz_at,
           d.done_at AS day0_done, d.windows_raw, d.hunger_time,
           o.status AS order_status,
           (SELECT MAX(day) FROM progress p WHERE p.user_id = u.user_id) AS days,
           EXISTS (SELECT 1 FROM events e
                    WHERE e.user_id = u.user_id AND e.event = 'sub_ok') AS sub_ok
      FROM quiz q
      JOIN users u ON u.user_id = q.user_id
      LEFT JOIN day0 d ON d.user_id = u.user_id
      LEFT JOIN orders o ON o.user_id = u.user_id
     ORDER BY q.quiz_at DESC`).all();

  if (!results.length) {
    return sendMessage(env.BOT_TOKEN, msg.chat.id, "Тест пока никто не прошёл.");
  }

  // Короткая воронка в подписи к файлу: открывать таблицу ради пяти цифр
  // незачем, а по ним сразу видно, где люди отваливаются.
  const n = results.length;
  const count = (f) => results.filter(f).length;
  const caption =
    `Прошли тест: ${n}\n` +
    `Подписались на канал: ${count((r) => r.sub_ok)}\n` +
    `Сделали День 0: ${count((r) => r.day0_done)}\n` +
    `Написали тебе: ${count((r) => r.order_status)}\n` +
    `Оплатили: ${count((r) => r.order_status === "paid")}`;

  const day = new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10);
  await upload(env.BOT_TOKEN, "sendDocument", { chat_id: msg.chat.id, caption },
               "document", new Blob([buildCsv(results)], { type: "text/csv" }),
               `ucheniki-${day}.csv`);
}
