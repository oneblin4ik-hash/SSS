import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { tickAutoCommentSource } from "@/lib/engines/autocomment";

export const runtime = "nodejs";

/** Manual "tick now" for a source's auto-commenting — for on-demand testing from the UI. */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;

  const source = await prisma.monitoredSource.findFirst({ where: { id, userId: user.id } });
  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const result = await tickAutoCommentSource(id);
  return NextResponse.json(result);
}
