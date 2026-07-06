export type Mode = "CONSERVATIVE" | "BALANCED" | "AGGRESSIVE";

/** Seconds between generic actions (campaigns/warmup tempo), by safety mode. */
export function pauseRange(mode: Mode): { min: number; max: number } {
  return { CONSERVATIVE: { min: 60, max: 180 }, BALANCED: { min: 30, max: 90 }, AGGRESSIVE: { min: 15, max: 45 } }[mode];
}

export function randInt(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min + 1));
}

/** Default low-risk public channels to warm an account up against. */
export const WARMUP_POOL = ["@durov", "@telegram", "@breakingmash", "@varlamov_news", "@meduzalive"];

/** Ramp of target actions/day by account age (warm-up day number). */
export function warmupDailyTarget(mode: Mode, day: number): number {
  const ramp = { CONSERVATIVE: [3, 5, 8, 12], BALANCED: [5, 8, 12, 18], AGGRESSIVE: [8, 12, 18, 25] }[mode];
  if (day <= 3) return ramp[0];
  if (day <= 7) return ramp[1];
  if (day <= 14) return ramp[2];
  return ramp[3];
}

/** Per-source daily auto-comment cap by safety mode (human-plausible volume). */
export function autoCommentDailyCap(mode: Mode): number {
  return { CONSERVATIVE: 5, BALANCED: 12, AGGRESSIVE: 25 }[mode];
}

/** Seconds between auto-comments (wide jitter — fixed cadence is a ban signal). */
export function commentPause(mode: Mode): number {
  const base = { CONSERVATIVE: [180, 600], BALANCED: [120, 420], AGGRESSIVE: [90, 300] }[mode];
  return randInt(base[0], base[1]);
}

/** Relevance double-gate thresholds. */
export const RELEVANCE_MIN = 70;
export const CONFIDENCE_MIN = 60;
