const DIFF_META = {
  small:  { label: "Малый",      color: "var(--leaf)" },
  medium: { label: "Средний",    color: "var(--accent)" },
  large:  { label: "Крупный",    color: "var(--accent-2)" },
  epic:   { label: "Эпический",  color: "var(--crimson)" }
};

const STAT_COLORS_Q = {
  strength:   "var(--stat-strength)",
  discipline: "var(--stat-discipline)",
  energy:     "var(--stat-energy)",
  mental:     "var(--stat-mental)"
};

const STAT_LABELS_Q = {
  strength: "Сила", discipline: "Дисциплина", energy: "Энергия", mental: "Ментал"
};

const FILTERS = [
  { id: "all",     label: "Все" },
  { id: "active",  label: "Активные" },
  { id: "daily",   label: "Ежедневные" },
  { id: "boss",    label: "Боссы" },
  { id: "done",    label: "Закрыто" }
];

const QuestModal = ({ quest, onSave, onDelete, onClose }) => {
  const { useState } = React;
  const isNew = !quest || quest.mode === "new";
  const initial = isNew ? { title: "", stat: "strength", difficulty: "medium", due: "", daily: false, boss: false } : quest;
  const [form, setForm] = useState(initial);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const xp = SSEngine.DIFFICULTY_XP[form.difficulty] || 50;

  const handleSave = () => {
    if (!form.title.trim()) return;
    onSave(form);
    onClose();
  };

  const handleDelete = () => {
    if (confirm("Удалить квест?")) {
      onDelete(form.id);
      onClose();
    }
  };

  return (
    <div className="ss-modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="ss-modal">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, margin: 0 }}>
            {isNew ? "Новый квест" : "Редактировать"}
          </h2>
          <button className="ss-ghost-btn" onClick={onClose} style={{ padding: "4px 8px" }}>✕</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: 6 }}>Название</div>
            <input className="ss-input" value={form.title} onChange={e => set("title", e.target.value)} placeholder="Название квеста..." autoFocus />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <div className="eyebrow" style={{ marginBottom: 6 }}>Характеристика</div>
              <select className="ss-select" value={form.stat || "strength"} onChange={e => set("stat", e.target.value)}>
                <option value="strength">Сила</option>
                <option value="discipline">Дисциплина</option>
                <option value="energy">Энергия</option>
                <option value="mental">Ментал</option>
              </select>
            </div>
            <div>
              <div className="eyebrow" style={{ marginBottom: 6 }}>Сложность · XP</div>
              <select className="ss-select" value={form.difficulty} onChange={e => set("difficulty", e.target.value)}>
                <option value="small">Малый · 50 XP</option>
                <option value="medium">Средний · 100 XP</option>
                <option value="large">Крупный · 200 XP</option>
                <option value="epic">Эпический · 500 XP</option>
              </select>
            </div>
          </div>

          <div>
            <div className="eyebrow" style={{ marginBottom: 6 }}>Срок</div>
            <input className="ss-input" type="date" value={form.due || ""} onChange={e => set("due", e.target.value)} />
          </div>

          <div style={{ display: "flex", gap: 20 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "var(--text-2)" }}>
              <input type="checkbox" checked={!!form.daily} onChange={e => set("daily", e.target.checked)}
                style={{ width: 15, height: 15, accentColor: "var(--accent)" }} />
              Ежедневный
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: "var(--text-2)" }}>
              <input type="checkbox" checked={!!form.boss} onChange={e => set("boss", e.target.checked)}
                style={{ width: 15, height: 15, accentColor: "var(--crimson)" }} />
              Босс недели
            </label>
          </div>

          <div style={{ background: "var(--bg-2)", borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "var(--text-3)" }}>
            Базовая награда: <span className="num" style={{ color: "var(--accent)" }}>+{xp} XP</span>
            {form.boss && <span style={{ color: "var(--crimson)", marginLeft: 8 }}>× 1.25 (босс)</span>}
          </div>

          <div style={{ display: "flex", gap: 8, justifyContent: "space-between", marginTop: 8 }}>
            <div style={{ display: "flex", gap: 8 }}>
              {!isNew && (
                <button className="ss-btn danger" onClick={handleDelete}>✕ Удалить</button>
              )}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="ss-btn ghost" onClick={onClose}>Отмена</button>
              <button className="ss-btn" onClick={handleSave} disabled={!form.title.trim()}>
                {isNew ? "+ Создать" : "✓ Сохранить"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const QuestItem = ({ quest, onToggle, onEdit }) => {
  const diff = DIFF_META[quest.difficulty] || DIFF_META.medium;
  const xp = SSEngine.xpFor(quest, quest.streak || 0);
  const statColor = STAT_COLORS_Q[quest.stat] || "var(--text-3)";
  const statLabel = STAT_LABELS_Q[quest.stat] || quest.stat;

  return (
    <div className="quest-row">
      <div
        className={`quest-check ${quest.done ? "done" : ""}`}
        onClick={() => onToggle(quest.id)}
      >
        {quest.done && "✓"}
      </div>
      <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => onEdit(quest)}>
        <div style={{
          fontSize: 13,
          color: quest.done ? "var(--text-3)" : "var(--text-1)",
          textDecoration: quest.done ? "line-through" : "none",
          marginBottom: 4,
          display: "flex", alignItems: "center", gap: 6
        }}>
          {quest.boss && <span style={{ fontSize: 10, color: "var(--crimson)", fontFamily: "var(--font-mono)" }}>◆ BOSS</span>}
          {quest.title}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, background: `color-mix(in oklab, ${diff.color} 15%, transparent)`, color: diff.color }}>
            {diff.label}
          </span>
          <span style={{ fontSize: 10, color: statColor }}>{statLabel}</span>
          {quest.streak > 0 && <span style={{ fontSize: 10, color: "var(--text-3)" }}>🔥 {quest.streak}</span>}
          {quest.due && <span style={{ fontSize: 10, color: "var(--text-3)" }}>→ {fmtDate(quest.due)}</span>}
        </div>
      </div>
      <span className="num" style={{ fontSize: 12, color: "var(--accent)", flexShrink: 0 }}>+{xp}</span>
    </div>
  );
};

