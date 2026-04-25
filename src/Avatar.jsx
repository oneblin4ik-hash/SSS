const XPBar = ({ pct, compact = false }) => (
  <div className="xp-bar" style={{ height: compact ? 5 : 8 }}>
    <span style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
  </div>
);

const Avatar = ({ size = 120, level = 12, pct = 0, stage = 3, src = null }) => {
  const stageFx = [
    { filter: "saturate(0.6) brightness(0.85)" },
    { filter: "saturate(0.85) brightness(0.95)" },
    { filter: "none" },
    { filter: "saturate(1.1) contrast(1.05)" },
    { filter: "saturate(1.2) contrast(1.1)" },
    { filter: "saturate(1.3) contrast(1.15) brightness(1.05)" }
  ];
  const fx = stageFx[Math.min(5, Math.max(0, stage))];
  const R = size / 2;
  const stroke = Math.max(3, size * 0.035);
  const inner = R - stroke - 3;
  const circ = 2 * Math.PI * inner;
  const dash = circ * (pct / 100);
  const gradId = `rg-${size}-${level}`;

  return (
    <div style={{ position: "relative", width: size, height: size, display: "inline-block" }}>
      <svg width={size} height={size} style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
        <defs>
          <linearGradient id={gradId} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.82 0.14 75)"/>
            <stop offset="100%" stopColor="oklch(0.55 0.18 35)"/>
          </linearGradient>
        </defs>
        <circle cx={R} cy={R} r={inner} stroke="rgba(255,255,255,0.07)" strokeWidth={stroke} fill="none"/>
        <circle cx={R} cy={R} r={inner}
          stroke={`url(#${gradId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          fill="none"
          style={{ filter: "drop-shadow(0 0 6px rgba(217,162,84,0.5))", transition: "stroke-dasharray 0.8s var(--ease-out)" }}
        />
      </svg>
      <div style={{
        position: "absolute",
        top: stroke + 3, left: stroke + 3, right: stroke + 3, bottom: stroke + 3,
        borderRadius: "50%", overflow: "hidden",
        background: "radial-gradient(circle at 30% 30%, #f4c87a 0%, #c88a2a 70%, #6b4a18 100%)",
        boxShadow: "inset 0 4px 12px rgba(0,0,0,0.3), 0 6px 24px rgba(0,0,0,0.5)"
      }}>
        {src
          ? <img src={src} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover", filter: fx.filter }}/>
          : <div style={{
              width: "100%", height: "100%", display: "grid", placeItems: "center",
              fontFamily: "var(--font-display)", fontSize: size * 0.3, color: "rgba(0,0,0,0.5)"
            }}>S</div>
        }
      </div>
      <div style={{
        position: "absolute", bottom: -size * 0.05, left: "50%", transform: "translateX(-50%)",
        padding: `${size * 0.025}px ${size * 0.08}px`,
        fontFamily: "var(--font-display)", fontSize: size * 0.13, fontWeight: 600, color: "#0a0b0e",
        background: "linear-gradient(180deg, oklch(0.85 0.14 75), oklch(0.68 0.16 55))",
        borderRadius: 999,
        boxShadow: "0 3px 10px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.3)",
        letterSpacing: "0.02em", whiteSpace: "nowrap", zIndex: 1
      }}>
        Lv {level}
      </div>
    </div>
  );
};
