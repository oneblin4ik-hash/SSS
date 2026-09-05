/* Доступ к D1. Ничего умного: три функции, которые нужны первому заходу. */

const now = () => new Date().toISOString();

/**
 * Заводит человека при первом /start и не трогает уже заведённого.
 * Источник пишем только один раз — при повторном /start с другим диплинком
 * перезаписывать нельзя, иначе потеряем, откуда человек пришёл на самом деле.
 */
export async function upsertUser(db, { userId, username, name, source }) {
  await db
    .prepare(
      `INSERT INTO users (user_id, username, name, source, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5)
       ON CONFLICT(user_id) DO UPDATE SET
         username = COALESCE(excluded.username, users.username),
         name     = COALESCE(users.name, excluded.name)`,
    )
    .bind(userId, username ?? null, name ?? null, source ?? null, now())
    .run();
}

/** Событие воронки. Пишем всегда, даже когда кажется, что незачем:
 *  восстановить пропущенное событие задним числом нельзя. */
export async function logEvent(db, userId, event, meta = null) {
  await db
    .prepare(`INSERT INTO events (user_id, event, meta, at) VALUES (?1, ?2, ?3, ?4)`)
    .bind(userId, event, meta ? JSON.stringify(meta) : null, now())
    .run();
}

/** Результат теста. Перепрохождение затирает прошлый — человеку показываем
 *  то, что он ответил в последний раз, а не первый. */
export async function saveQuiz(db, userId, payload) {
  await db.batch([
    db
      .prepare(
        `INSERT INTO quiz (user_id, payload, type, exp, quiz_at)
         VALUES (?1, ?2, ?3, ?4, ?5)
         ON CONFLICT(user_id) DO UPDATE SET
           payload = excluded.payload,
           type    = excluded.type,
           exp     = excluded.exp,
           quiz_at = excluded.quiz_at`,
      )
      .bind(userId, JSON.stringify(payload), payload.t ?? null, payload.ex ?? null, now()),
    db
      .prepare(`UPDATE users SET name = ?2, gender = ?3 WHERE user_id = ?1`)
      .bind(userId, payload.n ?? null, payload.g ?? null),
  ]);
}
