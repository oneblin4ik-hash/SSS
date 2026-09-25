/* Схема базы накатывается сама, при первом запросе после выкладки.
 *
 * Так сделано не от хорошей жизни. Накатывать таблицы руками — отдельный
 * шаг, который выполняет человек, а значит однажды его забудут. Цена
 * забытого шага здесь предельно конкретная: код уже умеет присылать урок,
 * а таблицы, куда он пишет прогресс, ещё нет — и урок не уходит.
 *
 * Стоит это почти ничего: `CREATE TABLE IF NOT EXISTS` на существующей
 * таблице ничего не делает, а флаг ниже держится, пока жив изолят,
 * то есть проверка идёт раз в несколько минут, а не на каждый запрос.
 *
 * Источник схемы — `schema.sql`. Здесь её копия, потому что воркер
 * не читает файлов с диска. Меняешь там — меняй и тут.
 */

let ready = false;

const TABLES = [
  `CREATE TABLE IF NOT EXISTS users (
     user_id INTEGER PRIMARY KEY, username TEXT, name TEXT, gender TEXT,
     source TEXT, tz TEXT, created_at TEXT NOT NULL, state TEXT,
     unsub INTEGER DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS quiz (
     user_id INTEGER PRIMARY KEY, payload TEXT NOT NULL, type TEXT,
     exp TEXT, quiz_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS events (
     id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL,
     event TEXT NOT NULL, meta TEXT, at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS day0 (
     user_id INTEGER PRIMARY KEY, sleep_raw TEXT, wake TEXT, sleep TEXT,
     hours REAL, windows_raw TEXT, window1 TEXT, window2 TEXT,
     hunger_time TEXT, dinner_txt TEXT, done_at TEXT)`,
  `CREATE TABLE IF NOT EXISTS orders (
     user_id INTEGER PRIMARY KEY, code TEXT NOT NULL, status TEXT NOT NULL,
     at TEXT NOT NULL, closed_at TEXT)`,
  `CREATE TABLE IF NOT EXISTS jobs (
     id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL,
     kind TEXT NOT NULL, due_at TEXT NOT NULL, sent_at TEXT)`,
  `CREATE TABLE IF NOT EXISTS progress (
     user_id INTEGER NOT NULL, day INTEGER NOT NULL, sent_at TEXT,
     checkin TEXT, at TEXT, PRIMARY KEY (user_id, day))`,
  `CREATE TABLE IF NOT EXISTS files (
     slug TEXT PRIMARY KEY, file_id TEXT NOT NULL, at TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS events_user ON events (user_id, at)`,
  `CREATE INDEX IF NOT EXISTS events_kind ON events (event, at)`,
  `CREATE INDEX IF NOT EXISTS jobs_due ON jobs (due_at) WHERE sent_at IS NULL`,
];

/* Колонки, добавленные к уже существующей таблице. IF NOT EXISTS у ALTER
   не бывает, поэтому просто пробуем и глотаем отказ: «колонка уже есть» —
   это ровно то состояние, которого мы добиваемся. */
const COLUMNS = [
  `ALTER TABLE users ADD COLUMN state TEXT`,
  `ALTER TABLE users ADD COLUMN unsub INTEGER DEFAULT 0`,
  `ALTER TABLE users ADD COLUMN tz TEXT`,
];

export async function ensureSchema(db) {
  if (ready) return;
  for (const sql of TABLES) await db.prepare(sql).run();
  for (const sql of COLUMNS) {
    try {
      await db.prepare(sql).run();
    } catch {
      /* колонка уже на месте */
    }
  }
  ready = true;
}
