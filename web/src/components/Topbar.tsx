import type { ReactNode } from "react";

export function Topbar({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between px-7 py-5 border-b border-line">
      <div>
        <h1 className="display text-xl text-text-bright m-0">{title}</h1>
        {sub && <p className="text-sm text-text-dim mt-1 mb-0">{sub}</p>}
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}
