import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { toJsonArray, fromJsonArray } from "@/lib/jsonArray";

export const runtime = "nodejs";

const Patch = z.object({
  isActive: z.boolean().optional(),
  autoComment: z.boolean().optional(),
  autoAccountIds: z.array(z.string()).optional(),
  autoDailyLimit: z.number().int().min(1).max(100).optional(),
  autoTone: z.string().max(200).nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const prisma = getDb();
  const user = await getAuthUser(prisma);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  const source = await prisma.monitoredSource.findFirst({ where: { id, userId: user.id } });
  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = Patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { autoAccountIds, ...rest } = parsed.data;
  const updated = await prisma.monitoredSource.update({
    where: { id },
    data: { ...rest, ...(autoAccountIds ? { autoAccountIds: toJsonArray(autoAccountIds) } : {}) },
  });
  return NextResponse.json({
    id: updated.id,
    isActive: updated.isActive,
    autoComment: updated.autoComment,
    autoAccountIds: fromJsonArray(updated.autoAccountIds),
    autoDailyLimit: updated.autoDailyLimit,
    autoTone: updated.autoTone,
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const prisma = getDb();
  const user = await getAuthUser(prisma);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const source = await prisma.monitoredSource.findFirst({ where: { id, userId: user.id } });
  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.monitoredSource.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
