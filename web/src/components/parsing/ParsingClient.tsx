"use client";

import { useCallback, useEffect, useState } from "react";
import { Database, Plus, RefreshCw, Loader2 } from "lucide-react";
import { Topbar } from "@/components/Topbar";

type Audience = { id: string; name: string; count: number; status: string };
type Account = { id: string; name: string | null; phone: string };

export function ParsingClient() {
  const [audiences, setAudiences] = useState<Audience[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const [name, setName] = useState("");
  const [sourceType, setSourceType] = useState<"MEMBERS" | "COMMENTERS">("MEMBERS");
  const [sourceRef, setSourceRef] = useState("");
  const [accountId, setAccountId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, acc] = await Promise.all([
        fetch("/api/audiences", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/accounts", { cache: "no-store" }).then((r) => r.json()),
      ]);
      setAudiences(Array.isArray(a) ? a : []);
      setAccounts(Array.isArray(acc) ? acc : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function create() {
    setErr(""); setBusy(true);
    try {
      const r = await fetch("/api/audiences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, sourceType, sourceRef, accountId: accountId || undefined }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Ошибка");
      setName(""); setSourceRef("");
      await load();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Topbar
        title="Парсинг"
        sub="Соберите базу контактов из участников чата или комментаторов канала"
        action={
          <button className="btn ghost" onClick={load} title="Обновить">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        }
      />
      <div className="p-7 flex-1 flex flex-col gap-6 max-w-2xl">
        {err && <div className="text-sm text-st-ban bg-st-ban/10 border border-st-ban/30 rounded-btn px-3 py-2">{err}</div>}

        <div className="card card-pad">
          <h3 className="display text-base mb-3 flex items-center gap-2">
            <Database size={16} className="text-accent" /> Новая база
          </h3>
          <div className="flex flex-col gap-3">
            <input className="inp" placeholder="Название базы" value={name} onChange={(e) => setName(e.target.value)} />
            <div className="flex gap-2">
              <select className="inp w-44" value={sourceType} onChange={(e) => setSourceType(e.target.value as any)}>
                <option value="MEMBERS">Участники чата</option>
                <option value="COMMENTERS">Комментаторы канала</option>
              </select>
              <input className="inp flex-1 mono" placeholder="@chat_or_channel" value={sourceRef} onChange={(e) => setSourceRef(e.target.value)} />
            </div>
            <select className="inp" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              <option value="">Любой активный аккаунт</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name || a.phone}</option>
              ))}
            </select>
            <button className="btn primary ml-auto" onClick={create} disabled={busy || !name || !sourceRef}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Собрать базу
            </button>
          </div>
        </div>

        {audiences.length === 0 ? (
          <div className="card card-pad text-center py-10 text-sm text-text-dim">Баз пока нет.</div>
        ) : (
          <div className="flex flex-col gap-2">
            {audiences.map((a) => (
              <div key={a.id} className="card card-pad flex items-center justify-between">
                <div className="text-text-bright font-medium">{a.name}</div>
                <div className="text-sm text-text-dim num">{a.count} контактов</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
