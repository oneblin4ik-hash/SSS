import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { getAccountSession } from "@/lib/telegram/account";
import { tg } from "@/lib/telegram/service";

export const runtime = "nodejs";

export async function GET() {
  const prisma = getDb();
  const user = await getAuthUser(prisma);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const audiences = await prisma.audience.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(audiences.map((a: (typeof audiences)[number]) => ({ id: a.id, name: a.name, count: a.count, status: a.status })));
}

const Body = z.object({
  name: z.string().min(1).max(120),
  sourceType: z.enum(["MEMBERS", "COMMENTERS"]),
  sourceRef: z.string().min(1),
  accountId: z.string().optional(),
});

/** Build an audience by parsing a chat's members or a channel's commenters. */
export async function POST(req: NextRequest) {
  const prisma = getDb();
  const user = await getAuthUser(prisma);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid" }, { status: 400 });

  const account = await getAccountSession(prisma, user.id, parsed.data.accountId);
  if (!account) return NextResponse.json({ error: "Нет активного аккаунта для парсинга" }, { status: 400 });

  try {
    const result =
      parsed.data.sourceType === "MEMBERS"
        ? await tg.parseMembers({ session: account.session, proxy: account.proxy, target: parsed.data.sourceRef, limit: 300 })
        : await tg.parseCommenters({ session: account.session, proxy: account.proxy, target: parsed.data.sourceRef, limit: 300 });

    const audience = await prisma.audience.create({
      data: {
        userId: user.id,
        name: parsed.data.name,
        sourceType: parsed.data.sourceType,
        sourceRef: parsed.data.sourceRef,
        count: result.contacts.length,
        status: "READY",
        contacts: { createMany: { data: result.contacts.map((c) => ({ tgUserId: c.tgUserId, username: c.username, name: c.name })) } },
      },
    });
    return NextResponse.json({ id: audience.id, name: audience.name, count: audience.count });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Ошибка парсинга" }, { status: 400 });
  }
}
