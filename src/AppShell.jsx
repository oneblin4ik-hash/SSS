const { useState, useEffect, useCallback, useRef } = React;

/* ── Achievement auto-unlock triggers ──────────────────────────── */
const ACHIEVEMENT_TRIGGERS = {
  // Сила
  a3:  ({ workouts }) => {
    const now = new Date(), m = now.getMonth(), y = now.getFullYear();
    return (workouts.prs || []).filter(pr => {
      const d = new Date(pr.date);
      return d.getMonth() === m && d.getFullYear() === y;
    }).length >= 3;
  },
  a4:  ({ workouts }) => (workouts.log || []).length >= 100,
  a5:  ({ workouts }) => (workouts.prs || []).length >= 1,

  // Дисциплина
  a6:  ({ profile }) => (profile.streak || 0) >= 30,
  a7:  ({ profile }) => (profile.streak || 0) >= 7,
  a9:  ({ quests })  => quests.some(q => q.boss && q.done),
  a11: ({ profile }) => (profile.streak || 0) >= 7,

  // Контент
  a13: ({ content }) => content.filter(c => c.type === "reels" && c.status === "published").length >= 10,
  a14: ({ content }) => content.filter(c => c.type === "tg"    && c.status === "published").length >= 30,
  a15: ({ content }) => content.some(c => c.status === "published"),
  a16: ({ content }) => {
    const counts = {};
    content.filter(c => c.status === "published").forEach(c => {
      counts[c.date] = (counts[c.date] || 0) + 1;
    });
    return Object.values(counts).some(n => n >= 3);
  },
  a17: ({ content }) => {
    const tones = new Set(content.filter(c => c.status === "published").map(c => c.tone));
    return ["Провокация", "Подруга-эксперт", "Лёгкий юмор"].every(t => tones.has(t));
  },

  // Бизнес
  a18: ({ leads }) => leads.some(l => l.stage === "paid"),
  a19: ({ wallet }) => {
    const now = new Date(), m = now.getMonth(), y = now.getFullYear();
    return (wallet.entries || [])
      .filter(e => { if (e.type !== "income") return false; const d = new Date(e.date); return d.getMonth()===m && d.getFullYear()===y; })
      .reduce((s, e) => s + e.amount, 0) >= 100000;
  },
  a20: ({ leads }) => leads.filter(l => l.stage === "paid").length >= 10,
  a21: ({ leads }) => leads.filter(l => l.stage === "done").length >= 5,
  a22: ({ wallet }) => (wallet.balance || 0) >= (wallet.goal || Infinity),

  // Интеллект
  a24: ({ profile }) => (profile.streak || 0) >= 7,
  a25: ({ stats })   => Object.values(stats).some(s => s.value >= 60),

  // Скрытые
  a26: ({ eventLog }) => {
    const today = new Date().toDateString();
    return (eventLog || [])
      .filter(e => e.when && new Date(e.when).toDateString() === today)
      .reduce((s, e) => { const n = parseInt(String(e.xp||"").replace(/\D/g,""),10); return s+(isNaN(n)?0:n); }, 0) >= 1000;
  },
  a27: ({ quests }) => quests.some(q => {
    if (!q.completedAt) return false;
    const h = new Date(q.completedAt).getHours();
    return h >= 0 && h < 5;
  }),
  a28: ({ quests }) => quests.length >= 20,
  a30: ({ achievements }) => achievements.filter(a => a.done).length >= 15,

  // Тело (масса)
  a31: ({ workouts }) => (workouts.measurements?.current?.chest  || 0) >= 98,
  a32: ({ workouts }) => (workouts.measurements?.current?.biceps || 0) >= 36,
  a33: ({ workouts }) => (workouts.measurements?.current?.thigh  || 0) >= 60,
  a34: ({ workouts, _prevMeasurements }) => false, // fired manually from saveMeasurements
  a35: ({ workouts }) => {
    const cur = workouts.measurements?.current || {};
    const tgt = workouts.measurements?.target  || {};
    return ["chest","hips","biceps","thigh"].every(k => (cur[k]||0) >= (tgt[k]||0));
  },
};

