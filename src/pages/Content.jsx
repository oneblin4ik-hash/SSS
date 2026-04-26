const TARGET_AUDIENCE = "Девушки 25–45 лет, фитнес-ниша, цели — похудение, рост самооценки, женская психология через силовые тренировки";

const CONTENT_STATUSES = [
  { id: "idea",      label: "Идея",        color: "var(--text-3)" },
  { id: "draft",     label: "Черновик",    color: "var(--teal)" },
  { id: "ready",     label: "Готово",      color: "var(--accent)" },
  { id: "published", label: "Опубликовано",color: "var(--leaf)" }
];

const TONES = ["Подруга-эксперт", "Провокация", "Лёгкий юмор"];

const ContentCard = ({ item, onStatusChange }) => {
  const statusMeta = CONTENT_STATUSES.find(s => s.id === item.status) || CONTENT_STATUSES[0];
  return (
    <div style={{
      background: "var(--bg-2)", border: "1px solid var(--line-1)", borderRadius: 10, padding: 12,
      transition: "all 0.15s", cursor: "default"
    }}>
      <div style={{ display: "flex", gap: 6, marginBottom: 8, alignItems: "center" }}>
        <span style={{
          fontSize: 9, padding: "2px 7px", borderRadius: 4, fontFamily: "var(--font-mono)", letterSpacing: "0.1em",
          background: item.type === "tg" ? "color-mix(in oklab, var(--teal) 15%, transparent)" : "color-mix(in oklab, var(--accent) 15%, transparent)",
          color: item.type === "tg" ? "var(--teal)" : "var(--accent)", textTransform: "uppercase"
        }}>
          {item.type === "tg" ? "TG" : "Reels"}
        </span>
        <span style={{ fontSize: 9, color: statusMeta.color, fontFamily: "var(--font-mono)" }}>● {statusMeta.label}</span>
      </div>
      <div style={{ fontSize: 12, color: "var(--text-1)", marginBottom: 6, lineHeight: 1.4 }}>{item.title}</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 10, color: "var(--text-3)" }}>{item.tone}</span>
        <span className="num" style={{ fontSize: 10, color: "var(--text-3)" }}>{fmtDate(item.date)}</span>
      </div>
      <div style={{ display: "flex", gap: 4, marginTop: 8, flexWrap: "wrap" }}>
        {CONTENT_STATUSES.filter(s => s.id !== item.status).map(s => (
          <button key={s.id} style={{
            fontSize: 9, padding: "2px 6px", borderRadius: 4,
            border: "1px solid var(--line-2)", background: "transparent",
            color: s.color, cursor: "pointer", fontFamily: "var(--font-mono)"
          }} onClick={() => onStatusChange(item.id, s.id)}>
            → {s.label}
          </button>
        ))}
      </div>
    </div>
  );
};

