"use client";

import { useEffect, useState } from "react";
import { Topbar } from "@/components/Topbar";
import { Loader2, Check } from "lucide-react";

type Settings = {
  email: string;
  name: string | null;
  targetChannel: string | null;
  defaultTone: string | null;
  safetyMode: "CONSERVATIVE" | "BALANCED" | "AGGRESSIVE";
  autoPauseOnRisk: boolean;
};

const MODES: { key: Settings["safetyMode"]; label: string; desc: string }[] = [
  { key: "CONSERVATIVE", label: "Консервативный", desc: "Минимальные лимиты, макс. безопасность" },
  { key: "BALANCED", label: "Сбалансированный", desc: "Оптимум скорости и безопасности" },
  { key: "AGGRESSIVE", label: "Агрессивный", desc: "Выше лимиты, для старых аккаунтов" },
];

const TONES = [
  "Дружелюбный, по делу",
  "Экспертный, уверенный",
  "Краткий и нейтральный",
  "Энергичный, с эмодзи",
];

export function SettingsClient() {
  const [s, setS] = useState<Settings | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings", { cache: "no-store" })
      .then((r) => r.json())
      .then(setS);
  }, []);

  async function save() {
    if (!s) return;
    setBusy(true);
    setSaved(false);
    try {
      const r = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: s.name ?? "",
          targetChannel: s.targetChannel ?? "",
          defaultTone: s.defaultTone ?? TONES[0],
          safetyMode: s.safetyMode,
          autoPauseOnRisk: s.autoPauseOnRisk,
        }),
      });
      if (r.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Topbar
        title="Настройки"
        sub="Личный кабинет — изменения сохраняются автоматически на сервере"
        action={
          <button className="btn primary" onClick={save} disabled={busy || !s}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : saved ? <Check size={16} /> : null}
            {saved ? "Сохранено" : "Сохранить"}
          </button>
        }
      />
      <div className="p-7 flex-1 max-w-2xl">
        {!s ? (
          <div className="text-text-dim text-sm">Загрузка…</div>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="card card-pad">
              <h3 className="display text-base mb-4">Профиль</h3>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="field-label">Email</label>
                  <input className="inp opacity-60" value={s.email} disabled />
                </div>
                <div>
                  <label className="field-label">Имя</label>
                  <input
                    className="inp"
                    value={s.name ?? ""}
                    onChange={(e) => setS({ ...s, name: e.target.value })}
                    placeholder="Ваше имя"
                  />
                </div>
              </div>
            </div>

            <div className="card card-pad">
              <h3 className="display text-base mb-1">Привлечение трафика</h3>
              <p className="text-sm text-text-dim mb-4">
                Канал, на который вы направляете трафик, и тон ответов по умолчанию.
              </p>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="field-label">Целевой канал</label>
                  <input
                    className="inp mono"
                    value={s.targetChannel ?? ""}
                    onChange={(e) => setS({ ...s, targetChannel: e.target.value })}
                    placeholder="@my_channel или https://t.me/my_channel"
                  />
                </div>
                <div>
                  <label className="field-label">Тон ответов по умолчанию</label>
                  <select
                    className="inp"
                    value={s.defaultTone ?? TONES[0]}
                    onChange={(e) => setS({ ...s, defaultTone: e.target.value })}
                  >
                    {TONES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="card card-pad">
              <h3 className="display text-base mb-1">Защита от бана</h3>
              <p className="text-sm text-text-dim mb-4">
                Режим определяет лимиты действий и темп. ИИ адаптирует поведение под возраст аккаунта.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
                {MODES.map((m) => (
                  <button
                    key={m.key}
                    onClick={() => setS({ ...s, safetyMode: m.key })}
                    className={`text-left p-3 rounded-btn border transition-colors ${
                      s.safetyMode === m.key
                        ? "border-accent bg-accent/10"
                        : "border-line hover:border-line-soft"
                    }`}
                  >
                    <div
                      className={`text-sm font-medium ${
                        s.safetyMode === m.key ? "text-accent" : "text-text"
                      }`}
                    >
                      {m.label}
                    </div>
                    <div className="text-xs text-text-faint mt-0.5">{m.desc}</div>
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-2.5 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={s.autoPauseOnRisk}
                  onChange={(e) => setS({ ...s, autoPauseOnRisk: e.target.checked })}
                />
                Автоматически ставить аккаунт на паузу при риске бана
              </label>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
