const WORKOUT_TYPES = ["Ноги", "Верх тела", "Full body", "Кардио", "Пресс", "Плечи", "Спина", "Руки"];

const MEASUREMENT_LABELS = {
  chest: "Грудь", waist: "Талия", hips: "Бёдра", biceps: "Бицепс", thigh: "Бедро"
};

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  let d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1; // Mon=0
}

const WorkoutsPage = ({ workouts, setWorkouts, logEvent, setProfile }) => {
  const { useState } = React;
  const today = new Date();
  const [editMeasurements, setEditMeasurements] = useState(false);
  const [measForm, setMeasForm] = useState({ ...workouts.measurements.current });
  const [newWorkout, setNewWorkout] = useState({ type: "Ноги", xp: 100 });

  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const todayStr = today.toISOString().split("T")[0];

  const workoutDates = new Set((workouts.log || []).map(w => w.date));

  const addWorkout = () => {
    if (!newWorkout.type) return;
    const entry = {
      id: "wl" + Date.now(),
      date: todayStr,
      type: newWorkout.type,
      xp: parseInt(newWorkout.xp, 10) || 100
    };
    setWorkouts(w => ({ ...w, log: [entry, ...(w.log || [])] }));
    logEvent(`Тренировка: ${entry.type}`, `+${entry.xp}`);
  };

  // XP multiplier per cm gained per zone (waist excluded)
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

  const MONTH_NAMES = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
  const DAY_NAMES = ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];

  return (
    <div>
      <div className="ss-page-header">
        <div>
          <div className="eyebrow">Физическое развитие</div>
          <h1>Тренировки</h1>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>

        {/* Calendar */}
        <div className="ss-card" style={{ padding: 20 }}>
          <div className="eyebrow" style={{ marginBottom: 12 }}>{MONTH_NAMES[month]} {year}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 8 }}>
            {DAY_NAMES.map(d => (
              <div key={d} style={{ textAlign: "center", fontSize: 9, color: "var(--text-4)", fontFamily: "var(--font-mono)", padding: "2px 0" }}>
                {d}
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const hasWorkout = workoutDates.has(dateStr);
              const isToday = dateStr === todayStr;
              return (
                <div key={day} style={{
                  height: 30, display: "grid", placeItems: "center",
                  borderRadius: 6,
                  background: hasWorkout ? "color-mix(in oklab, var(--accent) 30%, transparent)" : "transparent",
                  border: isToday ? "1px solid var(--accent)" : "1px solid transparent",
                  fontFamily: "var(--font-mono)", fontSize: 11,
                  color: hasWorkout ? "var(--accent)" : isToday ? "var(--text-1)" : "var(--text-3)",
                  transition: "all 0.15s"
                }}>
                  {day}
                </div>
              );
            })}
          </div>

          {/* Add workout */}
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--line-1)" }}>
            <div className="eyebrow" style={{ marginBottom: 10 }}>Добавить тренировку</div>
            <div style={{ display: "flex", gap: 8 }}>
              <select className="ss-select" value={newWorkout.type} onChange={e => setNewWorkout(w => ({ ...w, type: e.target.value }))} style={{ flex: 2 }}>
                {WORKOUT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <input className="ss-input" type="number" value={newWorkout.xp} onChange={e => setNewWorkout(w => ({ ...w, xp: e.target.value }))}
                style={{ width: 80 }} placeholder="XP" />
              <button className="ss-btn" onClick={addWorkout} style={{ flexShrink: 0 }}>+ Тренировка</button>
            </div>
          </div>
        </div>

        {/* Log + PRs */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Recent log */}
          <div className="ss-card" style={{ padding: 20 }}>
            <div className="eyebrow" style={{ marginBottom: 14 }}>Последние тренировки</div>
            {(workouts.log || []).slice(0, 6).map((w, i) => (
              <div key={w.id || i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--line-1)" }}>
                <span className="num" style={{ fontSize: 10, color: "var(--text-3)", width: 60, flexShrink: 0 }}>{fmtDate(w.date)}</span>
                <span style={{ flex: 1, fontSize: 13 }}>{w.type}</span>
                <span className="num" style={{ fontSize: 11, color: "var(--accent)" }}>+{w.xp}</span>
              </div>
            ))}
            {(workouts.log || []).length === 0 && (
              <div style={{ color: "var(--text-3)", fontSize: 13 }}>Нет записей</div>
            )}
          </div>

          {/* PRs */}
          <div className="ss-card" style={{ padding: 20 }}>
            <div className="eyebrow" style={{ marginBottom: 14 }}>Личные рекорды</div>
            {(workouts.prs || []).map((pr, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--line-1)" }}>
                <span style={{ flex: 1, fontSize: 13, color: "var(--text-2)" }}>{pr.lift}</span>
                <span style={{ fontFamily: "var(--font-display)", fontSize: 17, color: "var(--accent)" }}>{pr.value}</span>
                <span style={{ fontSize: 11, color: "var(--text-3)" }}>{pr.unit}</span>
                <span className="num" style={{ fontSize: 10, color: "var(--text-4)", width: 52, textAlign: "right" }}>{fmtDate(pr.date)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Measurements */}
      <div className="ss-card" style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div className="eyebrow">Замеры тела</div>
          {editMeasurements
            ? <div style={{ display: "flex", gap: 8 }}>
                <button className="ss-ghost-btn" onClick={() => setEditMeasurements(false)}>Отмена</button>
                <button className="ss-btn" onClick={saveMeasurements}>✓ Сохранить</button>
              </div>
            : <button className="ss-ghost-btn" onClick={() => { setMeasForm({ ...workouts.measurements.current }); setEditMeasurements(true); }}>✎ Править</button>
          }
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14 }}>
          {Object.keys(MEASUREMENT_LABELS).map(key => {
            const isWaist = key === "waist";
            const cur = workouts.measurements.current[key] || 0;
            const tgt = workouts.measurements.target[key] || 0;
            const diff = (cur - tgt).toFixed(1);
            // For mass-gain zones: cur>=tgt is good (green). For waist: neutral.
            const diffNum = parseFloat(diff);
            let diffColor = "var(--text-4)";
            if (!isWaist) {
              diffColor = diffNum >= 0 ? "var(--leaf)" : "var(--crimson)";
            }
            // Progress bar: for mass zones, how close cur is to tgt (cur/tgt %)
            const pct = isWaist ? 50
              : tgt > 0 ? Math.min(100, Math.round((cur / tgt) * 100)) : 50;
            return (
              <div key={key} style={{ textAlign: "center" }}>
                <div className="eyebrow" style={{ marginBottom: 8 }}>
                  {MEASUREMENT_LABELS[key]}
                  {isWaist && <span style={{ marginLeft: 4, opacity: 0.4, fontSize: 9 }}>—</span>}
                </div>
                {editMeasurements
                  ? <input className="ss-input" type="number" step="0.1"
                      value={measForm[key] || ""} onChange={e => setMeasForm(f => ({ ...f, [key]: e.target.value }))}
                      style={{ textAlign: "center", marginBottom: 8 }} />
                  : <div style={{ fontFamily: "var(--font-display)", fontSize: 24, color: "var(--text-1)", marginBottom: 4 }}>{cur}</div>
                }
                {isWaist
                  ? <div style={{ fontSize: 10, color: "var(--text-4)", marginBottom: 14 }}>нейтрально</div>
                  : <>
                    <div style={{ fontSize: 10, color: "var(--text-3)", marginBottom: 6 }}>цель: {tgt} см</div>
                    <div style={{ fontSize: 10, color: diffColor, marginBottom: 8 }}>
                      {diffNum >= 0 ? "+" : ""}{diff} от цели
                    </div>
                    <XPBar pct={pct} compact />
                  </>
                }
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
