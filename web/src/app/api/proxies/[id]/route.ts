import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const proxy = await prisma.proxy.findFirst({ where: { id, userId: user.id } });
  if (!proxy) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.proxy.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
