#!/usr/bin/env python3
"""
Путь клиента одним файлом: квиз → оффер → покупка → 14 дней → разбор.

    python3 build_put_klienta.py

На выходе в out/:

    put-klienta.html            открывается двойным кликом
    put-klienta-artifact.html   то же без обёртки документа — под артефакт

Зачем. Отдельно у нас уже есть квиз, страница оффера, симулятор бота и
листы курса. Порознь они не отвечают на главный вопрос: получает ли человек
с конкретными ответами именно свой материал. Здесь всё сшито в одну ленту,
и вариант задаётся не переключателем, а ответами в квизе — как в проде.

Как устроено. Три готовых продукта вставлены целиком, каждый в свой iframe:
квиз, оффер и лист курса. Изоляция нужна не для красоты — у трёх систем свои
`.btn`, `.tile` и `.note`, в одном документе они бы передрались. Оболочка
между ними рисует то, чего нет ни в одном файле: экран покупки, ленту бота
по дням и переходы.

Вариант курса. `kurs.book(goal, sex, place)` собирает восемь связок; здесь
отрисованы все листы разом, а показывается тот, чей ключ совпал с ответами.
Так один файл проверяет все восемь вариантов без пересборки.
"""
import base64
import html as html_mod
import json
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))

import build_bot_sim as sim
from build_course import PLACE_DAYS, for_reader, parse
from data import kurs
from data import programmy
from lib import gold as g
from lib.render import document

ROOT = pathlib.Path(__file__).parent
OUT = ROOT / "out"
QUIZ = ROOT.parent / "quiz-test" / "out" / "kviz-demo.html"
#: Шаблон, а не готовый offer.html: в нём {{name}} и {{type}} ещё
#: не подставлены — путь подставляет их из ответов теста, как это
#: сделает бот.
OFFER = ROOT.parent / "offer-page" / "out" / "offer-template.html"

#: Пол в payload квиза — f/m, в именах файлов курса — zh/m.
SEX = {"f": "zh", "m": "m"}
#: Место в payload — home/gym/any; «ещё не решил» ведёт домой (см. §7.2а
#: спеки бота), но бот сначала переспрашивает. Здесь переспрашивает оболочка.
PLACE = {"home": "dom", "gym": "zal", "any": "dom"}
#: Цель в payload — loss/tone/mass.
GOAL = {"loss": "cut", "tone": "cut", "mass": "gain"}
#: Названия типов старта — как в TYPES квиза. Оффер вставляет их в плашку.
TYPE = {"never": "🌱 Чистый лист", "quit": "⏸ Долгая пауза",
        "onoff": "⚡ Рывками"}


def key(goal: str, sex: str, place: str) -> str:
    return f"{goal}-{sex}-{place}"


def variants() -> dict[str, dict]:
    """Для каждой из восьми связок — порядок листов и лист под каждый день."""
    out = {}
    for goal in kurs.GOALS:
        for sex in kurs.SEXES:
            for place in kurs.PLACES:
                pages = kurs.book(goal=goal, sex=sex, place=place)
                slugs = [p["slug"] for p in pages]
                days = {}
                for p in pages:
                    m = re.match(r"kurs-(\d\d)-", p["slug"])
                    if m and m.group(1) not in ("00", "15", "16"):
                        days[int(m.group(1))] = p["slug"]
                out[key(goal, sex, place)] = {
                    "slugs": slugs, "days": days,
                    "programma": next(s for s in slugs if "programma" in s),
                }
    return out


