import Anthropic from "@anthropic-ai/sdk";

/**
 * Generate human-in-the-loop reply drafts for a found message.
 * Returns 1–3 short comment variants. The caller persists them as DraftReply
 * rows that a human reviews and approves before anything is posted.
 */
export async function generateDrafts(input: {
  messageText: string;
  authorName?: string | null;
  tone: string;
  targetChannel?: string | null;
  extraGuidance?: string | null;
}): Promise<string[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY не задан. Добавьте ключ в настройках сервера.");
  }

  const client = new Anthropic({ apiKey });

  const system = [
    "Ты — ассистент SMM-специалиста. Пишешь короткие, естественные комментарии-ответы",
    "на сообщения в Telegram-каналах и чатах от лица реального пользователя.",
    `Тон: ${input.tone}.`,
    input.targetChannel
      ? `Если уместно и ненавязчиво, можно мягко упомянуть канал ${input.targetChannel}, но без спама.`
      : "",
    input.extraGuidance || "",
    "Правила: 1–2 предложения, по-русски, без хэштегов и без эмодзи-спама,",
    "звучит как живой человек, релевантно теме сообщения.",
    "Верни СТРОГО JSON-массив из 3 строк-вариантов, без пояснений.",
  ]
    .filter(Boolean)
    .join(" ");

  const userMsg =
    `Сообщение${input.authorName ? ` от ${input.authorName}` : ""}:\n` +
    `"""${input.messageText}"""\n\n` +
    `Сгенерируй 3 варианта ответа-комментария. Формат: JSON-массив из 3 строк.`;

  const resp = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 1024,
    system,
    messages: [{ role: "user", content: userMsg }],
  });

  const text = resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  return parseVariants(text);
}

export type CommentDecision = {
  shouldComment: boolean;
  relevanceScore: number; // 0–100
  confidence: number; // 0–100
  matchedTriggers: string[];
  commentText: string | null;
  reason: string;
};

/**
 * Relevance-gated comment drafter for auto-neurocommenting. Skip-by-default:
 * returns a structured decision the engine double-gates in code before posting.
 */
export async function draftComment(input: {
  postText: string;
  channelTitle?: string | null;
  tone: string;
  targetChannel?: string | null;
  keywords: string[]; // the user's "comment-worthy intents"
  extraGuidance?: string | null;
}): Promise<CommentDecision> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY не задан. Добавьте ключ в настройках сервера.");

  const client = new Anthropic({ apiKey });

  const system = [
    "Ты — осторожный ассистент SMM-специалиста. Комментировать — это ИСКЛЮЧЕНИЕ, а не правило.",
    "Лучше пропустить 10 релевантных постов, чем оставить 1 комментарий, который выглядит как спам или оффтоп.",
    "Комментарий пишется от лица живого человека, который добавляет ценность или задаёт уместный вопрос —",
    "не рекламный текст. Без выдуманных фактов, личного опыта, статистики и без раскрытия бренда пользователя,",
    "если это не оправдано контекстом.",
    input.keywords.length
      ? `Пост релевантен, только если он реально пересекается с интересами: ${input.keywords.join(", ")}.`
      : "Комментируй только посты, явно связанные с нишей пользователя.",
    input.targetChannel ? `Ниша/оффер пользователя связан с каналом ${input.targetChannel}.` : "",
    `Тон комментария: ${input.tone}.`,
    input.extraGuidance || "",
    "НИКОГДА не комментируй эмоционально заряженные, политические, трагические, медицинские, финансовые",
    "советы или посты про несовершеннолетних, а также посты, которые сами являются рекламой.",
    "Сначала оцени relevanceScore и обоснуй, ПОТОМ решай shouldComment.",
    'Верни СТРОГО JSON: {"shouldComment":bool,"relevanceScore":0-100,"confidence":0-100,' +
      '"matchedTriggers":[..],"reason":"одно предложение","commentText": строка или null}.',
    "commentText должен быть null, если shouldComment=false. Если comment — 1–2 предложения по-русски, без хэштегов и эмодзи-спама.",
  ]
    .filter(Boolean)
    .join(" ");

  const resp = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 800,
    system,
    messages: [
      {
        role: "user",
        content:
          `Пост${input.channelTitle ? ` из ${input.channelTitle}` : ""}:\n"""${input.postText}"""\n\n` +
          `Реши: стоит ли оставить комментарий? Верни только JSON.`,
      },
    ],
  });

  const text = resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  try {
    const d = JSON.parse(cleaned);
    return {
      shouldComment: !!d.shouldComment,
      relevanceScore: Number(d.relevanceScore) || 0,
      confidence: Number(d.confidence) || 0,
      matchedTriggers: Array.isArray(d.matchedTriggers) ? d.matchedTriggers.map(String) : [],
      commentText: typeof d.commentText === "string" && d.commentText.trim() ? d.commentText.trim() : null,
      reason: String(d.reason || ""),
    };
  } catch {
    // Malformed → treat as skip (fail closed).
    return { shouldComment: false, relevanceScore: 0, confidence: 0, matchedTriggers: [], commentText: null, reason: "malformed AI response" };
  }
}

/** Best-effort parse of the model output into up to 3 variant strings. */
function parseVariants(text: string): string[] {
  const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  try {
    const arr = JSON.parse(cleaned);
    if (Array.isArray(arr)) {
      const out = arr.map((x) => String(x).trim()).filter(Boolean);
      if (out.length) return out.slice(0, 3);
    }
  } catch {
    /* fall through */
  }
  const lines = cleaned
    .split("\n")
    .map((l) => l.replace(/^\s*(?:\d+[.)]|[-*])\s*/, "").trim())
    .filter(Boolean);
  return (lines.length ? lines : [cleaned]).slice(0, 3);
}
