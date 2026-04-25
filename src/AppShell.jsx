const { useState, useEffect, useCallback } = React;

const NAV = [
  { id: "home",         label: "Главная",      icon: "◎" },
  { id: "character",    label: "Персонаж",     icon: "☗" },
  { id: "quests",       label: "Квесты",       icon: "⚔" },
  { id: "workouts",     label: "Тренировки",   icon: "△" },
  { id: "content",      label: "Контент-план", icon: "✎" },
  { id: "crm",          label: "CRM / Лиды",   icon: "◐" },
  { id: "wallet",       label: "Кошелёк",      icon: "◈" },
  { id: "achievements", label: "Достижения",   icon: "✦" }
];

function useAppState() {
  const [profile,      setProfile]      = useState(() => SSStorage.get("profile",      SSSeed.profile));
  const [stats,        setStats]        = useState(() => SSStorage.get("stats",        SSSeed.stats));
  const [quests,       setQuests]       = useState(() => SSStorage.get("quests",       SSSeed.quests));
  const [leads,        setLeads]        = useState(() => SSStorage.get("leads",        SSSeed.leads));
  const [content,      setContent]      = useState(() => SSStorage.get("content",      SSSeed.content));
  const [wallet,       setWallet]       = useState(() => SSStorage.get("wallet",       SSSeed.wallet));
  const [workouts,     setWorkouts]     = useState(() => SSStorage.get("workouts",     SSSeed.workouts));
  const [achievements, setAchievements] = useState(() => SSStorage.get("achievements", SSSeed.achievements));
  const [eventLog,     setEventLog]     = useState(() => SSStorage.get("eventLog",     []));

  useEffect(() => SSStorage.set("profile",      profile),      [profile]);
  useEffect(() => SSStorage.set("stats",        stats),        [stats]);
  useEffect(() => SSStorage.set("quests",       quests),       [quests]);
  useEffect(() => SSStorage.set("leads",        leads),        [leads]);
  useEffect(() => SSStorage.set("content",      content),      [content]);
  useEffect(() => SSStorage.set("wallet",       wallet),       [wallet]);
  useEffect(() => SSStorage.set("workouts",     workouts),     [workouts]);
  useEffect(() => SSStorage.set("achievements", achievements), [achievements]);
  useEffect(() => SSStorage.set("eventLog",     eventLog.slice(0, 50)), [eventLog]);

  const logEvent = useCallback((txt, xp) => {
    const ts = new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    setEventLog(prev => [{ t: ts, txt, xp, when: Date.now() }, ...prev].slice(0, 50));
  }, []);

  const completeQuest = useCallback((qid) => {
    setQuests(qs => {
      const q = qs.find(x => x.id === qid);
      if (!q || q.done) return qs;
      const xp = SSEngine.xpFor(q, q.streak || 0);
      setProfile(p => SSEngine.addXp(p, xp));
      if (q.stat) {
        setStats(s => ({
          ...s,
          [q.stat]: {
            ...s[q.stat],
            value: Math.min(100, (s[q.stat]?.value || 0) + (q.difficulty === "epic" ? 4 : q.difficulty === "large" ? 2 : 1))
          }
        }));
      }
      logEvent(`«${q.title}» — выполнено`, `+${xp}`);
      return qs.map(x => x.id === qid ? { ...x, done: true, completedAt: Date.now() } : x);
    });
  }, [logEvent]);

  const undoQuest   = useCallback((qid) => setQuests(qs => qs.map(x => x.id === qid ? { ...x, done: false } : x)), []);
  const addQuest    = useCallback((q) => {
    const nq = { id: "q" + Date.now(), done: false, streak: 0, ...q };
    setQuests(qs => [nq, ...qs]);
    logEvent(`Новый квест «${nq.title}»`, "");
  }, [logEvent]);
  const updateQuest = useCallback((qid, patch) => setQuests(qs => qs.map(x => x.id === qid ? { ...x, ...patch } : x)), []);
  const deleteQuest = useCallback((qid) => setQuests(qs => qs.filter(x => x.id !== qid)), []);

  return {
    profile, setProfile, stats, setStats,
    quests, completeQuest, undoQuest, addQuest, updateQuest, deleteQuest, setQuests,
    leads, setLeads, content, setContent, wallet, setWallet,
    workouts, setWorkouts, achievements, setAchievements,
    eventLog, logEvent
  };
}

const Sidebar = ({ tab, setTab, profile }) => {
  const pct = Math.round(((profile.xp || 0) / (profile.xpToNext || 1)) * 100);
  const [menuOpen, setMenuOpen] = useState(false);

  const doExport = () => {
    const d = SSStorage.exportAll();
    const a = document.createElement("a");
    a.href = "data:application/json," + encodeURIComponent(JSON.stringify(d, null, 2));
    a.download = "serbolin-backup.json";
    a.click();
    setMenuOpen(false);
  };

  const doImport = () => {
    const inp = document.createElement("input");
    inp.type = "file"; inp.accept = ".json";
    inp.onchange = e => {
      const f = e.target.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = ev => {
        try {
          SSStorage.importAll(JSON.parse(ev.target.result));
          window.location.reload();
        } catch (err) { alert("Ошибка импорта: " + err.message); }
      };
      r.readAsText(f);
    };
    inp.click();
    setMenuOpen(false);
  };

  const doReset = () => {
    if (confirm("Сбросить все данные? Это действие необратимо.")) {
      SSStorage.resetAll();
      window.location.reload();
    }
    setMenuOpen(false);
  };

  return (
    <aside className="ss-sidebar">
      <div className="ss-sidebar-head">
        <LogoWordmark />
      </div>

      <nav className="ss-nav">
        {NAV.map(item => (
          <button key={item.id}
            className={`ss-nav-item${tab === item.id ? " active" : ""}`}
            onClick={() => setTab(item.id)}>
            <span className="ss-nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="ss-sidebar-foot">
        <div className="ss-profile-card">
          <Avatar size={56} level={profile.level || 1} pct={pct} stage={profile.avatarStage || 0} />
          <div style={{ marginTop: 10, width: "100%" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 15, textAlign: "center" }}>{profile.name}</div>
            <div style={{ fontSize: 10, color: "var(--text-3)", textAlign: "center", fontStyle: "italic" }}>{profile.class}</div>
          </div>
          <div style={{ marginTop: 10, width: "100%" }}>
            <XPBar pct={pct} compact />
            <div className="num" style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 10, color: "var(--text-3)" }}>
              <span>XP</span><span>{profile.xp}/{profile.xpToNext}</span>
            </div>
          </div>
        </div>

        <div style={{ position: "relative", marginTop: 8 }}>
          <button className="ss-ghost-btn" style={{ width: "100%" }} onClick={() => setMenuOpen(v => !v)}>
            ⚙ Данные
          </button>
          {menuOpen && (
            <div style={{
              position: "absolute", bottom: "calc(100% + 4px)", left: 0, right: 0,
              background: "var(--bg-3)", border: "1px solid var(--line-2)",
              borderRadius: 8, padding: 6, zIndex: 10
            }}>
              <button className="ss-ghost-btn" style={{ width: "100%", textAlign: "left", marginBottom: 2 }} onClick={doExport}>
                ↓ Экспорт JSON
              </button>
              <button className="ss-ghost-btn" style={{ width: "100%", textAlign: "left", marginBottom: 2 }} onClick={doImport}>
                ↑ Импорт JSON
              </button>
              <button className="ss-ghost-btn" style={{ width: "100%", textAlign: "left", color: "var(--crimson)" }} onClick={doReset}>
                ✕ Сбросить
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
