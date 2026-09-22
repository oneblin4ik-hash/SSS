/* Тонкая обёртка над Bot API. Ровно то, что нужно боту, без библиотеки:
   на воркерах каждый лишний килобайт кода — это время холодного старта. */

const API = "https://api.telegram.org/bot";

/** Один вызов метода Bot API. Кидает ошибку с описанием от Telegram —
 *  молчаливые провалы отладить потом невозможно. */
export async function call(token, method, payload = {}) {
  const res = await fetch(`${API}${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!data.ok) {
    throw new Error(`${method}: ${data.description || res.status}`);
  }
  return data.result;
}

/* Разметка Telegram — минное поле, и мина всегда чужая.
 *
 * Одиночная звёздочка, подчёркивание или квадратная скобка ломают разбор,
 * и Bot API не отправляет сообщение ВООБЩЕ: отвечает ошибкой. А чужой текст
 * попадает внутрь наших сообщений постоянно — имя из теста, юзернейм в
 * карточке заявки, ответ своими словами в «Дне 0». Юзернеймы с
 * подчёркиванием встречаются через один: @ivan_petrov — это уже нечётное
 * подчёркивание и карточка, которая не придёт.
 *
 * Поэтому перед отправкой считаем маркеры. Не сходятся — отправляем то же
 * самое без разметки: человек увидит звёздочки вместо жирного, но увидит.
 * Потерять сообщение целиком хуже, чем потерять его оформление. */
const balanced = (text) => {
  for (const ch of ["*", "_", "`"]) {
    if ((text.split(ch).length - 1) % 2) return false;
  }
  // Ссылка в разметке — это «[подпись](адрес)». Скобка без пары значит,
  // что Telegram будет искать конец ссылки до конца сообщения и не найдёт.
  return text.split("[").length === text.split("](").length;
};

export const sendMessage = (token, chat_id, text, extra = {}) => {
  const safe = extra.parse_mode && !balanced(text)
    ? { ...extra, parse_mode: undefined }
    : extra;
  return call(token, "sendMessage", { chat_id, text, ...safe });
};

/** Чужой текст, который встанет внутрь наших звёздочек. Маркеры из него
 *  убираем: в имени и в ответе своими словами им делать нечего, а без
 *  них оформление вокруг не разъедется. */
export const plain = (s) =>
  String(s ?? "").replace(/[*_`\[\]]/g, "").trim();

export const answerCallback = (token, id, text, alert = false) =>
  call(token, "answerCallbackQuery", {
    callback_query_id: id,
    text,
    show_alert: alert,
  });

/* Статусы, при которых человек считается подписчиком. §2а спеки. */
const SUBSCRIBED = new Set(["creator", "administrator", "member"]);

/**
 * Подписан ли человек на канал. Проверка живая, при каждом нажатии:
 * запомнить один раз и верить на слово нельзя — отпишется через минуту.
 *
 * Бот обязан быть админом канала, иначе Telegram на getChatMember не ответит.
 * Прав при этом не нужно никаких: боту надо только читать состав.
 */
export async function isSubscribed(token, channel, userId) {
  let member;
  try {
    member = await call(token, "getChatMember", {
      chat_id: channel,
      user_id: userId,
    });
  } catch {
    // Человека в канале нет — Telegram отвечает ошибкой, а не пустотой.
    return false;
  }
  // «Ограничен» разбирается отдельно: человек может числиться в канале
  // и при этом быть лишён права писать. Для нас он подписчик.
  if (member.status === "restricted") return Boolean(member.is_member);
  return SUBSCRIBED.has(member.status);
}
