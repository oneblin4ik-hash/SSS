import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const prisma = getDb();
  const user = await getAuthUser(prisma);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({
    email: user.email,
    name: user.name,
    targetChannel: user.targetChannel,
    defaultTone: user.defaultTone,
    safetyMode: user.safetyMode,
    autoPauseOnRisk: user.autoPauseOnRisk,
  });
}

const Patch = z.object({
  name: z.string().max(120).optional(),
  targetChannel: z.string().max(200).optional(),
  defaultTone: z.string().min(1).max(200).optional(),
  safetyMode: z.enum(["CONSERVATIVE", "BALANCED", "AGGRESSIVE"]).optional(),
  autoPauseOnRisk: z.boolean().optional(),
});

export async function PATCH(req: NextRequest) {
  const prisma = getDb();
  const user = await getAuthUser(prisma);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = Patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: parsed.data,
  });
  return NextResponse.json({
    email: updated.email,
    name: updated.name,
    targetChannel: updated.targetChannel,
    defaultTone: updated.defaultTone,
    safetyMode: updated.safetyMode,
    autoPauseOnRisk: updated.autoPauseOnRisk,
  });
}