/* ── Content mini-calendar ────────────────────────────────────── */
const ContentCalendar = ({ content }) => {
  const { useState } = React;
  const now   = new Date();
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [viewYear,  setViewYear]  = useState(now.getFullYear());

  const MONTH_NAMES = ["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
  const DAY_NAMES   = ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"];

  const daysInMonth  = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayRaw  = new Date(viewYear, viewMonth, 1).getDay();
  const firstDay     = firstDayRaw === 0 ? 6 : firstDayRaw - 1;
  const todayStr     = now.toISOString().split("T")[0];

  // Build date → content items map
  const byDate = {};
  content.forEach(c => {
    if (!byDate[c.date]) byDate[c.date] = [];
    byDate[c.date].push(c);
  });

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const STATUS_DOTS = {
    idea:      "var(--text-3)",
    draft:     "var(--teal)",
    ready:     "var(--accent)",
    published: "var(--leaf)"
  };

  return (
    <div className="ss-card" style={{ padding:20 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
        <button className="ss-ghost-btn" style={{ padding:"3px 10px" }} onClick={prevMonth}>‹</button>
        <div className="eyebrow">{MONTH_NAMES[viewMonth]} {viewYear}</div>
        <button className="ss-ghost-btn" style={{ padding:"3px 10px" }} onClick={nextMonth}>›</button>
      </div>

      {/* Day headers */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3, marginBottom:6 }}>
        {DAY_NAMES.map(d => (
          <div key={d} style={{ textAlign:"center", fontSize:9, color:"var(--text-4)", fontFamily:"var(--font-mono)" }}>{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3 }}>
        {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = `${viewYear}-${String(viewMonth+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
          const items   = byDate[dateStr] || [];
          const isToday = dateStr === todayStr;
          return (
            <div key={day} style={{
              minHeight:40, borderRadius:6, padding:"3px 4px",
              background: items.length > 0
                ? "color-mix(in oklab, var(--accent) 12%, transparent)"
                : "transparent",
              border: isToday ? "1px solid var(--accent)" : "1px solid transparent",
              transition:"background 0.15s"
            }}>
              <div style={{ textAlign:"center", fontSize:10, fontFamily:"var(--font-mono)",
                color: isToday ? "var(--accent)" : items.length ? "var(--text-2)" : "var(--text-4)",
                marginBottom:2 }}>
                {day}
              </div>
              {items.slice(0,3).map((c, ci) => (
                <div key={ci} style={{
                  fontSize:8, padding:"1px 3px", borderRadius:3, marginBottom:1,
                  background:`color-mix(in oklab, ${STATUS_DOTS[c.status]||"var(--text-3)"} 15%, transparent)`,
                  color: STATUS_DOTS[c.status] || "var(--text-3)",
                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
                  fontFamily:"var(--font-mono)"
                }}>
                  {c.type === "tg" ? "TG" : "RL"} {c.title.slice(0,12)}
                </div>
              ))}
              {items.length > 3 && (
                <div style={{ fontSize:8, color:"var(--text-4)", textAlign:"center" }}>+{items.length-3}</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display:"flex", gap:12, marginTop:12, flexWrap:"wrap" }}>
        {CONTENT_STATUSES.map(s => (
          <span key={s.id} style={{ fontSize:10, color:s.color, display:"flex", alignItems:"center", gap:4 }}>
            <span style={{ width:8, height:8, borderRadius:"50%", background:s.color, display:"inline-block" }}/>
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
};

const ContentPage = ({ content, setContent, logEvent }) => {
  const { useState } = React;
  const [format, setFormat] = useState("tg");
  const [tone, setTone] = useState(TONES[0]);
  const [topic, setTopic] = useState("");
  const [generated, setGenerated] = useState("");
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setGenerating(true);
    const prompt = `Ты контент-мейкер для фитнес-блогера. Целевая аудитория: ${TARGET_AUDIENCE}.\nТон: ${tone}. Формат: ${format === "tg" ? "Telegram пост" : "Reels сценарий"}. Тема: «${topic}».\nНапиши готовый текст, без комментариев. На русском.`;
    try {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": window.ANTHROPIC_API_KEY || "",
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true"
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1024,
          messages: [{ role: "user", content: prompt }]
        })
      });
      if (resp.ok) {
        const data = await resp.json();
        setGenerated(data.content?.[0]?.text || "Нет ответа");
      } else {
        setGenerated(`Ошибка API: ${resp.status}. Введи API-ключ в window.ANTHROPIC_API_KEY.`);
      }
    } catch (e) {
      setGenerated("API недоступен. Используй как шаблон и пиши вручную.");
    }
    setGenerating(false);
  };

  const saveContent = (status) => {
    if (!topic.trim() && !generated.trim()) return;
    const item = {
      id: "c" + Date.now(),
      type: format,
      title: topic || generated.slice(0, 60) + "…",
      tone,
      status,
      date: new Date().toISOString().split("T")[0]
    };
    setContent(prev => [item, ...prev]);
    logEvent(`Контент: «${item.title.slice(0, 30)}»`, "");
    setTopic(""); setGenerated("");
  };

  const changeStatus = (id, newStatus) => {
    setContent(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));
  };

  const deleteContent = (id) => {
    setContent(prev => prev.filter(c => c.id !== id));
  };

  return (
    <div>
      <div className="ss-page-header">
        <div>
          <div className="eyebrow">ЦА: {TARGET_AUDIENCE.slice(0, 50)}…</div>
          <h1>Контент-план</h1>
        </div>
      </div>

      {/* Top row: Generator + Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 14, marginBottom: 14 }}>

        {/* Generator */}
        <div className="ss-card" style={{ padding: 20 }}>
          <div className="eyebrow" style={{ marginBottom: 16 }}>Генератор контента</div>

          {/* Format toggle */}
          <div style={{ display: "flex", gap: 0, marginBottom: 14, borderRadius: 8, overflow: "hidden", border: "1px solid var(--line-2)" }}>
            {[{ id: "tg", label: "Telegram пост" }, { id: "reels", label: "Reels сценарий" }].map(f => (
              <button key={f.id} onClick={() => setFormat(f.id)}
                style={{
                  flex: 1, padding: "8px 12px", fontSize: 12,
                  background: format === f.id ? "color-mix(in oklab, var(--accent) 15%, transparent)" : "transparent",
                  color: format === f.id ? "var(--accent)" : "var(--text-3)",
                  borderRight: f.id === "tg" ? "1px solid var(--line-2)" : "none",
                  transition: "all 0.15s"
                }}>{f.label}</button>
            ))}
          </div>

          {/* Tone buttons */}
          <div className="eyebrow" style={{ marginBottom: 8 }}>Тон</div>
          <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
            {TONES.map(t => (
              <button key={t} className="ss-ghost-btn" onClick={() => setTone(t)}
                style={tone === t ? { borderColor: "var(--accent)", color: "var(--accent)", background: "color-mix(in oklab, var(--accent) 10%, transparent)" } : {}}>
                {t}
              </button>
            ))}
          </div>

          {/* Topic */}
          <div className="eyebrow" style={{ marginBottom: 8 }}>Тема</div>
          <input className="ss-input" value={topic} onChange={e => setTopic(e.target.value)}
            placeholder="Например: почему силовые — это не страшно…" style={{ marginBottom: 12 }} />

          <button className="ss-btn" onClick={handleGenerate} disabled={generating || !topic.trim()}
            style={{ width: "100%", justifyContent: "center", marginBottom: 14 }}>
            {generating ? "Генерирую…" : "✦ Генерировать"}
          </button>

          {/* Generated text */}
          <textarea className="ss-textarea" value={generated} onChange={e => setGenerated(e.target.value)}
            placeholder="Здесь появится текст…" style={{ minHeight: 140, marginBottom: 12 }} />

          <div style={{ display: "flex", gap: 8 }}>
            <button className="ss-ghost-btn" onClick={() => saveContent("draft")} disabled={!topic.trim() && !generated.trim()}>
              Сохранить черновик
            </button>
            <button className="ss-btn" onClick={() => saveContent("published")} disabled={!topic.trim() && !generated.trim()}>
              ✓ Опубликовано
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="ss-card" style={{ padding: 20 }}>
          <div className="eyebrow" style={{ marginBottom: 16 }}>Статистика контента</div>
          {CONTENT_STATUSES.map(s => {
            const cnt = content.filter(c => c.status === s.id).length;
            return (
              <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--line-1)" }}>
                <span style={{ fontSize: 12, color: s.color, display: "flex", alignItems: "center", gap: 6 }}>
                  ● {s.label}
                </span>
                <span className="num" style={{ fontSize: 14, fontFamily: "var(--font-display)", color: s.color }}>{cnt}</span>
              </div>
            );
          })}
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--line-1)" }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Всего</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 32, color: "var(--accent)" }}>{content.length}</div>
            <div style={{ fontSize: 11, color: "var(--text-3)" }}>единиц контента</div>
          </div>
        </div>
      </div>

      {/* Mini-calendar */}
      <div style={{ marginBottom: 14 }}>
        <ContentCalendar content={content} />
      </div>

      {/* Kanban */}
      <div className="eyebrow" style={{ marginBottom: 14 }}>Доска контента</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        {CONTENT_STATUSES.map(col => {
          const items = content.filter(c => c.status === col.id);
          return (
            <div key={col.id} className="kanban-col">
              <div className="kanban-col-header">
                <span style={{ fontSize: 12, color: col.color, display: "flex", alignItems: "center", gap: 6 }}>
                  ● {col.label}
                </span>
                <span className="num" style={{ fontSize: 11, color: "var(--text-3)" }}>{items.length}</span>
              </div>
              {items.map(item => (
                <ContentCard key={item.id} item={item} onStatusChange={changeStatus} />
              ))}
              {items.length === 0 && (
                <div style={{ fontSize: 11, color: "var(--text-4)", textAlign: "center", paddingTop: 20 }}>пусто</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