def sheets_doc() -> str:
    """Документ со всеми листами курса. Показывается один, остальные скрыты."""
    seen: dict[str, list] = {}
    for p in kurs.all_pages():
        seen[p["slug"]] = p["body"] if isinstance(p["body"], list) else [p["body"]]
    blocks = "".join(
        f'<div class="box" data-slug="{slug}">'
        + "".join(f'<div class="fit"><div class="sheet">'
                  f'<div class="stage">{s}</div></div></div>' for s in sheets)
        + "</div>"
        for slug, sheets in seen.items())
    css = g.base_css(g.PHONE) + kurs.WK_CSS + programmy.CSS + """
html,body{background:#08080A;margin:0}
.box{display:none;padding:14px 0 28px;gap:16px;flex-direction:column;
  align-items:center}
.box.on{display:flex}
/* Лист физический, 130 мм — на телефоне это шире экрана. Ужимаем
   трансформом и вручную поджимаем высоту обёртки: transform не меняет
   поток, и без этого внизу осталась бы пустая полоса. */
.fit{position:relative}
.fit .sheet{transform-origin:top left;
  box-shadow:0 18px 60px rgba(0,0,0,.6);border-radius:10px}
"""
    js = """
function fit(){
  var pad = 24;
  document.querySelectorAll('.box.on .fit').forEach(function(w){
    var sh = w.querySelector('.sheet');
    sh.style.transform = 'none';
    var natW = sh.offsetWidth, natH = sh.offsetHeight;
    var k = Math.min(1, (window.innerWidth - pad) / natW);
    sh.style.transform = 'scale(' + k + ')';
    w.style.width = (natW * k) + 'px';
    w.style.height = (natH * k) + 'px';
  });
}
function show(slug){
  document.querySelectorAll('.box').forEach(function(b){
    b.classList.toggle('on', b.dataset.slug === slug);
  });
  fit();
  window.scrollTo(0,0);
}
window.addEventListener('resize', fit);
window.addEventListener('message', function(e){
  if (e.data && e.data.sheet) show(e.data.sheet);
});
"""
    return document(css, blocks + f"<script>{js}</script>", "Листы курса")


def lessons_data() -> list[dict]:
    """Уроки по дням со всеми ветками — фильтрует уже страница."""
    out = []
    for d in parse():
        paras = []
        for goal, sex, place, text in d["lesson"]:
            paras.append({"g": goal, "s": sex, "p": place, "h": text})
        out.append({"n": d["n"], "title": html_mod.unescape(d["title"]),
                    "task": d["task"], "paras": paras,
                    "star": d["star"]})
    return out


def levels_data() -> dict[str, dict]:
    lv = sim.levels()
    return {str(k): {"title": html_mod.unescape(v["title"]),
                     "lines": v["lines"]} for k, v in lv.items()}


def b64(path: pathlib.Path, mime: str) -> str:
    return f"data:{mime};base64," + base64.b64encode(path.read_bytes()).decode()


def shell_fonts() -> str:
    """Manrope и Inter для самой оболочки. Внутри iframe у квиза, оффера
    и курса свои — эти нужны только под хром пути."""
    d = ROOT.parent / "quiz-test" / "fonts"
    faces = []
    for fam, files in (("Manrope", ["manrope-600", "manrope-700", "manrope-800"]),
                       ("Inter", ["inter-400", "inter-500", "inter-600"])):
        for stem in files:
            w = stem.split("-")[1]
            for sub in ("cyrillic", "latin"):
                f = d / f"{stem}-{sub}.woff2"
                if not f.exists():
                    continue
                faces.append(
                    f"@font-face{{font-family:'{fam}';font-style:normal;"
                    f"font-weight:{w};font-display:block;"
                    f"src:url({b64(f, 'font/woff2')}) format('woff2')}}")
    return "".join(faces)


