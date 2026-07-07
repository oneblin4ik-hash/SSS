import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { tickCampaign } from "@/lib/engines/campaign";

export const runtime = "nodejs";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const prisma = getDb();
  const user = await getAuthUser(prisma);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const c = await prisma.campaign.findFirst({ where: { id, userId: user.id } });
  if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const result = await tickCampaign(prisma, id);
  return NextResponse.json(result);
}
