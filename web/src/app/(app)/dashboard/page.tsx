import { Topbar } from "@/components/Topbar";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getAuthUser();
  const [accounts, sources, drafts, campaigns] = await Promise.all([
    prisma.telegramAccount.count({ where: { userId: user!.id } }),
    prisma.monitoredSource.count({ where: { userId: user!.id } }),
    prisma.draftReply.count({ where: { account: { userId: user!.id }, status: "PUBLISHED" } }),
    prisma.campaign.count({ where: { userId: user!.id, status: "RUNNING" } }),
  ]);

  const tiles = [
    { label: "Аккаунтов", value: accounts },
    { label: "Источников", value: sources },
    { label: "Опубликовано ответов", value: drafts },
    { label: "Активных кампаний", value: campaigns },
  ];

  return (
    <>
      <Topbar title="Дашборд" sub={`Добро пожаловать, ${user?.name || user?.email}`} />
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
