const TIER_META = {
  bronze: { label: "Бронза", color: "#c08a4a" },
  silver: { label: "Серебро", color: "#b8c0cc" },
  gold:   { label: "Золото", color: "oklch(0.78 0.15 75)" }
};

const PATHS = ["Все", "Сила", "Дисциплина", "Контент", "Бизнес", "Ментал", "Скрытые"];

const AchievementCard = ({ ach, onToggle }) => {
  const tier = TIER_META[ach.tier] || TIER_META.bronze;
  return (
    <div
      onClick={() => onToggle(ach.id)}
      style={{
        background: ach.done
          ? `linear-gradient(180deg, color-mix(in oklab, ${tier.color} 12%, var(--bg-2)), var(--bg-1))`
          : "linear-gradient(180deg, var(--bg-2), var(--bg-1))",
        border: ach.done ? `1px solid color-mix(in oklab, ${tier.color} 30%, transparent)` : "1px solid var(--line-1)",
        borderRadius: 12, padding: 16,
        opacity: ach.done ? 1 : 0.45,
        cursor: "pointer",
        transition: "all 0.2s",
        boxShadow: ach.done ? `0 4px 20px color-mix(in oklab, ${tier.color} 20%, transparent)` : "none"
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.opacity = "1";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.opacity = ach.done ? "1" : "0.45";
      }}
    >
      {/* Icon circle */}
      <div style={{
        width: 58, height: 58, borderRadius: "50%", margin: "0 auto 12px",
        display: "grid", placeItems: "center",
        background: ach.done
          ? `radial-gradient(circle at 35% 35%, color-mix(in oklab, ${tier.color} 40%, transparent), color-mix(in oklab, ${tier.color} 10%, transparent))`
          : "var(--bg-3)",
        border: ach.done ? `1px solid color-mix(in oklab, ${tier.color} 50%, transparent)` : "1px solid var(--line-2)",
        filter: ach.done ? "none" : "grayscale(1)",
        fontSize: 24
      }}>
        ✦
      </div>

      {/* Tier + path */}
      <div className="eyebrow" style={{ textAlign: "center", marginBottom: 6, color: ach.done ? tier.color : "var(--text-4)" }}>
        {tier.label} · {ach.path}
      </div>

      {/* Title */}
      <div style={{
        fontFamily: "var(--font-display)", fontSize: 13, textAlign: "center",
        color: ach.done ? "var(--text-1)" : "var(--text-3)",
        marginBottom: 6, lineHeight: 1.3, minHeight: 34
      }}>
        {ach.done ? ach.title : "???"}
      </div>

      {/* Description */}
      <div style={{ fontSize: 11, color: "var(--text-3)", textAlign: "center", lineHeight: 1.4 }}>
        {ach.done ? ach.desc : "Выполни условие для разблокировки"}
      </div>

      {ach.done && (
        <div style={{ textAlign: "center", marginTop: 10 }}>
          <span className="num" style={{ fontSize: 10, color: "var(--accent)" }}>✓ Открыто</span>
        </div>
      )}
    </div>
  );
};

const AchievementsPage = ({ achievements, setAchievements, setProfile, logEvent }) => {
  const { useState } = React;
  const [pathFilter, setPathFilter] = useState("Все");
  const [popup, setPopup] = useState(null);

  const filtered = pathFilter === "Все"
    ? achievements
    : achievements.filter(a => a.path === pathFilter);

  const doneCount = achievements.filter(a => a.done).length;

  const toggleAch = (id) => {
    const ach = achievements.find(a => a.id === id);
    if (!ach) return;
    const wasDone = ach.done;
    setAchievements(prev => prev.map(a => a.id === id ? { ...a, done: !a.done } : a));
    if (!wasDone) {
      // Unlock: +150 XP
      setProfile(p => SSEngine.addXp(p, 150));
      logEvent(`✦ Ачивка: «${ach.title}»`, "+150");
      setPopup(ach);
      setTimeout(() => setPopup(null), 3000);
    }
  };

  return (
    <div>
      <div className="ss-page-header">
        <div>
          <div className="eyebrow">Прогресс · {doneCount}/{achievements.length} открыто</div>
          <h1>Достижения</h1>
        </div>
      </div>

      {/* Path filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        {PATHS.map(p => (
          <button key={p} className="ss-ghost-btn" onClick={() => setPathFilter(p)}
            style={pathFilter === p ? { borderColor: "var(--accent)", color: "var(--accent)", background: "color-mix(in oklab, var(--accent) 10%, transparent)" } : {}}>
            {p}
            {p !== "Все" && (
              <span className="num" style={{ marginLeft: 5, opacity: 0.6 }}>
                {achievements.filter(a => a.path === p && a.done).length}/{achievements.filter(a => a.path === p).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 24 }}>
        <XPBar pct={Math.round((doneCount / achievements.length) * 100)} />
        <div className="num" style={{ fontSize: 10, color: "var(--text-3)", marginTop: 5 }}>
          {doneCount} / {achievements.length} достижений
        </div>
      </div>

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14 }}>
        {filtered.map(ach => (
          <AchievementCard key={ach.id} ach={ach} onToggle={toggleAch} />
        ))}
      </div>

      {/* Achievement popup */}
      {popup && (
        <div className="achievement-popup">
          <div style={{ fontSize: 28 }}>✦</div>
          <div>
            <div style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)", marginBottom: 4 }}>
              ДОСТИЖЕНИЕ РАЗБЛОКИРОВАНО
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--accent)" }}>{popup.title}</div>
            <div style={{ fontSize: 11, color: "var(--text-2)", marginTop: 3 }}>{popup.desc}</div>
          </div>
          <div className="num" style={{ color: "var(--accent)", fontSize: 13, marginLeft: "auto" }}>+150 XP</div>
        </div>
      )}
    </div>
  );
};
