"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const r = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Ошибка регистрации");
      router.push("/dashboard");
      router.refresh();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={submit} className="card card-pad w-full max-w-sm flex flex-col gap-4">
        <h1 className="display text-xl text-text-bright">Регистрация</h1>
        {err && <div className="text-sm text-st-ban">{err}</div>}
        <div>
          <label className="field-label">Имя</label>
          <input className="inp" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="field-label">Email</label>
          <input className="inp" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="field-label">Пароль</label>
          <input className="inp" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
        </div>
        <button className="btn primary justify-center" disabled={busy}>
          {busy ? <Loader2 size={16} className="animate-spin" /> : null}
          Создать аккаунт
        </button>
        <p className="text-sm text-text-dim text-center">
          Уже есть аккаунт? <Link href="/login" className="text-accent">Войти</Link>
        </p>
      </form>
    </div>
  );
}
