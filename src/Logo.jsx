const LogoMonogram = ({ size = 32, accent = "var(--accent)" }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
    <defs>
      <linearGradient id="lm-grad" x1="0" y1="0" x2="0" y2="64" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor={accent} />
        <stop offset="1" stopColor={accent} stopOpacity="0.5" />
      </linearGradient>
    </defs>
    <path d="M32 3 L58 12 V32 Q58 50 32 61 Q6 50 6 32 V12 Z"
          fill="rgba(0,0,0,0.4)" stroke={accent} strokeWidth="1.5" strokeOpacity="0.65"/>
    <path d="M41 18 Q26 18 26 26 Q26 33 36 34 Q46 35 46 42 Q46 50 30 50"
          stroke="url(#lm-grad)" strokeWidth="3.2" strokeLinecap="round" fill="none"/>
    <path d="M41 16 L44 12 L42 18 Z" fill={accent}/>
    <circle cx="32" cy="32" r="28" stroke={accent} strokeOpacity="0.15" strokeWidth="1"/>
  </svg>
);

const LogoWordmark = () => (
  <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
    <LogoMonogram size={28} />
    <div style={{ lineHeight: 1 }}>
      <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 18, color: "var(--text-1)" }}>Serbolin</div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.25em", textTransform: "uppercase", color: "var(--text-3)", marginTop: 3 }}>Super System</div>
    </div>
  </div>
);
