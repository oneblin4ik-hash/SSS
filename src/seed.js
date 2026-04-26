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
    title: "Новый герой",
    level: 1,
    xp: 0,
    xpToNext: 550,
    streak: 0,
    totalXp: 0,
    class: "Воин-стратег",
    avatarStage: 0
  },
  stats: {
    strength:   { value: 0 },
    discipline: { value: 0 },
    energy:     { value: 0 },
    mental:     { value: 0 }
  },
  quests: [
    { id: "q2", title: "Написать пост в Telegram", stat: "mental",     difficulty: "small", due: seedDate("today"), daily: true,  done: false, streak: 0 },
    { id: "q3", title: "Режим питания",            stat: "energy",     difficulty: "small", due: seedDate("today"), daily: true,  done: false, streak: 0 },
    { id: "q6", title: "Сторис / прямой эфир",     stat: "mental",     difficulty: "small", due: seedDate("today"), daily: true,  done: false, streak: 0 },
    { id: "q7", title: "Разбор нового клиента",    stat: "discipline", difficulty: "small", due: seedDate("today"), daily: true,  done: false, streak: 0 }
  ],
  leads: [],
  content: [],
  wallet: {
    balance: 0,
    goal: 300000,
    entries: []
  },
  workouts: {
    measurements: {
      current: { chest: 0, waist: 0, hips: 0, biceps: 0, thigh: 0 },
      target:  { chest: 98, waist: 70, hips: 98, biceps: 36, thigh: 60 }
    },
    weightLog: [],
    prs: [],
    log: []
  },
  achievements: [
    { id:"a1",  title:"Не сдох на пятом подходе",         desc:"Добить силовую в день, когда хотелось слиться", path:"Сила",       tier:"gold",   done:false },
    { id:"a2",  title:"Опять понедельник, опять приседы",  desc:"4 понедельника подряд — ноги",                  path:"Сила",       tier:"silver", done:false },
    { id:"a3",  title:"Ну ты и машина",                    desc:"3 PR за один месяц",                            path:"Сила",       tier:"gold",   done:false },
    { id:"a4",  title:"Штанга меня любит",                 desc:"100 тренировок в зале",                         path:"Сила",       tier:"gold",   done:false },
    { id:"a5",  title:"Я поднимаю больше, чем сомнения",   desc:"Первый PR",                                     path:"Сила",       tier:"bronze", done:false },
    { id:"a6",  title:"Железная воля",                     desc:"30-дневный стрик",                              path:"Дисциплина", tier:"gold",   done:false },
    { id:"a7",  title:"Семь раз в неделю",                 desc:"Неделя без пропуска ежедневки",                 path:"Дисциплина", tier:"silver", done:false },
    { id:"a8",  title:"Будильник в страхе",                desc:"14 дней подряд вставать до 7:00",               path:"Дисциплина", tier:"silver", done:false },
    { id:"a9",  title:"Закрыла босса недели",              desc:"Выполнить задачу-босс",                         path:"Дисциплина", tier:"gold",   done:false },
    { id:"a10", title:"Легче, чем кажется",                desc:"Тренировка после 22:00",                        path:"Дисциплина", tier:"bronze", done:false },
    { id:"a11", title:"Первый рассвет",                    desc:"7 дней стрика",                                 path:"Дисциплина", tier:"bronze", done:false },
    { id:"a12", title:"Ритуал утра",                       desc:"Утренний квест 10 раз подряд",                  path:"Дисциплина", tier:"silver", done:false },
    { id:"a13", title:"Я не клоун, я контент",             desc:"10 опубликованных Reels",                       path:"Контент",    tier:"silver", done:false },
    { id:"a14", title:"Писатель без простоя",              desc:"30 постов в Telegram",                          path:"Контент",    tier:"gold",   done:false },
    { id:"a15", title:"Первая публичка",                   desc:"Первый опубликованный пост",                    path:"Контент",    tier:"bronze", done:false },
    { id:"a16", title:"Вирусный эпизод",                   desc:"3 контента за один день",                       path:"Контент",    tier:"silver", done:false },
    { id:"a17", title:"Голос найден",                      desc:"Использовать все 3 тона",                       path:"Контент",    tier:"bronze", done:false },
    { id:"a18", title:"Первые в очереди",                  desc:"Первая оплата от клиента",                      path:"Бизнес",     tier:"bronze", done:false },
    { id:"a19", title:"Миллионщица-в-пути",                desc:"100 000 ₽ за месяц",                           path:"Бизнес",     tier:"silver", done:false },
    { id:"a20", title:"Маленькая империя",                 desc:"10 активных клиентов",                          path:"Бизнес",     tier:"gold",   done:false },
    { id:"a21", title:"Закрыла, довела, отпустила",        desc:"5 клиентов в «Завершено»",                      path:"Бизнес",     tier:"silver", done:false },
    { id:"a22", title:"Баланс героя",                      desc:"Достигнуть цели месяца",                        path:"Бизнес",     tier:"gold",   done:false },
    { id:"a23", title:"Не отвалилась после «не хочу»",    desc:"Завершить день, когда хотела бросить",          path:"Интеллект",  tier:"silver", done:false },
    { id:"a24", title:"Тишина внутри",                     desc:"7 дней подряд без пропуска",                    path:"Интеллект",  tier:"silver", done:false },
    { id:"a25", title:"Видимая я",                         desc:"Достичь «Мастер» в характеристике",            path:"Интеллект",  tier:"gold",   done:false },
    { id:"a26", title:"Тысячница",                         desc:"1000 XP за один день",                          path:"Скрытые",    tier:"gold",   done:false },
    { id:"a27", title:"Ночной дозор",                      desc:"Закрыть квест после полуночи",                  path:"Скрытые",    tier:"bronze", done:false },
    { id:"a28", title:"Архитектор",                        desc:"Создать 20 квестов",                            path:"Скрытые",    tier:"silver", done:false },
    { id:"a29", title:"Суперсистема",                      desc:"Открыть все 8 вкладок за один день",            path:"Скрытые",    tier:"gold",   done:false },
    { id:"a30", title:"Перевалила за половину",            desc:"Открыть 15 ачивок",                             path:"Скрытые",    tier:"silver", done:false },
    { id:"a31", title:"Железный торс",                     desc:"Грудь достигла цели — 98 см",                   path:"Тело",       tier:"gold",   done:false },
    { id:"a32", title:"Руки-канаты",                       desc:"Бицепс достиг цели — 36 см",                   path:"Тело",       tier:"silver", done:false },
    { id:"a33", title:"Ноги-столбы",                       desc:"Бедро достигло цели — 60 см",                   path:"Тело",       tier:"silver", done:false },
    { id:"a34", title:"Первый сантиметр",                  desc:"+1 см в любой зоне за замер",                   path:"Тело",       tier:"bronze", done:false },
    { id:"a35", title:"Масса принята",                     desc:"Все замеры (кроме талии) на цели",              path:"Тело",       tier:"gold",   done:false }
  ],
  eventLog: []
};
