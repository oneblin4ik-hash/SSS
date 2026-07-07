import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { tickAutoReplyAccount } from "@/lib/engines/autoreply";

export const runtime = "nodejs";

/** Manual "tick now" for an account's DM auto-responder — for on-demand testing from the UI. */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const prisma = getDb();
  const user = await getAuthUser(prisma);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  const account = await prisma.telegramAccount.findFirst({ where: { id, userId: user.id } });
  if (!account) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const result = await tickAutoReplyAccount(prisma, id);
  return NextResponse.json(result);
}