const QuestsPage = ({ quests, completeQuest, undoQuest, addQuest, updateQuest, deleteQuest, openModal, setOpenModal }) => {
  const { useState } = React;
  const [filter, setFilter] = useState("all");
  const [editQuest, setEditQuest] = useState(null);

  const showModal = openModal || editQuest;

  const filtered = quests.filter(q => {
    if (filter === "active")  return !q.done;
    if (filter === "daily")   return q.daily;
    if (filter === "boss")    return q.boss;
    if (filter === "done")    return q.done;
    return true;
  });

  const handleToggle = (qid) => {
    const q = quests.find(x => x.id === qid);
    if (!q) return;
    if (q.done) undoQuest(qid); else completeQuest(qid);
  };

  const handleSave = (form) => {
    if (form.id && form.mode !== "new") {
      updateQuest(form.id, form);
    } else {
      addQuest(form);
    }
  };

  const handleDelete = (qid) => {
    deleteQuest(qid);
    setEditQuest(null);
    if (setOpenModal) setOpenModal(null);
  };

  const closeModal = () => {
    setEditQuest(null);
    if (setOpenModal) setOpenModal(null);
  };

  return (
    <div>
      <div className="ss-page-header">
        <div>
          <div className="eyebrow">RPG · Задачи</div>
          <h1>Квесты</h1>
        </div>
        <button className="ss-btn" onClick={() => setOpenModal ? setOpenModal({ mode: "new" }) : setEditQuest({ mode: "new" })}>
          + Новый квест
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {FILTERS.map(f => (
          <button key={f.id} className={`ss-ghost-btn ${filter === f.id ? "active" : ""}`}
            style={filter === f.id ? { borderColor: "var(--accent)", color: "var(--accent)", background: "color-mix(in oklab, var(--accent) 10%, transparent)" } : {}}
            onClick={() => setFilter(f.id)}>
            {f.label}
            <span className="num" style={{ marginLeft: 5, opacity: 0.6 }}>
              {f.id === "all" ? quests.length
                : f.id === "active"  ? quests.filter(q => !q.done).length
                : f.id === "daily"   ? quests.filter(q => q.daily).length
                : f.id === "boss"    ? quests.filter(q => q.boss).length
                : quests.filter(q => q.done).length}
            </span>
          </button>
        ))}
      </div>

      {/* Quest list */}
      <div className="ss-card" style={{ padding: "8px 20px" }}>
        {filtered.length === 0 && (
          <div style={{ padding: "24px 0", textAlign: "center", color: "var(--text-3)", fontSize: 13 }}>
            Нет квестов в этой категории
          </div>
        )}
        {filtered.map(q => (
          <QuestItem
            key={q.id}
            quest={q}
            onToggle={handleToggle}
            onEdit={q => setEditQuest(q)}
          />
        ))}
      </div>

      {showModal && (
        <QuestModal
          quest={showModal.mode === "new" ? { mode: "new" } : (editQuest || openModal)}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={closeModal}
        />
      )}
    </div>
  );
};
