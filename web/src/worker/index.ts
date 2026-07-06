/**
 * Background worker: drives warm-up plans and campaigns on a schedule.
 * Runs as a plain Node process (NOT on the Cloudflare edge):
 *
 *   cd web && npm run worker
 *
 * It shares the same database and SESSION_ENCRYPTION_KEY as the web app, and
 * calls the telegram-service for every MTProto action. Each loop ticks all due
 * warm-up plans, campaigns, auto-comment sources, and DM auto-reply accounts
 * (their own nextTickAt spacing enforces tempo).
 */
import "dotenv/config";
import { tickDueWarmupPlans } from "@/lib/engines/warmup";
import { tickDueCampaigns } from "@/lib/engines/campaign";
import { tickDueAutoComments } from "@/lib/engines/autocomment";
import { tickDueAutoReplies } from "@/lib/engines/autoreply";

const INTERVAL_MS = Number(process.env.WORKER_INTERVAL_MS) || 5000;

async function loop() {
  try {
    const w = await tickDueWarmupPlans();
    const c = await tickDueCampaigns();
    const a = await tickDueAutoComments();
    const r = await tickDueAutoReplies();
    if (w || c || a || r) console.log(`[worker] ticked warmups=${w} campaigns=${c} autocomments=${a} autoreplies=${r}`);
  } catch (e) {
    console.error("[worker] error", e);
  }
}

console.log(`✓ Pro Potok worker — interval ${INTERVAL_MS}ms`);
setInterval(loop, INTERVAL_MS);
loop();
