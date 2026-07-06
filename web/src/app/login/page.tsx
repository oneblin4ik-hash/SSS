"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Ошибка входа");
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
        <h1 className="display text-xl text-text-bright">Вход в Про Поток</h1>
        {err && <div className="text-sm text-st-ban">{err}</div>}
        <div>
          <label className="field-label">Email</label>
          <input className="inp" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="field-label">Пароль</label>
          <input className="inp" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <button className="btn primary justify-center" disabled={busy}>
          {busy ? <Loader2 size={16} className="animate-spin" /> : null}
          Войти
        </button>
        <p className="text-sm text-text-dim text-center">
          Нет аккаунта? <Link href="/register" className="text-accent">Зарегистрироваться</Link>
        </p>
      </form>
    </div>
  );
}
