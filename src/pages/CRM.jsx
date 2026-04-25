const CRM_STAGES = [
  { id: "lead", label: "Лид",        color: "var(--text-3)" },
  { id: "call", label: "Созвон",     color: "var(--teal)" },
  { id: "paid", label: "Оплачено",   color: "var(--accent)" },
  { id: "done", label: "Завершено",  color: "var(--leaf)" }
];

const LeadModal = ({ lead, onSave, onClose }) => {
  const { useState } = React;
  const isNew = !lead || lead.mode === "new";
  const initial = isNew
    ? { name: "", phone: "", amount: 0, stage: "lead", next: "", note: "" }
    : lead;
  const [form, setForm] = useState(initial);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    if (!form.name.trim()) return;
    onSave(form);
    onClose();
  };

  return (
    <div className="ss-modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="ss-modal">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, margin: 0 }}>
            {isNew ? "Новый лид" : form.name}
          </h2>
          <button className="ss-ghost-btn" onClick={onClose} style={{ padding: "4px 8px" }}>✕</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <div className="eyebrow" style={{ marginBottom: 6 }}>Имя</div>
              <input className="ss-input" value={form.name} onChange={e => set("name", e.target.value)} placeholder="Имя клиента" autoFocus />
            </div>
            <div>
              <div className="eyebrow" style={{ marginBottom: 6 }}>Телефон</div>
              <input className="ss-input" value={form.phone || ""} onChange={e => set("phone", e.target.value)} placeholder="+7 xxx xxx-xx-xx" />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <div className="eyebrow" style={{ marginBottom: 6 }}>Сумма ₽</div>
              <input className="ss-input" type="number" value={form.amount || ""} onChange={e => set("amount", parseInt(e.target.value, 10) || 0)} placeholder="0" />
            </div>
            <div>
              <div className="eyebrow" style={{ marginBottom: 6 }}>Этап</div>
              <select className="ss-select" value={form.stage} onChange={e => set("stage", e.target.value)}>
                {CRM_STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <div className="eyebrow" style={{ marginBottom: 6 }}>Следующий контакт</div>
            <input className="ss-input" type="date" value={form.next || ""} onChange={e => set("next", e.target.value)} />
          </div>
          <div>
            <div className="eyebrow" style={{ marginBottom: 6 }}>Заметки</div>
            <textarea className="ss-textarea" value={form.note || ""} onChange={e => set("note", e.target.value)} placeholder="Детали, договорённости…" />
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
            <button className="ss-btn ghost" onClick={onClose}>Отмена</button>
            <button className="ss-btn" onClick={handleSave} disabled={!form.name.trim()}>
              {isNew ? "+ Создать" : "✓ Сохранить"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const LeadCard = ({ lead, onMove, onEdit }) => {
  const stageMeta = CRM_STAGES.find(s => s.id === lead.stage) || CRM_STAGES[0];
  const nextStage = CRM_STAGES[CRM_STAGES.findIndex(s => s.id === lead.stage) + 1];

  return (
    <div style={{
      background: "var(--bg-2)", border: "1px solid var(--line-1)", borderRadius: 10, padding: 12,
      transition: "all 0.15s"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
        <div style={{ fontWeight: 500, fontSize: 13, cursor: "pointer" }} onClick={() => onEdit(lead)}>{lead.name}</div>
        {lead.amount > 0 && (
          <span className="num" style={{ fontSize: 11, color: "var(--accent)", flexShrink: 0, marginLeft: 8 }}>
            {formatRub(lead.amount)}
          </span>
        )}
      </div>
      {lead.phone && (
        <div className="num" style={{ fontSize: 10, color: "var(--text-3)", marginBottom: 4 }}>{lead.phone}</div>
      )}
      {lead.note && (
        <div style={{ fontSize: 11, color: "var(--text-2)", marginBottom: 6, lineHeight: 1.4 }}>{lead.note}</div>
      )}
      {lead.next && (
        <div style={{ fontSize: 10, color: "var(--accent)", marginBottom: 8 }}>→ {fmtDate(lead.next)}</div>
      )}
      {nextStage && (
        <button style={{
          fontSize: 10, padding: "3px 8px", borderRadius: 5,
          border: `1px solid color-mix(in oklab, ${nextStage.color} 40%, transparent)`,
          background: `color-mix(in oklab, ${nextStage.color} 10%, transparent)`,
          color: nextStage.color, cursor: "pointer", fontFamily: "var(--font-mono)"
        }} onClick={() => onMove(lead.id, nextStage.id)}>
          → {nextStage.label}
        </button>
      )}
    </div>
  );
};

const CRMPage = ({ leads, setLeads, wallet, setWallet, logEvent }) => {
  const { useState } = React;
  const [modal, setModal] = useState(null);

  const totalPaid = leads.filter(l => l.stage === "paid" || l.stage === "done")
    .reduce((s, l) => s + (l.amount || 0), 0);

  const moveLead = (id, newStage) => {
    setLeads(prev => {
      const lead = prev.find(l => l.id === id);
      if (!lead) return prev;
      if (newStage === "paid" && lead.stage !== "paid" && lead.amount > 0) {
        const entry = {
          id: "w" + Date.now(),
          type: "income",
          cat: "Клиент",
          amount: lead.amount,
          date: new Date().toISOString().split("T")[0],
          note: lead.name
        };
        setWallet(w => ({
          ...w,
          balance: (w.balance || 0) + lead.amount,
          entries: [entry, ...(w.entries || [])]
        }));
        logEvent(`${lead.name} — оплата`, `+${formatRub(lead.amount)}`);
      }
      return prev.map(l => l.id === id ? { ...l, stage: newStage } : l);
    });
  };

  const saveLead = (form) => {
    if (form.id && form.mode !== "new") {
      setLeads(prev => prev.map(l => l.id === form.id ? { ...l, ...form } : l));
    } else {
      const newLead = { ...form, id: "l" + Date.now() };
      setLeads(prev => [newLead, ...prev]);
      logEvent(`Новый лид: ${newLead.name}`, "");
    }
  };

  const editLead = (lead) => setModal(lead);

  return (
    <div>
      <div className="ss-page-header">
        <div>
          <div className="eyebrow">Управление клиентами</div>
          <h1>CRM / Лиды</h1>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ textAlign: "right" }}>
            <div className="num" style={{ fontSize: 11, color: "var(--text-3)" }}>{leads.length} клиентов</div>
            <div className="num" style={{ fontSize: 13, color: "var(--accent)" }}>всего {formatRub(totalPaid)}</div>
          </div>
          <button className="ss-btn" onClick={() => setModal({ mode: "new" })}>+ Лид</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        {CRM_STAGES.map(col => {
          const items = leads.filter(l => l.stage === col.id);
          return (
            <div key={col.id} className="kanban-col">
              <div className="kanban-col-header">
                <span style={{ fontSize: 12, color: col.color, display: "flex", alignItems: "center", gap: 6 }}>
                  ● {col.label}
                </span>
                <span className="num" style={{ fontSize: 11, color: "var(--text-3)" }}>{items.length}</span>
              </div>
              {items.map(lead => (
                <LeadCard key={lead.id} lead={lead} onMove={moveLead} onEdit={editLead} />
              ))}
              {items.length === 0 && (
                <div style={{ fontSize: 11, color: "var(--text-4)", textAlign: "center", paddingTop: 20 }}>пусто</div>
              )}
            </div>
          );
        })}
      </div>

      {modal && (
        <LeadModal
          lead={modal}
          onSave={saveLead}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
};
