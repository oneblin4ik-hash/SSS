// Utility: convert relative day offset "+N"/"-N"/"today"/null to ISO date string
function seedDate(offset) {
  if (!offset || offset === "today") return new Date().toISOString().split("T")[0];
  const d = new Date();
  d.setDate(d.getDate() + parseInt(String(offset), 10));
  return d.toISOString().split("T")[0];
}

// Format currency Russian style
function formatRub(n) {
  return (n || 0).toLocaleString("ru-RU") + " ₽";
}

// Format date for display
function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

const SSSeed = {
  profile: {
    name: "Serbolin",
    title: "Архитектор дисциплины",
    level: 12,
    xp: 2840,
    xpToNext: 3500,
    streak: 17,
    totalXp: 28400,
    class: "Воин-стратег",
    avatarStage: 3
  },
  stats: {
    strength:   { value: 46 },
    discipline: { value: 62 },
    energy:     { value: 38 },
    mental:     { value: 54 }
  },
  quests: [
    { id: "q1", title: "Силовая: ноги + ягодицы",    stat: "strength",   difficulty: "medium", xp: 100, due: seedDate("today"), daily: true,  done: false, streak: 12 },
    { id: "q2", title: "Написать пост в Telegram",    stat: "mental",     difficulty: "small",  xp: 50,  due: seedDate("today"), daily: true,  done: true,  streak: 17 },
    { id: "q3", title: "10 000 шагов",                stat: "energy",     difficulty: "small",  xp: 50,  due: seedDate("today"), daily: true,  done: false, streak: 5  },
    { id: "q4", title: "Снять 3 Reels на неделю",     stat: "mental",     difficulty: "large",  xp: 200, due: seedDate("+3"),    daily: false, done: false },
    { id: "q5", title: "Закрыть 5 новых клиентов",    stat: "discipline", difficulty: "epic",   xp: 500, due: seedDate("+6"),    daily: false, done: false, boss: true }
  ],
  leads: [
    { id: "l1", name: "Анна К.",  phone: "+7 999 123-45-67", stage: "paid", amount: 25000, next: seedDate("+14"), note: "Тариф «Трансформация», 3 мес." },
    { id: "l2", name: "Мария С.", phone: "+7 925 555-01-02", stage: "call", amount: 0,     next: seedDate("+1"),  note: "Созвон завтра 14:00" },
    { id: "l3", name: "Дарья В.", phone: "+7 903 777-22-10", stage: "lead", amount: 0,     next: seedDate("+2"),  note: "Пришла из Reels" },
    { id: "l4", name: "Елена П.", phone: "+7 916 000-11-44", stage: "paid", amount: 45000, next: seedDate("+30"), note: "Продление на 6 мес." },
    { id: "l5", name: "Ольга Н.", phone: "+7 960 222-33-55", stage: "done", amount: 18000, next: null,            note: "Завершила курс. Отзыв получен." }
  ],
  content: [
    { id: "c1", type: "tg",    title: "Почему «чуть-чуть» — главный враг результата",         tone: "Провокация",      status: "published", date: seedDate("-2") },
    { id: "c2", type: "reels", title: "3 мифа о том, что «мышцы делают квадратной»",           tone: "Подруга-эксперт", status: "ready",     date: seedDate("+1") },
    { id: "c3", type: "tg",    title: "Дисциплина ≠ насилие над собой",                        tone: "Подруга-эксперт", status: "draft",     date: seedDate("+2") },
    { id: "c4", type: "reels", title: "Как я снова начала, когда всё развалилось",              tone: "Лёгкий юмор",     status: "idea",      date: seedDate("+4") }
  ],
  wallet: {
    balance: 184500,
    goal: 300000,
    entries: [
      { id: "w1", type: "income",  cat: "Клиент",       amount: 25000, date: seedDate("-1"), note: "Анна К. — 2 мес." },
      { id: "w2", type: "income",  cat: "Клиент",       amount: 45000, date: seedDate("-3"), note: "Елена П. — продление" },
      { id: "w3", type: "expense", cat: "Реклама",      amount: 8000,  date: seedDate("-2"), note: "Telegram Ads" },
      { id: "w4", type: "expense", cat: "Подписки",     amount: 2400,  date: seedDate("-4"), note: "Canva + Notion" },
      { id: "w5", type: "income",  cat: "Консультация", amount: 6000,  date: seedDate("-5"), note: "Разовая" }
    ]
  },
  workouts: {
    measurements: {
      current: { chest: 96, waist: 78, hips: 100, biceps: 34, thigh: 58 },
      target:  { chest: 98, waist: 70, hips: 98,  biceps: 36, thigh: 60 }
    },
    prs: [
      { lift: "Присед",       value: 85,  unit: "кг",  date: seedDate("-14") },
      { lift: "Становая",     value: 100, unit: "кг",  date: seedDate("-9")  },
      { lift: "Жим лёжа",     value: 55,  unit: "кг",  date: seedDate("-21") },
      { lift: "Подтягивания", value: 6,   unit: "раз", date: seedDate("-6")  }
    ],
    log: [
      { id: "wl1", date: seedDate("-1"), type: "Ноги",       xp: 120 },
      { id: "wl2", date: seedDate("-2"), type: "Кардио",     xp: 50  },
      { id: "wl3", date: seedDate("-4"), type: "Верх тела",  xp: 100 },
      { id: "wl4", date: seedDate("-5"), type: "Full body",  xp: 140 },
      { id: "wl5", date: seedDate("-7"), type: "Ноги",       xp: 120 }
    ]
  },
  achievements: [
    { id:"a1",  title:"Не сдох на пятом подходе",        desc:"Добить силовую в день, когда хотелось слиться", path:"Сила",       tier:"gold",   done:true  },
    { id:"a2",  title:"Опять понедельник, опять приседы", desc:"4 понедельника подряд — ноги",                  path:"Сила",       tier:"silver", done:true  },
    { id:"a3",  title:"Ну ты и машина",                   desc:"3 PR за один месяц",                            path:"Сила",       tier:"gold",   done:false },
    { id:"a4",  title:"Штанга меня любит",                desc:"100 тренировок в зале",                         path:"Сила",       tier:"gold",   done:false },
    { id:"a5",  title:"Я поднимаю больше, чем сомнения",  desc:"Первый PR",                                     path:"Сила",       tier:"bronze", done:true  },
    { id:"a6",  title:"Железная воля",                    desc:"30-дневный стрик",                              path:"Дисциплина", tier:"gold",   done:false },
    { id:"a7",  title:"Семь раз в неделю",                desc:"Неделя без пропуска ежедневки",                 path:"Дисциплина", tier:"silver", done:true  },
    { id:"a8",  title:"Будильник в страхе",               desc:"14 дней подряд вставать до 7:00",               path:"Дисциплина", tier:"silver", done:false },
    { id:"a9",  title:"Закрыла босса недели",             desc:"Выполнить задачу-босс",                         path:"Дисциплина", tier:"gold",   done:false },
    { id:"a10", title:"Легче, чем кажется",               desc:"Тренировка после 22:00",                        path:"Дисциплина", tier:"bronze", done:true  },
    { id:"a11", title:"Первый рассвет",                   desc:"7 дней стрика",                                 path:"Дисциплина", tier:"bronze", done:true  },
    { id:"a12", title:"Ритуал утра",                      desc:"Утренний квест 10 раз подряд",                  path:"Дисциплина", tier:"silver", done:false },
    { id:"a13", title:"Я не клоун, я контент",            desc:"10 опубликованных Reels",                       path:"Контент",    tier:"silver", done:true  },
    { id:"a14", title:"Писатель без простоя",             desc:"30 постов в Telegram",                          path:"Контент",    tier:"gold",   done:false },
    { id:"a15", title:"Первая публичка",                  desc:"Первый опубликованный пост",                    path:"Контент",    tier:"bronze", done:true  },
    { id:"a16", title:"Вирусный эпизод",                  desc:"3 контента за один день",                       path:"Контент",    tier:"silver", done:false },
    { id:"a17", title:"Голос найден",                     desc:"Использовать все 3 тона",                       path:"Контент",    tier:"bronze", done:false },
    { id:"a18", title:"Первые в очереди",                 desc:"Первая оплата от клиента",                      path:"Бизнес",     tier:"bronze", done:true  },
    { id:"a19", title:"Миллионщица-в-пути",              desc:"100 000 ₽ за месяц",                            path:"Бизнес",     tier:"silver", done:false },
    { id:"a20", title:"Маленькая империя",                desc:"10 активных клиентов",                          path:"Бизнес",     tier:"gold",   done:false },
    { id:"a21", title:"Закрыла, довела, отпустила",       desc:"5 клиентов в «Завершено»",                      path:"Бизнес",     tier:"silver", done:false },
    { id:"a22", title:"Баланс героя",                     desc:"Достигнуть цели месяца",                        path:"Бизнес",     tier:"gold",   done:false },
    { id:"a23", title:"Не отвалилась после «не хочу»",   desc:"Завершить день, когда хотела бросить",          path:"Интеллект",     tier:"silver", done:true  },
    { id:"a24", title:"Тишина внутри",                    desc:"7 дней подряд без пропуска",                    path:"Интеллект",     tier:"silver", done:false },
    { id:"a25", title:"Видимая я",                        desc:"Достичь «Мастер» в характеристике",            path:"Интеллект",     tier:"gold",   done:false },
    { id:"a26", title:"Тысячница",                        desc:"1000 XP за один день",                          path:"Скрытые",    tier:"gold",   done:false },
    { id:"a27", title:"Ночной дозор",                     desc:"Закрыть квест после полуночи",                  path:"Скрытые",    tier:"bronze", done:false },
    { id:"a28", title:"Архитектор",                       desc:"Создать 20 квестов",                            path:"Скрытые",    tier:"silver", done:false },
    { id:"a29", title:"Суперсистема",                     desc:"Открыть все 8 вкладок за один день",            path:"Скрытые",    tier:"gold",   done:true  },
    { id:"a30", title:"Перевалила за половину",           desc:"Открыть 15 ачивок",                             path:"Скрытые",    tier:"silver", done:false },

    // Тело (масса)
    { id:"a31", title:"Железный торс",     desc:"Грудь достигла цели — 98 см",    path:"Тело", tier:"gold",   done:false },
    { id:"a32", title:"Руки-канаты",       desc:"Бицепс достиг цели — 36 см",     path:"Тело", tier:"silver", done:false },
    { id:"a33", title:"Ноги-столбы",       desc:"Бедро достигло цели — 60 см",    path:"Тело", tier:"silver", done:false },
    { id:"a34", title:"Первый сантиметр",  desc:"+1 см в любой зоне за замер",    path:"Тело", tier:"bronze", done:false },
    { id:"a35", title:"Масса принята",     desc:"Все замеры (кроме талии) на цели", path:"Тело", tier:"gold", done:false }
  ],
  eventLog: []
};
