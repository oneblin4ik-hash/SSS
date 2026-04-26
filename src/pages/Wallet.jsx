const INCOME_CATS  = ["Клиент", "Консультация", "Реклама", "Прочее"];
const EXPENSE_CATS = ["Реклама", "Подписки", "Еда", "Транспорт", "Зал", "Прочее"];

function getMonthEntries(entries) {
  const now = new Date(), m = now.getMonth(), y = now.getFullYear();
  return (entries || []).filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === m && d.getFullYear() === y;
  });
}

/* ── Entry edit modal ─────────────────────────────────────────── */
const EntryModal = ({ entry, onSave, onDelete, onClose }) => {
  const { useState } = React;
  const [form, setForm] = useState({ ...entry });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const cats = form.type === "income" ? INCOME_CATS : EXPENSE_CATS;

  return (
    <div className="ss-modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="ss-modal">
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <h2 style={{ fontFamily:"var(--font-display)", fontSize:22, margin:0 }}>Редактировать запись</h2>
          <button className="ss-ghost-btn" onClick={onClose} style={{ padding:"4px 8px" }}>✕</button>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div>
              <div className="eyebrow" style={{ marginBottom:6 }}>Тип</div>
              <select className="ss-select" value={form.type} onChange={e => set("type", e.target.value)}>
                <option value="income">Доход</option>
                <option value="expense">Расход</option>
              </select>
            </div>
            <div>
              <div className="eyebrow" style={{ marginBottom:6 }}>Категория</div>
              <select className="ss-select" value={form.cat} onChange={e => set("cat", e.target.value)}>
                {cats.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div>
              <div className="eyebrow" style={{ marginBottom:6 }}>Сумма ₽</div>
              <input className="ss-input" type="number" value={form.amount || ""}
                onChange={e => set("amount", parseInt(e.target.value,10) || 0)} />
            </div>
            <div>
              <div className="eyebrow" style={{ marginBottom:6 }}>Дата</div>
              <input className="ss-input" type="date" value={form.date || ""}
                onChange={e => set("date", e.target.value)} />
            </div>
          </div>
          <div>
            <div className="eyebrow" style={{ marginBottom:6 }}>Заметка</div>
            <input className="ss-input" value={form.note || ""} onChange={e => set("note", e.target.value)} />
          </div>
          <div style={{ display:"flex", gap:8, justifyContent:"space-between", marginTop:8 }}>
            <button className="ss-btn danger"
              onClick={() => { if(confirm("Удалить запись?")) { onDelete(entry); onClose(); } }}>
              ✕ Удалить
            </button>
            <div style={{ display:"flex", gap:8 }}>
              <button className="ss-btn ghost" onClick={onClose}>Отмена</button>
              <button className="ss-btn" onClick={() => { onSave(entry, form); onClose(); }}>✓ Сохранить</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Main page ────────────────────────────────────────────────── */
const WalletPage = ({ wallet, setWallet, logEvent }) => {
  const { useState } = React;
  const [type, setType] = useState("income");
  const [cat, setCat] = useState("Клиент");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [editEntry, setEditEntry] = useState(null);
  const [editingBalance, setEditingBalance] = useState(false);
  const [balanceInput, setBalanceInput] = useState("");

  const entries   = wallet.entries || [];
  const monthEntries = getMonthEntries(entries);
  const monthIncome  = monthEntries.filter(e => e.type === "income").reduce((s, e) => s + (e.amount||0), 0);
  const monthExpense = monthEntries.filter(e => e.type === "expense").reduce((s, e) => s + (e.amount||0), 0);
  const goalPct = Math.min(100, Math.round(((wallet.balance||0) / (wallet.goal||1)) * 100));

  /* ─ Add entry ─ */
  const addEntry = () => {
    const n = parseInt(String(amount).replace(/\D/g,""), 10);
    if (!n || n <= 0) return;
    const entry = { id:"w"+Date.now(), type, cat, amount:n, date:new Date().toISOString().split("T")[0], note:note.trim() };
    setWallet(w => ({
      ...w,
      balance: type === "income" ? (w.balance||0)+n : Math.max(0,(w.balance||0)-n),
      entries: [entry, ...(w.entries||[])]
    }));
    logEvent(`${type==="income"?"+":"−"} ${formatRub(n)} · ${cat}`, "");
    setAmount(""); setNote("");
  };

  /* ─ Edit entry ─ */
  const saveEntry = (original, updated) => {
    // Reverse old balance effect, apply new
    const oldSign = original.type === "income" ? 1 : -1;
    const newSign = updated.type  === "income" ? 1 : -1;
    const balanceDelta = newSign * updated.amount - oldSign * original.amount;
    setWallet(w => ({
      ...w,
      balance: Math.max(0, (w.balance||0) + balanceDelta),
      entries: (w.entries||[]).map(e => e.id === original.id ? { ...e, ...updated } : e)
    }));
  };

  /* ─ Delete entry ─ */
  const deleteEntry = (entry) => {
    const sign = entry.type === "income" ? -1 : 1;
    setWallet(w => ({
      ...w,
      balance: Math.max(0, (w.balance||0) + sign * entry.amount),
      entries: (w.entries||[]).filter(e => e.id !== entry.id)
    }));
    logEvent(`Запись удалена: ${entry.cat}`, entry.type==="income"?`-${formatRub(entry.amount)}`:`+${formatRub(entry.amount)}`);
  };

  /* ─ Direct balance edit ─ */
  const saveBalance = () => {
    const n = parseInt(String(balanceInput).replace(/\D/g,""), 10);
    if (isNaN(n) || n < 0) return;
    setWallet(w => ({ ...w, balance: n }));
    setEditingBalance(false);
    setBalanceInput("");
  };

  const catOptions = type === "income" ? INCOME_CATS : EXPENSE_CATS;

  return (
    <div>
      <div className="ss-page-header">
        <div>
          <div className="eyebrow">Финансы</div>
          <h1>Кошелёк</h1>
        </div>
      </div>

      {/* Top cards */}
      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr", gap:14, marginBottom:14 }}>

        {/* Balance */}
        <div className="ss-card" style={{ padding:24 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
            <div className="eyebrow">Баланс</div>
            {editingBalance
              ? <div style={{ display:"flex", gap:6 }}>
                  <button className="ss-ghost-btn" style={{ padding:"3px 8px", fontSize:11 }} onClick={() => setEditingBalance(false)}>Отмена</button>
                  <button className="ss-btn" style={{ padding:"3px 10px", fontSize:11 }} onClick={saveBalance}>✓</button>
                </div>
              : <button className="ss-ghost-btn" style={{ fontSize:11, padding:"3px 8px" }}
                  onClick={() => { setBalanceInput(String(wallet.balance||0)); setEditingBalance(true); }}>
                  ✎ Изменить
                </button>
            }
          </div>
          {editingBalance
            ? <input className="ss-input" type="number" value={balanceInput}
                onChange={e => setBalanceInput(e.target.value)}
                style={{ fontFamily:"var(--font-display)", fontSize:28, marginBottom:16 }} autoFocus />
            : <div style={{ fontFamily:"var(--font-display)", fontSize:48, fontWeight:500, color:"var(--accent)", lineHeight:1, marginBottom:16 }}>
                {formatRub(wallet.balance||0)}
              </div>
          }
          <XPBar pct={goalPct} />
          <div className="num" style={{ display:"flex", justifyContent:"space-between", marginTop:6, fontSize:11, color:"var(--text-3)" }}>
            <span>{goalPct}% цели</span>
            <span>Цель: {formatRub(wallet.goal)}</span>
          </div>
        </div>

        {/* Income */}
        <div className="ss-card" style={{ padding:20 }}>
          <div className="eyebrow" style={{ marginBottom:12 }}>Доход / месяц</div>
          <div style={{ fontFamily:"var(--font-display)", fontSize:26, color:"var(--leaf)", lineHeight:1 }}>
            {formatRub(monthIncome)}
          </div>
          <div style={{ fontSize:11, color:"var(--text-3)", marginTop:8 }}>
            {monthEntries.filter(e=>e.type==="income").length} транзакций
          </div>
        </div>

        {/* Expense */}
        <div className="ss-card" style={{ padding:20 }}>
          <div className="eyebrow" style={{ marginBottom:12 }}>Расход / месяц</div>
          <div style={{ fontFamily:"var(--font-display)", fontSize:26, color:"var(--crimson)", lineHeight:1 }}>
            {formatRub(monthExpense)}
          </div>
          <div style={{ fontSize:11, color:"var(--text-3)", marginTop:8 }}>
            {monthEntries.filter(e=>e.type==="expense").length} транзакций
          </div>
        </div>
      </div>

      {/* Form + History */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:14 }}>

        {/* Form */}
        <div className="ss-card" style={{ padding:20 }}>
          <div className="eyebrow" style={{ marginBottom:14 }}>Добавить</div>
          <div style={{ display:"flex", gap:0, marginBottom:14, borderRadius:8, overflow:"hidden", border:"1px solid var(--line-2)" }}>
            <button onClick={() => { setType("income"); setCat("Клиент"); }}
              style={{ flex:1, padding:"9px 0", fontSize:12,
                background: type==="income" ? "color-mix(in oklab, var(--leaf) 15%, transparent)" : "transparent",
                color: type==="income" ? "var(--leaf)" : "var(--text-3)",
                borderRight:"1px solid var(--line-2)", transition:"all 0.15s" }}>+ Доход</button>
            <button onClick={() => { setType("expense"); setCat("Реклама"); }}
              style={{ flex:1, padding:"9px 0", fontSize:12,
                background: type==="expense" ? "color-mix(in oklab, var(--crimson) 15%, transparent)" : "transparent",
                color: type==="expense" ? "var(--crimson)" : "var(--text-3)",
                transition:"all 0.15s" }}>− Расход</button>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <div>
              <div className="eyebrow" style={{ marginBottom:6 }}>Категория</div>
              <select className="ss-select" value={cat} onChange={e => setCat(e.target.value)}>
                {catOptions.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <div className="eyebrow" style={{ marginBottom:6 }}>Сумма ₽</div>
              <input className="ss-input" type="number" value={amount}
                onChange={e => setAmount(e.target.value)} placeholder="0"
                onKeyDown={e => e.key === "Enter" && addEntry()} />
            </div>
            <div>
              <div className="eyebrow" style={{ marginBottom:6 }}>Заметка</div>
              <input className="ss-input" value={note} onChange={e => setNote(e.target.value)} placeholder="Опционально…" />
            </div>
            <button className="ss-btn" onClick={addEntry} disabled={!amount || parseInt(amount,10)<=0}
              style={{ width:"100%", justifyContent:"center",
                borderColor:`color-mix(in oklab, ${type==="income"?"var(--leaf)":"var(--crimson)"} 40%, transparent)`,
                color: type==="income" ? "var(--leaf)" : "var(--crimson)",
                background:`color-mix(in oklab, ${type==="income"?"var(--leaf)":"var(--crimson)"} 14%, transparent)` }}>
              + Добавить
            </button>
          </div>
        </div>

        {/* History */}
        <div className="ss-card" style={{ padding:20, maxHeight:520, overflow:"auto" }}>
          <div className="eyebrow" style={{ marginBottom:14 }}>История транзакций</div>
          {entries.length === 0 && (
            <div style={{ color:"var(--text-3)", fontSize:13 }}>Нет транзакций</div>
          )}
          {entries.map((e, i) => (
            <div key={e.id||i} style={{
              display:"flex", alignItems:"center", gap:12, padding:"9px 0",
              borderBottom:"1px solid var(--line-1)"
            }}>
              <span className="num" style={{ fontSize:10, color:"var(--text-3)", width:88, flexShrink:0 }}>
                {fmtDate(e.date)}
              </span>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, color:"var(--text-1)" }}>{e.cat}</div>
                {e.note && <div style={{ fontSize:10, color:"var(--text-3)", marginTop:1 }}>{e.note}</div>}
              </div>
              <span style={{ fontFamily:"var(--font-display)", fontSize:16,
                color: e.type==="income" ? "var(--leaf)" : "var(--crimson)", flexShrink:0 }}>
                {e.type==="income"?"+":"−"}{formatRub(e.amount)}
              </span>
              <button onClick={() => setEditEntry(e)}
                style={{ background:"none", border:"none", cursor:"pointer", color:"var(--text-4)", fontSize:13, padding:"0 3px" }}
                title="Редактировать">✎</button>
              <button onClick={() => { if(confirm("Удалить запись?")) deleteEntry(e); }}
                style={{ background:"none", border:"none", cursor:"pointer", color:"var(--text-4)", fontSize:13, padding:"0 3px" }}
                title="Удалить">✕</button>
            </div>
          ))}
        </div>
      </div>

      {editEntry && (
        <EntryModal
          entry={editEntry}
          onSave={saveEntry}
          onDelete={deleteEntry}
          onClose={() => setEditEntry(null)}
        />
      )}
    </div>
  );
};
