import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export const runtime = "nodejs";

const Patch = z.object({ status: z.enum(["DRAFT", "RUNNING", "PAUSED", "DONE"]).optional() });

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const prisma = getDb();
  const user = await getAuthUser(prisma);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const c = await prisma.campaign.findFirst({ where: { id, userId: user.id } });
  if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = Patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const data: any = { ...parsed.data };
  if (parsed.data.status === "RUNNING" && !c.nextTickAt) data.nextTickAt = new Date();

  const updated = await prisma.campaign.update({ where: { id }, data });
  return NextResponse.json({ id: updated.id, status: updated.status });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const prisma = getDb();
  const user = await getAuthUser(prisma);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const c = await prisma.campaign.findFirst({ where: { id, userId: user.id } });
  if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.campaign.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
