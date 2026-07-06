import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const drafts = await prisma.draftReply.findMany({
    where: { account: { userId: user.id } },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      account: { select: { id: true, name: true, username: true, phone: true } },
      foundMessage: {
        select: {
          id: true,
          text: true,
          authorName: true,
          authorUsername: true,
          source: { select: { title: true, username: true } },
        },
      },
    },
  });

  return NextResponse.json(
    drafts.map((d) => ({
      id: d.id,
      content: d.editedContent ?? d.content,
      variants: d.variants,
      status: d.status,
      createdAt: d.createdAt,
      account: d.account,
      message: {
        id: d.foundMessage.id,
        text: d.foundMessage.text,
        authorName: d.foundMessage.authorName,
        authorUsername: d.foundMessage.authorUsername,
        source: d.foundMessage.source,
      },
    }))
  );
}
