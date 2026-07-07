import type { PrismaClient } from "@prisma/client";
import { proxyToInput } from "@/lib/telegram/account";
import { tg } from "@/lib/telegram/service";
import { toJsonArray } from "@/lib/jsonArray";

/**
 * Scan a MonitoredSource for fresh posts and persist any not already seen.
 * Shared by the manual "Скан" button and the auto-comment engine so the
 * scan+dedup logic (keyed on [tgChatId,tgMessageId]) exists in exactly one place.
 */
export async function scanSource(
  prisma: PrismaClient,
  sourceId: string,
  opts: { session: string; proxy: ReturnType<typeof proxyToInput>; keywords?: string[]; sinceHours?: number; limit?: number }
): Promise<{ scanned: number; fresh: number; chatId: string; title: string }> {
  const source = await prisma.monitoredSource.findUniqueOrThrow({ where: { id: sourceId } });
  const channel = source.username || source.tgId;
  if (!channel) throw new Error("У источника нет @username или id");

  const scan = await tg.scan({
    session: opts.session,
    proxy: opts.proxy,
    channel,
    keywords: opts.keywords ?? [],
    sinceHours: opts.sinceHours ?? 48,
    limit: opts.limit ?? 100,
  });

  const ids = scan.messages.map((m) => m.tgMessageId);
  const existing = await prisma.foundMessage.findMany({
    where: { tgChatId: scan.chatId, tgMessageId: { in: ids } },
    select: { tgMessageId: true },
  });
  const seen = new Set(existing.map((e: { tgMessageId: string }) => e.tgMessageId));
  const fresh = scan.messages.filter((m) => !seen.has(m.tgMessageId));

  // D1/SQLite's createMany has no skipDuplicates support (unlike Postgres) —
  // insert one at a time and swallow unique-constraint hits (a concurrent
  // tick may have inserted the same [tgChatId,tgMessageId] in the meantime).
  for (const m of fresh) {
    await prisma.foundMessage
      .create({
        data: {
          sourceId,
          tgChatId: m.tgChatId,
          tgMessageId: m.tgMessageId,
          text: m.text,
          postedAt: new Date(m.postedAt),
          matchedKeywords: toJsonArray(m.matchedKeywords),
          authorName: m.authorName,
          authorUsername: m.authorUsername,
          authorTgId: m.authorTgId,
        },
      })
      .catch(() => {});
  }

  await prisma.monitoredSource.update({
    where: { id: sourceId },
    data: { lastScanAt: new Date(), tgId: scan.chatId, title: source.title || scan.title },
  });

  return { scanned: scan.messages.length, fresh: fresh.length, chatId: scan.chatId, title: scan.title };
}
