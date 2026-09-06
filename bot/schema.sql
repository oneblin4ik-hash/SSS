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

-- «День 0»: четыре ответа свободным текстом. Храним и сырой ответ, и то,
-- что удалось из него разобрать. Разобрать выходит не всегда — человек
-- пишет «встал в семь, лёг в полночь», — и тогда в карточке стоит его
-- собственная фраза, а не выдуманное нами число.
CREATE TABLE IF NOT EXISTS day0 (
  user_id      INTEGER PRIMARY KEY,
  sleep_raw    TEXT,      -- ответ на вопрос про подъём и отбой, как есть
  wake         TEXT,      -- разобранное время подъёма, если вышло
  sleep        TEXT,      -- разобранное время отбоя, если вышло
  hours        REAL,      -- часов сна, если удалось посчитать
  windows_raw  TEXT,      -- ответ про свободные окна, как есть
  window1      TEXT,
  window2      TEXT,
  hunger_time  TEXT,      -- зона риска
  dinner_txt   TEXT,      -- что ел вчера после 19:00
  done_at      TEXT
);

-- Состояние диалога: на каком вопросе «Дня 0» человек стоит.
-- NULL — диалога нет. Отдельной таблицы не заводим, шаг всего один.
ALTER TABLE users ADD COLUMN state TEXT;
