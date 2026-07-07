import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { toJsonArray, fromJsonArray } from "@/lib/jsonArray";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const prisma = getDb();
  const user = await getAuthUser(prisma);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const type = req.nextUrl.searchParams.get("type");

  const campaigns = await prisma.campaign.findMany({
    where: { userId: user.id, ...(type ? { type: type as any } : {}) },
    orderBy: { createdAt: "desc" },
    include: { audience: { select: { name: true, count: true } } },
  });

  return NextResponse.json(
    campaigns.map((c: (typeof campaigns)[number]) => {
      const targets = fromJsonArray(c.targets);
      return {
        id: c.id,
        type: c.type,
        name: c.name,
        status: c.status,
        targets,
        emoji: c.emoji,
        reactCount: c.reactCount,
        audience: c.audience,
        message: c.message,
        accountIds: fromJsonArray(c.accountIds),
        perAccountLimit: c.perAccountLimit,
        cursor: c.cursor,
        sentCount: c.sentCount,
        failCount: c.failCount,
        total: c.type === "REACTION" ? targets.length : c.audience?.count ?? 0,
        lastTickAt: c.lastTickAt,
      };
    })
  );
}

const Body = z.object({
  type: z.enum(["REACTION", "MAILING", "INVITE", "STORY_VIEW"]),
  name: z.string().min(1).max(120),
  accountIds: z.array(z.string()).min(1, "Выберите хотя бы один аккаунт"),
  perAccountLimit: z.number().int().min(1).max(500).optional(),
  targets: z.array(z.string()).optional(),
  emoji: z.string().optional(),
  reactCount: z.number().int().min(1).max(10).optional(),
  audienceId: z.string().optional(),
  message: z.string().max(4096).optional(),
});

export async function POST(req: NextRequest) {
  const prisma = getDb();
  const user = await getAuthUser(prisma);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid body" }, { status: 400 });
  }
  const d = parsed.data;

  if (d.type === "REACTION" && (!d.targets || d.targets.length === 0)) {
    return NextResponse.json({ error: "Укажите чаты/каналы для реакций" }, { status: 400 });
  }
  if (d.type === "MAILING" && (!d.audienceId || !d.message)) {
    return NextResponse.json({ error: "Выберите базу и введите сообщение" }, { status: 400 });
  }
  if (d.type === "INVITE" && (!d.audienceId || !d.targets || d.targets.length === 0)) {
    return NextResponse.json({ error: "Выберите базу и канал-приёмник" }, { status: 400 });
  }
  if (d.type === "STORY_VIEW" && !d.audienceId) {
    return NextResponse.json({ error: "Выберите базу для просмотра историй" }, { status: 400 });
  }

  const accCount = await prisma.telegramAccount.count({
    where: { id: { in: d.accountIds }, userId: user.id },
  });
  if (accCount !== d.accountIds.length) {
    return NextResponse.json({ error: "Некорректные аккаунты" }, { status: 400 });
  }
  if (d.audienceId) {
    const aud = await prisma.audience.findFirst({ where: { id: d.audienceId, userId: user.id } });
    if (!aud) return NextResponse.json({ error: "База не найдена" }, { status: 400 });
  }

  const c = await prisma.campaign.create({
    data: {
      userId: user.id,
      type: d.type,
      name: d.name,
      accountIds: toJsonArray(d.accountIds),
      perAccountLimit: d.perAccountLimit ?? 30,
      targets: toJsonArray(d.targets ?? []),
      emoji: d.emoji || null,
      reactCount: d.reactCount ?? 3,
      audienceId: d.audienceId || null,
      message: d.message || null,
      nextTickAt: new Date(),
    },
  });
  return NextResponse.json({ id: c.id });
}
