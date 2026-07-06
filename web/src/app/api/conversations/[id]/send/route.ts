import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { decrypt } from "@/lib/crypto";
import { proxyToInput } from "@/lib/telegram/account";
import { tg } from "@/lib/telegram/service";

export const runtime = "nodejs";

const Body = z.object({ text: z.string().min(1).max(4096) });

/** Manual reply in a conversation — human takes over for this one message. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  const conversation = await prisma.conversation.findFirst({
    where: { id, account: { userId: user.id } },
    include: { account: { include: { proxy: true } } },
  });
  if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!conversation.account.sessionEnc) return NextResponse.json({ error: "Аккаунт не подключён" }, { status: 400 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const session = await decrypt(conversation.account.sessionEnc);
  const proxy = proxyToInput(conversation.account.proxy);

  try {
    const { tgMessageId } = await tg.sendToPeer({
      session,
      proxy,
      tgUserId: conversation.peerTgId,
      accessHash: conversation.peerAccessHash,
      username: conversation.peerUsername,
      text: parsed.data.text,
    });
    const message = await prisma.chatMessage.create({
      data: { conversationId: id, direction: "OUT", text: parsed.data.text, tgMessageId, aiGenerated: false },
    });
    await prisma.conversation.update({ where: { id }, data: { lastMessageAt: new Date(), unread: false } });
    return NextResponse.json({ id: message.id, direction: message.direction, text: message.text, createdAt: message.createdAt });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Ошибка отправки" }, { status: 400 });
  }
}
