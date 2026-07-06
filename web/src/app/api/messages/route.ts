import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const messages = await prisma.foundMessage.findMany({
    where: { source: { userId: user.id } },
    orderBy: { postedAt: "desc" },
    take: 100,
    include: { source: { select: { title: true, username: true } } },
  });
  return NextResponse.json(
    messages.map((m) => ({
      id: m.id,
      text: m.text,
      authorName: m.authorName,
      authorUsername: m.authorUsername,
      matchedKeywords: m.matchedKeywords,
      status: m.status,
      postedAt: m.postedAt,
      source: m.source,
    }))
  );
}
