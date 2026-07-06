"use client";

import { useCallback, useEffect, useState } from "react";
import { UserPlus, Trash2, RefreshCw, AtSign, Phone } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { StatusBadge, RiskBadge } from "@/components/ui/StatusBadge";
import { AddAccountModal } from "./AddAccountModal";

type Account = {
  id: string;
  phone: string;
  name: string | null;
  username: string | null;
  status: string;
  riskLevel: string;
  toneStyle: string;
  dailyReplyLimit: number;
  proxyId: string | null;
  createdAt: string;
  lastCheckedAt: string | null;
};
type Proxy = { id: string; host: string; port: number; label: string | null };

export function AccountsClient() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [proxies, setProxies] = useState<Proxy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, p] = await Promise.all([
        fetch("/api/accounts", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/proxies", { cache: "no-store" }).then((r) => r.json()),
      ]);
      setAccounts(a);
      setProxies(Array.isArray(p) ? p : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function remove(id: string) {
    if (!confirm("Отключить аккаунт? Сессия будет удалена.")) return;
    await fetch(`/api/accounts/${id}`, { method: "DELETE" });
    setAccounts((a) => a.filter((x) => x.id !== id));
  }

  async function bindProxy(id: string, proxyId: string) {
    await fetch(`/api/accounts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proxyId: proxyId || null }),
    });
    setAccounts((a) => a.map((x) => (x.id === id ? { ...x, proxyId: proxyId || null } : x)));
  }

  return (
    <>
      <Topbar
        title="Аккаунты"
        sub="Подключённые Telegram-аккаунты и их статус"
        action={
          <>
            <button className="btn ghost" onClick={load} title="Обновить">
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
            <button className="btn primary" onClick={() => setShowAdd(true)}>
              <UserPlus size={16} />
              Добавить аккаунт
            </button>
          </>
        }
      />

      <div className="p-7 flex-1">
        {loading && accounts.length === 0 ? (
          <div className="text-text-dim text-sm">Загрузка…</div>
        ) : accounts.length === 0 ? (
          <div className="card card-pad text-center py-16">
            <div className="w-12 h-12 rounded-full bg-accent/15 text-accent grid place-items-center mx-auto mb-4">
              <UserPlus size={24} />
            </div>
            <h3 className="display text-lg mb-1">Нет подключённых аккаунтов</h3>
            <p className="text-sm text-text-dim mb-5 max-w-sm mx-auto">
              Подключите ваш первый Telegram-аккаунт, чтобы начать мониторинг и
              работу с ответами.
            </p>
            <button className="btn primary mx-auto" onClick={() => setShowAdd(true)}>
              <UserPlus size={16} />
              Подключить аккаунт
            </button>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-dim border-b border-line">
                  <th className="font-medium px-5 py-3">Аккаунт</th>
                  <th className="font-medium px-5 py-3">Статус</th>
                  <th className="font-medium px-5 py-3">Риск</th>
                  <th className="font-medium px-5 py-3">Прокси</th>
                  <th className="font-medium px-5 py-3">Тон</th>
                  <th className="font-medium px-5 py-3 text-right">Лимит/день</th>
                  <th className="font-medium px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((a) => (
                  <tr key={a.id} className="border-b border-line-soft last:border-0 hover:bg-surface-2/40">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-surface-3 grid place-items-center text-xs font-semibold text-accent">
                          {(a.name || a.phone).slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="text-text-bright font-medium truncate">
                            {a.name || "Без имени"}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-text-faint">
                            {a.username ? (
                              <span className="flex items-center gap-0.5 mono">
                                <AtSign size={11} />
                                {a.username}
                              </span>
                            ) : null}
                            <span className="flex items-center gap-0.5 mono">
                              <Phone size={11} />
                              {a.phone}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={a.status} />
                    </td>
                    <td className="px-5 py-3.5">
                      <RiskBadge level={a.riskLevel} />
                    </td>
                    <td className="px-5 py-3.5">
                      <select
                        className="inp h-8 w-36 text-xs"
                        value={a.proxyId ?? ""}
                        onChange={(e) => bindProxy(a.id, e.target.value)}
                      >
                        <option value="">Без прокси</option>
                        {proxies.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.label || `${p.host}:${p.port}`}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-5 py-3.5 text-text-dim">{a.toneStyle}</td>
                    <td className="px-5 py-3.5 text-right num">{a.dailyReplyLimit}</td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        className="btn ghost h-8 px-2 text-st-ban"
                        onClick={() => remove(a.id)}
                        title="Отключить"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddAccountModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onAdded={load}
      />
    </>
  );
}
