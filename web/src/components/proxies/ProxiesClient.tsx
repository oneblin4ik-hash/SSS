"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, RefreshCw, Loader2 } from "lucide-react";
import { Topbar } from "@/components/Topbar";

type Proxy = {
  id: string;
  type: string;
  host: string;
  port: number;
  username: string | null;
  label: string | null;
};

export function ProxiesClient() {
  const [proxies, setProxies] = useState<Proxy[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const [type, setType] = useState("SOCKS5");
  const [host, setHost] = useState("");
  const [port, setPort] = useState(1080);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [label, setLabel] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/proxies", { cache: "no-store" }).then((x) => x.json());
      setProxies(Array.isArray(r) ? r : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function create() {
    setErr(""); setBusy(true);
    try {
      const r = await fetch("/api/proxies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, host, port: Number(port), username: username || undefined, password: password || undefined, label: label || undefined }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Ошибка");
      setHost(""); setUsername(""); setPassword(""); setLabel("");
      await load();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    await fetch(`/api/proxies/${id}`, { method: "DELETE" });
    setProxies((p) => p.filter((x) => x.id !== id));
  }

  return (
    <>
      <Topbar
        title="Прокси"
        sub="Прокси для привязки к Telegram-аккаунтам"
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
            <Plus size={16} className="text-accent" /> Новый прокси
          </h3>
          <div className="flex flex-col gap-3">
            <div className="flex gap-3">
              <select className="inp w-32" value={type} onChange={(e) => setType(e.target.value)}>
                <option value="SOCKS5">SOCKS5</option>
                <option value="HTTP">HTTP</option>
                <option value="MTPROTO">MTProto</option>
              </select>
              <input className="inp flex-1 mono" placeholder="host" value={host} onChange={(e) => setHost(e.target.value)} />
              <input className="inp w-24 mono" type="number" placeholder="port" value={port} onChange={(e) => setPort(Number(e.target.value))} />
            </div>
            <div className="flex gap-3">
              <input className="inp" placeholder="Логин (необязательно)" value={username} onChange={(e) => setUsername(e.target.value)} />
              <input className="inp" placeholder="Пароль (необязательно)" value={password} onChange={(e) => setPassword(e.target.value)} />
              <input className="inp" placeholder="Метка" value={label} onChange={(e) => setLabel(e.target.value)} />
            </div>
            <button className="btn primary ml-auto" onClick={create} disabled={busy || !host}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Добавить
            </button>
          </div>
        </div>

        {proxies.length === 0 ? (
          <div className="card card-pad text-center py-10 text-sm text-text-dim">Прокси пока нет.</div>
        ) : (
          <div className="flex flex-col gap-2">
            {proxies.map((p) => (
              <div key={p.id} className="card card-pad flex items-center justify-between">
                <div>
                  <div className="text-text-bright font-medium">{p.label || `${p.host}:${p.port}`}</div>
                  <div className="text-xs text-text-faint mono">{p.type} · {p.host}:{p.port}</div>
                </div>
                <button className="btn ghost h-8 px-2 text-st-ban" onClick={() => remove(p.id)}>
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
