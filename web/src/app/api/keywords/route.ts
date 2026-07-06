import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const keywords = await prisma.keyword.findMany({ where: { userId: user.id } });
  return NextResponse.json(keywords);
}

const Body = z.object({ text: z.string().min(1).max(100) });

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "text обязателен" }, { status: 400 });
  const keyword = await prisma.keyword.create({ data: { userId: user.id, text: parsed.data.text.trim() } });
  return NextResponse.json(keyword);
}
