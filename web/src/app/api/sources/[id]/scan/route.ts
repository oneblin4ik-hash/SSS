import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { getAccountSession } from "@/lib/telegram/account";
import { scanSource } from "@/lib/engines/scan";

export const runtime = "nodejs";

const Body = z.object({ accountId: z.string().optional() });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  const source = await prisma.monitoredSource.findFirst({ where: { id, userId: user.id } });
  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  const accountId = parsed.success ? parsed.data.accountId : undefined;

  const account = await getAccountSession(user.id, accountId);
  if (!account) return NextResponse.json({ error: "Нет активного аккаунта для сканирования" }, { status: 400 });

  const keywords = (
    await prisma.keyword.findMany({ where: { userId: user.id, isActive: true } })
  ).map((k) => k.text);

  try {
    const result = await scanSource(id, { session: account.session, proxy: account.proxy, keywords, sinceHours: 48, limit: 100 });
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Ошибка сканирования" }, { status: 400 });
  }
}
