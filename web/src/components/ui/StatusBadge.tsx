const STATUS_LABELS: Record<string, string> = {
  CONNECTING: "подключение",
  ACTIVE: "активен",
  WARMING: "прогрев",
  PAUSED: "пауза",
  ERROR: "ошибка",
  BANNED: "забанен",
};
const STATUS_COLORS: Record<string, string> = {
  CONNECTING: "var(--st-idle)",
  ACTIVE: "var(--st-live)",
  WARMING: "var(--accent)",
  PAUSED: "var(--st-idle)",
  ERROR: "var(--st-ban)",
  BANNED: "var(--st-ban)",
};

export function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] || "var(--st-idle)";
  return (
    <span className="badge" style={{ background: `${color}22`, color }}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

const RISK_LABELS: Record<string, string> = { LOW: "низкий", MEDIUM: "средний", HIGH: "высокий" };
const RISK_COLORS: Record<string, string> = {
  LOW: "var(--st-live)",
  MEDIUM: "var(--accent)",
  HIGH: "var(--st-ban)",
};

export function RiskBadge({ level }: { level: string }) {
  const color = RISK_COLORS[level] || "var(--st-idle)";
  return (
    <span className="badge" style={{ background: `${color}22`, color }}>
      {RISK_LABELS[level] || level}
    </span>
  );
}
