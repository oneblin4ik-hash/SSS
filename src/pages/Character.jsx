const STAT_DESCRIPTIONS = {
  strength:   "Физ. тренировки, тренажёрный зал, активность",
  discipline: "Регулярность, системность, соблюдение графика",
  energy:     "Восстановление, сон, питание, шаги",
  mental:     "Обучение, контент, творчество, рефлексия"
};

const STAT_LABELS = {
  strength:   { label: "Сила",       color: "var(--stat-strength)" },
  discipline: { label: "Дисциплина", color: "var(--stat-discipline)" },
  energy:     { label: "Энергия",    color: "var(--stat-energy)" },
  mental:     { label: "Интеллект",  color: "var(--stat-mental)" }
};

const STAGE_LEVELS = [0, 5, 10, 15, 20, 25];

const CharacterPage = ({ profile, stats, achievements }) => {
  const pct = Math.round((profile.xp / profile.xpToNext) * 100);
  const donePct = achievements ? Math.round((achievements.filter(a => a.done).length / achievements.length) * 100) : 0;

  return (
    <div>
      <div className="ss-page-header">
        <div>
          <div className="eyebrow">RPG · Профиль</div>
          <h1>Персонаж</h1>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 14, alignItems: "start" }}>

        {/* Left column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="ss-card" style={{ padding: 28, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <Avatar size={220} level={profile.level} pct={pct} stage={profile.avatarStage} />
            <div style={{ textAlign: "center", marginTop: 16 }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 500, marginBottom: 4 }}>{profile.name}</div>
              <div style={{ fontStyle: "italic", color: "var(--text-2)", fontSize: 14, marginBottom: 8 }}>«{profile.title}»</div>
              <div className="num" style={{ fontSize: 10, color: "var(--accent)", letterSpacing: "0.2em", textTransform: "uppercase" }}>{profile.class}</div>
            </div>

            <div style={{ width: "100%" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: "var(--text-3)" }}>Уровень {profile.level} → {profile.level + 1}</span>
                <span className="num" style={{ fontSize: 11, color: "var(--accent)" }}>{profile.xp} / {profile.xpToNext}</span>
              </div>
              <XPBar pct={pct} />
              <div className="num" style={{ fontSize: 10, color: "var(--text-3)", marginTop: 6, textAlign: "right" }}>
                Всего XP: {(profile.totalXp || 0).toLocaleString("ru-RU")}
              </div>
            </div>
          </div>

          {/* Avatar stages */}
          <div className="ss-card" style={{ padding: 20 }}>
            <div className="rune-divider" style={{ marginTop: 0 }}>эволюция аватара</div>
            <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
              {STAGE_LEVELS.map((lvl, i) => {
                const isActive  = Math.floor(profile.level / 5) >= i;
                const isCurrent = Math.floor(profile.level / 5) === i;
                return (
                  <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: "50%", overflow: "hidden",
                      border: isCurrent ? "2px solid var(--accent)" : "2px solid var(--line-2)",
                      opacity: isActive ? 1 : 0.28,
                      boxShadow: isCurrent ? "0 0 14px var(--amber-glow)" : "none",
                      transition: "all 0.2s"
                    }}>
                      <WarriorPortrait stage={i} />
                    </div>
                    <span className="num" style={{ fontSize: 9, color: isCurrent ? "var(--accent)" : "var(--text-4)" }}>Lv {lvl}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Stats */}
          <div className="ss-card" style={{ padding: 20 }}>
            <div className="eyebrow" style={{ marginBottom: 20 }}>Характеристики</div>
            {Object.entries(stats).map(([key, s]) => {
              const meta = STAT_LABELS[key];
              const desc = STAT_DESCRIPTIONS[key];
              const tier = SSEngine.tierFor(s.value);
              return (
                <div key={key} style={{ marginBottom: 24 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                    <div>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: 18, color: "var(--text-1)", marginBottom: 2 }}>
                        {meta.label}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-3)" }}>{desc}</div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: 24, color: meta.color, lineHeight: 1 }}>{s.value}</div>
                      <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 2 }}>{tier}</div>
                    </div>
                  </div>
                  <div className="xp-bar" style={{ height: 8, marginTop: 8 }}>
                    <span style={{
                      width: `${s.value}%`,
                      background: `linear-gradient(90deg, color-mix(in oklab, ${meta.color} 60%, transparent), ${meta.color})`,
                      boxShadow: `0 0 8px color-mix(in oklab, ${meta.color} 60%, transparent)`
                    }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary */}
          <div className="ss-card" style={{ padding: 20 }}>
            <div className="eyebrow" style={{ marginBottom: 16 }}>Сводка</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <div style={{ textAlign: "center", padding: "16px 8px", background: "var(--bg-2)", borderRadius: 10, border: "1px solid var(--line-1)" }}>
                <div style={{ fontSize: 22, marginBottom: 6 }}>🔥</div>
                <div className="num" style={{ fontSize: 22, fontFamily: "var(--font-display)", color: "var(--accent)", lineHeight: 1 }}>{profile.streak}</div>
                <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 4 }}>дней стрика</div>
              </div>
              <div style={{ textAlign: "center", padding: "16px 8px", background: "var(--bg-2)", borderRadius: 10, border: "1px solid var(--line-1)" }}>
                <div style={{ fontSize: 22, marginBottom: 6 }}>✦</div>
                <div className="num" style={{ fontSize: 22, fontFamily: "var(--font-display)", color: "var(--accent)", lineHeight: 1 }}>
                  {achievements ? achievements.filter(a => a.done).length : 0}/{achievements ? achievements.length : 30}
                </div>
                <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 4 }}>достижений</div>
              </div>
              <div style={{ textAlign: "center", padding: "16px 8px", background: "var(--bg-2)", borderRadius: 10, border: "1px solid var(--line-1)" }}>
                <div style={{ fontSize: 22, marginBottom: 6 }}>⚔</div>
                <div className="num" style={{ fontSize: 18, fontFamily: "var(--font-display)", color: "var(--accent)", lineHeight: 1 }}>
                  {((profile.totalXp || 0) / 1000).toFixed(1)}к
                </div>
                <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 4 }}>всего XP</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
