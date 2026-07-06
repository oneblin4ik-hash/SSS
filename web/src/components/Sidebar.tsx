"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { NAV } from "@/config/nav";

export function Sidebar({ userName, userEmail }: { userName: string | null; userEmail: string }) {
  const pathname = usePathname();
  const router = useRouter();

  const sections = Array.from(new Set(NAV.map((n) => n.section)));

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <aside className="w-64 shrink-0 border-r border-line flex flex-col justify-between h-screen sticky top-0">
      <div>
        <div className="flex items-center gap-2 px-5 py-5">
          <div className="w-8 h-8 rounded-lg bg-accent/15 text-accent grid place-items-center font-bold">П</div>
          <span className="display text-lg text-text-bright">Про Поток</span>
        </div>
        <nav className="px-3 flex flex-col gap-4">
          {sections.map((section) => (
            <div key={section}>
              <div className="text-xs text-text-faint px-2 mb-1 uppercase tracking-wide">{section}</div>
              <div className="flex flex-col gap-0.5">
                {NAV.filter((n) => n.section === section).map((item) => {
                  const active = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      className={`flex items-center gap-2.5 px-2.5 h-9 rounded-lg text-sm transition-colors ${
                        active ? "bg-accent/10 text-accent" : "text-text-dim hover:text-text hover:bg-surface-2"
                      }`}
                    >
                      <Icon size={16} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-2.5 px-5 py-4 border-t border-line">
        <div className="w-8 h-8 rounded-full bg-surface-3 grid place-items-center text-xs font-semibold text-accent">
          {(userName || userEmail).slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm text-text-bright truncate">{userName || "Без имени"}</div>
          <div className="text-xs text-text-faint truncate">{userEmail}</div>
        </div>
        <button className="text-text-faint hover:text-text-bright" onClick={logout} title="Выйти">
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}
