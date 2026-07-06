import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword, issueSession } from "@/lib/auth";

export const runtime = "nodejs";

const Body = z.object({ email: z.string().email(), password: z.string().min(1) });

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "email и пароль обязательны" }, { status: 400 });
  }
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase().trim() } });
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return NextResponse.json({ error: "Неверный email или пароль" }, { status: 401 });
  }
  await issueSession(user.id);
  return NextResponse.json({ ok: true });
}
