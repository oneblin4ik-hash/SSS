import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { tg } from "@/lib/telegram/service";
import { getAuthUser } from "@/lib/auth";
import { getDb } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";

export const runtime = "nodejs";

const Body = z.object({ phone: z.string().min(5), password: z.string().min(1) });

export async function POST(req: NextRequest) {
  const prisma = getDb();
  const user = await getAuthUser(prisma);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "phone и password обязательны" }, { status: 400 });
  const phone = parsed.data.phone.trim();

  try {
    const result = await tg.signInWith2fa(phone, parsed.data.password);
    await prisma.telegramAccount.update({
      where: { userId_phone: { userId: user.id, phone } },
      data: {
        sessionEnc: encrypt(result.session),
        status: "ACTIVE",
        name: result.name || null,
        username: result.username || null,
        lastCheckedAt: new Date(),
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Telegram error" }, { status: 500 });
  }
}
