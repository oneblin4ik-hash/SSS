/* PDF курса.
 *
 * Файлы лежат на том же Cloudflare Pages, что и квиз: папка kurs внутри
 * `quiz-test/dist`. Отдельный проект заводить не стали — этот уже
 * подключён к репозиторию и обновляется сам, а лишняя сущность означала бы
 * лишнюю настройку руками.
 *
 * Первый раз бот отправляет файл по ссылке, Telegram забирает его себе
 * и возвращает file_id. Дальше в сообщение уходит эта строка, а не файл:
 * сорок пять вариантов курса передаются по сети ровно по одному разу
 * за всё время, сколько бы человек ни купило.
 */
import { call } from "./telegram.js";
import { PDF_VER } from "./pdfver.js";

export const BASE = "https://serbolin-kviz.pages.dev/kurs";

/* Как ответы теста превращаются в куски имени файла. */
const SEX = { f: "zh", m: "m" };
const PLACE = { home: "dom", gym: "zal", any: "dom" };   // «ещё не решил» → дом
const GAIN = (gl) => gl === "mass";

/* Дни, где текст один, а страница разная. */
const BY_GOAL = new Set([3, 6, 7]);            // питание
const BY_SEX_PLACE = new Set([4, 9, 11, 13]);  // тренировки

/** Слаг страницы дня под конкретного человека. */
export function daySlug(day, base, q) {
  if (BY_GOAL.has(day)) return GAIN(q.gl) ? `${base}-nabor` : base;
  if (BY_SEX_PLACE.has(day)) {
    return `${base}-${SEX[q.g] || "m"}-${PLACE[q.pl] || "dom"}`;
  }
  return base;
}

/** Программа тренировок: один файл из восьми, пятнадцатый лист. */
export const programSlug = (q) =>
  `kurs-15-programma-${PLACE[q.pl] || "dom"}-` +
  `${GAIN(q.gl) ? "massa" : "pohudenie"}-${SEX[q.g] || "m"}`;

export const RAZBOR_SLUG = "kurs-16-razbor";

/**
 * Отправляет PDF. Первый раз — по ссылке, дальше по file_id из кэша.
 * Если Telegram отказался забирать файл по ссылке, ошибку не глотаем:
 * человек не должен остаться без страницы дня молча.
 */
export async function sendPdf(env, chatId, slug, caption) {
  // Ключ кэша — имя файла плюс отпечаток содержимого. Без отпечатка
  // пересобранный PDF до людей не доезжает: Telegram хранит первую копию,
  // и бот слал бы её вечно. Отпечаток пишет quiz-test/build_deploy.py.
  const ver = PDF_VER[slug];
  const key = ver ? `${slug}@${ver}` : slug;

  const cached = await env.DB.prepare(`SELECT file_id FROM files WHERE slug = ?1`)
    .bind(key).first();

  // ?v= — на случай, если Telegram помнит и сам адрес: с новым отпечатком
  // адрес тоже новый. Pages строку запроса игнорирует и отдаёт тот же файл.
  const url = `${BASE}/${slug}.pdf${ver ? `?v=${ver}` : ""}`;
  const msg = await call(env.BOT_TOKEN, "sendDocument", {
    chat_id: chatId,
    document: cached ? cached.file_id : url,
    ...(caption ? { caption } : {}),
  });

  if (!cached) {
    const id = msg?.document?.file_id;
    if (id) {
      await env.DB.prepare(
        `INSERT INTO files (slug, file_id, at) VALUES (?1, ?2, ?3)
         ON CONFLICT(slug) DO UPDATE SET file_id = excluded.file_id`)
        .bind(key, id, new Date().toISOString()).run();
    }
  }
  return msg;
}
