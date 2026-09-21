-- Таблицы бота. Состав из спеки, раздел 8.
--
-- Держим в D1 (это SQLite внутри Cloudflare). Всё, что нужно на старте:
-- кто пришёл, что ответил в тесте, и лента событий для воронки.
--
-- РУКАМИ ЗАПУСКАТЬ НЕ НАДО. Бот накатывает схему сам, при первом запросе
-- после выкладки — см. `src/migrate.js`. Этот файл остаётся документацией:
-- здесь схема с комментариями, там та же схема одной строкой на таблицу.
--
-- Прогон сверяет два списка и падает, если они разъехались. Добавил
-- таблицу сюда — добавь и в migrate.js, иначе в проде её не будет.
--
-- Если всё-таки понадобится накатить вручную:
--   npx wrangler d1 execute serbolin-bot --remote --file=schema.sql

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

-- Заявки. Платёжной системы нет: человек пишет в личку, Эдуард называет
-- реквизиты и включает курс руками. Заявка живёт, пока по ней не нажали
-- одну из двух кнопок — по таймауту ничего не удаляем, иначе человек
-- потеряется молча.
CREATE TABLE IF NOT EXISTS orders (
  user_id  INTEGER PRIMARY KEY,
  code     TEXT NOT NULL,
  status   TEXT NOT NULL,          -- awaiting | paid | declined
  at       TEXT NOT NULL,
  closed_at TEXT
);

-- Отложенные отправки: догрев и напоминание Эдуарду о висящей заявке.
-- Крон раз в четверть часа забирает всё, чему пришёл срок.
CREATE TABLE IF NOT EXISTS jobs (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id  INTEGER NOT NULL,
  kind     TEXT NOT NULL,
  due_at   TEXT NOT NULL,
  sent_at  TEXT
);
CREATE INDEX IF NOT EXISTS jobs_due ON jobs (due_at) WHERE sent_at IS NULL;

-- Отписка от догрева. Кнопка обязана работать с первого нажатия.
ALTER TABLE users ADD COLUMN unsub INTEGER DEFAULT 0;

-- Прогресс по курсу: какой день отправлен и что человек ответил вечером.
CREATE TABLE IF NOT EXISTS progress (
  user_id   INTEGER NOT NULL,
  day       INTEGER NOT NULL,
  sent_at   TEXT,
  checkin   TEXT,             -- done | failed | NULL
  at        TEXT,
  PRIMARY KEY (user_id, day)
);

-- Кэш file_id. Telegram хранит файлы у себя: после первой отправки он
-- отдаёт короткий идентификатор, и дальше бот шлёт не файл, а строку.
-- Без кэша каждая отправка тянула бы PDF заново — трафик на пустом месте
-- и лишняя точка отказа.
CREATE TABLE IF NOT EXISTS files (
  slug     TEXT PRIMARY KEY,
  file_id  TEXT NOT NULL,
  at       TEXT NOT NULL
);