SHELL_CSS = """
:root{--void:#0B0B0C;--plate:#131315;--plate-2:#1B1B1E;--line:#242428;
  --text:#fff;--text-2:#C8C8CE;--text-3:#9A9AA0;--text-4:#6B6B72;
  --accent:#D8232A;--accent-hi:#F4363D}
*{box-sizing:border-box}
body{margin:0;background:var(--void);color:var(--text);
  font:400 15px/1.55 'Inter',system-ui,sans-serif}
h1,h2,h3{font-family:'Manrope',system-ui,sans-serif;margin:0;letter-spacing:-.02em}
.wrap{max-width:560px;margin:0 auto;padding:0 16px 90px}
.top{position:sticky;top:0;z-index:20;background:rgba(11,11,12,.94);
  backdrop-filter:blur(10px);border-bottom:1px solid var(--line)}
.top .in{max-width:560px;margin:0 auto;padding:11px 16px;
  display:flex;align-items:center;gap:12px}
.top b{font:800 14px/1 'Manrope',sans-serif;letter-spacing:-.01em}
.top .who{font:500 11.5px/1.3 'Inter',sans-serif;color:var(--text-4);flex:1}
.top button{background:none;border:1px solid var(--line);color:var(--text-3);
  border-radius:8px;padding:6px 10px;font:600 11.5px 'Inter',sans-serif;cursor:pointer}
.steps{display:flex;gap:4px;padding:0 16px 9px;max-width:560px;margin:0 auto}
.steps i{flex:1;height:3px;border-radius:2px;background:var(--line)}
.steps i.on{background:var(--accent)}
.eyebrow{font:600 11px/1 'Inter',sans-serif;letter-spacing:1.8px;
  text-transform:uppercase;color:var(--text-4)}
.lead{color:var(--text-2);font-size:16px;line-height:1.6}
.card{background:var(--plate);border:1px solid var(--line);border-radius:16px;
  padding:18px 20px;margin-top:14px}
.btn{display:block;width:100%;margin-top:18px;padding:15px 18px;border:0;
  border-radius:13px;background:var(--accent);color:#fff;cursor:pointer;
  font:700 15.5px/1.2 'Manrope',sans-serif;text-align:center}
.btn:hover{background:var(--accent-hi)}
.btn.ghost{background:none;border:1px solid var(--line);color:var(--text-2)}
.frame{width:100%;border:0;border-radius:16px;background:#000;display:block}
.pane{border:1px solid var(--line);border-radius:18px;overflow:hidden;
  margin-top:14px;background:#000}
.msg{margin-top:10px;display:flex}
.msg .bub{max-width:88%;background:var(--plate-2);border-radius:16px 16px 16px 5px;
  padding:12px 15px;font-size:14.5px;line-height:1.55;color:var(--text-2)}
.msg.out{justify-content:flex-end}
.msg.out .bub{background:#2A1416;border-radius:16px 16px 5px 16px;color:#F3D6D8}
.msg .bub p{margin:0 0 9px}
.msg .bub p:last-child{margin:0}
.msg .bub b{color:var(--text)}
.li{display:block}
.tag{display:inline-block;margin-bottom:6px;padding:3px 8px;border-radius:6px;
  background:rgba(216,35,42,.14);color:var(--accent-hi);
  font:600 10.5px/1.3 'Inter',sans-serif;letter-spacing:.3px}
.task{border-left:2px solid var(--accent);padding-left:12px;margin-top:12px}
.task .eyebrow{color:var(--accent-hi)}
.sep{display:flex;align-items:center;gap:10px;margin:26px 0 4px;
  color:var(--text-4);font:600 11.5px 'Inter',sans-serif;letter-spacing:1.2px;
  text-transform:uppercase}
.sep::before,.sep::after{content:"";flex:1;height:1px;background:var(--line)}
.keys{display:flex;gap:7px;margin-top:9px;flex-wrap:wrap}
.keys button{flex:1;min-width:44%;padding:11px 8px;border:1px solid var(--line);
  background:var(--plate);color:var(--text-2);border-radius:10px;cursor:pointer;
  font:600 13px 'Inter',sans-serif}
.keys button:hover{border-color:var(--accent);color:#fff}
.stamp{font-size:26px;margin-bottom:6px}
.level .bub{background:linear-gradient(180deg,#1E1418,#141416);
  border:1px solid rgba(216,35,42,.3)}
.note{color:var(--text-4);font-size:13px;line-height:1.5;margin-top:10px}
.hint{background:var(--plate);border:1px dashed var(--line);border-radius:12px;
  padding:11px 14px;margin-top:14px;color:var(--text-3);font-size:13px;line-height:1.5}
.hint b{color:var(--text-2)}
.pill{display:inline-flex;gap:6px;align-items:center;padding:5px 10px;
  border-radius:999px;background:var(--plate-2);border:1px solid var(--line);
  font:600 11.5px 'Inter',sans-serif;color:var(--text-3);margin:2px 4px 2px 0}
.pill b{color:var(--accent-hi)}
body.nomarks .tag{display:none}
.top button[aria-pressed="true"]{border-color:var(--accent);color:var(--accent-hi)}
.nav2{display:flex;gap:9px;margin-top:18px}
.nav2 .btn{margin-top:0}
"""


