const XPBar = ({ pct, compact = false }) => (
  <div className="xp-bar" style={{ height: compact ? 5 : 8 }}>
    <span style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
  </div>
);

/* ── Warrior portrait SVG ─────────────────────────────────────── */
const WarriorPortrait = ({ stage = 3 }) => {
  const s = Math.min(5, Math.max(0, stage));

  const P = [
    // 0 — Новичок (серый силуэт)
    { bg:"#111318", base:"#22252e", mid:"#2a2e3a", hi:"#3a3f50", trim:"#50566a",
      blade:"#555", shine:"#888", eye:null, glow:0 },
    // 1 — Ученик (бронза)
    { bg:"#150e08", base:"#2c2010", mid:"#3a2a14", hi:"#50381c", trim:"#7a5828",
      blade:"#9a8850", shine:"#c8b070", eye:null, glow:0 },
    // 2 — Воин (сталь)
    { bg:"#0e1018", base:"#202840", mid:"#2a3450", hi:"#384868", trim:"#607090",
      blade:"#a0b8d0", shine:"#d8eaf8", eye:null, glow:0 },
    // 3 — Рыцарь (золото)
    { bg:"#120d04", base:"#3a2a10", mid:"#4e381a", hi:"#6a4e22", trim:"#c8920a",
      blade:"#dcc870", shine:"#fff8c8", eye:"rgba(255,200,40,0.65)", glow:0.35 },
    // 4 — Чемпион (огонь)
    { bg:"#0e0702", base:"#3a1808", mid:"#582010", hi:"#7a2c12", trim:"#e8720a",
      blade:"#fff0a0", shine:"#ffffff", eye:"rgba(255,140,20,0.9)", glow:0.65 },
    // 5 — Легенда (пламя)
    { bg:"#0a0404", base:"#280808", mid:"#440a0a", hi:"#6e0e0e", trim:"#ff3800",
      blade:"#ffffff", shine:"#ffffa0", eye:"rgba(255,60,0,1)", glow:1.0 },
  ][s];

  const uid = `wp${s}`;

  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%"
         xmlns="http://www.w3.org/2000/svg" style={{ display:"block" }}>
      <defs>
        <linearGradient id={`${uid}-helm`} x1="30%" y1="0%" x2="70%" y2="100%">
          <stop offset="0%" stopColor={P.hi}/>
          <stop offset="100%" stopColor={P.base}/>
        </linearGradient>
        <linearGradient id={`${uid}-chest`} x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" stopColor={P.mid}/>
          <stop offset="100%" stopColor={P.base}/>
        </linearGradient>
        <linearGradient id={`${uid}-blade`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor={P.blade} stopOpacity="0.75"/>
          <stop offset="45%"  stopColor={P.shine}/>
          <stop offset="100%" stopColor={P.blade} stopOpacity="0.55"/>
        </linearGradient>
        {P.glow > 0 && (
          <filter id={`${uid}-glow`} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="2.5" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        )}
        {P.glow > 0 && (
          <radialGradient id={`${uid}-aura`} cx="50%" cy="60%" r="50%">
            <stop offset="0%"   stopColor={P.trim} stopOpacity={P.glow * 0.4}/>
            <stop offset="100%" stopColor={P.trim} stopOpacity="0"/>
          </radialGradient>
        )}
      </defs>

      {/* Background */}
      <rect width="100" height="100" fill={P.bg}/>
      {P.glow > 0 && <ellipse cx="50" cy="65" rx="50" ry="50" fill={`url(#${uid}-aura)`}/>}

      {/* ── GREATSWORD (за плечом, острие вверх) ── */}
      <g transform="translate(74,46) rotate(6)" filter={P.glow > 0 ? `url(#${uid}-glow)` : undefined}>
        {/* Blade */}
        <rect x="-2.8" y="-56" width="5.6" height="58" rx="2.8" fill={`url(#${uid}-blade)`}/>
        {/* Tip */}
        <polygon points="-2.8,-56 2.8,-56 0,-65" fill={P.shine}/>
        {/* Fuller groove */}
        <rect x="-0.8" y="-54" width="1.6" height="52" rx="0.8" fill={P.bg} opacity="0.45"/>
      </g>
      {/* Crossguard */}
      <g transform="translate(74,46) rotate(6)">
        <rect x="-20" y="0" width="40" height="8" rx="4" fill={P.trim}/>
        {s >= 2 && <ellipse cx="0" cy="4" rx="5.5" ry="3.5" fill={P.shine} opacity="0.6"
          filter={P.glow > 0 ? `url(#${uid}-glow)` : undefined}/>}
        <circle cx="-20" cy="4" r="3.5" fill={P.trim}/>
        <circle cx="20"  cy="4" r="3.5" fill={P.trim}/>
      </g>
      {/* Handle */}
      <g transform="translate(74,46) rotate(6)">
        <rect x="-3.2" y="8" width="6.4" height="22" rx="2" fill="#1a0e06"/>
        {[11,15,19,23,27].map(y => (
          <line key={y} x1="-3.2" y1={y} x2="3.2" y2={y}
            stroke={P.trim} strokeWidth="0.9" opacity="0.45"/>
        ))}
        {/* Pommel */}
        <ellipse cx="0" cy="33" rx="5.5" ry="4" fill={P.trim}/>
      </g>

      {/* ── CHEST PLATE ── */}
      <path d="M16,76 Q14,94 17,108 L83,108 Q86,94 84,76 Z"
        fill={`url(#${uid}-chest)`}/>
      {s >= 2 && <>
        <line x1="50" y1="76" x2="50" y2="108"
          stroke={P.trim} strokeWidth="1" opacity="0.35"/>
        <path d="M31,86 Q50,81 69,86"
          stroke={P.trim} strokeWidth="1" fill="none" opacity="0.35"/>
      </>}
      {/* Chest emblem for stage 3+ */}
      {s >= 3 && (
        <path d="M50,80 L52.5,87.5 L60,87.5 L54,92 L56,100 L50,95.5 L44,100 L46,92 L40,87.5 L47.5,87.5 Z"
          fill={P.trim} opacity={s >= 4 ? 0.9 : 0.65}
          filter={P.glow > 0 ? `url(#${uid}-glow)` : undefined}/>
      )}

      {/* ── SHOULDER PLATES ── */}
      <ellipse cx="18" cy="76" rx="13.5" ry="8" fill={P.mid}/>
      <ellipse cx="18" cy="75" rx="13.5" ry="8" fill="none" stroke={P.trim} strokeWidth="1.2" opacity="0.5"/>
      {s >= 2 && <circle cx="18" cy="71" r="2.5" fill={P.trim} opacity="0.65"/>}
      <ellipse cx="82" cy="76" rx="13.5" ry="8" fill={P.mid}/>
      <ellipse cx="82" cy="75" rx="13.5" ry="8" fill="none" stroke={P.trim} strokeWidth="1.2" opacity="0.5"/>
      {s >= 2 && <circle cx="82" cy="71" r="2.5" fill={P.trim} opacity="0.65"/>}

      {/* Gorget */}
      <rect x="40" y="59" width="20" height="17" rx="4" fill={P.mid}/>
      <rect x="40" y="58" width="20" height="17" rx="4" fill="none"
        stroke={P.trim} strokeWidth="1" opacity="0.4"/>

      {/* ── HELMET ── */}
      <ellipse cx="50" cy="37" rx="23" ry="25" fill={`url(#${uid}-helm)`}/>

      {/* Crest ridge */}
      {s >= 1 && (
        <path d="M40,16 Q50,5 60,16"
          stroke={P.trim} strokeWidth={s >= 3 ? 2.8 : 1.8}
          fill="none" opacity="0.8"
          filter={P.glow > 0 && s >= 4 ? `url(#${uid}-glow)` : undefined}/>
      )}

      {/* T-visor */}
      <rect x="29" y="34" width="42" height="9" rx="2.5" fill="rgba(0,0,0,0.8)"/>
      {/* Nose guard */}
      <rect x="48" y="43" width="4" height="12" rx="1.5" fill={P.base}/>

      {/* Eye glow */}
      {P.eye && <>
        <ellipse cx="36" cy="38.5" rx="5" ry="2.8"
          fill={P.eye} filter={`url(#${uid}-glow)`}/>
        <ellipse cx="64" cy="38.5" rx="5" ry="2.8"
          fill={P.eye} filter={`url(#${uid}-glow)`}/>
      </>}

      {/* Cheek guards */}
      <path d="M27,37 Q24,50 28,62 Q37,67 44,62 L44,55 L40,43 Q34,39 27,37 Z"
        fill={P.mid}/>
      <path d="M73,37 Q76,50 72,62 Q63,67 56,62 L56,55 L60,43 Q66,39 73,37 Z"
        fill={P.mid}/>

      {/* Helmet border */}
      <ellipse cx="50" cy="37" rx="23" ry="25"
        fill="none" stroke={P.trim} strokeWidth="1.5" opacity="0.4"/>

      {/* Rivets */}
      {s >= 2 && <>
        <circle cx="34" cy="26" r="1.8" fill={P.trim} opacity="0.7"/>
        <circle cx="66" cy="26" r="1.8" fill={P.trim} opacity="0.7"/>
      </>}
      {s >= 3 && <>
        <circle cx="28" cy="41" r="1.5" fill={P.trim} opacity="0.6"/>
        <circle cx="72" cy="41" r="1.5" fill={P.trim} opacity="0.6"/>
      </>}
    </svg>
  );
};

