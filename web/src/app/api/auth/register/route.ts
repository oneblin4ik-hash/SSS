import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/prisma";
import { hashPassword, issueSession } from "@/lib/auth";

export const runtime = "nodejs";

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().max(120).optional(),
});

export async function POST(req: NextRequest) {
  const prisma = getDb();
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid" }, { status: 400 });
  }
  const email = parsed.data.email.toLowerCase().trim();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "Пользователь уже существует" }, { status: 400 });

  const user = await prisma.user.create({
    data: { email, passwordHash: await hashPassword(parsed.data.password), name: parsed.data.name || null },
  });
  await issueSession(user.id);
  return NextResponse.json({ ok: true });
}
