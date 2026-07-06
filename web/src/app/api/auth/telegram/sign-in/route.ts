import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { tg } from "@/lib/telegram/service";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";

export const runtime = "nodejs";

const Body = z.object({ phone: z.string().min(5), code: z.string().min(3) });

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "phone и code обязательны" }, { status: 400 });
  const phone = parsed.data.phone.trim();

  try {
    const result = await tg.signInWithCode(phone, parsed.data.code);
    if (result.needs2fa) return NextResponse.json({ needs2fa: true });

    await prisma.telegramAccount.update({
      where: { userId_phone: { userId: user.id, phone } },
      data: {
        sessionEnc: encrypt(result.session!),
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