/* ── Avatar ring + portrait ───────────────────────────────────── */
const Avatar = ({ size = 120, level = 12, pct = 0, stage = 3 }) => {
  const R      = size / 2;
  const stroke = Math.max(3, size * 0.035);
  const inner  = R - stroke - 3;
  const circ   = 2 * Math.PI * inner;
  const dash   = circ * (pct / 100);
  const gradId = `rg-${size}-${level}`;

  return (
    <div style={{ position:"relative", width:size, height:size, display:"inline-block" }}>
      {/* XP ring */}
      <svg width={size} height={size}
           style={{ position:"absolute", inset:0, transform:"rotate(-90deg)" }}>
        <defs>
          <linearGradient id={gradId} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%"   stopColor="oklch(0.82 0.14 75)"/>
            <stop offset="100%" stopColor="oklch(0.55 0.18 35)"/>
          </linearGradient>
        </defs>
        <circle cx={R} cy={R} r={inner}
          stroke="rgba(255,255,255,0.07)" strokeWidth={stroke} fill="none"/>
        <circle cx={R} cy={R} r={inner}
          stroke={`url(#${gradId})`} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`} fill="none"
          style={{ filter:"drop-shadow(0 0 6px rgba(217,162,84,0.5))",
                   transition:"stroke-dasharray 0.8s var(--ease-out)" }}/>
      </svg>

      {/* Portrait circle */}
      <div style={{
        position:"absolute",
        top:stroke+3, left:stroke+3, right:stroke+3, bottom:stroke+3,
        borderRadius:"50%", overflow:"hidden",
        boxShadow:"inset 0 4px 12px rgba(0,0,0,0.4), 0 6px 24px rgba(0,0,0,0.6)"
      }}>
        <WarriorPortrait stage={stage}/>
      </div>

      {/* Level badge */}
      <div style={{
        position:"absolute", bottom:-size*0.05, left:"50%",
        transform:"translateX(-50%)",
        padding:`${size*0.025}px ${size*0.08}px`,
        fontFamily:"var(--font-display)", fontSize:size*0.13, fontWeight:600,
        color:"#0a0b0e",
        background:"linear-gradient(180deg, oklch(0.85 0.14 75), oklch(0.68 0.16 55))",
        borderRadius:999,
        boxShadow:"0 3px 10px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.3)",
        letterSpacing:"0.02em", whiteSpace:"nowrap", zIndex:1
      }}>
        Lv {level}
      </div>
    </div>
  );
};
