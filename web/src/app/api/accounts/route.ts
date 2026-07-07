import { NextResponse } from "next/server";
import { getDb } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const prisma = getDb();
  const user = await getAuthUser(prisma);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const accounts = await prisma.telegramAccount.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(
    accounts.map((a: (typeof accounts)[number]) => ({
      id: a.id,
      phone: a.phone,
      name: a.name,
      username: a.username,
      status: a.status,
      riskLevel: a.riskLevel,
      toneStyle: a.toneStyle,
      systemPrompt: a.systemPrompt,
      dailyReplyLimit: a.dailyReplyLimit,
      autoReplyEnabled: a.autoReplyEnabled,
      proxyId: a.proxyId,
      createdAt: a.createdAt,
      lastCheckedAt: a.lastCheckedAt,
    }))
  );
}
