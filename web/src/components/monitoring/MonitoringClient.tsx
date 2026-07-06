"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, RefreshCw, Radar, Search, Loader2, Sparkles, Bot, ChevronDown, ChevronUp, Zap } from "lucide-react";
import { Topbar } from "@/components/Topbar";

type Source = {
  id: string;
  type: string;
  title: string;
  username: string | null;
  isActive: boolean;
  lastScanAt: string | null;
  messageCount: number;
  autoComment: boolean;
  autoAccountIds: string[];
  autoDailyLimit: number;
  autoTone: string | null;
};
type Account = { id: string; name: string | null; phone: string };
type Keyword = { id: string; text: string; isActive: boolean };
type Message = {
  id: string;
  text: string;
  authorName: string | null;
  authorUsername: string | null;
  matchedKeywords: string[];
  status: string;
  postedAt: string;
  source: { title: string; username: string | null };
};

async function jget(url: string) {
  return fetch(url, { cache: "no-store" }).then((r) => r.json());
}
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

export function MonitoringClient() {
  const [sources, setSources] = useState<Source[]>([]);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [scanning, setScanning] = useState<string | null>(null);
  const [drafting, setDrafting] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [ticking, setTicking] = useState<string | null>(null);

  const [type, setType] = useState("CHANNEL");
  const [handle, setHandle] = useState("");
  const [kw, setKw] = useState("");

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [s, k, m, a] = await Promise.all([
        jget("/api/sources"), jget("/api/keywords"), jget("/api/messages"), jget("/api/accounts"),
      ]);
      setSources(Array.isArray(s) ? s : []);
      setKeywords(Array.isArray(k) ? k : []);
      setMessages(Array.isArray(m) ? m : []);
      setAccounts(Array.isArray(a) ? a : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  async function addSource() {
    setErr("");
    try {
      await jsend("/api/sources", "POST", { type, handle });
      setHandle("");
      await loadAll();
    } catch (e: any) {
      setErr(e.message);
    }
  }
  async function toggleSource(s: Source) {
    await jsend(`/api/sources/${s.id}`, "PATCH", { isActive: !s.isActive });
    setSources((x) => x.map((y) => (y.id === s.id ? { ...y, isActive: !y.isActive } : y)));
  }
  async function scan(id: string) {
    setErr(""); setScanning(id);
    try {
      const r = await jsend(`/api/sources/${id}/scan`, "POST");
      setErr(`Найдено новых: ${r.fresh}`);
      await loadAll();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setScanning(null);
    }
  }
  async function removeSource(id: string) {
    await jsend(`/api/sources/${id}`, "DELETE");
    setSources((x) => x.filter((y) => y.id !== id));
  }
  async function patchAuto(s: Source, patch: Partial<Pick<Source, "autoComment" | "autoAccountIds" | "autoDailyLimit" | "autoTone">>) {
    const updated = await jsend(`/api/sources/${s.id}`, "PATCH", patch);
    setSources((x) => x.map((y) => (y.id === s.id ? { ...y, ...updated } : y)));
  }
  function toggleAutoAccount(s: Source, accountId: string) {
    const next = s.autoAccountIds.includes(accountId)
      ? s.autoAccountIds.filter((id) => id !== accountId)
      : [...s.autoAccountIds, accountId];
    patchAuto(s, { autoAccountIds: next });
  }
  async function tickAutoNow(id: string) {
    setErr(""); setTicking(id);
    try {
      const r = await jsend(`/api/sources/${id}/autocomment`, "POST");
      setErr(r.detail || "Тик выполнен");
      await loadAll();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setTicking(null);
    }
  }
  async function addKeyword() {
    if (!kw.trim()) return;
    await jsend("/api/keywords", "POST", { text: kw.trim() });
    setKw("");
    await loadAll();
  }
  async function removeKeyword(id: string) {
    await jsend(`/api/keywords/${id}`, "DELETE");
    setKeywords((x) => x.filter((y) => y.id !== id));
  }
  async function makeDraft(id: string) {
    setDrafting(id);
    try {
      await jsend(`/api/messages/${id}/draft`, "POST");
      await loadAll();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setDrafting(null);
    }
  }

  return (
    <>
      <Topbar
        title="Мониторинг"
        sub="Источники, ключевые слова и найденные сообщения"
        action={
          <button className="btn ghost" onClick={loadAll} title="Обновить">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        }
      />
      <div className="p-7 flex-1 flex flex-col gap-6 max-w-4xl">
        {err && <div className="text-sm text-accent bg-accent/10 border border-accent/30 rounded-btn px-3 py-2">{err}</div>}

        <div className="card card-pad">
          <h3 className="display text-base mb-3 flex items-center gap-2">
            <Radar size={16} className="text-accent" /> Источники
          </h3>
          <div className="flex gap-2 mb-4">
            <select className="inp w-32" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="CHANNEL">Канал</option>
              <option value="GROUP">Чат</option>
            </select>
            <input className="inp flex-1 mono" placeholder="@channel или t.me/channel" value={handle} onChange={(e) => setHandle(e.target.value)} />
            <button className="btn primary" onClick={addSource} disabled={!handle}>
              <Plus size={16} /> Добавить
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {sources.map((s) => (
              <div key={s.id} className="border-b border-line-soft last:border-0">
                <div className="flex items-center gap-3 py-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-text-bright font-medium truncate">{s.title}</div>
                    <div className="text-xs text-text-faint">
                      {s.messageCount} сообщ. · {s.lastScanAt ? `скан ${new Date(s.lastScanAt).toLocaleString("ru-RU")}` : "не сканировался"}
                      {s.autoComment && ` · авто-комменты вкл, лимит ${s.autoDailyLimit}/день`}
                    </div>
                  </div>
                  <button
                    className={`badge ${s.autoComment ? "" : "opacity-50"}`}
                    style={{ background: s.autoComment ? "var(--accent)22" : "var(--st-idle)22", color: s.autoComment ? "var(--accent)" : "var(--st-idle)" }}
                    onClick={() => patchAuto(s, { autoComment: !s.autoComment })}
                    title="Авто-нейрокомментинг"
                  >
                    <Bot size={12} className="inline mr-1" />
                    {s.autoComment ? "авто вкл" : "авто выкл"}
                  </button>
                  <button
                    className={`badge ${s.isActive ? "" : "opacity-60"}`}
                    style={{ background: s.isActive ? "var(--st-live)22" : "var(--st-idle)22", color: s.isActive ? "var(--st-live)" : "var(--st-idle)" }}
                    onClick={() => toggleSource(s)}
                  >
                    {s.isActive ? "активен" : "пауза"}
                  </button>
                  <button className="btn ghost h-8 px-2" onClick={() => scan(s.id)} disabled={scanning === s.id}>
                    {scanning === s.id ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                    Скан
                  </button>
                  <button className="btn ghost h-8 px-2" onClick={() => setExpanded(expanded === s.id ? null : s.id)}>
                    {expanded === s.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  <button className="btn ghost h-8 px-2 text-st-ban" onClick={() => removeSource(s.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>

                {expanded === s.id && (
                  <div className="bg-surface-2 rounded-lg p-4 mb-3 flex flex-col gap-3">
                    <div>
                      <label className="field-label">Аккаунты для авто-комментинга (пусто = все активные)</label>
                      <div className="flex flex-wrap gap-2">
                        {accounts.length === 0 && <span className="text-xs text-text-faint">Нет аккаунтов.</span>}
                        {accounts.map((a) => (
                          <button
                            key={a.id}
                            onClick={() => toggleAutoAccount(s, a.id)}
                            className={`text-xs px-2.5 h-7 rounded-full border transition-colors ${
                              s.autoAccountIds.includes(a.id)
                                ? "border-accent bg-accent/10 text-accent"
                                : "border-line text-text-dim hover:text-text"
                            }`}
                          >
                            {a.name || a.phone}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-4 items-end">
                      <div>
                        <label className="field-label">Лимит комментариев/день</label>
                        <input
                          type="number" min={1} max={100} className="inp w-28"
                          value={s.autoDailyLimit}
                          onChange={(e) => patchAuto(s, { autoDailyLimit: Number(e.target.value) })}
                        />
                      </div>
                      <div className="flex-1">
                        <label className="field-label">Тон комментариев (необязательно)</label>
                        <input
                          className="inp" value={s.autoTone ?? ""}
                          onChange={(e) => patchAuto(s, { autoTone: e.target.value || null })}
                          placeholder="Использовать тон аккаунта по умолчанию"
                        />
                      </div>
                      <button className="btn secondary h-9" onClick={() => tickAutoNow(s.id)} disabled={ticking === s.id}>
                        {ticking === s.id ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                        Тик сейчас
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="card card-pad">
          <h3 className="display text-base mb-3">Ключевые слова</h3>
          <div className="flex gap-2 mb-3">
            <input className="inp flex-1" placeholder="ключевое слово" value={kw} onChange={(e) => setKw(e.target.value)} />
            <button className="btn primary" onClick={addKeyword} disabled={!kw.trim()}>
              <Plus size={16} />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {keywords.map((k) => (
              <span key={k.id} className="badge bg-surface-3 text-text-dim flex items-center gap-1.5">
                {k.text}
                <button onClick={() => removeKeyword(k.id)} className="hover:text-st-ban">×</button>
              </span>
            ))}
          </div>
        </div>

        <div className="card card-pad">
          <h3 className="display text-base mb-3">Найденные сообщения</h3>
          {messages.length === 0 ? (
            <div className="text-sm text-text-dim py-6 text-center">Пока ничего не найдено.</div>
          ) : (
            <div className="flex flex-col gap-3">
              {messages.map((m) => (
                <div key={m.id} className="border-b border-line-soft last:border-0 pb-3">
                  <div className="text-xs text-text-faint mb-1">
                    {m.source.title} · {m.authorName || m.authorUsername || "неизвестно"} · {new Date(m.postedAt).toLocaleString("ru-RU")}
                  </div>
                  <div className="text-sm text-text mb-2">{m.text}</div>
                  {m.status === "NEW" ? (
                    <button className="btn secondary h-8" onClick={() => makeDraft(m.id)} disabled={drafting === m.id}>
                      {drafting === m.id ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                      Создать ответ
                    </button>
                  ) : (
                    <span className="badge bg-surface-3 text-text-dim">{m.status === "DRAFTED" ? "черновик готов" : "пропущено"}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
