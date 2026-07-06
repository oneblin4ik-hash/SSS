import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const sources = await prisma.monitoredSource.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { messages: true } } },
  });
  return NextResponse.json(
    sources.map((s) => ({
      id: s.id,
      type: s.type,
      title: s.title,
      username: s.username,
      isActive: s.isActive,
      lastScanAt: s.lastScanAt,
      messageCount: s._count.messages,
      autoComment: s.autoComment,
      autoAccountIds: s.autoAccountIds,
      autoDailyLimit: s.autoDailyLimit,
      autoTone: s.autoTone,
      createdAt: s.createdAt,
    }))
  );
}

const Body = z.object({
  type: z.enum(["CHANNEL", "GROUP"]),
  handle: z.string().min(2), // @name, t.me/name, or a title
});

/** Normalize a user-entered handle/link into a clean @username or raw title. */
function normalize(handle: string): { username: string | null; title: string } {
  const trimmed = handle.trim();
  const m = trimmed.match(/(?:t\.me\/|@)([a-zA-Z0-9_]+)/);
  if (m) return { username: m[1], title: m[1] };
  return { username: null, title: trimmed };
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "type и ссылка обязательны" }, { status: 400 });
  }
  const { username, title } = normalize(parsed.data.handle);

  const source = await prisma.monitoredSource.create({
    data: { userId: user.id, type: parsed.data.type, title, username },
  });
  return NextResponse.json({
    id: source.id,
    type: source.type,
    title: source.title,
    username: source.username,
    isActive: source.isActive,
    lastScanAt: source.lastScanAt,
    messageCount: 0,
    autoComment: source.autoComment,
    autoAccountIds: source.autoAccountIds,
    autoDailyLimit: source.autoDailyLimit,
    autoTone: source.autoTone,
    createdAt: source.createdAt,
  });
}
