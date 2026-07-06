import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export const runtime = "nodejs";

const Patch = z.object({
  isActive: z.boolean().optional(),
  autoComment: z.boolean().optional(),
  autoAccountIds: z.array(z.string()).optional(),
  autoDailyLimit: z.number().int().min(1).max(100).optional(),
  autoTone: z.string().max(200).nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  const source = await prisma.monitoredSource.findFirst({ where: { id, userId: user.id } });
  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = Patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const updated = await prisma.monitoredSource.update({ where: { id }, data: parsed.data });
  return NextResponse.json({
    id: updated.id,
    isActive: updated.isActive,
    autoComment: updated.autoComment,
    autoAccountIds: updated.autoAccountIds,
    autoDailyLimit: updated.autoDailyLimit,
    autoTone: updated.autoTone,
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const source = await prisma.monitoredSource.findFirst({ where: { id, userId: user.id } });
  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.monitoredSource.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
