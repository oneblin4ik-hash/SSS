import { Topbar } from "@/components/Topbar";
import { getAuthUser } from "@/lib/auth";
import { getDb } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const prisma = getDb();
  const user = await getAuthUser(prisma);
  const [replies, clicks, warmups, campaigns] = await Promise.all([
    prisma.analyticsEvent.count({ where: { type: "REPLY_PUBLISHED", accountId: { in: (await prisma.telegramAccount.findMany({ where: { userId: user!.id }, select: { id: true } })).map((a: { id: string }) => a.id) } } }),
    prisma.analyticsEvent.count({ where: { type: "LINK_CLICK", trackedLink: { userId: user!.id } } }),
    prisma.warmupPlan.count({ where: { userId: user!.id, status: "RUNNING" } }),
    prisma.campaign.count({ where: { userId: user!.id } }),
  ]);

  const tiles = [
    { label: "Опубликовано ответов", value: replies },
    { label: "Переходов по ссылкам", value: clicks },
    { label: "Аккаунтов в прогреве", value: warmups },
    { label: "Всего кампаний", value: campaigns },
  ];

  return (
    <>
      <Topbar title="Аналитика" sub="Сводные показатели по вашим аккаунтам" />
      <div className="p-7 flex-1">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {tiles.map((t) => (
            <div key={t.label} className="card card-pad">
              <div className="text-xs text-text-dim mb-2">{t.label}</div>
              <div className="num text-3xl leading-none">{t.value}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
