import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { generateDrafts } from "@/lib/ai";
import { toJsonArray } from "@/lib/jsonArray";

export const runtime = "nodejs";

const Body = z.object({ accountId: z.string().optional() });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const prisma = getDb();
  const user = await getAuthUser(prisma);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  const message = await prisma.foundMessage.findFirst({
    where: { id, source: { userId: user.id } },
  });
  if (!message) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  const accountId = parsed.success ? parsed.data.accountId : undefined;

  const account = await prisma.telegramAccount.findFirst({
    where: { userId: user.id, ...(accountId ? { id: accountId } : { status: "ACTIVE" }) },
    orderBy: { lastCheckedAt: "desc" },
  });
  if (!account) return NextResponse.json({ error: "Нет активного аккаунта" }, { status: 400 });

  try {
    const variants = await generateDrafts({
      messageText: message.text,
      authorName: message.authorName,
      tone: account.toneStyle || user.defaultTone,
      targetChannel: user.targetChannel,
      extraGuidance: account.systemPrompt,
    });

    const draft = await prisma.draftReply.create({
      data: {
        foundMessageId: message.id,
        accountId: account.id,
        content: variants[0],
        variants: toJsonArray(variants),
        status: "PENDING",
        aiModel: "claude-opus-4-8",
      },
    });
    await prisma.foundMessage.update({ where: { id: message.id }, data: { status: "DRAFTED" } });

    return NextResponse.json({ draft: { id: draft.id, content: draft.content }, variants });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Ошибка генерации" }, { status: 400 });
  }
}
