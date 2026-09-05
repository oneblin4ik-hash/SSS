-- Таблицы бота. Состав из спеки, раздел 8.
--
-- Держим в D1 (это SQLite внутри Cloudflare). Всё, что нужно на старте:
-- кто пришёл, что ответил в тесте, и лента событий для воронки.
--
-- Применяется один раз:
--   npx wrangler d1 execute serbolin --remote --file=schema.sql

CREATE TABLE IF NOT EXISTS users (
  user_id     INTEGER PRIMARY KEY,   -- id Telegram, он же ключ везде
  username    TEXT,                  -- может не быть вовсе
  name        TEXT,                  -- имя из теста, до него — из Telegram
  gender      TEXT,                  -- 'f' | 'm', появляется после теста
  source      TEXT,                  -- метка из диплинка: quiz, q_ig, q_yt…
  tz          TEXT,                  -- часовой пояс, спрашиваем при выдаче
  created_at  TEXT NOT NULL
);

-- Результат теста. Payload кладём целиком: схема квиза ещё будет меняться,
-- а разбирать его по колонкам заново дороже, чем хранить строкой.
-- Рядом дублируем два поля, по которым режем аудиторию чаще всего.
CREATE TABLE IF NOT EXISTS quiz (
  user_id   INTEGER PRIMARY KEY,
  payload   TEXT NOT NULL,           -- JSON как пришёл из Mini App
  type      TEXT,                    -- t: never | quit | onoff
  exp       TEXT,                    -- ex: самое ценное поле всей воронки
  quiz_at   TEXT NOT NULL
);

-- Лента событий. Одна строка — один шаг человека по воронке.
-- Главные цифры на старте: упёрся в подписку / прошёл её / дошёл до конца
-- теста / сделал День 0 / написал в личку.
CREATE TABLE IF NOT EXISTS events (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id   INTEGER NOT NULL,
  event     TEXT NOT NULL,
  meta      TEXT,
  at        TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS events_user  ON events (user_id, at);
CREATE INDEX IF NOT EXISTS events_kind  ON events (event, at);
