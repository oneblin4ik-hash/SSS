import { PrismaClient } from "@prisma/client";
import { PrismaD1 } from "@prisma/adapter-d1";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { D1Database } from "@cloudflare/workers-types";

type Env = { DB: D1Database };

/**
 * D1 is only reachable through the per-request Workers binding (env.DB), so
 * there is no module-level singleton client — every call site (route
 * handlers, engines, the cron handler) asks for its own client. Constructing
 * one is cheap: the adapter just wraps the binding, there's no connection to
 * pool. Use inside Next.js route handlers / server code.
 */
export function getDb(): PrismaClient {
  const { env } = getCloudflareContext() as unknown as { env: Env };
  return new PrismaClient({ adapter: new PrismaD1(env.DB) });
}

/** Same as getDb(), but for contexts without the sync request context (e.g. the scheduled/cron handler). */
export async function getDbAsync(): Promise<PrismaClient> {
  const { env } = (await getCloudflareContext({ async: true })) as unknown as { env: Env };
  return new PrismaClient({ adapter: new PrismaD1(env.DB) });
}

/** For the cron/scheduled Worker entry point, which gets `env` directly as a handler argument. */
export function getDbFromEnv(env: Env): PrismaClient {
  return new PrismaClient({ adapter: new PrismaD1(env.DB) });
}
