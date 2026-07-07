"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Bot, ChevronDown, ChevronUp, Zap, Loader2, Send, MessageCircle } from "lucide-react";
import { Topbar } from "@/components/Topbar";

type Account = {
  id: string;
  name: string | null;
  phone: string;
  toneStyle: string;
  systemPrompt: string | null;
  dailyReplyLimit: number;
  autoReplyEnabled: boolean;
};
type ChatMessage = { id: string; direction: "IN" | "OUT"; text: string; aiGenerated: boolean; createdAt: string };
type Conversation = {
  id: string;
  peerUsername: string | null;
  peerName: string | null;
  autoReply: boolean;
  unread: boolean;
  lastMessageAt: string;
  account: { id: string; name: string | null; phone: string };
  messages: ChatMessage[];
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

export function NeurochatClient() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [expandedAccount, setExpandedAccount] = useState<string | null>(null);
  const [expandedConv, setExpandedConv] = useState<string | null>(null);
  const [ticking, setTicking] = useState<string | null>(null);
  const [sending, setSending] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [a, c] = await Promise.all([jget("/api/accounts"), jget("/api/conversations")]);
      setAccounts(Array.isArray(a) ? a : []);
      setConversations(Array.isArray(c) ? c : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  async function patchAccount(a: Account, patch: Partial<Pick<Account, "autoReplyEnabled" | "toneStyle" | "systemPrompt" | "dailyReplyLimit">>) {
    const updated = await jsend(`/api/accounts/${a.id}`, "PATCH", patch);
    setAccounts((x) => x.map((y) => (y.id === a.id ? { ...y, ...updated } : y)));
  }
  async function tickNow(accountId: string) {
    setErr(""); setTicking(accountId);
    try {
      const r = await jsend(`/api/accounts/${accountId}/autoreply-tick`, "POST");
      setErr(r.detail || "Тик выполнен");
      await loadAll();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setTicking(null);
    }
  }
  async function toggleConvAuto(c: Conversation) {
    const updated = await jsend(`/api/conversations/${c.id}`, "PATCH", { autoReply: !c.autoReply });
    setConversations((x) => x.map((y) => (y.id === c.id ? { ...y, ...updated } : y)));
  }
  function expandConv(id: string) {
    const next = expandedConv === id ? null : id;
    setExpandedConv(next);
    if (next) {
      jsend(`/api/conversations/${id}`, "PATCH", { unread: false })
        .then(() => setConversations((x) => x.map((y) => (y.id === id ? { ...y, unread: false } : y))))
        .catch(() => {});
    }
  }
  async function sendManual(c: Conversation) {
    const text = (drafts[c.id] || "").trim();
    if (!text) return;
    setSending(c.id);
    try {
      await jsend(`/api/conversations/${c.id}/send`, "POST", { text });
      setDrafts((d) => ({ ...d, [c.id]: "" }));
      await loadAll();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSending(null);
    }
  }

  return (
    <>
      <Topbar
        title="Нейрочат"
        sub="Автоответчик для личных сообщений — ИИ отвечает лидам, которые написали первыми"
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
            <Bot size={16} className="text-accent" /> Автоответчик по аккаунтам
          </h3>
          {accounts.length === 0 ? (
            <div className="text-sm text-text-dim py-4 text-center">Сначала подключите аккаунт.</div>
          ) : (
            <div className="flex flex-col gap-2">
              {accounts.map((a) => (
                <div key={a.id} className="border-b border-line-soft last:border-0">
                  <div className="flex items-center gap-3 py-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-text-bright font-medium truncate">{a.name || a.phone}</div>
                      <div className="text-xs text-text-faint">
                        лимит {a.dailyReplyLimit}/день · тон: {a.toneStyle}
                      </div>
                    </div>
                    <button
                      className={`badge ${a.autoReplyEnabled ? "" : "opacity-50"}`}
                      style={{
                        background: a.autoReplyEnabled ? "var(--accent)22" : "var(--st-idle)22",
                        color: a.autoReplyEnabled ? "var(--accent)" : "var(--st-idle)",
                      }}
                      onClick={() => patchAccount(a, { autoReplyEnabled: !a.autoReplyEnabled })}
                      title="Автоответчик"
                    >
                      <Bot size={12} className="inline mr-1" />
                      {a.autoReplyEnabled ? "авто вкл" : "авто выкл"}
                    </button>
                    <button className="btn ghost h-8 px-2" onClick={() => tickNow(a.id)} disabled={ticking === a.id}>
                      {ticking === a.id ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                      Тик сейчас
                    </button>
                    <button className="btn ghost h-8 px-2" onClick={() => setExpandedAccount(expandedAccount === a.id ? null : a.id)}>
                      {expandedAccount === a.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>

                  {expandedAccount === a.id && (
                    <div className="bg-surface-2 rounded-lg p-4 mb-3 flex flex-col gap-3">
                      <div className="flex gap-4 items-end">
                        <div>
                          <label className="field-label">Лимит ответов/день</label>
                          <input
                            type="number" min={1} max={200} className="inp w-28"
                            value={a.dailyReplyLimit}
                            onChange={(e) => patchAccount(a, { dailyReplyLimit: Number(e.target.value) })}
                          />
                        </div>
                        <div className="flex-1">
                          <label className="field-label">Тон общения</label>
                          <input
                            className="inp" value={a.toneStyle}
                            onChange={(e) => patchAccount(a, { toneStyle: e.target.value })}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="field-label">Доп. инструкция для ИИ (необязательно)</label>
                        <textarea
                          className="inp w-full min-h-20" value={a.systemPrompt ?? ""}
                          onChange={(e) => patchAccount(a, { systemPrompt: e.target.value || null })}
                          placeholder="Например: не обсуждай цены, направляй в канал только если спросят про обучение"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card card-pad">
          <h3 className="display text-base mb-3 flex items-center gap-2">
            <MessageCircle size={16} className="text-accent" /> Диалоги
          </h3>
          {conversations.length === 0 ? (
            <div className="text-sm text-text-dim py-6 text-center">Пока никто не писал в личные сообщения.</div>
          ) : (
            <div className="flex flex-col gap-2">
              {conversations.map((c) => (
                <div key={c.id} className="border-b border-line-soft last:border-0">
                  <div className="flex items-center gap-3 py-2 cursor-pointer" onClick={() => expandConv(c.id)}>
                    <div className="flex-1 min-w-0">
                      <div className="text-text-bright font-medium truncate flex items-center gap-2">
                        {c.peerName || (c.peerUsername ? `@${c.peerUsername}` : "неизвестно")}
                        {c.unread && <span className="w-2 h-2 rounded-full bg-accent inline-block" />}
                      </div>
                      <div className="text-xs text-text-faint truncate">
                        {c.account.name || c.account.phone} · {new Date(c.lastMessageAt).toLocaleString("ru-RU")}
                        {c.messages.length > 0 && ` · ${c.messages[c.messages.length - 1].text.slice(0, 60)}`}
                      </div>
                    </div>
                    <button
                      className={`badge ${c.autoReply ? "" : "opacity-50"}`}
                      style={{ background: c.autoReply ? "var(--accent)22" : "var(--st-idle)22", color: c.autoReply ? "var(--accent)" : "var(--st-idle)" }}
                      onClick={(e) => { e.stopPropagation(); toggleConvAuto(c); }}
                      title="Автоответ в этом диалоге"
                    >
                      <Bot size={12} className="inline mr-1" />
                      {c.autoReply ? "авто" : "вручную"}
                    </button>
                    <button className="btn ghost h-8 px-2">
                      {expandedConv === c.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>

                  {expandedConv === c.id && (
                    <div className="bg-surface-2 rounded-lg p-4 mb-3 flex flex-col gap-3">
                      <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
                        {c.messages.map((m) => (
                          <div key={m.id} className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${m.direction === "OUT" ? "self-end bg-accent/15 text-text-bright" : "self-start bg-surface-3 text-text"}`}>
                            {m.text}
                            {m.aiGenerated && <span className="block text-[10px] text-text-faint mt-1">ИИ · {new Date(m.createdAt).toLocaleTimeString("ru-RU")}</span>}
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input
                          className="inp flex-1"
                          placeholder="Ответить вручную…"
                          value={drafts[c.id] || ""}
                          onChange={(e) => setDrafts((d) => ({ ...d, [c.id]: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === "Enter") sendManual(c); }}
                        />
                        <button className="btn secondary h-9" onClick={() => sendManual(c)} disabled={sending === c.id || !(drafts[c.id] || "").trim()}>
                          {sending === c.id ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                        </button>
                      </div>
                    </div>
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
