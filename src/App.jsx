const App = () => {
  const [tab, setTab] = React.useState("home");
  const state = useAppState();
  const [questModal, setQuestModal] = React.useState(null);

  const pageProps = {
    ...state,
    onAddQuest: () => setQuestModal({ mode: "new" })
  };

  return (
    <div className="ss-app">
      <Sidebar tab={tab} setTab={setTab} profile={state.profile} />
      <main className="ss-main">
        {tab === "home" && (
          <HomePage {...pageProps} />
        )}
        {tab === "character" && (
          <CharacterPage {...pageProps} />
        )}
        {tab === "quests" && (
          <QuestsPage {...pageProps} openModal={questModal} setOpenModal={setQuestModal} />
        )}
        {tab === "workouts" && (
          <WorkoutsPage {...pageProps} />
        )}
        {tab === "content" && (
          <ContentPage {...pageProps} />
        )}
        {tab === "crm" && (
          <CRMPage {...pageProps} />
        )}
        {tab === "wallet" && (
          <WalletPage {...pageProps} />
        )}
        {tab === "achievements" && (
          <AchievementsPage {...pageProps} />
        )}
      </main>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
