const CRM_STAGES = [
  { id: "lead", label: "Лид",       color: "var(--text-3)" },
  { id: "call", label: "Созвон",    color: "var(--teal)" },
  { id: "paid", label: "Оплачено",  color: "var(--accent)" },
  { id: "done", label: "Завершено", color: "var(--leaf)" }
];

/* ── Lead / Client modal ──────────────────────────────────────── */
const LeadModal = ({ lead, onSave, onDelete, onClose }) => {
  const { useState } = React;
  const isNew = !lead || lead.mode === "new";
  const initial = isNew
    ? { name:"", phone:"", amount:0, stage:"lead", next:"", note:"", paymentDate:"", sessionPrice:0 }
    : lead;
  const [form, setForm] = useState(initial);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const isPaid = form.stage === "paid";

  return (
    <div className="ss-modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="ss-modal">
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <h2 style={{ fontFamily:"var(--font-display)", fontSize:22, margin:0 }}>
            {isNew ? "Новый контакт" : form.name}
          </h2>
          <button className="ss-ghost-btn" onClick={onClose} style={{ padding:"4px 8px" }}>✕</button>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div>
              <div className="eyebrow" style={{ marginBottom:6 }}>Имя</div>
              <input className="ss-input" value={form.name} onChange={e => set("name", e.target.value)}
                placeholder="Имя клиента" autoFocus />
            </div>
            <div>
              <div className="eyebrow" style={{ marginBottom:6 }}>Телефон</div>
              <input className="ss-input" value={form.phone||""} onChange={e => set("phone", e.target.value)}
                placeholder="+7 xxx xxx-xx-xx" />
            </div>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div>
              <div className="eyebrow" style={{ marginBottom:6 }}>Этап</div>
              <select className="ss-select" value={form.stage} onChange={e => set("stage", e.target.value)}>
                {CRM_STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <div className="eyebrow" style={{ marginBottom:6 }}>Сумма сделки ₽</div>
              <input className="ss-input" type="number" value={form.amount||""}
                onChange={e => set("amount", parseInt(e.target.value,10)||0)} placeholder="0" />
            </div>
          </div>

          {/* Client-specific payment fields */}
          {isPaid && (
            <div style={{ borderTop:"1px solid var(--line-1)", paddingTop:12 }}>
              <div className="eyebrow" style={{ marginBottom:10, color:"var(--accent)" }}>Оплата занятий</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div>
                  <div className="eyebrow" style={{ marginBottom:6 }}>Следующая оплата</div>
                  <input className="ss-input" type="date" value={form.paymentDate||""}
                    onChange={e => set("paymentDate", e.target.value)} />
                </div>
                <div>
                  <div className="eyebrow" style={{ marginBottom:6 }}>Стоимость занятий ₽</div>
                  <input className="ss-input" type="number" value={form.sessionPrice||""}
                    onChange={e => set("sessionPrice", parseInt(e.target.value,10)||0)} placeholder="0" />
                </div>
              </div>
            </div>
          )}

          <div>
            <div className="eyebrow" style={{ marginBottom:6 }}>Следующий контакт</div>
            <input className="ss-input" type="date" value={form.next||""} onChange={e => set("next", e.target.value)} />
          </div>
          <div>
            <div className="eyebrow" style={{ marginBottom:6 }}>Заметки</div>
            <textarea className="ss-textarea" value={form.note||""} onChange={e => set("note", e.target.value)}
              placeholder="Детали, договорённости…" />
          </div>

          <div style={{ display:"flex", gap:8, justifyContent:"space-between", marginTop:8 }}>
            <div>
              {!isNew && (
                <button className="ss-btn danger"
                  onClick={() => { if(confirm("Удалить контакт?")) { onDelete(form.id); onClose(); } }}>
                  ✕ Удалить
                </button>
              )}
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button className="ss-btn ghost" onClick={onClose}>Отмена</button>
              <button className="ss-btn" onClick={() => { if(form.name.trim()){ onSave(form); onClose(); } }}
                disabled={!form.name.trim()}>
                {isNew ? "+ Создать" : "✓ Сохранить"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Kanban card ──────────────────────────────────────────────── */
const LeadCard = ({ lead, onMove, onEdit }) => {
  const stageMeta = CRM_STAGES.find(s => s.id === lead.stage) || CRM_STAGES[0];
  const nextStage = CRM_STAGES[CRM_STAGES.findIndex(s => s.id === lead.stage) + 1];

  return (
    <div style={{
      background:"var(--bg-2)", border:"1px solid var(--line-1)",
      borderRadius:10, padding:12, transition:"all 0.15s"
    }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:4 }}>
        <div style={{ fontWeight:500, fontSize:13, cursor:"pointer" }} onClick={() => onEdit(lead)}>
          {lead.name}
        </div>
        {lead.amount > 0 && (
          <span className="num" style={{ fontSize:11, color:"var(--accent)", flexShrink:0, marginLeft:8 }}>
            {formatRub(lead.amount)}
          </span>
        )}
      </div>
      {lead.phone && (
        <div className="num" style={{ fontSize:10, color:"var(--text-3)", marginBottom:4 }}>{lead.phone}</div>
      )}
      {lead.note && (
        <div style={{ fontSize:11, color:"var(--text-2)", marginBottom:6, lineHeight:1.4 }}>{lead.note}</div>
      )}
      {lead.next && (
        <div style={{ fontSize:10, color:"var(--accent)", marginBottom:8 }}>→ {fmtDate(lead.next)}</div>
      )}
      <div style={{ display:"flex", gap:6, alignItems:"center" }}>
        {nextStage && (
          <button style={{
            fontSize:10, padding:"3px 8px", borderRadius:5,
            border:`1px solid color-mix(in oklab, ${nextStage.color} 40%, transparent)`,
            background:`color-mix(in oklab, ${nextStage.color} 10%, transparent)`,
            color:nextStage.color, cursor:"pointer", fontFamily:"var(--font-mono)"
          }} onClick={() => onMove(lead.id, nextStage.id)}>
            → {nextStage.label}
          </button>
        )}
        <button style={{ background:"none", border:"none", cursor:"pointer", color:"var(--text-4)", fontSize:12, padding:"0 2px" }}
          onClick={() => onEdit(lead)} title="Редактировать">✎</button>
      </div>
    </div>
  );
};

/* ── Client payment row ───────────────────────────────────────── */
const ClientRow = ({ lead, onEdit }) => {
  const today = new Date().toISOString().split("T")[0];
  const payDate = lead.paymentDate;
  const isOverdue = payDate && payDate < today;
  const isSoon   = payDate && !isOverdue && payDate <= new Date(Date.now() + 7*86400000).toISOString().split("T")[0];

  return (
    <div style={{
      display:"grid", gridTemplateColumns:"1fr auto auto auto auto",
      alignItems:"center", gap:12, padding:"10px 0",
      borderBottom:"1px solid var(--line-1)"
    }}>
      <div>
        <div style={{ fontSize:13, fontWeight:500 }}>{lead.name}</div>
        {lead.note && <div style={{ fontSize:11, color:"var(--text-3)", marginTop:2 }}>{lead.note}</div>}
      </div>
      <div style={{ textAlign:"right" }}>
        {lead.sessionPrice > 0
          ? <span className="num" style={{ fontSize:13, color:"var(--accent)" }}>{formatRub(lead.sessionPrice)}</span>
          : <span style={{ fontSize:11, color:"var(--text-4)" }}>—</span>
        }
        <div style={{ fontSize:9, color:"var(--text-4)", marginTop:2 }}>за занятия</div>
      </div>
      <div style={{ textAlign:"center" }}>
        {payDate
          ? <span className="num" style={{ fontSize:11,
              color: isOverdue ? "var(--crimson)" : isSoon ? "var(--accent)" : "var(--text-2)" }}>
              {isOverdue ? "⚠ " : isSoon ? "→ " : ""}{fmtDate(payDate)}
            </span>
          : <span style={{ fontSize:11, color:"var(--text-4)" }}>нет даты</span>
        }
        <div style={{ fontSize:9, color:"var(--text-4)", marginTop:2 }}>след. оплата</div>
      </div>
      <div className="num" style={{ fontSize:11, color:"var(--leaf)", textAlign:"right" }}>
        {lead.amount > 0 ? formatRub(lead.amount) : "—"}
        <div style={{ fontSize:9, color:"var(--text-4)", marginTop:2 }}>сумма</div>
      </div>
      <button style={{ background:"none", border:"none", cursor:"pointer", color:"var(--text-4)", fontSize:13, padding:"0 4px" }}
        onClick={() => onEdit(lead)} title="Редактировать">✎</button>
    </div>
  );
};

/* ── Main page ────────────────────────────────────────────────── */
const CRMPage = ({ leads, setLeads, wallet, setWallet, logEvent }) => {
  const { useState } = React;
  const [modal, setModal] = useState(null);
  const [view, setView] = useState("pipeline"); // "pipeline" | "clients"

  const clients = leads.filter(l => l.stage === "paid");
  const totalPaid = leads.filter(l => l.stage === "paid" || l.stage === "done")
    .reduce((s, l) => s + (l.amount || 0), 0);

  const moveLead = (id, newStage) => {
    setLeads(prev => {
      const lead = prev.find(l => l.id === id);
      if (!lead) return prev;
      if (newStage === "paid" && lead.stage !== "paid" && lead.amount > 0) {
        const entry = { id:"w"+Date.now(), type:"income", cat:"Клиент",
          amount: lead.amount, date: new Date().toISOString().split("T")[0], note: lead.name };
        setWallet(w => ({ ...w, balance:(w.balance||0)+lead.amount, entries:[entry,...(w.entries||[])] }));
        logEvent(`${lead.name} — оплата`, `+${formatRub(lead.amount)}`);
      }
      return prev.map(l => l.id === id ? { ...l, stage: newStage } : l);
    });
  };

  const saveLead = (form) => {
    if (form.id && form.mode !== "new") {
      setLeads(prev => prev.map(l => l.id === form.id ? { ...l, ...form } : l));
    } else {
      const newLead = { ...form, id:"l"+Date.now() };
      setLeads(prev => [newLead, ...prev]);
      logEvent(`Новый контакт: ${newLead.name}`, "");
    }
  };

  const deleteLead = (id) => {
    setLeads(prev => prev.filter(l => l.id !== id));
  };

  return (
    <div>
      <div className="ss-page-header">
        <div>
          <div className="eyebrow">Клиенты и контакты</div>
          <h1>Личная база</h1>
        </div>
        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          <div style={{ textAlign:"right" }}>
            <div className="num" style={{ fontSize:11, color:"var(--text-3)" }}>{leads.length} контактов</div>
            <div className="num" style={{ fontSize:13, color:"var(--accent)" }}>всего {formatRub(totalPaid)}</div>
          </div>
          <button className="ss-btn" onClick={() => setModal({ mode:"new" })}>+ Контакт</button>
        </div>
      </div>

      {/* View toggle */}
      <div style={{ display:"flex", gap:8, marginBottom:20 }}>
        <button className="ss-ghost-btn" onClick={() => setView("pipeline")}
          style={view === "pipeline" ? { borderColor:"var(--accent)", color:"var(--accent)", background:"color-mix(in oklab, var(--accent) 10%, transparent)" } : {}}>
          ◈ Воронка
          <span className="num" style={{ marginLeft:5, opacity:0.6 }}>{leads.filter(l=>l.stage!=="done").length}</span>
        </button>
        <button className="ss-ghost-btn" onClick={() => setView("clients")}
          style={view === "clients" ? { borderColor:"var(--accent)", color:"var(--accent)", background:"color-mix(in oklab, var(--accent) 10%, transparent)" } : {}}>
          ◉ Мои клиенты
          <span className="num" style={{ marginLeft:5, opacity:0.6 }}>{clients.length}</span>
        </button>
      </div>

      {/* Pipeline kanban */}
      {view === "pipeline" && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:14 }}>
          {CRM_STAGES.map(col => {
            const items = leads.filter(l => l.stage === col.id);
            return (
              <div key={col.id} className="kanban-col">
                <div className="kanban-col-header">
                  <span style={{ fontSize:12, color:col.color, display:"flex", alignItems:"center", gap:6 }}>
                    ● {col.label}
                  </span>
                  <span className="num" style={{ fontSize:11, color:"var(--text-3)" }}>{items.length}</span>
                </div>
                {items.map(lead => (
                  <LeadCard key={lead.id} lead={lead} onMove={moveLead} onEdit={l => setModal(l)} />
                ))}
                {items.length === 0 && (
                  <div style={{ fontSize:11, color:"var(--text-4)", textAlign:"center", paddingTop:20 }}>пусто</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Clients payment tracker */}
      {view === "clients" && (
        <div className="ss-card" style={{ padding:20 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
            <div className="eyebrow">Активные клиенты · оплата занятий</div>
            <span className="num" style={{ fontSize:11, color:"var(--text-3)" }}>
              {clients.length} клиентов
            </span>
          </div>
          {clients.length === 0 && (
            <div style={{ color:"var(--text-3)", fontSize:13, padding:"20px 0", textAlign:"center" }}>
              Нет активных клиентов — переведите лид в статус «Оплачено»
            </div>
          )}
          {/* Header */}
          {clients.length > 0 && (
            <div style={{ display:"grid", gridTemplateColumns:"1fr auto auto auto auto",
              gap:12, marginBottom:8, paddingBottom:8, borderBottom:"1px solid var(--line-2)" }}>
              <span className="eyebrow">Клиент</span>
              <span className="eyebrow" style={{ textAlign:"right" }}>Занятия</span>
              <span className="eyebrow" style={{ textAlign:"center" }}>Оплата</span>
              <span className="eyebrow" style={{ textAlign:"right" }}>Сумма</span>
              <span/>
            </div>
          )}
          {clients.map(lead => (
            <ClientRow key={lead.id} lead={lead} onEdit={l => setModal(l)} />
          ))}

          {/* Upcoming payments summary */}
          {clients.length > 0 && (() => {
            const today = new Date().toISOString().split("T")[0];
            const soon  = clients.filter(l => l.paymentDate && l.paymentDate <= new Date(Date.now()+7*86400000).toISOString().split("T")[0] && l.paymentDate >= today);
            const overdue = clients.filter(l => l.paymentDate && l.paymentDate < today);
            if (!soon.length && !overdue.length) return null;
            return (
              <div style={{ marginTop:16, paddingTop:14, borderTop:"1px solid var(--line-1)", display:"flex", gap:16 }}>
                {overdue.length > 0 && (
                  <div style={{ fontSize:12, color:"var(--crimson)" }}>
                    ⚠ Просрочено: <strong>{overdue.length}</strong>
                  </div>
                )}
                {soon.length > 0 && (
                  <div style={{ fontSize:12, color:"var(--accent)" }}>
                    → На этой неделе: <strong>{soon.length}</strong>
                    {" · "}{formatRub(soon.reduce((s,l)=>s+(l.sessionPrice||0),0))}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {modal && (
        <LeadModal
          lead={modal}
          onSave={saveLead}
          onDelete={deleteLead}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
};
