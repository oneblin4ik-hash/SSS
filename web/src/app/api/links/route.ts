import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export const runtime = "nodejs";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

function slug(): string {
  return Math.random().toString(36).slice(2, 9);
}

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const links = await prisma.trackedLink.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(
    links.map((l) => ({
      id: l.id,
      slug: l.slug,
      shortUrl: `${APP_URL}/r/${l.slug}`,
      targetUrl: l.targetUrl,
      label: l.label,
      clicks: l.clicks,
      createdAt: l.createdAt,
    }))
  );
}

const Body = z.object({
  targetUrl: z.string().url("Некорректный URL"),
  label: z.string().max(120).optional(),
  accountId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid" }, { status: 400 });
  }

  for (let i = 0; i < 4; i++) {
    try {
      const link = await prisma.trackedLink.create({
        data: {
          userId: user.id,
          slug: slug(),
          targetUrl: parsed.data.targetUrl,
          label: parsed.data.label || null,
          accountId: parsed.data.accountId || null,
        },
      });
      return NextResponse.json({ id: link.id, slug: link.slug, shortUrl: `${APP_URL}/r/${link.slug}` });
    } catch {
      /* slug collision — retry */
    }
  }
  return NextResponse.json({ error: "Не удалось создать ссылку" }, { status: 500 });
}
