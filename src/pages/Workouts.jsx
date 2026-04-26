const WORKOUT_TYPES = ["Ноги", "Верх тела", "Full body", "Кардио", "Пресс", "Плечи", "Спина", "Руки"];

const MEASUREMENT_LABELS = {
  chest: "Грудь", waist: "Талия", hips: "Бёдра", biceps: "Бицепс", thigh: "Бедро"
};

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year, month) {
  let d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1;
}

/* ── Workout edit modal ───────────────────────────────────────── */
const WorkoutModal = ({ workout, onSave, onDelete, onClose }) => {
  const { useState } = React;
  const isNew = !workout || workout.mode === "new";
  const todayStr = new Date().toISOString().split("T")[0];
  const initial = isNew
    ? { type: "Ноги", xp: 100, date: todayStr }
    : { type: workout.type, xp: workout.xp, date: workout.date };
  const [form, setForm] = useState(initial);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="ss-modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="ss-modal">
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <h2 style={{ fontFamily:"var(--font-display)", fontSize:22, margin:0 }}>
            {isNew ? "Добавить тренировку" : "Редактировать тренировку"}
          </h2>
          <button className="ss-ghost-btn" onClick={onClose} style={{ padding:"4px 8px" }}>✕</button>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div>
              <div className="eyebrow" style={{ marginBottom:6 }}>Тип</div>
              <select className="ss-select" value={form.type} onChange={e => set("type", e.target.value)}>
                {WORKOUT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <div className="eyebrow" style={{ marginBottom:6 }}>XP (назначается вручную)</div>
              <input className="ss-input" type="number" min="1" value={form.xp}
                onChange={e => set("xp", parseInt(e.target.value, 10) || 0)} />
            </div>
          </div>
          <div>
            <div className="eyebrow" style={{ marginBottom:6 }}>Дата</div>
            <input className="ss-input" type="date" value={form.date}
              onChange={e => set("date", e.target.value)} />
          </div>
          <div style={{ background:"var(--bg-2)", borderRadius:8, padding:"10px 14px", fontSize:12, color:"var(--text-3)" }}>
            {isNew ? "Будет начислено" : "Текущее значение"}:{" "}
            <span className="num" style={{ color:"var(--accent)" }}>+{form.xp} XP</span>
          </div>
          <div style={{ display:"flex", gap:8, justifyContent:"space-between", marginTop:8 }}>
            <div>
              {!isNew && (
                <button className="ss-btn danger"
                  onClick={() => { if(confirm("Удалить тренировку? XP будет сожжён.")) { onDelete(workout); onClose(); } }}>
                  ✕ Удалить
                </button>
              )}
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button className="ss-btn ghost" onClick={onClose}>Отмена</button>
              <button className="ss-btn" onClick={() => { onSave(form); onClose(); }}>
                {isNew ? "+ Добавить" : "✓ Сохранить"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Main page ────────────────────────────────────────────────── */
const WorkoutsPage = ({ workouts, setWorkouts, logEvent, setProfile }) => {
  const { useState } = React;
  const today = new Date();
  const [editMeasurements, setEditMeasurements] = useState(false);
  const [measForm, setMeasForm] = useState({ ...workouts.measurements.current });
  const [workoutModal, setWorkoutModal] = useState(null);
  const [showAllLog, setShowAllLog] = useState(false);
  const [weightInput, setWeightInput] = useState("");
  const [weightDate, setWeightDate] = useState(today.toISOString().split("T")[0]);

  const year     = today.getFullYear();
  const month    = today.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const todayStr = today.toISOString().split("T")[0];

  const workoutDates = new Set((workouts.log || []).map(w => w.date));
  const weightLog    = workouts.weightLog || [];

  /* ─ Add/edit workout ─ */
  const saveWorkout = (form) => {
    const xp = parseInt(form.xp, 10) || 100;
    if (workoutModal && workoutModal.id) {
      setWorkouts(w => ({
        ...w,
        log: (w.log || []).map(e =>
          e.id === workoutModal.id ? { ...e, type: form.type, xp, date: form.date } : e
        )
      }));
    } else {
      const entry = { id: "wl" + Date.now(), date: form.date, type: form.type, xp };
      setWorkouts(w => ({ ...w, log: [entry, ...(w.log || [])] }));
      if (setProfile) setProfile(p => SSEngine.addXp(p, xp));
      logEvent(`Тренировка: ${form.type}`, `+${xp}`);
    }
  };

  /* ─ Delete workout (burns XP) ─ */
  const deleteWorkout = (workout) => {
    setWorkouts(w => ({ ...w, log: (w.log || []).filter(e => e.id !== workout.id) }));
    if (setProfile && workout.xp) {
      setProfile(p => SSEngine.subtractXp(p, workout.xp));
      logEvent(`Тренировка отменена: ${workout.type}`, `-${workout.xp}`);
    }
  };

  /* ─ Measurements + XP ─ */
  const XP_PER_CM = { chest: 15, hips: 10, biceps: 25, thigh: 10 };

  const saveMeasurements = () => {
    const old = workouts.measurements.current;
    const parsed = {};
    Object.keys(measForm).forEach(k => { parsed[k] = parseFloat(measForm[k]) || 0; });

    let totalXp = 0;
    const gains = [];
    Object.keys(XP_PER_CM).forEach(k => {
      const delta = (parsed[k] || 0) - (old[k] || 0);
      if (delta > 0) {
        const xp = Math.round(delta * XP_PER_CM[k]);
        totalXp += xp;
        gains.push(`+${delta.toFixed(1)} см ${MEASUREMENT_LABELS[k]}`);
      }
    });

    setWorkouts(w => ({ ...w, measurements: { ...w.measurements, current: parsed } }));
    if (totalXp > 0 && setProfile) {
      setProfile(p => SSEngine.addXp(p, totalXp));
      logEvent(`Замеры: ${gains.join(", ")}`, `+${totalXp}`);
    }
    setEditMeasurements(false);
  };

  /* ─ Weight log ─ */
  const addWeight = () => {
    const val = parseFloat(weightInput);
    if (!val || val <= 0) return;
    const entry = { id: "wt" + Date.now(), date: weightDate, value: val };
    setWorkouts(w => ({ ...w, weightLog: [entry, ...(w.weightLog || [])].sort((a,b) => b.date.localeCompare(a.date)) }));
    setWeightInput("");
    logEvent(`Вес: ${val} кг`, "");
  };

  const deleteWeightEntry = (id) => {
    setWorkouts(w => ({ ...w, weightLog: (w.weightLog || []).filter(e => e.id !== id) }));
  };

  const latestWeight = weightLog.length > 0 ? weightLog[0].value : null;

  const MONTH_NAMES = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
  const DAY_NAMES   = ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];

  const logToShow = showAllLog ? (workouts.log || []) : (workouts.log || []).slice(0, 8);

  return (
    <div>
      <div className="ss-page-header">
        <div>
          <div className="eyebrow">Физическое развитие</div>
          <h1>Тренировки</h1>
        </div>
        <button className="ss-btn" onClick={() => setWorkoutModal({ mode:"new" })}>+ Тренировка</button>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>

        {/* Calendar */}
        <div className="ss-card" style={{ padding:20 }}>
          <div className="eyebrow" style={{ marginBottom:12 }}>{MONTH_NAMES[month]} {year}</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7, 1fr)", gap:4, marginBottom:8 }}>
            {DAY_NAMES.map(d => (
              <div key={d} style={{ textAlign:"center", fontSize:9, color:"var(--text-4)", fontFamily:"var(--font-mono)", padding:"2px 0" }}>{d}</div>
            ))}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7, 1fr)", gap:4 }}>
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
              const hasWorkout = workoutDates.has(dateStr);
              const isToday   = dateStr === todayStr;
              return (
                <div key={day} style={{
                  height:30, display:"grid", placeItems:"center", borderRadius:6,
                  background: hasWorkout ? "color-mix(in oklab, var(--accent) 30%, transparent)" : "transparent",
                  border: isToday ? "1px solid var(--accent)" : "1px solid transparent",
                  fontFamily:"var(--font-mono)", fontSize:11,
                  color: hasWorkout ? "var(--accent)" : isToday ? "var(--text-1)" : "var(--text-3)",
                  transition:"all 0.15s"
                }}>
                  {day}
                </div>
              );
            })}
          </div>
          <div style={{ marginTop:16, paddingTop:14, borderTop:"1px solid var(--line-1)", display:"flex", gap:16, alignItems:"center" }}>
            <span style={{ fontSize:11, color:"var(--text-3)" }}>Всего:</span>
            <span className="num" style={{ fontSize:13, color:"var(--accent)" }}>{(workouts.log||[]).length} тренировок</span>
            {latestWeight && (
              <span className="num" style={{ fontSize:13, color:"var(--teal)", marginLeft:"auto" }}>
                ⚖ {latestWeight} кг
              </span>
            )}
          </div>
        </div>

        {/* Workout log */}
        <div className="ss-card" style={{ padding:20 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <div className="eyebrow">Журнал тренировок</div>
            <button className="ss-ghost-btn" style={{ fontSize:10, padding:"3px 8px" }}
              onClick={() => setWorkoutModal({ mode:"new" })}>+ Добавить</button>
          </div>
          {logToShow.map((w, i) => (
            <div key={w.id || i} style={{
              display:"flex", alignItems:"center", gap:8, padding:"7px 0",
              borderBottom:"1px solid var(--line-1)"
            }}>
              <span className="num" style={{ fontSize:10, color:"var(--text-3)", width:56, flexShrink:0 }}>{fmtDate(w.date)}</span>
              <span style={{ flex:1, fontSize:13 }}>{w.type}</span>
              <span className="num" style={{ fontSize:11, color:"var(--accent)", minWidth:36, textAlign:"right" }}>+{w.xp}</span>
              <button onClick={() => setWorkoutModal(w)}
                style={{ background:"none", border:"none", cursor:"pointer", color:"var(--text-4)", fontSize:13, padding:"0 3px" }}
                title="Редактировать">✎</button>
              <button onClick={() => { if(confirm("Удалить? XP будет сожжён.")) deleteWorkout(w); }}
                style={{ background:"none", border:"none", cursor:"pointer", color:"var(--text-4)", fontSize:13, padding:"0 3px" }}
                title="Удалить">✕</button>
            </div>
          ))}
          {(workouts.log || []).length === 0 && (
            <div style={{ color:"var(--text-3)", fontSize:13 }}>Нет записей</div>
          )}
          {(workouts.log || []).length > 8 && (
            <button className="ss-ghost-btn" style={{ width:"100%", marginTop:10, fontSize:11 }}
              onClick={() => setShowAllLog(v => !v)}>
              {showAllLog ? "↑ Свернуть" : `↓ Все (${(workouts.log||[]).length})`}
            </button>
          )}
        </div>
      </div>

      {/* Weight log */}
      <div className="ss-card" style={{ padding:20, marginBottom:14 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <div>
            <div className="eyebrow">Мой вес</div>
            {latestWeight && (
              <div style={{ fontFamily:"var(--font-display)", fontSize:28, color:"var(--teal)", marginTop:4 }}>
                {latestWeight} кг
              </div>
            )}
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"flex-end" }}>
            <div>
              <div className="eyebrow" style={{ marginBottom:4 }}>Дата</div>
              <input className="ss-input" type="date" value={weightDate}
                onChange={e => setWeightDate(e.target.value)} style={{ width:130 }} />
            </div>
            <div>
              <div className="eyebrow" style={{ marginBottom:4 }}>Вес (кг)</div>
              <input className="ss-input" type="number" step="0.1" value={weightInput}
                onChange={e => setWeightInput(e.target.value)} placeholder="0.0"
                style={{ width:90 }}
                onKeyDown={e => e.key === "Enter" && addWeight()} />
            </div>
            <button className="ss-btn" onClick={addWeight} disabled={!weightInput}>+ Записать</button>
          </div>
        </div>

        {weightLog.length === 0 && (
          <div style={{ color:"var(--text-3)", fontSize:13 }}>Записей нет — добавь первый замер</div>
        )}
        {weightLog.length > 0 && (
          <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
            {weightLog.slice(0, 20).map((e, i) => {
              const prev = weightLog[i + 1];
              const delta = prev ? (e.value - prev.value).toFixed(1) : null;
              const color = delta === null ? "var(--text-2)"
                : parseFloat(delta) > 0 ? "var(--leaf)"
                : parseFloat(delta) < 0 ? "var(--crimson)"
                : "var(--text-3)";
              return (
                <div key={e.id} style={{
                  background:"var(--bg-2)", border:"1px solid var(--line-1)",
                  borderRadius:8, padding:"8px 12px", minWidth:90, textAlign:"center",
                  position:"relative"
                }}>
                  <div className="num" style={{ fontSize:10, color:"var(--text-3)", marginBottom:2 }}>{fmtDate(e.date)}</div>
                  <div style={{ fontFamily:"var(--font-display)", fontSize:20, color:"var(--text-1)" }}>{e.value}</div>
                  <div style={{ fontSize:9, color:"var(--text-3)" }}>кг</div>
                  {delta !== null && (
                    <div style={{ fontSize:10, color, marginTop:2 }}>
                      {parseFloat(delta) > 0 ? "+" : ""}{delta}
                    </div>
                  )}
                  <button onClick={() => deleteWeightEntry(e.id)}
                    style={{ position:"absolute", top:4, right:4, background:"none", border:"none", cursor:"pointer",
                      color:"var(--text-4)", fontSize:10, lineHeight:1 }}>✕</button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* PRs */}
      <div className="ss-card" style={{ padding:20, marginBottom:14 }}>
        <div className="eyebrow" style={{ marginBottom:14 }}>Личные рекорды</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(200px,1fr))", gap:10 }}>
          {(workouts.prs || []).map((pr, i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px",
              background:"var(--bg-2)", borderRadius:8, border:"1px solid var(--line-1)" }}>
              <span style={{ flex:1, fontSize:13, color:"var(--text-2)" }}>{pr.lift}</span>
              <span style={{ fontFamily:"var(--font-display)", fontSize:20, color:"var(--accent)" }}>{pr.value}</span>
              <span style={{ fontSize:11, color:"var(--text-3)" }}>{pr.unit}</span>
              <span className="num" style={{ fontSize:10, color:"var(--text-4)" }}>{fmtDate(pr.date)}</span>
            </div>
          ))}
          {(workouts.prs || []).length === 0 && (
            <div style={{ color:"var(--text-3)", fontSize:13 }}>Нет рекордов</div>
          )}
        </div>
      </div>

      {/* Measurements */}
      <div className="ss-card" style={{ padding:20 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <div className="eyebrow">Замеры тела</div>
          {editMeasurements
            ? <div style={{ display:"flex", gap:8 }}>
                <button className="ss-ghost-btn" onClick={() => setEditMeasurements(false)}>Отмена</button>
                <button className="ss-btn" onClick={saveMeasurements}>✓ Сохранить</button>
              </div>
            : <button className="ss-ghost-btn" onClick={() => { setMeasForm({ ...workouts.measurements.current }); setEditMeasurements(true); }}>
                ✎ Обновить замеры
              </button>
          }
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(5, 1fr)", gap:14 }}>
          {Object.keys(MEASUREMENT_LABELS).map(key => {
            const isWaist = key === "waist";
            const cur = workouts.measurements.current[key] || 0;
            const tgt = workouts.measurements.target[key] || 0;
            const diff = (cur - tgt).toFixed(1);
            const diffNum = parseFloat(diff);
            let diffColor = "var(--text-4)";
            if (!isWaist) diffColor = diffNum >= 0 ? "var(--leaf)" : "var(--crimson)";
            const pct = isWaist ? 50 : tgt > 0 ? Math.min(100, Math.round((cur / tgt) * 100)) : 50;
            return (
              <div key={key} style={{ textAlign:"center" }}>
                <div className="eyebrow" style={{ marginBottom:8 }}>{MEASUREMENT_LABELS[key]}</div>
                {editMeasurements
                  ? <input className="ss-input" type="number" step="0.1"
                      value={measForm[key] || ""} onChange={e => setMeasForm(f => ({ ...f, [key]: e.target.value }))}
                      style={{ textAlign:"center", marginBottom:8 }} />
                  : <div style={{ fontFamily:"var(--font-display)", fontSize:24, color:"var(--text-1)", marginBottom:4 }}>{cur || "—"}</div>
                }
                {isWaist
                  ? <div style={{ fontSize:10, color:"var(--text-4)", marginBottom:14 }}>нейтрально</div>
                  : <>
                    <div style={{ fontSize:10, color:"var(--text-3)", marginBottom:6 }}>цель: {tgt} см</div>
                    {cur > 0 && <div style={{ fontSize:10, color:diffColor, marginBottom:8 }}>
                      {diffNum >= 0 ? "+" : ""}{diff} от цели
                    </div>}
                    {cur > 0 && <XPBar pct={pct} compact />}
                  </>
                }
              </div>
            );
          })}
        </div>
      </div>

      {workoutModal && (
        <WorkoutModal
          workout={workoutModal}
          onSave={saveWorkout}
          onDelete={deleteWorkout}
          onClose={() => setWorkoutModal(null)}
        />
      )}
    </div>
  );
};
