"use client";

import { useCallback, useEffect, useState } from "react";
import { Flame, Play, Pause, StepForward, Trash2, RefreshCw, Plus, Loader2 } from "lucide-react";
import { Topbar } from "@/components/Topbar";

type Account = { id: string; name: string | null; phone: string };
type Plan = {
  id: string;
  accountId: string;
  account: { name: string | null; phone: string; username: string | null };
  currentDay: number;
  totalDays: number;
  actionsToday: number;
  totalActions: number;
  status: string;
};

async function jsend(url: string, method: string, body?: unknown) {
  const r = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || "Ошибка");
  return d;
}

export function WarmingClient() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [accountId, setAccountId] = useState("");
  const [totalDays, setTotalDays] = useState(21);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, a] = await Promise.all([
        fetch("/api/warming", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/accounts", { cache: "no-store" }).then((r) => r.json()),
      ]);
      setPlans(Array.isArray(p) ? p : []);
      setAccounts(Array.isArray(a) ? a : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function act(id: string, fn: () => Promise<void>) {
    setErr(""); setBusy(id);
    try { await fn(); } catch (e: any) { setErr(e.message); } finally { setBusy(null); }
  }

  async function create() {
    await act("new", async () => {
      await jsend("/api/warming", "POST", { accountId, totalDays });
      setAccountId("");
      await load();
    });
  }
  const toggle = (p: Plan) =>
    act(p.id, async () => {
      const status = p.status === "RUNNING" ? "PAUSED" : "RUNNING";
      await jsend(`/api/warming/${p.id}`, "PATCH", { status });
      setPlans((x) => x.map((y) => (y.id === p.id ? { ...y, status } : y)));
    });
  const stepNow = (p: Plan) =>
    act(p.id, async () => {
      const r = await jsend(`/api/warming/${p.id}/run`, "POST");
      setErr(r.detail || "Шаг выполнен");
      await load();
    });
  const remove = (p: Plan) =>
    act(p.id, async () => {
      await jsend(`/api/warming/${p.id}`, "DELETE");
      setPlans((x) => x.filter((y) => y.id !== p.id));
    });

  const usedAccountIds = new Set(plans.map((p) => p.accountId));
  const freeAccounts = accounts.filter((a) => !usedAccountIds.has(a.id));

  return (
    <>
      <Topbar
        title="Прогрев"
        sub="Постепенная активность для новых или отдохнувших аккаунтов"
        action={
          <button className="btn ghost" onClick={load} title="Обновить">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        }
      />
      <div className="p-7 flex-1 flex flex-col gap-6 max-w-3xl">
        {err && <div className="text-sm text-accent bg-accent/10 border border-accent/30 rounded-btn px-3 py-2">{err}</div>}

        <div className="card card-pad">
          <h3 className="display text-base mb-3 flex items-center gap-2">
            <Flame size={16} className="text-accent" /> Новый план прогрева
          </h3>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="field-label">Аккаунт</label>
              <select className="inp" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                <option value="">Выберите аккаунт…</option>
                {freeAccounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name || a.phone}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Дней</label>
              <input type="number" min={1} max={60} className="inp w-24" value={totalDays} onChange={(e) => setTotalDays(Number(e.target.value))} />
            </div>
            <button className="btn primary" onClick={create} disabled={busy === "new" || !accountId}>
              {busy === "new" ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Начать
            </button>
          </div>
        </div>

        {plans.length === 0 ? (
          <div className="card card-pad text-center py-10 text-sm text-text-dim">Планов прогрева пока нет.</div>
        ) : (
          <div className="flex flex-col gap-3">
            {plans.map((p) => {
              const pct = Math.round((p.currentDay / p.totalDays) * 100);
              return (
                <div key={p.id} className="card card-pad">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-text-bright font-medium">{p.account.name || p.account.phone}</span>
                    <span className="text-xs text-text-faint">день {p.currentDay}/{p.totalDays} · {p.actionsToday} действий сегодня</span>
                    <span
                      className="badge ml-auto"
                      style={{
                        background: p.status === "RUNNING" || p.status === "DONE" ? "var(--st-live)22" : "var(--st-idle)22",
                        color: p.status === "RUNNING" || p.status === "DONE" ? "var(--st-live)" : "var(--st-idle)",
                      }}
                    >
                      {p.status === "RUNNING" ? "идёт" : p.status === "DONE" ? "готово" : "пауза"}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden mt-3">
                    <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    {p.status !== "DONE" && (
                      <button className="btn secondary h-9" onClick={() => toggle(p)} disabled={busy === p.id}>
                        {p.status === "RUNNING" ? <Pause size={15} /> : <Play size={15} />}
                        {p.status === "RUNNING" ? "Пауза" : "Старт"}
                      </button>
                    )}
                    {p.status !== "DONE" && (
                      <button className="btn ghost h-9" onClick={() => stepNow(p)} disabled={busy === p.id}>
                        {busy === p.id ? <Loader2 size={15} className="animate-spin" /> : <StepForward size={15} />}
                        Шаг сейчас
                      </button>
                    )}
                    <button className="btn ghost h-9 text-st-ban ml-auto" onClick={() => remove(p)} disabled={busy === p.id}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