# Тексты бота. Взяты дословно из source/bot-integratsiya-Serbolin.md —
# сочинять здесь нельзя, иначе путь покажет не то, что уйдёт в прод.
TXT = {
    "paid": ("<p><b>{name}, ты в деле.</b></p>"
             "<p>Первый урок придёт завтра в 8 утра. Ничего сегодня "
             "не начинай — серьёзно, не начинай. День 1 идёт без диеты "
             "и без зала, и это не подарок, а часть метода: пять изменений "
             "одновременно не выдерживает никто.</p>"
             "<p>Терпение + Дисциплина = Результат. До завтра.</p>"),
    "tz": ("<p>Последнее. В котором часу тебе присылать урок? "
           "Ставлю 8:00 по твоему времени.</p>"),
    "tz_ok": ("<p>Записал. Значит в 8:00 по Москве.</p>"
              "<p>Пока держи обложку и страницу «Перед стартом» — прочитай "
              "сегодня, она короткая. Завтра начинаем.</p>"),
    "done": ("<p>Отметил. {streak} подряд. Так и держим.</p>"),
    "fail": ("<p>Бывает. Ничего не компенсируем и не догоняем: завтра просто "
             "идём по плану. Один пропущенный день ничего не решает, решает "
             "выход из графика на неделю.</p>"),
    # §7.2а спеки бота: «ещё не решил» ведёт домой, но бот переспрашивает.
    "gym_q": ("<p>🏋️ Последнее перед программой. В тесте ты не выбрал, "
              "где будешь заниматься. По умолчанию соберу домашнюю: "
              "ни абонемента, ни оборудования, начать можно сегодня "
              "вечером.</p><p>Но если за эти две недели ты решил идти "
              "в зал — скажи сейчас.</p>"),
    "gym_home": ("<p>Понял, собираю домашнюю. Перейдёшь в зал позже — "
                 "напиши, пришлю зальную, это бесплатно.</p>"),
    "gym_gym": ("<p>Понял, зальная. Если окажется, что до зала пока "
                "не доезжаешь, — напиши, пришлю домашнюю.</p>"),
    "prog": ("<p>Твоя программа тренировок. Она собрана под твои ответы: "
             "место, цель и пол. Нажимай на упражнение — откроется видео "
             "с техникой.</p>"),
    "razbor": ("<p>И последнее. Четырнадцать дней ты писал то, что обычно "
               "не пишет никто: свои сутки, свою тарелку, свой слабый пункт, "
               "три колонки повторов.</p><p>Разбор бесплатный, созвон "
               "30 минут, с документом после. Страница ниже — что именно "
               "разбираем.</p>"),
}


def plural(n: int) -> str:
    if 11 <= n % 100 <= 14:
        return f"{n} дней"
    return f"{n} " + {1: "день", 2: "дня", 3: "дня", 4: "дня"}.get(n % 10, "дней")


def shell_js(data: dict) -> str:
    blob = json.dumps(data, ensure_ascii=False).replace("</", "<\\/")
    return "const D = " + blob + ";\n" + r"""
const $ = s => document.querySelector(s);
let P = null, day = 0, stage = 'start';

function pick(){
  const q = P || {};
  const goal = D.GOAL[q.gl] || 'cut';
  const sex  = D.SEX[q.g]   || 'm';
  const place = P && P.place ? P.place : (D.PLACE[q.pl] || 'dom');
  return {goal, sex, place, key: goal + '-' + sex + '-' + place};
}
function sheet(slug){
  const f = $('#sheets');
  const go = () => f.contentWindow.postMessage({sheet: slug}, '*');
  if (f.dataset.ready) go(); else f.onload = () => { f.dataset.ready = '1'; go(); };
  if (f.dataset.ready) go();
}
function esc(s){ return (s||'').replace(/</g,'&lt;'); }

function paras(d){
  const v = pick();
  const sx = P && P.g === 'm' ? 'm' : 'f';
  const pl = v.place === 'zal' ? 'gym' : 'home';
  return d.paras.filter(p =>
    (!p.g || p.g === v.goal) && (!p.s || p.s === sx) && (!p.p || p.p === pl));
}

function steps(i){
  return '<div class="steps">' +
    [0,1,2,3,4].map(k => '<i class="' + (k <= i ? 'on' : '') + '"></i>').join('') +
    '</div>';
}

function render(){
  const el = $('#app');
  if (stage === 'start') el.innerHTML = viewStart();
  else if (stage === 'quiz') el.innerHTML = viewQuiz();
  else if (stage === 'gymq') el.innerHTML = viewGym();
  else if (stage === 'offer') el.innerHTML = viewOffer();
  else if (stage === 'pay') el.innerHTML = viewPay();
  else if (stage === 'day') el.innerHTML = viewDay();
  else if (stage === 'prog') el.innerHTML = viewProg();
  else if (stage === 'razbor') el.innerHTML = viewRazbor();
  $('#who').textContent = P ? whoLine() : 'ещё не проходил тест';
  window.scrollTo(0, 0);
  wire();
}
function whoLine(){
  const v = pick();
  const g = {cut:'похудение', gain:'набор массы'}[v.goal];
  const s = v.sex === 'm' ? 'мужчина' : 'женщина';
  const p = v.place === 'zal' ? 'зал' : 'дом';
  return (P.n || '') + ' · ' + s + ' · ' + g + ' · ' + p;
}
"""


