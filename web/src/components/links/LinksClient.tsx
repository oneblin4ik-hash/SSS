"use client";

import { useCallback, useEffect, useState } from "react";
import { Link2, Plus, Trash2, RefreshCw, Copy, Loader2, MousePointerClick } from "lucide-react";
import { Topbar } from "@/components/Topbar";

type TLink = {
  id: string;
  slug: string;
  shortUrl: string;
  targetUrl: string;
  label: string | null;
  clicks: number;
  createdAt: string;
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

export function LinksClient() {
  const [links, setLinks] = useState<TLink[]>([]);
  const [targetUrl, setTargetUrl] = useState("");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/links", { cache: "no-store" }).then((x) => x.json());
      setLinks(Array.isArray(r) ? r : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function create() {
    setErr(""); setBusy(true);
    try {
      await jsend("/api/links", "POST", { targetUrl, label });
      setTargetUrl(""); setLabel("");
      await load();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function remove(id: string) {
    await jsend(`/api/links/${id}`, "DELETE");
    setLinks((l) => l.filter((x) => x.id !== id));
  }
  function copy(url: string) {
    navigator.clipboard?.writeText(url);
    setCopied(url);
    setTimeout(() => setCopied(null), 1500);
  }

  const totalClicks = links.reduce((n, l) => n + l.clicks, 0);

  return (
    <>
      <Topbar
        title="Ссылки"
        sub="Трекинг-ссылки для аналитики переходов на ваш канал/оффер"
        action={
          <button className="btn ghost" onClick={load} title="Обновить">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        }
      />
      <div className="p-7 flex-1 flex flex-col gap-6 max-w-3xl">
        {err && (
          <div className="text-sm text-st-ban bg-st-ban/10 border border-st-ban/30 rounded-btn px-3 py-2">{err}</div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="card card-pad">
            <div className="text-xs text-text-dim mb-2">Всего ссылок</div>
            <div className="num text-3xl leading-none">{links.length}</div>
          </div>
          <div className="card card-pad">
            <div className="text-xs text-text-dim mb-2 flex items-center gap-1.5">
              <MousePointerClick size={13} className="text-accent" /> Переходов
            </div>
            <div className="num text-3xl leading-none">{totalClicks}</div>
          </div>
        </div>

        <div className="card card-pad">
          <h3 className="display text-base mb-3 flex items-center gap-2">
            <Plus size={16} className="text-accent" /> Новая трекинг-ссылка
          </h3>
          <div className="flex flex-col gap-3">
            <div>
              <label className="field-label">Куда ведёт (URL)</label>
              <input className="inp mono" value={targetUrl} onChange={(e) => setTargetUrl(e.target.value)} placeholder="https://t.me/my_channel" />
            </div>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="field-label">Метка (необязательно)</label>
                <input className="inp" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Рассылка июль" />
              </div>
              <button className="btn primary" onClick={create} disabled={busy || !targetUrl}>
                {busy ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />}
                Создать
              </button>
            </div>
          </div>
        </div>

        {links.length === 0 ? (
          <div className="card card-pad text-center py-10 text-sm text-text-dim">Ссылок пока нет.</div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-dim border-b border-line">
                  <th className="font-medium px-5 py-3">Ссылка</th>
                  <th className="font-medium px-5 py-3">Цель</th>
                  <th className="font-medium px-5 py-3 text-right">Переходы</th>
                  <th className="font-medium px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {links.map((l) => (
                  <tr key={l.id} className="border-b border-line-soft last:border-0 hover:bg-surface-2/40">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <button className="mono text-accent hover:underline flex items-center gap-1" onClick={() => copy(l.shortUrl)} title="Копировать">
                          /r/{l.slug} <Copy size={12} />
                        </button>
                        {copied === l.shortUrl && <span className="text-xs text-st-live">скопировано</span>}
                      </div>
                      {l.label && <div className="text-xs text-text-faint mt-0.5">{l.label}</div>}
                    </td>
                    <td className="px-5 py-3.5 mono text-xs text-text-dim truncate max-w-[220px]">{l.targetUrl}</td>
                    <td className="px-5 py-3.5 text-right num">{l.clicks}</td>
                    <td className="px-5 py-3.5 text-right">
                      <button className="btn ghost h-8 px-2 text-st-ban" onClick={() => remove(l.id)} title="Удалить">
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
    </>
  );
}
