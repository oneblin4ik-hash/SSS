import { prisma } from "@/lib/prisma";

/**
 * React to a telegram-service error code for one account — the enforcement half
 * of "Защита от бана". Only account-health signals act here; per-target outcomes
 * (privacy, already-participant, can't-write) are logged by callers, not escalated.
 *
 *  - FLOOD_WAIT  → cooldown via floodUntil (engines skip the account until then)
 *  - PEER_FLOOD  → risk HIGH immediately + 12h cooldown; if autoPauseOnRisk, PAUSE
 *    the account + its campaigns. A spam-block is definitive, not a "wait and see"
 *    signal — do NOT reintroduce a LOW→MEDIUM→HIGH escalation here.
 *  - AUTH_DEAD   → account ERROR (session invalid / revoked)
 */
export async function applyErrorOutcome(opts: {
  accountId: string;
  code: string;
  retryAfter?: number;
  autoPauseOnRisk: boolean;
}): Promise<void> {
  const { accountId, code, retryAfter = 0, autoPauseOnRisk } = opts;

  if (code === "FLOOD_WAIT") {
    const until = new Date(Date.now() + Math.max(retryAfter, 30) * 1000);
    await prisma.telegramAccount.update({
      where: { id: accountId },
      data: { floodUntil: until, lastRiskReason: `FLOOD_WAIT ${retryAfter}s` },
    });
    return;
  }

  if (code === "AUTH_DEAD") {
    await prisma.telegramAccount.update({
      where: { id: accountId },
      data: { status: "ERROR", riskLevel: "HIGH", lastRiskReason: "Сессия недействительна" },
    });
    await pauseAccountCampaigns(accountId);
    return;
  }

  if (code === "PEER_FLOOD") {
    await prisma.telegramAccount.update({
      where: { id: accountId },
      data: {
        riskLevel: "HIGH",
        lastRiskReason: "Спам-блок (PEER_FLOOD)",
        floodUntil: new Date(Date.now() + 12 * 3600_000),
        ...(autoPauseOnRisk ? { status: "PAUSED" } : {}),
      },
    });
    if (autoPauseOnRisk) await pauseAccountCampaigns(accountId);
  }
}

/** Pause every RUNNING campaign/warmup plan that uses this account. */
async function pauseAccountCampaigns(accountId: string): Promise<void> {
  await prisma.campaign.updateMany({
    where: { status: "RUNNING", accountIds: { has: accountId } },
    data: { status: "PAUSED" },
  });
  await prisma.warmupPlan.updateMany({
    where: { status: "RUNNING", accountId },
    data: { status: "PAUSED" },
  });
}

/** Count an account's successful outbound actions in the last 24h (for dailyReplyLimit). */
export async function actionsLast24h(accountId: string): Promise<number> {
  const since = new Date(Date.now() - 24 * 3600_000);
  const [campaigns, drafts] = await Promise.all([
    prisma.campaignLog.count({ where: { accountId, ok: true, createdAt: { gte: since } } }),
    prisma.draftReply.count({ where: { accountId, status: "PUBLISHED", publishedAt: { gte: since } } }),
  ]);
  return campaigns + drafts;
}