SHELL_VIEWS = r"""
function viewStart(){
  return steps(0) + '<div class="wrap">' +
  '<p class="eyebrow" style="margin-top:22px">Путь клиента</p>' +
  '<h1 style="font-size:30px;margin-top:10px">От первого экрана теста ' +
  'до заявки на разбор</h1>' +
  '<p class="lead" style="margin-top:12px">Здесь всё, что человек увидит ' +
  'на самом деле, и в том же порядке. Тест настоящий, страница оффера ' +
  'настоящая, уроки и листы — те, что уйдут в бота.</p>' +
  '<div class="card"><p class="eyebrow">Что важно проверить</p>' +
  '<p class="lead" style="font-size:15px;margin-top:8px">Ответы в тесте ' +
  'решают, какой курс человек получит. Пол, цель и место занятий меняют ' +
  'тренировки, питание и программу. Пройди тест как мужчина с набором ' +
  'массы в зале, потом как женщина с похудением дома — материал будет ' +
  'разный.</p>' +
  '<div style="margin-top:12px">' +
  '<span class="pill"><b>8</b> связок ответов</span>' +
  '<span class="pill"><b>25</b> листов у одного</span>' +
  '<span class="pill"><b>45</b> файлов в сборке</span></div></div>' +
  '<button class="btn" data-go="quiz">Начать с теста</button>' +
  '<p class="note">Тест открывается целиком, как в Telegram. ' +
  'Ответишь — путь пойдёт дальше сам.</p></div>';
}

function viewQuiz(){
  return steps(0) + '<div class="wrap">' +
  '<p class="eyebrow" style="margin-top:20px">Шаг 1 · Тест</p>' +
  '<h2 style="font-size:23px;margin-top:8px">Тот же квиз, что в боте</h2>' +
  '<p class="note">Дойди до конца — до экрана с прогнозом. Дальше путь ' +
  'подхватит твои ответы.</p>' +
  '<div class="pane"><iframe class="frame" id="quizf" ' +
  'style="height:78vh;min-height:560px" src="about:blank"></iframe></div>' +
  '<button class="btn ghost" data-skip="1">Пропустить и выбрать вручную</button>' +
  '</div>';
}

function viewGym(){
  return steps(1) + '<div class="wrap">' +
  '<div class="sep">Уточняющий вопрос</div>' +
  '<div class="msg"><div class="bub">' + D.TXT.gym_q + '</div></div>' +
  '<div class="keys"><button data-place="dom">Дома</button>' +
  '<button data-place="zal">В зале</button></div>' +
  '<p class="note">В тесте ты выбрал «ещё не решил». По умолчанию это ' +
  'домашний вариант, но бот один раз переспрашивает — за две недели ' +
  'человек мог собраться в зал.</p></div>';
}

function viewOffer(){
  return steps(1) + '<div class="wrap">' +
  '<p class="eyebrow" style="margin-top:20px">Шаг 2 · Оффер</p>' +
  '<h2 style="font-size:23px;margin-top:8px">Страница, которую бот ' +
  'присылает после теста</h2>' +
  '<p class="note">Три экрана: обложка, что внутри, цена и вопросы. ' +
  'Здесь же результаты учеников и отзывы.</p>' +
  '<div class="pane"><iframe class="frame" id="offerf" ' +
  'style="height:80vh;min-height:600px" src="about:blank"></iframe></div>' +
  '<div class="nav2"><button class="btn ghost" data-go="quiz">Назад в тест</button>' +
  '<button class="btn" data-go="pay">Купить за 1 890 ₽</button></div></div>';
}

function viewPay(){
  const n = (P && P.n) || 'Гость';
  return steps(2) + '<div class="wrap">' +
  '<div class="sep">Покупка</div>' +
  '<div class="msg out"><div class="bub">Хочу курс «Первые шаги к форме»' +
  '</div></div>' +
  '<div class="hint"><b>Что происходит у Эдуарда.</b> Боту падает заявка ' +
  'с кодом и карточкой из теста: имя, тип старта, рост, вес, окна, зона ' +
  'риска. Он называет реквизиты сам и нажимает «Включить курс».</div>' +
  '<div class="msg"><div class="bub">' +
    D.TXT.paid.replace('{name}', esc(n)) + '</div></div>' +
  '<div class="msg"><div class="bub">' + D.TXT.tz + '</div></div>' +
  '<div class="keys"><button data-go="day0">Москва, UTC+3</button></div>' +
  '</div>';
}

function levelBlock(n){
  const lv = D.LEVELS[String(n)];
  if (!lv) return '';
  const name = (P && P.n) || 'Гость';
  const lines = lv.lines.filter(x => !/^<b>\[/.test(x))
    .map(x => '<p>' + x.replace('{{name}}', esc(name)) + '</p>').join('');
  const cta = lv.lines.filter(x => /^<b>\[/.test(x))
    .map(x => '<div class="keys"><button>' +
      x.replace(/<\/?b>|\[|\]/g, '').trim() + '</button></div>').join('');
  return '<div class="msg level"><div class="bub">' +
    '<div class="stamp">' + lv.title + '</div>' + lines + '</div></div>' + cta;
}

function viewDay(){
  const v = pick();
  if (day === 0){
    return steps(3) + '<div class="wrap">' +
    '<div class="sep">До первого урока</div>' +
    '<div class="msg"><div class="bub">' + D.TXT.tz_ok + '</div></div>' +
    sheetPane('kurs-00-oblozhka', 'Обложка курса') +
    sheetPane('kurs-00-oglavlenie', 'Оглавление') +
    sheetPane('kurs-00-pered-startom', 'Перед стартом') +
    '<button class="btn" data-day="1">Утро первого дня</button></div>';
  }
  const d = D.DAYS[day - 1];
  const slug = D.V[v.key].days[day];
  const ps = paras(d).map(p => {
    const tag = p.g || p.s || p.p ? '<span class="tag">' + tagName(p) + '</span>' : '';
    if (/^<b>\[/.test(p.h)) return '';
    return '<p>' + tag + p.h + '</p>';
  }).join('');
  const cta = paras(d).filter(p => /^<b>\[/.test(p.h))
    .map(p => '<div class="keys"><button>' +
      p.h.replace(/<\/?b>|\[|\]/g, '').trim() + '</button></div>').join('');
  const streak = plural(day);
  return steps(3) + '<div class="wrap">' +
  '<div class="sep">День ' + day + ' · ' + esc(d.title) + '</div>' +
  '<div class="msg"><div class="bub">' + ps + '</div></div>' + cta +
  '<div class="msg"><div class="bub"><p class="eyebrow">Задание на сегодня</p>' +
  '<p>' + d.task + '</p></div></div>' +
  sheetPane(slug, 'Лист дня ' + day) +
  '<div class="sep">Вечером, 20:00</div>' +
  '<div class="keys"><button data-checkin="done">Сделал</button>' +
  '<button data-checkin="fail">Не вышло</button></div>' +
  '<div id="checkin"></div>' +
  '<div id="level">' + levelBlock(day) + '</div>' +
  '<div class="nav2">' +
  (day > 1 ? '<button class="btn ghost" data-day="' + (day-1) + '">Назад</button>' : '') +
  (day < 14 ? '<button class="btn" data-day="' + (day+1) + '">День ' + (day+1) + '</button>'
            : '<button class="btn" data-go="prog">Твоя программа</button>') +
  '</div><p class="note">Стрик: ' + streak + ' из 14.</p></div>';
}

function tagName(p){
  const m = {cut:'тем, кто худеет', gain:'тем, кто набирает массу',
             f:'женщинам', m:'мужчинам', home:'тем, кто дома',
             gym:'тем, кто в зале'};
  return [p.g, p.s, p.p].filter(Boolean).map(k => m[k]).join(' · ');
}

function sheetPane(slug, cap){
  return '<div class="card" style="padding:12px"><p class="eyebrow">' + cap +
    '</p><p class="note" style="margin:4px 0 10px">' + slug + '.pdf</p>' +
    '<button class="btn ghost" style="margin-top:0" data-sheet="' + slug +
    '">Открыть лист</button></div>';
}

function viewProg(){
  const v = pick();
  return steps(4) + '<div class="wrap">' +
  '<div class="sep">После четырнадцатого дня</div>' +
  '<div class="msg"><div class="bub">' + D.TXT.prog + '</div></div>' +
  sheetPane(D.V[v.key].programma, 'Программа тренировок') +
  '<button class="btn" data-go="razbor">Дальше</button></div>';
}

function viewRazbor(){
  return steps(4) + '<div class="wrap">' +
  '<div class="sep">Финал</div>' +
  '<div class="msg"><div class="bub">' + D.TXT.razbor + '</div></div>' +
  sheetPane('kurs-16-razbor', 'Разбор под твои цифры') +
  '<div class="keys"><button>Записаться на разбор — созвон 30 минут</button></div>' +
  '<div class="hint"><b>Дальше по плану бота:</b> день 15 — «первый день ' +
  'без урока, как ощущение», день 18 — напоминание про разбор, день 25 — ' +
  '«не буду напоминать больше, дверь открыта».</div>' +
  '<button class="btn ghost" data-go="start">Пройти заново другим ' +
  'человеком</button></div>';
}
"""


