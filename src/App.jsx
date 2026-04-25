const App = () => {
  const [tab, setTab] = React.useState("home");
  const state = useAppState();
  const [questModal, setQuestModal] = React.useState(null);

  const pageProps = {
    ...state,
    onAddQuest: () => setQuestModal({ mode: "new" })
  };

  const { achPopup } = state;

  return (
    <div className="ss-app">
      <Sidebar tab={tab} setTab={setTab} profile={state.profile} />
      <main className="ss-main">
        {tab === "home"         && <HomePage      {...pageProps} />}
        {tab === "character"    && <CharacterPage {...pageProps} />}
        {tab === "quests"       && <QuestsPage    {...pageProps} openModal={questModal} setOpenModal={setQuestModal} />}
        {tab === "workouts"     && <WorkoutsPage  {...pageProps} />}
        {tab === "content"      && <ContentPage   {...pageProps} />}
        {tab === "crm"          && <CRMPage       {...pageProps} />}
        {tab === "wallet"       && <WalletPage    {...pageProps} />}
        {tab === "achievements" && <AchievementsPage {...pageProps} />}
      </main>

      {/* Global achievement unlock popup */}
      {achPopup && (
        <div className="achievement-popup">
          <div style={{ fontSize: 28 }}>✦</div>
          <div>
            <div style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)", marginBottom: 4 }}>
              ДОСТИЖЕНИЕ РАЗБЛОКИРОВАНО
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--accent)" }}>
              {achPopup.title}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-2)", marginTop: 3 }}>{achPopup.desc}</div>
          </div>
          <div className="num" style={{ color: "var(--accent)", fontSize: 13, marginLeft: "auto" }}>+150 XP</div>
        </div>
      )}
    </div>
  );
};

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
