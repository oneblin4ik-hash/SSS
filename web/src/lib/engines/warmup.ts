import type { PrismaClient } from "@prisma/client";
import { decrypt } from "@/lib/crypto";
import { proxyToInput } from "@/lib/telegram/account";
import { tg, TgError } from "@/lib/telegram/service";
import { warmupDailyTarget, pauseRange, randInt, WARMUP_POOL, type Mode } from "./limits";
import { applyErrorOutcome } from "./health";
import { fromJsonArray } from "@/lib/jsonArray";

/**
 * Run one warm-up action for a single plan (join / react / read).
 * Advances actionsToday, rolls the day over at the daily target,
 * finishes the plan at totalDays. Returns a short status for the caller.
 */
export async function tickWarmupPlan(prisma: PrismaClient, planId: string): Promise<{ ok: boolean; detail: string; day: number; actionsToday: number }> {
  const plan = await prisma.warmupPlan.findUnique({
    where: { id: planId },
    include: { account: { include: { proxy: true } }, user: true },
  });
  if (!plan) return { ok: false, detail: "plan not found", day: 0, actionsToday: 0 };
  if (plan.status !== "RUNNING") {
    return { ok: false, detail: `status=${plan.status}`, day: plan.currentDay, actionsToday: plan.actionsToday };
  }
  if (!plan.account.sessionEnc) {
    await prisma.warmupPlan.update({ where: { id: planId }, data: { status: "PAUSED" } });
    return { ok: false, detail: "нет сессии аккаунта", day: plan.currentDay, actionsToday: plan.actionsToday };
  }
  // Flood cooldown gate: skip until the account is out of its FLOOD_WAIT window.
  if (plan.account.floodUntil && plan.account.floodUntil.getTime() > Date.now()) {
    await prisma.warmupPlan.update({ where: { id: planId }, data: { nextTickAt: plan.account.floodUntil } });
    return { ok: false, detail: "аккаунт на кулдауне", day: plan.currentDay, actionsToday: plan.actionsToday };
  }

  const mode = plan.user.safetyMode as Mode;
  const target = warmupDailyTarget(mode, plan.currentDay);

  const dayElapsedMs = Date.now() - plan.dayStartedAt.getTime();
  if (plan.actionsToday >= target) {
    if (dayElapsedMs < 20 * 3600_000) {
      const nextTick = new Date(plan.dayStartedAt.getTime() + 22 * 3600_000);
      await prisma.warmupPlan.update({ where: { id: planId }, data: { nextTickAt: nextTick } });
      return { ok: true, detail: "дневная норма выполнена", day: plan.currentDay, actionsToday: plan.actionsToday };
    }
    if (plan.currentDay >= plan.totalDays) {
      await prisma.warmupPlan.update({ where: { id: planId }, data: { status: "DONE" } });
      await prisma.telegramAccount.update({ where: { id: plan.accountId }, data: { status: "ACTIVE" } });
      return { ok: true, detail: "прогрев завершён", day: plan.currentDay, actionsToday: plan.actionsToday };
    }
    await prisma.warmupPlan.update({
      where: { id: planId },
      data: { currentDay: { increment: 1 }, actionsToday: 0, dayStartedAt: new Date() },
    });
    return { ok: true, detail: "новый день прогрева", day: plan.currentDay + 1, actionsToday: 0 };
  }

  const session = await decrypt(plan.account.sessionEnc);
  const proxy = proxyToInput(plan.account.proxy);
  const channels = fromJsonArray(plan.channels);
  const pool = channels.length ? channels : WARMUP_POOL;
  const target0 = pool[randInt(0, pool.length - 1)];

  const roll = Math.random();
  let action: "join" | "read" | "react";
  if (plan.totalActions < pool.length && roll < 0.5) action = "join";
  else if (roll < 0.65) action = "join";
  else if (roll < 0.85) action = "react";
  else action = "read";

  let ok = true;
  let detail = "";
  try {
    if (action === "join") {
      const r = await tg.join({ session, proxy, target: target0 });
      detail = `вступление в ${r.title}`;
    } else if (action === "react") {
      const r = await tg.react({ session, proxy, target: target0, count: 1 });
      detail = `реакций: ${r.reacted} в ${target0}`;
    } else {
      await tg.read({ session, proxy, target: target0 });
      detail = `чтение ${target0}`;
    }
  } catch (e: any) {
    ok = false;
    detail = e?.message || "ошибка действия";
    if (e instanceof TgError) {
      await applyErrorOutcome(prisma, {
        accountId: plan.accountId,
        code: e.code,
        retryAfter: e.retryAfter,
        autoPauseOnRisk: plan.user.autoPauseOnRisk,
      });
    }
  }

  const { min, max } = pauseRange(mode);
  const nextTick = new Date(Date.now() + randInt(min, max) * 1000);

  await prisma.$transaction([
    prisma.warmupLog.create({
      data: { planId, action, target: target0, ok, detail },
    }),
    prisma.warmupPlan.update({
      where: { id: planId },
      data: {
        actionsToday: { increment: ok ? 1 : 0 },
        totalActions: { increment: ok ? 1 : 0 },
        lastTickAt: new Date(),
        nextTickAt: nextTick,
      },
    }),
  ]);

  return { ok, detail, day: plan.currentDay, actionsToday: plan.actionsToday + (ok ? 1 : 0) };
}

export async function tickDueWarmupPlans(prisma: PrismaClient, limit = 20): Promise<number> {
  const due = await prisma.warmupPlan.findMany({
    where: { status: "RUNNING", nextTickAt: { lte: new Date() } },
    select: { id: true },
    take: limit,
  });
  let n = 0;
  for (const p of due) {
    await tickWarmupPlan(prisma, p.id).catch(() => {});
    n++;
  }
  return n;
}
