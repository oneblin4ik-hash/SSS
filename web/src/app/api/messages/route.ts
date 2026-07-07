import { NextResponse } from "next/server";
import { getDb } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { fromJsonArray } from "@/lib/jsonArray";

export const runtime = "nodejs";

export async function GET() {
  const prisma = getDb();
  const user = await getAuthUser(prisma);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const messages = await prisma.foundMessage.findMany({
    where: { source: { userId: user.id } },
    orderBy: { postedAt: "desc" },
    take: 100,
    include: { source: { select: { title: true, username: true } } },
  });
  return NextResponse.json(
    messages.map((m: (typeof messages)[number]) => ({
      id: m.id,
      text: m.text,
      authorName: m.authorName,
      authorUsername: m.authorUsername,
      matchedKeywords: fromJsonArray(m.matchedKeywords),
      status: m.status,
      postedAt: m.postedAt,
      source: m.source,
    }))
  );
}
