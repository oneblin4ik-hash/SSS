import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { decrypt } from "@/lib/crypto";
import { tg, TgError } from "@/lib/telegram/service";
import { proxyToInput } from "@/lib/telegram/account";

export const runtime = "nodejs";

/** Live account health check: session validity + @SpamBot verdict → risk/status. */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  const account = await prisma.telegramAccount.findFirst({
    where: { id, userId: user.id },
    include: { proxy: true },
  });
  if (!account) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!account.sessionEnc) return NextResponse.json({ error: "Нет сессии" }, { status: 400 });

  const session = await decrypt(account.sessionEnc);
  const proxy = proxyToInput(account.proxy);

  try {
    await tg.check(session, proxy);
    const spam = await tg.spamStatus({ session, proxy });

    const riskLevel = spam.verdict === "limited" ? "HIGH" : "LOW";
    const status = spam.verdict === "limited" ? "PAUSED" : "ACTIVE";
    const updated = await prisma.telegramAccount.update({
      where: { id },
      data: {
        riskLevel,
        status: account.status === "WARMING" ? "WARMING" : status,
        lastCheckedAt: new Date(),
        lastRiskReason: spam.verdict === "limited" ? "Ограничен (@SpamBot)" : null,
      },
    });
    return NextResponse.json({ ok: true, verdict: spam.verdict, riskLevel: updated.riskLevel, status: updated.status });
  } catch (e: any) {
    if (e instanceof TgError && e.code === "AUTH_DEAD") {
      await prisma.telegramAccount.update({
        where: { id },
        data: { status: "ERROR", riskLevel: "HIGH", lastRiskReason: "Сессия недействительна" },
      });
    }
    return NextResponse.json({ error: e?.message || "Ошибка проверки" }, { status: 400 });
  }
}
