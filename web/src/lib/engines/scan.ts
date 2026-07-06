import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { proxyToInput } from "@/lib/telegram/account";
import { tg } from "@/lib/telegram/service";

/**
 * Scan a MonitoredSource for fresh posts and persist any not already seen.
 * Shared by the manual "Скан" button and the auto-comment engine so the
 * scan+dedup logic (keyed on [tgChatId,tgMessageId]) exists in exactly one place.
 */
export async function scanSource(
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
  const seen = new Set(existing.map((e) => e.tgMessageId));
  const fresh = scan.messages.filter((m) => !seen.has(m.tgMessageId));

  if (fresh.length) {
    await prisma.foundMessage.createMany({
      data: fresh.map((m) => ({
        sourceId,
        tgChatId: m.tgChatId,
        tgMessageId: m.tgMessageId,
        text: m.text,
        postedAt: new Date(m.postedAt),
        matchedKeywords: m.matchedKeywords,
        authorName: m.authorName,
        authorUsername: m.authorUsername,
        authorTgId: m.authorTgId,
      })),
      skipDuplicates: true,
    });
  }

  await prisma.monitoredSource.update({
    where: { id: sourceId },
    data: { lastScanAt: new Date(), tgId: scan.chatId, title: source.title || scan.title },
  });

  return { scanned: scan.messages.length, fresh: fresh.length, chatId: scan.chatId, title: scan.title };
}
