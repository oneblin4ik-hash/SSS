"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";

export function AddAccountModal({
  open,
  onClose,
  onAdded,
}: {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [step, setStep] = useState<"phone" | "code" | "2fa">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  if (!open) return null;

  async function requestCode() {
    setErr(""); setBusy(true);
    try {
      const r = await fetch("/api/auth/telegram/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Ошибка");
      setStep("code");
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function signIn() {
    setErr(""); setBusy(true);
    try {
      const r = await fetch("/api/auth/telegram/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Ошибка");
      if (d.needs2fa) { setStep("2fa"); return; }
      reset(); onAdded(); onClose();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function submit2fa() {
    setErr(""); setBusy(true);
    try {
      const r = await fetch("/api/auth/telegram/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Ошибка");
      reset(); onAdded(); onClose();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setStep("phone"); setPhone(""); setCode(""); setPassword("");
  }

  return (
    <div className="fixed inset-0 bg-black/60 grid place-items-center z-50">
      <div className="card card-pad w-full max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="display text-base">Добавить аккаунт</h3>
          <button onClick={() => { reset(); onClose(); }} className="text-text-faint hover:text-text-bright">
            <X size={18} />
          </button>
        </div>
        {err && <div className="text-sm text-st-ban mb-3">{err}</div>}
        {step === "phone" && (
          <div className="flex flex-col gap-3">
            <div>
              <label className="field-label">Номер телефона</label>
              <input className="inp mono" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+79991234567" />
            </div>
            <button className="btn primary justify-center" onClick={requestCode} disabled={busy || !phone}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : null}
              Получить код
            </button>
          </div>
        )}
        {step === "code" && (
          <div className="flex flex-col gap-3">
            <div>
              <label className="field-label">Код из Telegram</label>
              <input className="inp mono" value={code} onChange={(e) => setCode(e.target.value)} />
            </div>
            <button className="btn primary justify-center" onClick={signIn} disabled={busy || !code}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : null}
              Войти
            </button>
          </div>
        )}
        {step === "2fa" && (
          <div className="flex flex-col gap-3">
            <div>
              <label className="field-label">Пароль двухфакторной аутентификации</label>
              <input className="inp" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <button className="btn primary justify-center" onClick={submit2fa} disabled={busy || !password}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : null}
              Подтвердить
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
