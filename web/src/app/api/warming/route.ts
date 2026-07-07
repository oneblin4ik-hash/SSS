import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { toJsonArray } from "@/lib/jsonArray";

export const runtime = "nodejs";

export async function GET() {
  const prisma = getDb();
  const user = await getAuthUser(prisma);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const plans = await prisma.warmupPlan.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { account: { select: { name: true, phone: true, username: true } } },
  });
  return NextResponse.json(
    plans.map((p: (typeof plans)[number]) => ({
      id: p.id,
      accountId: p.accountId,
      account: p.account,
      currentDay: p.currentDay,
      totalDays: p.totalDays,
      actionsToday: p.actionsToday,
      totalActions: p.totalActions,
      status: p.status,
    }))
  );
}

const Body = z.object({
  accountId: z.string(),
  totalDays: z.number().int().min(1).max(60).optional(),
  channels: z.array(z.string()).optional(),
});

export async function POST(req: NextRequest) {
  const prisma = getDb();
  const user = await getAuthUser(prisma);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "accountId обязателен" }, { status: 400 });

  const account = await prisma.telegramAccount.findFirst({ where: { id: parsed.data.accountId, userId: user.id } });
  if (!account) return NextResponse.json({ error: "Аккаунт не найден" }, { status: 400 });

  const existing = await prisma.warmupPlan.findUnique({ where: { accountId: account.id } });
  if (existing) return NextResponse.json({ error: "Для этого аккаунта уже есть план прогрева" }, { status: 400 });

  const plan = await prisma.warmupPlan.create({
    data: {
      accountId: account.id,
      userId: user.id,
      totalDays: parsed.data.totalDays ?? 21,
      channels: toJsonArray(parsed.data.channels ?? []),
      nextTickAt: new Date(),
    },
  });
  await prisma.telegramAccount.update({ where: { id: account.id }, data: { status: "WARMING" } });
  return NextResponse.json({ id: plan.id });
}
