"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Play, Pause, StepForward, Trash2, RefreshCw, Plus, Loader2,
  ThumbsUp, Send, UserPlus, Eye,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Topbar } from "@/components/Topbar";

type Type = "REACTION" | "MAILING" | "INVITE" | "STORY_VIEW";
type Account = { id: string; name: string | null; username: string | null; phone: string };
type Audience = { id: string; name: string; count: number };
type Campaign = {
  id: string; type: Type; name: string; status: string;
  targets: string[]; emoji: string | null; reactCount: number;
  audience: { name: string; count: number } | null; message: string | null;
  accountIds: string[]; perAccountLimit: number;
  cursor: number; sentCount: number; failCount: number; total: number;
};

const CONFIG: Record<Type, {
  title: string; sub: string; icon: LucideIcon;
  needTargets?: boolean; needDest?: boolean; needEmoji?: boolean;
  needAudience?: boolean; needMessage?: boolean; sentWord: string;
}> = {
  REACTION: { title: "Масс-реакции", sub: "Реакции на свежие посты в чатах и каналах с ваших аккаунтов", icon: ThumbsUp, needTargets: true, needEmoji: true, sentWord: "реакций" },
  MAILING: { title: "Рассылка", sub: "Сообщения в ЛС по собранной базе — с лимитами и паузами", icon: Send, needAudience: true, needMessage: true, sentWord: "отправлено" },
  INVITE: { title: "Инвайтинг", sub: "Заливка собранной базы в ваш канал или группу", icon: UserPlus, needAudience: true, needDest: true, sentWord: "приглашено" },
  STORY_VIEW: { title: "Масслукинг", sub: "Массовый просмотр историй по базе — «просмотрено» ведёт людей в профиль", icon: Eye, needAudience: true, sentWord: "просмотрено" },
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

export function CampaignClient({ type }: { type: Type }) {
  const cfg = CONFIG[type];
  const Icon = cfg.icon;

  const [items, setItems] = useState<Campaign[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [audiences, setAudiences] = useState<Audience[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [accIds, setAccIds] = useState<string[]>([]);
  const [limit, setLimit] = useState(30);
  const [targets, setTargets] = useState("");
  const [dest, setDest] = useState("");
  const [emoji, setEmoji] = useState("👍");
  const [reactCount, setReactCount] = useState(3);
  const [audienceId, setAudienceId] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, a, au] = await Promise.all([
        fetch(`/api/campaigns?type=${type}`, { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/accounts", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/audiences", { cache: "no-store" }).then((r) => r.json()).catch(() => []),
      ]);
      setItems(Array.isArray(c) ? c : []);
      setAccounts(Array.isArray(a) ? a : []);
      setAudiences(Array.isArray(au) ? au : []);
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => { load(); }, [load]);

  async function act(id: string, fn: () => Promise<void>) {
    setErr(""); setBusy(id);
    try { await fn(); } catch (e: any) { setErr(e.message); } finally { setBusy(null); }
  }

  async function create() {
    await act("new", async () => {
      const body: any = { type, name: name || cfg.title, accountIds: accIds, perAccountLimit: limit };
      if (cfg.needTargets) body.targets = targets.split("\n").map((s) => s.trim()).filter(Boolean);
      if (cfg.needDest) body.targets = [dest.trim()];
      if (cfg.needEmoji) { body.emoji = emoji; body.reactCount = reactCount; }
      if (cfg.needAudience) body.audienceId = audienceId;
      if (cfg.needMessage) body.message = message;
      await jsend("/api/campaigns", "POST", body);
      setName(""); setTargets(""); setDest(""); setMessage(""); setAccIds([]);
      await load();
    });
  }
  const toggle = (c: Campaign) =>
    act(c.id, async () => {
      const status = c.status === "RUNNING" ? "PAUSED" : "RUNNING";
      await jsend(`/api/campaigns/${c.id}`, "PATCH", { status });
      setItems((x) => x.map((y) => (y.id === c.id ? { ...y, status } : y)));
    });
  const stepNow = (c: Campaign) =>
    act(c.id, async () => {
      const r = await jsend(`/api/campaigns/${c.id}/run`, "POST");
      setErr(r.detail || "Шаг выполнен");
      await load();
    });
  const remove = (c: Campaign) =>
    act(c.id, async () => {
      await jsend(`/api/campaigns/${c.id}`, "DELETE");
      setItems((x) => x.filter((y) => y.id !== c.id));
    });

  const toggleAcc = (id: string) =>
    setAccIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <>
      <Topbar
        title={cfg.title}
        sub={cfg.sub}
        action={
          <button className="btn ghost" onClick={load} title="Обновить">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        }
      />
      <div className="p-7 flex-1 flex flex-col gap-6 max-w-4xl">
        {err && (
          <div className="text-sm text-accent bg-accent/10 border border-accent/30 rounded-btn px-3 py-2">
            {err}
          </div>
        )}

        <div className="card card-pad">
          <h3 className="display text-base mb-4 flex items-center gap-2">
            <Plus size={16} className="text-accent" /> Новая кампания
          </h3>
          <div className="flex flex-col gap-4">
            <div>
              <label className="field-label">Название</label>
              <input className="inp" value={name} onChange={(e) => setName(e.target.value)} placeholder={cfg.title} />
            </div>

            {cfg.needTargets && (
              <div>
                <label className="field-label">Чаты/каналы (по одному в строке)</label>
                <textarea
                  className="inp !h-auto min-h-[72px] py-2 mono resize-y"
                  value={targets}
                  onChange={(e) => setTargets(e.target.value)}
                  placeholder={"@channel1\nhttps://t.me/channel2"}
                />
              </div>
            )}
            {cfg.needEmoji && (
              <div className="flex gap-4">
                <div>
                  <label className="field-label">Эмодзи</label>
                  <input className="inp w-24" value={emoji} onChange={(e) => setEmoji(e.target.value)} />
                </div>
                <div>
                  <label className="field-label">Реакций на чат</label>
                  <input type="number" min={1} max={10} className="inp w-24" value={reactCount} onChange={(e) => setReactCount(Number(e.target.value))} />
                </div>
              </div>
            )}
            {cfg.needAudience && (
              <div>
                <label className="field-label">База (аудитория)</label>
                <select className="inp" value={audienceId} onChange={(e) => setAudienceId(e.target.value)}>
                  <option value="">Выберите базу…</option>
                  {audiences.map((a) => (
                    <option key={a.id} value={a.id}>{a.name} ({a.count})</option>
                  ))}
                </select>
                {audiences.length === 0 && (
                  <p className="text-xs text-text-faint mt-1">Соберите базу в разделе «Парсинг».</p>
                )}
              </div>
            )}
            {cfg.needDest && (
              <div>
                <label className="field-label">Куда приглашать (ваш канал/группа)</label>
                <input className="inp mono" value={dest} onChange={(e) => setDest(e.target.value)} placeholder="@my_channel" />
              </div>
            )}
            {cfg.needMessage && (
              <div>
                <label className="field-label">Сообщение</label>
                <textarea
                  className="inp !h-auto min-h-[88px] py-2 resize-y"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Текст сообщения для рассылки в ЛС"
                />
                <p className="text-xs text-text-faint mt-1">Совет: сделайте трекинг-ссылку в «Ссылках» и вставьте сюда.</p>
              </div>
            )}

            <div>
              <label className="field-label">Аккаунты-исполнители</label>
              <div className="flex flex-wrap gap-2">
                {accounts.length === 0 && <span className="text-xs text-text-faint">Нет аккаунтов.</span>}
                {accounts.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => toggleAcc(a.id)}
                    className={`text-xs px-2.5 h-7 rounded-full border transition-colors ${
                      accIds.includes(a.id)
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-line text-text-dim hover:text-text"
                    }`}
                  >
                    {a.name || a.phone}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-text-dim">Лимит/аккаунт:</span>
                <input type="number" min={1} max={500} className="inp w-24" value={limit} onChange={(e) => setLimit(Number(e.target.value))} />
              </div>
              <button className="btn primary ml-auto" onClick={create} disabled={busy === "new" || accIds.length === 0}>
                {busy === "new" ? <Loader2 size={16} className="animate-spin" /> : <Icon size={16} />}
                Создать кампанию
              </button>
            </div>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="card card-pad text-center py-10 text-sm text-text-dim">Кампаний пока нет.</div>
        ) : (
          <div className="flex flex-col gap-3">
            {items.map((c) => {
              const pct = c.total ? Math.min(100, Math.round((c.cursor / c.total) * 100)) : 0;
              const meta = cfg.needTargets ? `${c.targets.length} чатов · ${c.emoji}`
                : cfg.needDest ? `→ ${c.targets[0] || "—"}`
                : c.audience?.name || "—";
              return (
                <div key={c.id} className="card card-pad">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Icon size={16} className="text-accent" />
                    <span className="text-text-bright font-medium">{c.name}</span>
                    <span className="text-xs text-text-faint">{meta}</span>
                    <span
                      className="badge ml-auto"
                      style={{
                        background: c.status === "RUNNING" || c.status === "DONE" ? "var(--st-live)22" : "var(--st-idle)22",
                        color: c.status === "RUNNING" || c.status === "DONE" ? "var(--st-live)" : "var(--st-idle)",
                      }}
                    >
                      {c.status === "RUNNING" ? "идёт" : c.status === "DONE" ? "готово" : c.status === "PAUSED" ? "пауза" : "черновик"}
                    </span>
                  </div>

                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-text-dim mb-1">
                      <span>{cfg.sentWord} {c.sentCount} · ошибок {c.failCount}</span>
                      <span>{c.cursor}/{c.total}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden">
                      <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-3">
                    {c.status !== "DONE" && (
                      <button className="btn secondary h-9" onClick={() => toggle(c)} disabled={busy === c.id}>
                        {c.status === "RUNNING" ? <Pause size={15} /> : <Play size={15} />}
                        {c.status === "RUNNING" ? "Пауза" : "Старт"}
                      </button>
                    )}
                    {c.status !== "DONE" && (
                      <button className="btn ghost h-9" onClick={() => stepNow(c)} disabled={busy === c.id}>
                        {busy === c.id ? <Loader2 size={15} className="animate-spin" /> : <StepForward size={15} />}
                        Шаг сейчас
                      </button>
                    )}
                    <button className="btn ghost h-9 text-st-ban ml-auto" onClick={() => remove(c)} disabled={busy === c.id}>
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