SHELL_WIRE = r"""
function wire(){
  document.querySelectorAll('[data-go]').forEach(b => b.onclick = () => {
    const t = b.dataset.go;
    if (t === 'day0'){ stage = 'day'; day = 0; }
    else if (t === 'start'){ P = null; stage = 'start'; day = 0; }
    else stage = t;
    render();
  });
  document.querySelectorAll('[data-day]').forEach(b => b.onclick = () => {
    day = +b.dataset.day; stage = 'day'; render();
  });
  document.querySelectorAll('[data-place]').forEach(b => b.onclick = () => {
    P.place = b.dataset.place;
    $('#who').textContent = whoLine();
    const t = b.dataset.place === 'zal' ? D.TXT.gym_gym : D.TXT.gym_home;
    b.parentElement.outerHTML = '<div class="msg out"><div class="bub">' +
      b.textContent + '</div></div><div class="msg"><div class="bub">' + t +
      '</div></div><button class="btn" data-go="offer">К офферу</button>';
    wire();
  });
  document.querySelectorAll('[data-checkin]').forEach(b => b.onclick = () => {
    const done = b.dataset.checkin === 'done';
    $('#checkin').innerHTML =
      '<div class="msg out"><div class="bub">' + b.textContent + '</div></div>' +
      '<div class="msg"><div class="bub">' +
      (done ? D.TXT.done.replace('{streak}', plural(day)) : D.TXT.fail) +
      '</div></div>';
  });
  document.querySelectorAll('[data-sheet]').forEach(b => b.onclick = () => {
    openSheet(b.dataset.sheet);
  });
  const skip = document.querySelector('[data-skip]');
  if (skip) skip.onclick = manual;
  const qf = $('#quizf');
  if (qf && !qf.dataset.on){ qf.dataset.on = '1'; qf.srcdoc = SRC.quiz; }
  const of = $('#offerf');
  if (of && !of.dataset.on){
    of.dataset.on = '1';
    // Плашку с именем и типом старта подставляет бот. Здесь то же самое,
    // иначе на странице стояло бы демо-имя из автономной сборки.
    of.srcdoc = SRC.offer
      .split('{{name}}').join(esc((P && P.n) || 'Друг'))
      .split('{{type}}').join(D.TYPE[P && P.t] || '🌱 Чистый лист');
  }
}

function openSheet(slug){
  const lb = $('#lb');
  lb.classList.add('on');
  const f = $('#sheets');
  if (!f.dataset.on){
    f.dataset.on = '1';
    f.srcdoc = SRC.sheets;
    f.onload = () => f.contentWindow.postMessage({sheet: slug}, '*');
  } else {
    f.contentWindow.postMessage({sheet: slug}, '*');
  }
  $('#lbcap').textContent = slug + '.pdf';
}

function manual(){
  const opts = [];
  ['m','f'].forEach(g => ['mass','loss'].forEach(gl =>
    ['gym','home'].forEach(pl => opts.push({g, gl, pl}))));
  const names = {m:'Мужчина', f:'Женщина', mass:'набор массы',
                 loss:'похудение', gym:'зал', home:'дом'};
  $('#app').innerHTML = steps(0) + '<div class="wrap">' +
    '<p class="eyebrow" style="margin-top:20px">Без теста</p>' +
    '<h2 style="font-size:23px;margin-top:8px">Восемь связок ответов</h2>' +
    '<p class="note">Тест можно не проходить: выбери связку — путь пойдёт ' +
    'с ней. Цифры прогноза при этом будут пустыми, их считает тест.</p>' +
    '<div class="keys" style="flex-direction:column">' +
    opts.map((o, i) => '<button style="min-width:100%" data-v="' + i + '">' +
      names[o.g] + ' · ' + names[o.gl] + ' · ' + names[o.pl] + '</button>').join('') +
    '</div></div>';
  document.querySelectorAll('[data-v]').forEach(b => b.onclick = () => {
    const o = opts[+b.dataset.v];
    P = {n: 'Гость', g: o.g, gl: o.gl, pl: o.pl};
    stage = 'offer'; render();
  });
}

window.addEventListener('message', e => {
  if (!e.data || e.data.quiz !== 'done') return;
  P = e.data.data;
  stage = (P.pl === 'any') ? 'gymq' : 'offer';
  render();
});
$('#lbx').onclick = () => $('#lb').classList.remove('on');
// Метки веток нужны тебе, а не ученику: они показывают, какой абзац кому
// уходит. Выключи — увидишь ровно то, что придёт человеку в чат.
$('#marks').onclick = () => {
  const on = document.body.classList.toggle('nomarks');
  $('#marks').setAttribute('aria-pressed', String(!on));
};
$('#reset').onclick = () => { P = null; day = 0; stage = 'start'; render(); };
render();
"""

