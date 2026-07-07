import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/prisma";

export const runtime = "nodejs";

/** Public redirect: /r/:slug → target, counting the click for traffic analytics. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const prisma = getDb();
  const { slug } = await params;
  const link = await prisma.trackedLink.findUnique({ where: { slug } });
  if (!link) {
    return NextResponse.json({ error: "Ссылка не найдена" }, { status: 404 });
  }

  await prisma
    .$transaction([
      prisma.trackedLink.update({ where: { id: link.id }, data: { clicks: { increment: 1 } } }),
      prisma.analyticsEvent.create({
        data: { type: "LINK_CLICK", trackedLinkId: link.id, accountId: link.accountId },
      }),
    ])
    .catch(() => {});

  return NextResponse.redirect(link.targetUrl, 302);
}
