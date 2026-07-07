import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export const runtime = "nodejs";

const Patch = z.object({
  proxyId: z.string().nullable().optional(),
  toneStyle: z.string().min(1).max(200).optional(),
  systemPrompt: z.string().max(2000).nullable().optional(),
  dailyReplyLimit: z.number().int().min(1).max(200).optional(),
  autoReplyEnabled: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const prisma = getDb();
  const user = await getAuthUser(prisma);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  const account = await prisma.telegramAccount.findFirst({ where: { id, userId: user.id } });
  if (!account) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = Patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const updated = await prisma.telegramAccount.update({ where: { id }, data: parsed.data });
  return NextResponse.json({
    id: updated.id,
    proxyId: updated.proxyId,
    toneStyle: updated.toneStyle,
    systemPrompt: updated.systemPrompt,
    dailyReplyLimit: updated.dailyReplyLimit,
    autoReplyEnabled: updated.autoReplyEnabled,
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const prisma = getDb();
  const user = await getAuthUser(prisma);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  const account = await prisma.telegramAccount.findFirst({ where: { id, userId: user.id } });
  if (!account) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.telegramAccount.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