LIGHTBOX_CSS = """
.lb{position:fixed;inset:0;z-index:60;background:rgba(6,6,7,.96);display:none;
  flex-direction:column}
.lb.on{display:flex}
.lb .bar{display:flex;align-items:center;gap:12px;padding:11px 16px;
  border-bottom:1px solid var(--line)}
.lb .bar span{flex:1;font:500 12px 'Inter',sans-serif;color:var(--text-4)}
.lb .bar button{background:none;border:1px solid var(--line);color:var(--text-2);
  border-radius:8px;padding:7px 13px;font:600 12.5px 'Inter',sans-serif;cursor:pointer}
.lb iframe{flex:1;width:100%;border:0;background:#08080A}
"""


def build() -> tuple[str, str]:
    data = {
        "DAYS": lessons_data(),
        "LEVELS": levels_data(),
        "V": variants(),
        "TXT": TXT,
        "SEX": SEX, "PLACE": PLACE, "GOAL": GOAL, "TYPE": TYPE,
    }
    src = {
        "quiz": QUIZ.read_text(encoding="utf-8"),
        "offer": OFFER.read_text(encoding="utf-8"),
        "sheets": sheets_doc(),
    }
    # </script> внутри вставленного HTML закрыл бы внешний тег. Экранируем
    # косую черту — для JSON это тот же символ, для парсера HTML уже нет.
    src_json = json.dumps(src, ensure_ascii=False).replace("</", "<\\/")
    js_plural = ("function plural(n){if(n%100>=11&&n%100<=14)return n+' дней';"
                 "var d={1:'день',2:'дня',3:'дня',4:'дня'}[n%10]||'дней';"
                 "return n+' '+d;}")
    body = f"""
<header class="top"><div class="in">
  <b>Путь клиента</b>
  <span class="who" id="who">ещё не проходил тест</span>
  <button id="marks" type="button" aria-pressed="true">Метки</button>
  <button id="reset" type="button">Заново</button>
</div></header>
<div id="app"></div>
<div class="lb" id="lb">
  <div class="bar"><span id="lbcap"></span>
    <button id="lbx" type="button">Закрыть</button></div>
  <iframe id="sheets" src="about:blank"></iframe>
</div>
<script>
const SRC = {src_json};
{js_plural}
{shell_js(data)}
{SHELL_VIEWS}
{SHELL_WIRE}
</script>
"""
    css = shell_fonts() + SHELL_CSS + LIGHTBOX_CSS
    title = "Воронка Серболина"
    full = document(css, body, title)
    # Артефакт оборачивает файл сам: свой <!doctype>, <html> и <body> здесь
    # не нужны, а <title> нужен — по нему страницу зовут в галерее и в табе.
    inner = f"<title>{title}</title><style>{css}</style>{body}"
    return full, inner


def main() -> None:
    OUT.mkdir(exist_ok=True)
    full, inner = build()
    for name, text in (("put-klienta.html", full),
                       ("put-klienta-artifact.html", inner)):
        f = OUT / name
        f.write_text(text, encoding="utf-8")
        print(f"  {f.name} ({f.stat().st_size / 1024:.0f} КБ)")
    if re.search(r'src="https?://|href="https?://(?!t\.me)', full):
        print("!! остались внешние ссылки")
    else:
        print("Внешних ресурсов нет — CSP артефакта не помешает.")


if __name__ == "__main__":
    main()
