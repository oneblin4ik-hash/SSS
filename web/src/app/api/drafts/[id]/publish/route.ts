import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { decrypt } from "@/lib/crypto";
import { tg } from "@/lib/telegram/service";
import { proxyToInput } from "@/lib/telegram/account";

export const runtime = "nodejs";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  const draft = await prisma.draftReply.findFirst({
    where: { id, account: { userId: user.id } },
    include: { account: { include: { proxy: true } }, foundMessage: true },
  });
  if (!draft) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (draft.status === "PUBLISHED") {
    return NextResponse.json({ error: "Уже опубликовано" }, { status: 400 });
  }
  if (!draft.account.sessionEnc) {
    return NextResponse.json({ error: "У аккаунта нет активной сессии" }, { status: 400 });
  }

  const text = draft.editedContent ?? draft.content;

  try {
    const session = await decrypt(draft.account.sessionEnc);
    const { tgMessageId } = await tg.post({
      session,
      proxy: proxyToInput(draft.account.proxy),
      chatId: draft.foundMessage.tgChatId,
      replyToMsgId: draft.foundMessage.tgMessageId,
      text,
    });

    const updated = await prisma.draftReply.update({
      where: { id },
      data: { status: "PUBLISHED", publishedAt: new Date(), tgMessageId },
    });
    await prisma.analyticsEvent.create({
      data: { type: "REPLY_PUBLISHED", accountId: draft.accountId, draftReplyId: draft.id },
    });
    return NextResponse.json({ id: updated.id, status: updated.status, tgMessageId: updated.tgMessageId });
  } catch (e: any) {
    await prisma.draftReply.update({ where: { id }, data: { status: "FAILED" } });
    return NextResponse.json({ error: e?.message || "Ошибка публикации" }, { status: 400 });
  }
}
