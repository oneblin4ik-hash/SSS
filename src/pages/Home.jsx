const STAT_META = {
  strength:   { label: "Сила",        color: "var(--stat-strength)" },
  discipline: { label: "Дисциплина",  color: "var(--stat-discipline)" },
  energy:     { label: "Здоровье",    color: "var(--stat-energy)" },
  mental:     { label: "Интеллект",   color: "var(--stat-mental)" }
};

const QUOTES = [
  "Дисциплина — это выбор между тем, чего ты хочешь сейчас, и тем, чего ты хочешь больше всего.",
  "Каждый повтор — это голос за того человека, которым ты хочешь стать.",
  "Последовательность — мать результата.",
  "Не ждать вдохновения. Создавать его движением.",
  "Сложно — значит, ты растёшь."
];

const HomePage = ({ profile, stats, quests, wallet, eventLog, completeQuest, undoQuest, onAddQuest }) => {
  const { useState } = React;
  const pct = Math.round((profile.xp / profile.xpToNext) * 100);
  const dailyQuests = quests.filter(q => q.daily);
  const doneToday = dailyQuests.filter(q => q.done).length;
  const bossQuest = quests.find(q => q.boss && !q.done);
  const walletPct = Math.min(100, Math.round((wallet.balance / wallet.goal) * 100));
  const todayXp = eventLog.reduce((s, e) => {
    if (!e.xp) return s;
    const n = parseInt(String(e.xp).replace(/\D/g, ""), 10);
    return s + (isNaN(n) ? 0 : n);
  }, 0);
  const quote = QUOTES[new Date().getDay() % QUOTES.length];

  return (
    <div>
      <div className="ss-page-header">
        <div>
          <div className="eyebrow">Serbolin Super System</div>
          <h1>Главная</h1>
        </div>
        <button className="ss-btn" onClick={onAddQuest}>+ Квест</button>
      </div>

      {/* Top row */}
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr 1fr", gap: 14, marginBottom: 14, alignItems: "start" }}>

        {/* Avatar block */}
        <div className="ss-card" style={{ padding: "24px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16, minWidth: 200 }}>
          <div style={{ marginBottom: 8 }}>
            <Avatar size={140} level={profile.level} pct={pct} stage={profile.avatarStage} />
          </div>
          <div style={{ textAlign: "center", width: "100%" }}>
            <div className="eyebrow" style={{ marginBottom: 6 }}>форма {profile.avatarStage}/5</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--text-1)", marginBottom: 12 }}>{profile.class}</div>
            <XPBar pct={pct} />
            <div className="num" style={{ display: "flex", justifyContent: "space-between", marginTop: 5, fontSize: 10, color: "var(--text-3)" }}>
              <span>Lv {profile.level}</span>
              <span>{profile.xp}/{profile.xpToNext}</span>
              <span>Lv {profile.level + 1}</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="ss-card" style={{ padding: 20 }}>
          <div className="eyebrow" style={{ marginBottom: 16 }}>характеристики</div>
          {Object.entries(stats).map(([key, s]) => {
            const meta = STAT_META[key];
            if (!meta) return null;
            const tier = SSEngine.tierFor(s.value);
            return (
              <div key={key} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: "var(--text-2)" }}>{meta.label}</span>
                  <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span className="num" style={{ fontSize: 12, color: meta.color }}>{s.value}</span>
                    <span style={{ fontSize: 10, color: "var(--text-3)" }}>{tier}</span>
                  </span>
                </div>
                <div className="xp-bar" style={{ height: 5 }}>
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

        {/* Wallet + Boss */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Wallet balance */}
          <div className="ss-card" style={{ padding: 20 }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>кошелёк · цель месяца</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 500, color: "var(--accent)", marginBottom: 12 }}>
              {formatRub(wallet.balance)}
            </div>
            <XPBar pct={walletPct} />
            <div className="num" style={{ display: "flex", justifyContent: "space-between", marginTop: 5, fontSize: 10, color: "var(--text-3)" }}>
              <span>{walletPct}% цели</span>
              <span>{formatRub(wallet.goal)}</span>
            </div>
          </div>

          {/* Boss quest */}
          {bossQuest ? (
            <div className="ss-card ss-card-glow" style={{ padding: 20 }}>
              <div className="eyebrow" style={{ marginBottom: 8, color: "var(--accent)" }}>◆ босс недели</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 15, marginBottom: 8 }}>{bossQuest.title}</div>
              <XPBar pct={bossQuest.done ? 100 : 0} />
              <div className="num" style={{ marginTop: 5, fontSize: 10, color: "var(--text-3)" }}>
                {bossQuest.done ? "✓ Выполнен" : `+${SSEngine.xpFor(bossQuest, bossQuest.streak || 0)} XP за победу`}
              </div>
            </div>
          ) : (
            <div className="ss-card" style={{ padding: 20, opacity: 0.5 }}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>◆ босс недели</div>
              <div style={{ fontSize: 13, color: "var(--text-3)" }}>Босс повержен</div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 14 }}>

        {/* Daily quests */}
        <div className="ss-card" style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div className="eyebrow">Сегодня · ежедневные квесты</div>
            <span className="num" style={{ fontSize: 11, color: "var(--accent)" }}>{doneToday}/{dailyQuests.length}</span>
          </div>
          {dailyQuests.length === 0 && (
            <div style={{ color: "var(--text-3)", fontSize: 13 }}>Нет ежедневных квестов</div>
          )}
          {dailyQuests.map(q => {
            const meta = STAT_META[q.stat] || {};
            const xp = SSEngine.xpFor(q, q.streak || 0);
            return (
              <div key={q.id} className="quest-row">
                <div
                  className={`quest-check ${q.done ? "done" : ""}`}
                  onClick={() => q.done ? undoQuest(q.id) : completeQuest(q.id)}
                >
                  {q.done && "✓"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13,
                    color: q.done ? "var(--text-3)" : "var(--text-1)",
                    textDecoration: q.done ? "line-through" : "none",
                    marginBottom: 3,
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
                  }}>
                    {q.title}
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {meta.color && (
                      <span style={{ fontSize: 10, color: meta.color }}>{meta.label}</span>
                    )}
                    <span style={{ fontSize: 10, color: "var(--text-3)" }}>🔥 {q.streak || 0}</span>
                  </div>
                </div>
                <span className="num" style={{ fontSize: 11, color: "var(--accent)", flexShrink: 0 }}>+{xp}</span>
              </div>
            );
          })}
          <div className="rune-divider">⟡ следующая генерация в 06:00 ⟡</div>
        </div>

        {/* Event log */}
        <div className="ss-card" style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div className="eyebrow">Хроника · сегодня</div>
            {todayXp > 0 && <span className="num" style={{ fontSize: 11, color: "var(--accent)" }}>+{todayXp} XP</span>}
          </div>
          {eventLog.length === 0 && (
            <div style={{ color: "var(--text-3)", fontSize: 13, marginBottom: 12 }}>Нет событий</div>
          )}
          {eventLog.slice(0, 6).map((ev, i) => (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 10 }}>
              <span className="num" style={{ fontSize: 10, color: "var(--text-3)", flexShrink: 0, width: 36 }}>{ev.t}</span>
              <span style={{ fontSize: 12, color: "var(--text-2)", flex: 1 }}>{ev.txt}</span>
              {ev.xp && <span className="num" style={{ fontSize: 11, color: "var(--accent)", flexShrink: 0 }}>{ev.xp}</span>}
            </div>
          ))}
          <div className="rune-divider" style={{ margin: "16px 0 12px" }} />
          <div style={{ fontSize: 11, color: "var(--text-3)", fontStyle: "italic", lineHeight: 1.5 }}>
            «{quote}»
          </div>
        </div>
      </div>
    </div>
  );
};
