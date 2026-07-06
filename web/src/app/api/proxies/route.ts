import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const proxies = await prisma.proxy.findMany({ where: { userId: user.id } });
  return NextResponse.json(proxies);
}

const Body = z.object({
  type: z.enum(["SOCKS5", "HTTP", "MTPROTO"]),
  host: z.string().min(1),
  port: z.number().int().positive(),
  username: z.string().optional(),
  password: z.string().optional(),
  secret: z.string().optional(),
  label: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid" }, { status: 400 });

  const proxy = await prisma.proxy.create({ data: { userId: user.id, ...parsed.data } });
  return NextResponse.json(proxy);
}
