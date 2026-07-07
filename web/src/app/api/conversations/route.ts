import { NextResponse } from "next/server";
import { getDb } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const prisma = getDb();
  const user = await getAuthUser(prisma);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const conversations = await prisma.conversation.findMany({
    where: { account: { userId: user.id } },
    orderBy: { lastMessageAt: "desc" },
    take: 100,
    include: {
      account: { select: { id: true, name: true, phone: true } },
      messages: { orderBy: { createdAt: "asc" }, take: 50 },
    },
  });
  return NextResponse.json(
    conversations.map((c: (typeof conversations)[number]) => ({
      id: c.id,
      peerTgId: c.peerTgId,
      peerUsername: c.peerUsername,
      peerName: c.peerName,
      autoReply: c.autoReply,
      unread: c.unread,
      lastMessageAt: c.lastMessageAt,
      account: c.account,
      messages: c.messages.map((m: (typeof c.messages)[number]) => ({
        id: m.id,
        direction: m.direction,
        text: m.text,
        aiGenerated: m.aiGenerated,
        createdAt: m.createdAt,
      })),
    }))
  );
}
