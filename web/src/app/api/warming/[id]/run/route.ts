import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { tickWarmupPlan } from "@/lib/engines/warmup";

export const runtime = "nodejs";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const plan = await prisma.warmupPlan.findFirst({ where: { id, userId: user.id } });
  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const result = await tickWarmupPlan(id);
  return NextResponse.json(result);
}
