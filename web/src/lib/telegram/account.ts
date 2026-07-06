import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import type { ProxyInput } from "./service";

export function proxyToInput(p: {
  type: string;
  host: string;
  port: number;
  username: string | null;
  password: string | null;
  secret: string | null;
} | null | undefined): ProxyInput {
  if (!p) return null;
  return {
    type: p.type as "SOCKS5" | "HTTP" | "MTPROTO",
    host: p.host,
    port: p.port,
    username: p.username,
    password: p.password,
    secret: p.secret,
  };
}

/**
 * Pick an authorized account for a user and return its decrypted session and
 * the GramJS-ready proxy (if one is bound). Optionally target a specific id.
 */
export async function getAccountSession(
  userId: string,
  accountId?: string
): Promise<{ accountId: string; session: string; proxy: ProxyInput } | null> {
  const account = await prisma.telegramAccount.findFirst({
    where: {
      userId,
      ...(accountId ? { id: accountId } : {}),
      status: { in: ["ACTIVE", "WARMING"] },
      sessionEnc: { not: null },
    },
    orderBy: { lastCheckedAt: "desc" },
    include: { proxy: true },
  });
  if (!account?.sessionEnc) return null;
  return {
    accountId: account.id,
    session: await decrypt(account.sessionEnc),
    proxy: proxyToInput(account.proxy),
  };
}
