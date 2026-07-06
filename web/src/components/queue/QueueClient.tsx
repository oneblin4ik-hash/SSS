"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Send, Check, X, Loader2 } from "lucide-react";
import { Topbar } from "@/components/Topbar";

type Account = { id: string; name: string | null; username: string | null };
type Draft = {
  id: string;
  content: string;
  variants: string[];
  status: string;
  account: Account;
  message: {
    id: string;
    text: string;
    authorName: string | null;
    authorUsername: string | null;
    source: { title: string; username: string | null };
  };
};

async function send(url: string, method: string, body?: unknown) {
  const r = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || "Ошибка");
  return data;
}

export function QueueClient() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [edited, setEdited] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await fetch("/api/drafts", { cache: "no-store" }).then((r) => r.json());
      setDrafts(Array.isArray(d) ? d : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function save(d: Draft) {
    setBusy(d.id); setErr("");
    try {
      await send(`/api/drafts/${d.id}`, "PATCH", { editedContent: edited[d.id] });
      await load();
    } catch (e: any) { setErr(e.message); } finally { setBusy(null); }
  }
  async function approveAndPublish(d: Draft) {
    setBusy(d.id); setErr("");
    try {
      await send(`/api/drafts/${d.id}`, "PATCH", { editedContent: edited[d.id], status: "APPROVED" });
      await send(`/api/drafts/${d.id}/publish`, "POST");
      await load();
    } catch (e: any) { setErr(e.message); } finally { setBusy(null); }
  }
  async function reject(d: Draft) {
    setBusy(d.id); setErr("");
    try {
      await send(`/api/drafts/${d.id}`, "PATCH", { status: "REJECTED" });
      await load();
    } catch (e: any) { setErr(e.message); } finally { setBusy(null); }
  }

  return (
    <>
      <Topbar
        title="Очередь"
        sub="Проверьте и опубликуйте сгенерированные ответы"
        action={
          <button className="btn ghost" onClick={load} title="Обновить">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        }
      />
      <div className="p-7 flex-1 flex flex-col gap-4 max-w-3xl">
        {err && <div className="text-sm text-st-ban bg-st-ban/10 border border-st-ban/30 rounded-btn px-3 py-2">{err}</div>}
        {drafts.length === 0 ? (
          <div className="card card-pad text-center py-16 text-sm text-text-dim">Очередь пуста.</div>
        ) : (
          drafts.map((d) => {
            const published = d.status === "PUBLISHED";
            return (
              <div key={d.id} className="card card-pad">
                <div className="text-xs text-text-faint mb-2">
                  {d.message.source.title} · {d.message.authorName || d.message.authorUsername || "неизвестно"} · через{" "}
                  {d.account.name || d.account.username}
                </div>
                <p className="text-sm text-text mb-3 bg-surface-2 rounded-lg p-3">{d.message.text}</p>

                <label className="field-label">Ответ (от лица аккаунта)</label>
                {!published && d.variants && d.variants.length > 1 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {d.variants.map((v, i) => (
                      <button
                        key={i}
                        onClick={() => setEdited((p) => ({ ...p, [d.id]: v }))}
                        className={`text-xs px-2.5 h-7 rounded-full border transition-colors max-w-[280px] truncate ${
                          (edited[d.id] ?? d.content) === v
                            ? "border-accent bg-accent/10 text-accent"
                            : "border-line text-text-dim hover:text-text"
                        }`}
                        title={v}
                      >
                        Вариант {i + 1}
                      </button>
                    ))}
                  </div>
                )}
                <textarea
                  className="inp !h-auto min-h-[72px] py-2 resize-y"
                  value={edited[d.id] ?? d.content}
                  disabled={published}
                  onChange={(e) => setEdited((p) => ({ ...p, [d.id]: e.target.value }))}
                />

                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  {!published && (
                    <>
                      <button className="btn secondary h-9" onClick={() => save(d)} disabled={busy === d.id}>
                        {busy === d.id ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                        Сохранить
                      </button>
                      <button className="btn primary h-9" onClick={() => approveAndPublish(d)} disabled={busy === d.id}>
                        <Send size={15} /> Опубликовать
                      </button>
                      <button className="btn ghost h-9 text-st-ban" onClick={() => reject(d)} disabled={busy === d.id}>
                        <X size={15} /> Отклонить
                      </button>
                    </>
                  )}
                  {published && <span className="badge" style={{ background: "var(--st-live)22", color: "var(--st-live)" }}>опубликовано</span>}
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
