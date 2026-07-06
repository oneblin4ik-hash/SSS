import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export const runtime = "nodejs";

const Patch = z.object({
  autoReply: z.boolean().optional(),
  unread: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  const conversation = await prisma.conversation.findFirst({ where: { id, account: { userId: user.id } } });
  if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = Patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const updated = await prisma.conversation.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ id: updated.id, autoReply: updated.autoReply, unread: updated.unread });
}
