import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export const runtime = "nodejs";

const Patch = z.object({ isActive: z.boolean().optional() });

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const prisma = getDb();
  const user = await getAuthUser(prisma);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const keyword = await prisma.keyword.findFirst({ where: { id, userId: user.id } });
  if (!keyword) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const parsed = Patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  const updated = await prisma.keyword.update({ where: { id }, data: parsed.data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const prisma = getDb();
  const user = await getAuthUser(prisma);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const keyword = await prisma.keyword.findFirst({ where: { id, userId: user.id } });
  if (!keyword) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.keyword.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
