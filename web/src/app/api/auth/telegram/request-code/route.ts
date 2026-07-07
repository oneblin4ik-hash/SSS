import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { tg } from "@/lib/telegram/service";
import { getAuthUser } from "@/lib/auth";
import { getDb } from "@/lib/prisma";
import { proxyToInput } from "@/lib/telegram/account";

export const runtime = "nodejs";

const Body = z.object({ phone: z.string().min(5), proxyId: z.string().optional() });

export async function POST(req: NextRequest) {
  const prisma = getDb();
  const user = await getAuthUser(prisma);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "phone required" }, { status: 400 });
  }
  const phone = parsed.data.phone.trim();

  let proxyInput = null;
  if (parsed.data.proxyId) {
    const p = await prisma.proxy.findFirst({ where: { id: parsed.data.proxyId, userId: user.id } });
    proxyInput = proxyToInput(p);
  }

  try {
    const { phoneCodeHash } = await tg.requestCode(phone, proxyInput);

    await prisma.telegramAccount.upsert({
      where: { userId_phone: { userId: user.id, phone } },
      update: { status: "CONNECTING", proxyId: parsed.data.proxyId || null },
      create: { userId: user.id, phone, status: "CONNECTING", proxyId: parsed.data.proxyId || null },
    });

    return NextResponse.json({ ok: true, phoneCodeHash });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Telegram error" }, { status: 500 });
  }
}