const NAV = [
  { id: "home",         label: "Главная",      icon: "◎" },
  { id: "character",    label: "Персонаж",     icon: "☗" },
  { id: "quests",       label: "Квесты",       icon: "⚔" },
  { id: "workouts",     label: "Тренировки",   icon: "△" },
  { id: "content",      label: "Контент-план", icon: "✎" },
  { id: "crm",          label: "Личная база",  icon: "◐" },
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
  const [achPopup,     setAchPopup]     = useState(null);
  const [syncStatus,   setSyncStatus]   = useState("idle"); // "idle" | "loading" | "saving" | "ok" | "error"

  // Always-current ref for achievements to avoid stale-closure issues
  const achRef = useRef(achievements);
  useEffect(() => { achRef.current = achievements; }, [achievements]);

  // ── Cloud sync: load on mount ───────────────────────────────────
  const cloudReadyRef = useRef(false);
  useEffect(() => {
    setSyncStatus("loading");
    SSStorage.loadFromCloud().then(data => {
      if (data) {
        if (data.profile)      setProfile(data.profile);
        if (data.stats)        setStats(data.stats);
        if (data.quests)       setQuests(data.quests);
        if (data.leads)        setLeads(data.leads);
        if (data.content)      setContent(data.content);
        if (data.wallet)       setWallet(data.wallet);
        if (data.workouts)     setWorkouts(data.workouts);
        if (data.achievements) setAchievements(data.achievements);
        if (data.eventLog)     setEventLog(data.eventLog);
      }
      setSyncStatus("ok");
      cloudReadyRef.current = true;
    });
  }, []);

  // ── Cloud sync: debounced auto-save on any state change ─────────
  const stateRef = useRef({});
  stateRef.current = { profile, stats, quests, leads, content, wallet, workouts, achievements, eventLog };
  const saveTimerRef = useRef(null);
  useEffect(() => {
    if (!cloudReadyRef.current) return;
    setSyncStatus("saving");
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      SSStorage.saveToCloud(stateRef.current).then(() => setSyncStatus("ok"));
    }, 2000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, stats, quests, leads, content, wallet, workouts, achievements, eventLog]);

  useEffect(() => SSStorage.set("profile",      profile),      [profile]);
  useEffect(() => SSStorage.set("stats",        stats),        [stats]);
  useEffect(() => SSStorage.set("quests",       quests),       [quests]);
  useEffect(() => SSStorage.set("leads",        leads),        [leads]);
  useEffect(() => SSStorage.set("content",      content),      [content]);
  useEffect(() => SSStorage.set("wallet",       wallet),       [wallet]);
  useEffect(() => SSStorage.set("workouts",     workouts),     [workouts]);
  useEffect(() => SSStorage.set("achievements", achievements), [achievements]);
  useEffect(() => SSStorage.set("eventLog",     eventLog.slice(0, 50)), [eventLog]);

  // ── Trigger checks ─────────────────────────────────────────────
  const questDoneCount  = quests.filter(q => q.done).length;
  const bossQuestDone   = quests.some(q => q.boss && q.done) ? 1 : 0;
  const workoutCount    = (workouts.log || []).length;
  const prCount         = (workouts.prs || []).length;
  const leadDoneCount   = leads.filter(l => l.stage === "done").length;
  const leadPaidCount   = leads.filter(l => l.stage === "paid").length;
  const publishedCount  = content.filter(c => c.status === "published").length;
  const chest   = workouts.measurements?.current?.chest  || 0;
  const biceps  = workouts.measurements?.current?.biceps || 0;
  const thigh   = workouts.measurements?.current?.thigh  || 0;
  const maxStat = Math.max(...Object.values(stats).map(s => s.value || 0));

  useEffect(() => {
    const state = { profile, quests, workouts, leads, content, wallet, eventLog, stats,
                    achievements: achRef.current };
    const toUnlock = achRef.current.filter(a =>
      !a.done && ACHIEVEMENT_TRIGGERS[a.id] && ACHIEVEMENT_TRIGGERS[a.id](state)
    );
    if (toUnlock.length === 0) return;

    setAchievements(prev =>
      prev.map(a => toUnlock.find(u => u.id === a.id) ? { ...a, done: true } : a)
    );
    toUnlock.forEach(ach => {
      setProfile(p => SSEngine.addXp(p, 150));
    });
    // batch log + popup after state flush
    Promise.resolve().then(() => {
      toUnlock.forEach(ach => {
        setEventLog(prev => {
          const ts = new Date().toLocaleTimeString("ru-RU", { hour:"2-digit", minute:"2-digit" });
          return [{ t: ts, txt: `✦ Ачивка: «${ach.title}»`, xp: "+150", when: Date.now() }, ...prev].slice(0, 50);
        });
      });
      setAchPopup(toUnlock[0]);
      setTimeout(() => setAchPopup(null), 4000);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.streak, profile.level, questDoneCount, bossQuestDone,
      workoutCount, prCount, leadDoneCount, leadPaidCount, publishedCount,
      chest, biceps, thigh, wallet.balance, eventLog.length, maxStat]);

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

  const undoQuest = useCallback((qid) => {
    setQuests(qs => {
      const q = qs.find(x => x.id === qid);
      if (!q || !q.done) return qs;
      const xp = SSEngine.xpFor(q, q.streak || 0);
      setProfile(p => SSEngine.subtractXp(p, xp));
      logEvent(`«${q.title}» — отменено`, `-${xp}`);
      return qs.map(x => x.id === qid ? { ...x, done: false, completedAt: undefined } : x);
    });
  }, [logEvent]);
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
    eventLog, logEvent,
    achPopup, setAchPopup,
    syncStatus
  };
}

const SYNC_LABELS = {
  idle:    { icon: "○",  color: "var(--text-4)", label: "" },
  loading: { icon: "⟳",  color: "var(--text-3)", label: "загрузка..." },
  saving:  { icon: "⟳",  color: "var(--text-3)", label: "сохранение..." },
  ok:      { icon: "✓",  color: "var(--leaf)",   label: "синхронизировано" },
  error:   { icon: "✕",  color: "var(--crimson)", label: "ошибка" },
};

const Sidebar = ({ tab, setTab, profile, syncStatus }) => {
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
          {syncStatus && syncStatus !== "idle" && (() => {
            const s = SYNC_LABELS[syncStatus] || SYNC_LABELS.idle;
            return (
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6, fontSize: 10, color: s.color }}>
                <span>{s.icon}</span><span>{s.label}</span>
              </div>
            );
          })()}
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
