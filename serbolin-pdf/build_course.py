#!/usr/bin/env python3
"""
Интерактивный комплект трипваера — то, что бот раздаёт по дням, собранное
в одну страницу, которую можно прокликать.

    python3 build_course.py

На выходе два файла в out/:

    kurs-14-dney.html            открывается двойным кликом
    kurs-14-dney-artifact.html   то же без обёртки документа — под артефакт

Внутри каждого дня:

* урок — дословно из source/tripvaer-14-dney-Serbolin.md. Тексты спеки
  переносятся как есть, заново их не сочиняют;
* задание дня — оно же уходит в сообщение бота;
* страница дня — тот самый PDF, который бот присылает следом, показанный
  растром из preview/.

Всё встроено в файл: шрифты и картинки в base64, внешних хостов нет. В
артефактах на claude.ai строгий CSP, любой внешний запрос режется, и
страница молча уезжает на системный шрифт. Сборка проверяет результат сама.
"""
import base64
import html
import io
import pathlib
import re

from data import intro as intro_data
from lib import theme

ROOT = pathlib.Path(__file__).parent
SOURCE = ROOT / "source" / "tripvaer-14-dney-Serbolin.md"
PREVIEW = ROOT / "preview"
OUT = ROOT / "out"
# Шрифты берём из квиза: там уже лежат подмножества ровно тех начертаний,
# на которых набрана вся воронка. Второй копии в репозитории не заводим.
FONTS = ROOT.parent / "quiz-test" / "fonts"

FONT_FILES = [
    ("Manrope", 400), ("Manrope", 600), ("Manrope", 700), ("Manrope", 800),
    ("Inter", 400), ("Inter", 500), ("Inter", 600), ("Inter", 700),
    ("JetBrains Mono", 500),
]

PRICE = "1\u2009890 ₽"
SLOGAN = "Терпение + Дисциплина = Результат"
# Бот-калькулятор КБЖУ: кнопка «Посчитать свои КБЖУ» в уроке дня 1. Отсюда
# ссылку берёт и симулятор чата — константа одна на обе сборки. Обнулишь —
# кнопка нарисуется неактивной и подписанной «ссылка не подключена», чтобы
# дырка была видна, а не терялась.
CALC_URL = "https://t.me/MoyaNormaBot"


# ─────────────────────────── разбор спеки ───────────────────────────

# 🛡 без VS16 браузер рисует текстовым начертанием — выходит контурное
# сердечко вместо щита. В PDF это лечит Noto Color Emoji в стеке шрифтов,
# но артефакт зависит от системного шрифта читателя, поэтому здесь
# принудительно просим эмодзи-начертание.
def emoji(ch: str) -> str:
    return ch if "\ufe0f" in ch else ch + "\ufe0f"


def cap(text: str) -> str:
    """Задание в спеке идёт строчной после метки «Задание:» — здесь метка
    отдельная, и предложение должно начинаться с заглавной."""
    return text[:1].upper() + text[1:] if text else text


EMOJI_RE = re.compile(
    "([\U0001F300-\U0001FAFF\u2600-\u27BF\u2B00-\u2BFF])(?!\ufe0f)")


def inline(text: str) -> str:
    """**жирный** и экранированные подчёркивания спеки → HTML.

    Заодно каждому эмодзи дописывается VS16: без него браузер берёт
    текстовое начертание из основного шрифта, и вместо цветной тарелки
    выходит контурный значок.
    """
    text = html.escape(text.strip())
    text = EMOJI_RE.sub(lambda m: m.group(1) + "\ufe0f", text)
    text = text.replace("\\_", "_")
    text = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", text)
    return text


# Абзац урока может уходить только части читателей. В спеке это метка в начале
# строки; здесь она превращается в поле рядом с текстом. Осей две и они
# независимы: цель (питание) и пол (физиология).
GOAL_MARKS = {"[дефицит]": "cut", "[профицит]": "gain"}
SEX_MARKS = {"[ж]": "f", "[м]": "m"}
GOALS = ("cut", "gain")
# Дни, где питание расходится по цели. Тренировки и психология общие.
GOAL_DAYS = (2, 3, 6, 7, 8, 10)
# Дни, где расходится физиология. Их мало намеренно: пол меняет программу
# тренировок и цифры прогноза, а в тексте уроков — почти ничего.
SEX_DAYS = (7,)


def for_reader(lesson: list[tuple[str | None, str | None, str]],
               goal: str, sex: str = "f") -> list[str]:
    """Абзацы урока для одного читателя: общие плюс его собственные."""
    return [html for g, x, html in lesson
            if (g is None or g == goal) and (x is None or x == sex)]


GOAL_LABEL = {"cut": "тем, кто худеет", "gain": "тем, кто набирает массу"}
SEX_LABEL = {"f": "женщинам", "m": "мужчинам"}


def cta(label: str) -> str:
    """Кнопка бота внутри урока. Ссылка есть только у калькулятора КБЖУ."""
    if "КБЖУ" in label and CALC_URL:
        return (f'<p class="cta"><a href="{CALC_URL}" target="_blank" '
                f'rel="noopener">{label}</a></p>')
    return (f'<p class="cta"><span>{label}</span>'
            f'<span class="tbd">ссылка не подключена</span></p>')


def lesson_para(goal: str | None, sex: str | None, body: str) -> str:
    """Абзац урока. Развилка видна прямо в тексте.

    Здесь, в отличие от бота, показываем обе ветки сразу: этот файл нужен,
    чтобы прочитать курс целиком и увидеть, где он расходится. Человеку в
    чат уходит только своя половина.

    Строка вида **[ Посчитать свои КБЖУ ]** — не абзац, а кнопка бота.
    Рисуем её кнопкой и здесь, чтобы читатель видел то же, что увидит
    человек в чате.
    """
    key = re.fullmatch(r"<b>\[(.+?)\]</b>", body.strip())
    if key:
        return cta(key.group(1).strip())
    if goal is None and sex is None:
        return f"<p>{body}</p>"
    tags = [GOAL_LABEL[goal]] if goal else []
    tags += [SEX_LABEL[sex]] if sex else []
    cls = " ".join(x for x in (goal, sex and "sex") if x)
    return (f'<p class="fork {cls}"><span class="tag">{" · ".join(tags)}</span>'
            f"{body}</p>")


def parse() -> list[dict]:
    """Уроки, задания и описания страниц по дням — из markdown спеки.

    Абзац урока приходит парой «цель, текст»: None — общий для всех,
    cut — только худеющим, gain — только набирающим массу.
    """
    lines = SOURCE.read_text(encoding="utf-8").split("\n")
    days: list[dict] = []
    cur: dict | None = None
    mode = None

    for ln in lines:
        m = re.match(r"^## День (\d+)\. (.+?)\s*$", ln)
        if m:
            title = m.group(2)
            cur = {
                "n": int(m.group(1)),
                # Звезда у дня 12 стоит прямо в заголовке спеки — вытаскиваем
                # её в отдельное поле, чтобы не тащить в вёрстку название.
                "title": title.replace("⭐", "").strip(),
                "star": "⭐" in title,
                "lesson": [], "task": "", "sheet": "",
            }
            days.append(cur)
            mode = None
            continue
        if cur is None:
            continue

        if ln.startswith("**Урок:**"):
            mode = "lesson"
        elif ln.startswith("**Задание:**"):
            cur["task"] = cap(inline(ln.split("**", 2)[2].lstrip(": ")))
            mode = None
        elif ln.startswith("**PDF-страница:**") or ln.startswith("**PDF:**"):
            cur["sheet"] = cap(inline(ln.split("**", 2)[2].lstrip(": ")))
            mode = None
        elif mode == "lesson" and ln.startswith(">"):
            para = ln.lstrip("> ").strip()
            if not para:
                continue
            goal = sex = None
            # Меток может быть две подряд: «[профицит] [ж] …».
            for marks, setter in ((GOAL_MARKS, "goal"), (SEX_MARKS, "sex")):
                for mark, code in marks.items():
                    if para.startswith(mark):
                        para = para[len(mark):].strip()
                        if setter == "goal":
                            goal = code
                        else:
                            sex = code
                        break
            # Строки списка продуктов («• Курица») склеиваются в один абзац
            # через перенос: в чате и на странице должен получиться столбик,
            # а не десяток отдельных абзацев с интервалами между ними.
            # Метку цели строка списка наследует у абзаца, под которым идёт, —
            # писать её в каждом пункте было бы шумно.
            if para.startswith("•"):
                item = inline(para.lstrip("• ").strip())
                prev = cur["lesson"][-1] if cur["lesson"] else None
                if prev:
                    goal = goal if goal is not None else prev[0]
                    sex = sex if sex is not None else prev[1]
                if (prev and prev[2].startswith('<span class="li">')
                        and prev[:2] == (goal, sex)):
                    cur["lesson"][-1] = (goal, sex,
                                         prev[2] + f'<span class="li">{item}</span>')
                else:
                    cur["lesson"].append((goal, sex, f'<span class="li">{item}</span>'))
            else:
                cur["lesson"].append((goal, sex, inline(para)))

    if len(days) != 14:
        raise SystemExit(f"в спеке найдено {len(days)} дней вместо 14")

    # Развилка по цели живёт в шести днях питания. Если метка потеряется при
    # правке текста, набирающий массу молча получит урок худеющего — поймать
    # это глазами почти невозможно, поэтому проверяем на сборке.
    #
    # Требуем не обе ветки, а хотя бы одну: дням 8 и 10 общий текст подходит
    # худеющему как есть, и набор просто дописывает к нему абзац. А вот метка
    # в дне, который сборки не разводят, — точно ошибка: её никто не покажет.
    for n, d in enumerate(days, 1):
        for axis, idx, allowed in (("по цели", 0, GOAL_DAYS), ("по полу", 1, SEX_DAYS)):
            marks = {m[idx] for m in d["lesson"] if m[idx]}
            if n in allowed and not marks:
                raise SystemExit(f"день {n}: развилка {axis} пропала")
            if n not in allowed and marks:
                raise SystemExit(
                    f"день {n}: метка {axis} {marks} есть, а день не в списке")
    return days


# ─────────────────────────── встраивание ───────────────────────────

def font_css() -> str:
    faces = []
    for name, weight in FONT_FILES:
        slug = name.lower().replace(" ", "-")
        for subset in ("cyrillic", "latin"):
            path = FONTS / f"{slug}-{weight}-{subset}.woff2"
            if not path.exists():
                raise SystemExit(f"нет шрифта {path} — прогони quiz-test/build_quiz_demo.py")
            b64 = base64.b64encode(path.read_bytes()).decode("ascii")
            faces.append(
                f"@font-face{{font-family:'{name}';font-style:normal;"
                f"font-weight:{weight};font-display:swap;"
                f"src:url(data:font/woff2;base64,{b64}) format('woff2')}}"
            )
    return "".join(faces)


# Суффикс страниц под набор массы. Вынесен в константу, потому что по нему
# фильтруют глоб сразу в двух сборках: дефис сортируется раньше точки, и без
# фильтра `tripvaer-03-...-nabor.png` встаёт первым и подменяет основную версию.
GAIN_SUFFIX = "-nabor"


def sheet_slug(day: int, goal: str = "cut") -> str:
    """Имя растра страницы дня.

    Для дня 0 маска `tripvaer-00-*` поймала бы ещё и обложки комплекта
    (`-oblozhka`, `-oblozhka-horizon`), поэтому у него имя задано явно.
    """
    if day == 0:
        return "tripvaer-00-pered-startom"
    want_gain = goal == "gain"
    hits = sorted(
        h for h in PREVIEW.glob(f"tripvaer-{day:02d}-*.png")
        if h.stem.endswith(GAIN_SUFFIX) == want_gain
    )
    if not hits:
        what = "под набор массы " if want_gain else ""
        raise SystemExit(f"нет превью {what}дня {day} — прогони preview.py")
    return hits[0].stem


def sheet_png(day: int) -> str:
    """Растр страницы дня в base64. A4 ужимаем — на экране он вдвое шире нужного."""
    path = PREVIEW / f"{sheet_slug(day)}.png"
    if not path.exists():
        raise SystemExit(f"нет превью {path.name} — прогони preview.py")
    raw = path.read_bytes()
    try:
        from PIL import Image
        img = Image.open(io.BytesIO(raw))
        if img.width > 820:
            h = round(img.height * 820 / img.width)
            img = img.resize((820, h), Image.LANCZOS)
            buf = io.BytesIO()
            img.save(buf, "PNG", optimize=True)
            raw = buf.getvalue()
    except ImportError:
        pass                      # без pillow просто отдаём как есть
    return "data:image/png;base64," + base64.b64encode(raw).decode("ascii")


# ─────────────────────────── вёрстка ───────────────────────────

CSS = f"""
:root{{
  --void:{theme.VOID}; --plate:{theme.PLATE}; --card:{theme.PLATE_2}; --raised:#26262A;
  --accent:{theme.ACCENT}; --accent-hi:{theme.ACCENT_HI};
  --accent-deep:{theme.ACCENT_DEEP}; --accent-field:{theme.ACCENT_FIELD};
  --text:{theme.D_TEXT}; --text-2:{theme.D_TEXT_2};
  --text-3:{theme.D_TEXT_3}; --text-4:{theme.D_TEXT_4};
  --line:rgba(255,255,255,.07); --line-2:rgba(255,255,255,.12);
  --r:16px; --r-lg:20px; --r-xl:28px;
}}
*,*::before,*::after{{box-sizing:border-box}}
body{{margin:0;background:var(--void);color:var(--text-2);
  font:400 16px/1.6 'Inter','Manrope',sans-serif;-webkit-font-smoothing:antialiased}}
h1,h2,h3{{font-family:'Manrope',sans-serif;font-weight:800;color:var(--text);
  letter-spacing:-.04em;line-height:1.06;margin:0}}
b,strong{{color:var(--text);font-weight:700}}
img{{max-width:100%;display:block}}

.eyebrow{{font:600 11px/1 'Inter',sans-serif;letter-spacing:.2em;
  text-transform:uppercase;color:var(--accent-hi)}}
.mono{{font-family:'JetBrains Mono',ui-monospace,monospace;font-weight:500}}

/* ── обложка: «Клин слева» из раздела «Геометрия» ───────────────── */
.hero{{position:relative;overflow:hidden;isolation:isolate;
  padding:64px 40px 56px;border-bottom:1px solid var(--line)}}
.hero::before{{content:"";position:absolute;inset:0;z-index:-1;
  background:var(--accent-field);clip-path:polygon(0 0,32% 0,6% 100%,0 100%)}}
.hero::after{{content:"";position:absolute;inset:0;z-index:-1;
  background:var(--accent-deep);opacity:.55;
  clip-path:polygon(25% 0,32% 0,6% 100%,-1% 100%)}}
.hero-in{{max-width:1180px;margin:0 auto;padding-left:34%}}
.brand{{display:flex;align-items:center;gap:14px;margin-bottom:38px}}
.brand img{{width:46px;height:46px;border-radius:50%}}
.brand .bt{{font-weight:700;color:var(--text);line-height:1.25;font-size:15px}}
.brand .bt span{{display:block;font-weight:400;color:var(--text-4);font-size:13px}}
.hero h1{{font-size:clamp(38px,6vw,68px);margin:18px 0 0}}
.hero .sub{{max-width:520px;margin:20px 0 0;color:var(--text-2)}}
.hero .meta{{display:flex;gap:34px;align-items:baseline;margin-top:34px;flex-wrap:wrap}}
.hero .price{{font-family:'Manrope',sans-serif;font-weight:800;font-size:34px;
  letter-spacing:-.04em;color:var(--text)}}
.hero .price span{{display:block;font-size:13px;font-weight:400;
  letter-spacing:0;color:var(--text-3);margin-top:6px;max-width:44ch}}
.hero .price span s{{color:var(--text-4);margin-right:5px}}
.hero .slogan{{font-family:'Manrope',sans-serif;font-weight:800;
  letter-spacing:-.02em;color:var(--text);font-size:16px}}

/* ── раскладка ──────────────────────────────────────────────────── */
.wrap{{max-width:1180px;margin:0 auto;padding:40px;
  display:grid;grid-template-columns:250px 1fr;gap:40px;align-items:start}}

.rail{{position:sticky;top:24px}}
.lvl{{margin-bottom:22px}}
.lvl .lh{{display:flex;align-items:center;gap:9px;margin-bottom:10px}}
.lvl .lh .nm{{font:600 12px/1 'Inter',sans-serif;letter-spacing:.16em;
  text-transform:uppercase;color:var(--text-4)}}
.lvl.on .lh .nm{{color:var(--accent-hi)}}
.rail button{{display:flex;align-items:baseline;gap:10px;width:100%;
  padding:9px 12px;border:0;border-radius:10px;background:transparent;
  color:var(--text-3);font:inherit;font-size:14px;text-align:left;
  cursor:pointer;transition:background .15s,color .15s}}
.rail button:hover{{background:var(--plate);color:var(--text)}}
.rail button.on{{background:var(--raised);color:var(--text)}}
.rail button .d{{font-family:'JetBrains Mono',monospace;font-size:12px;
  color:var(--text-4);flex:0 0 22px}}
.rail button.on .d{{color:var(--accent-hi)}}

/* ── день ───────────────────────────────────────────────────────── */
.day{{display:none}}
.day.on{{display:block;animation:in .22s cubic-bezier(.2,.8,.2,1) both}}
@keyframes in{{from{{opacity:0;transform:translateY(8px)}}to{{opacity:1;transform:none}}}}

.chip{{display:inline-flex;align-items:center;gap:8px;padding:7px 14px;
  border-radius:999px;background:rgba(216,35,42,.14);
  border:1px solid rgba(216,35,42,.45);color:var(--accent-hi);
  font:700 12px/1 'Inter',sans-serif}}
.day h2{{font-size:clamp(28px,4vw,42px);margin:18px 0 0}}
.dn{{font-family:'JetBrains Mono',monospace;font-size:13px;
  color:var(--text-4);margin-top:16px}}
.dn b{{color:var(--accent-hi);font-weight:500}}

.lesson{{margin-top:26px;max-width:66ch}}
.lesson p{{margin:0 0 15px}}
.lesson p.fork{{border-left:2px solid var(--line-2);padding-left:15px;margin-left:1px}}
.lesson p.fork.gain{{border-left-color:var(--accent)}}
.lesson p.fork.sex{{border-left-style:dashed}}
.lesson p.fork .tag{{display:block;font:600 10px/1 'Inter',sans-serif;letter-spacing:1.6px;text-transform:uppercase;color:var(--text-4);margin-bottom:7px}}
.lesson p.fork.gain .tag{{color:var(--accent-hi)}}
/* Столбик продуктов: строки идут плотнее обычных абзацев, с алой точкой. */
.lesson .li{{display:block;padding-left:16px;position:relative;line-height:1.75}}
.lesson .li::before{{content:"";position:absolute;left:2px;top:.72em;width:5px;height:5px;
  border-radius:999px;background:var(--accent)}}
.lesson p:first-child{{font-size:19px;line-height:1.5;color:var(--text)}}
.lesson p.cta{{margin:20px 0 15px}}
.lesson p.cta a,.lesson p.cta span{{display:inline-block;padding:12px 22px;
  border-radius:999px;font-weight:600;font-size:15px;text-decoration:none;
  background:var(--accent);color:#fff}}
.lesson p.cta a:hover{{background:var(--accent-hi)}}
.lesson p.cta span{{background:transparent;color:var(--text-4);
  border:1px dashed var(--line-2)}}
.lesson p.cta .tbd{{display:block;margin-top:7px;padding:0;border:0;
  font:400 12px/1 'Inter',sans-serif;color:var(--text-4)}}

.task{{margin-top:30px;background:var(--plate);border-radius:var(--r);
  padding:22px 24px;border-left:3px solid var(--accent)}}
.task .eyebrow{{display:block;margin-bottom:10px}}
.task p{{margin:0;color:var(--text-2)}}

/* ── «Перед стартом»: три опоры, врезка, подпись ─────────────────── */
.pillars{{margin-top:28px;display:flex;flex-direction:column;gap:16px}}
.pillars .eyebrow{{display:block;margin-bottom:2px}}
.pil{{display:flex;gap:14px;align-items:flex-start}}
.pil .pn{{flex:0 0 24px;height:24px;border-radius:999px;background:var(--accent);
  color:#fff;font:500 12px/24px 'JetBrains Mono',monospace;text-align:center}}
.pil b{{display:block;margin-bottom:4px;font-size:17px}}
.pil p{{margin:0;max-width:60ch}}
.pullq{{margin:30px 0;padding:0 0 0 18px;border-left:3px solid var(--accent);
  font:800 21px/1.32 'Manrope',sans-serif;letter-spacing:-.03em;
  color:var(--text);max-width:44ch}}
.after p{{margin:0 0 15px;max-width:66ch}}
.sign{{margin-top:30px;padding-top:16px;border-top:1px solid var(--line-2);
  font:800 17px/1.3 'Manrope',sans-serif;letter-spacing:-.02em;color:var(--text)}}
.day.intro .chip{{background:transparent;border-color:var(--line-2);
  color:var(--text-3)}}

.sheet{{margin-top:34px}}
.sheet .cap{{display:flex;justify-content:space-between;align-items:baseline;
  gap:16px;flex-wrap:wrap;margin-bottom:14px}}
.sheet .what{{color:var(--text-4);font-size:14px;max-width:58ch}}
.sheet .frame{{background:var(--card);border-radius:var(--r-lg);padding:18px;
  border:1px solid var(--line);max-width:520px}}
.sheet .frame img{{border-radius:8px;width:100%}}
.sheet .file{{margin-top:12px;color:var(--text-4);font-size:12.5px}}

.foot{{max-width:1180px;margin:0 auto;padding:0 40px 60px;color:var(--text-4);
  font-size:13.5px;border-top:1px solid var(--line);padding-top:26px}}

@media (max-width:900px){{
  .hero{{padding:38px 20px 40px}}
  .hero::before{{clip-path:polygon(0 0,14% 0,3% 100%,0 100%)}}
  .hero::after{{clip-path:polygon(11% 0,14% 0,3% 100%,0 100%)}}
  .hero-in{{padding-left:16%}}
  .wrap{{grid-template-columns:1fr;gap:26px;padding:26px 20px}}
  .rail{{position:static;display:flex;gap:8px;overflow-x:auto;
    padding-bottom:6px;-webkit-overflow-scrolling:touch}}
  .lvl{{margin:0;flex:0 0 auto}}
  .lvl .lh{{display:none}}
  .rail .days{{display:flex;gap:8px}}
  .rail button{{width:auto;white-space:nowrap;background:var(--plate)}}
  .foot{{padding:26px 20px 50px}}
}}
"""

JS = """
(function(){
  var days = [].slice.call(document.querySelectorAll('.day'));
  var btns = [].slice.call(document.querySelectorAll('.rail button'));
  function show(n){
    days.forEach(function(d){ d.classList.toggle('on', d.dataset.day === n); });
    btns.forEach(function(b){ b.classList.toggle('on', b.dataset.day === n); });
    document.querySelectorAll('.lvl').forEach(function(l){
      l.classList.toggle('on', !!l.querySelector('button.on'));
    });
    try { history.replaceState(null, '', '#den-' + n); } catch (e) {}
  }
  btns.forEach(function(b){
    b.addEventListener('click', function(){
      show(b.dataset.day);
      if (window.matchMedia('(max-width:900px)').matches) {
        document.querySelector('.wrap').scrollIntoView({behavior:'smooth', block:'start'});
      }
    });
  });
  // Стрелками — как листают уроки в боте.
  document.addEventListener('keydown', function(e){
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    var i = btns.findIndex(function(b){ return b.classList.contains('on'); });
    var next = i + (e.key === 'ArrowRight' ? 1 : -1);
    if (next >= 0 && next < btns.length) show(btns[next].dataset.day);
  });
  var m = (location.hash || '').match(/^#den-(\\d+)$/);
  show(m && +m[1] >= 0 && +m[1] <= 14 ? m[1] : '0');
})();
"""


def avatar_b64() -> str:
    raw = (ROOT / "assets" / "avatar.png").read_bytes()
    return "data:image/png;base64," + base64.b64encode(raw).decode("ascii")


def intro_pane() -> str:
    """Первая вкладка — та же страница «Перед стартом», что и в PDF.

    Текст берётся из data/intro.py, второй копии здесь нет: разъедется.
    """
    d = intro_data
    rows = "".join(
        f'<div class="pil"><span class="pn">{i}</span>'
        f"<div><b>{name}</b><p>{text}</p></div></div>"
        for i, (name, text) in enumerate(d.PILLARS, 1)
    )
    after = "".join(f"<p>{para}</p>" for para in d.AFTER)
    slug = sheet_slug(0)
    return f"""
<article class="day intro" data-day="0">
  <span class="chip">Перед стартом</span>
  <div class="dn">До первого урока</div>
  <h2>{d.TITLE}</h2>
  <div class="lesson">
    <p>{d.LEAD}</p>
    <p>{d.BEFORE}</p>
  </div>
  <div class="pillars">
    <span class="eyebrow">{d.PILLARS_LABEL}</span>
    {rows}
  </div>
  <blockquote class="pullq">{d.PULL}</blockquote>
  <div class="after">{after}</div>
  <div class="sign">{d.SIGN}</div>
  <div class="sheet">
    <div class="cap"><span class="eyebrow">Страница дня</span></div>
    <div class="frame"><img src="{sheet_png(0)}" alt="Страница «Перед стартом»"></div>
    <div class="file mono">{slug}.pdf — бот присылает её перед первым уроком</div>
  </div>
</article>"""


def build_body(days: list[dict]) -> str:
    rail = ['<div class="lvl"><div class="days">'
            '<button data-day="0"><span class="d">00</span>'
            '<span>Перед стартом</span></button></div></div>']
    for lv in theme.LEVELS:
        lo, hi = lv["days"]
        items = "".join(
            f'<button data-day="{d["n"]}"><span class="d">{d["n"]:02d}</span>'
            f'<span>{html.escape(d["title"])}</span></button>'
            for d in days if lo <= d["n"] <= hi
        )
        rail.append(
            f'<div class="lvl"><div class="lh"><span>{emoji(lv["emoji"])}</span>'
            f'<span class="nm">{lv["name"]}</span></div>'
            f'<div class="days">{items}</div></div>'
        )

    panes = [intro_pane()]
    for d in days:
        lv = theme.level_for_day(d["n"])
        lesson = "".join(lesson_para(*m) for m in d["lesson"])
        star = " " + emoji("⭐") if d["star"] else ""
        slug = sheet_slug(d["n"])
        panes.append(f"""
<article class="day" data-day="{d['n']}">
  <span class="chip">{emoji(lv["emoji"])} Уровень {lv["n"]} · {lv["name"]}</span>
  <div class="dn">День <b>{d['n']}</b> из 14</div>
  <h2>{html.escape(d['title'])}{star}</h2>
  <div class="lesson">{lesson}</div>
  <div class="task">
    <span class="eyebrow">Задание на сегодня</span>
    <p>{d['task']}</p>
  </div>
  <div class="sheet">
    <div class="cap">
      <span class="eyebrow">Страница дня</span>
      <span class="what">{d['sheet']}</span>
    </div>
    <div class="frame"><img src="{sheet_png(d['n'])}" alt="Страница дня {d['n']}"></div>
    <div class="file mono">{slug}.pdf — этот файл бот присылает следом за уроком</div>
  </div>
</article>""")

    return f"""
<header class="hero">
  <div class="hero-in">
    <div class="brand">
      <img src="{avatar_b64()}" alt="">
      <div class="bt">Эдуард Серболин<span>онлайн-тренер</span></div>
    </div>
    <div class="eyebrow">Курс · 14 дней</div>
    <h1>Первые шаги<br>к форме</h1>
    <p class="sub">14 дней — с чего начать и как не бросить. Каждое утро бот
    присылает урок, задание и страницу дня в PDF. Вечером — чек-ин одной
    кнопкой: сделал или не вышло.</p>
    <div class="meta">
      <div class="price">{PRICE}<span>один раз, навсегда твоё · без подписки и доплат</span></div>
      <div class="slogan">{SLOGAN}</div>
    </div>
  </div>
</header>

<div class="wrap">
  <nav class="rail">{''.join(rail)}</nav>
  <main>{''.join(panes)}</main>
</div>

<footer class="foot">
  Страницы дней — те самые PDF из <span class="mono">serbolin-pdf/out/</span>,
  которые бот отправляет вместе с уроком. Тёмные листы читают и запоминают,
  светлые заполняют ручкой.
</footer>"""


def main() -> None:
    days = parse()
    print(f"  разобрано дней: {len(days)}")
    body = build_body(days)
    style = f"<style>{font_css()}{CSS}</style>"
    OUT.mkdir(exist_ok=True)

    page = (
        '<!doctype html><html lang="ru"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1">'
        "<title>Первые шаги к форме</title>"
        f"{style}</head><body>{body}<script>{JS}</script></body></html>"
    )
    full = OUT / "kurs-14-dney.html"
    full.write_text(page, encoding="utf-8")
    print(f"  {full.name} ({full.stat().st_size // 1024} КБ)")

    # Артефакт получает страницу без обёртки документа: claude.ai сам
    # надевает <!doctype>/<head>/<body>. <title> оставляем — по нему
    # называется вкладка, и он ищется в первых 8 КБ файла.
    art = OUT / "kurs-14-dney-artifact.html"
    art.write_text(
        "<title>Первые шаги к форме</title>\n"
        f"{style}\n{body}\n<script>{JS}</script>",
        encoding="utf-8",
    )
    print(f"  {art.name} ({art.stat().st_size // 1024} КБ)")

    # Ищем то, что страница грузит. Ссылка в <a> — переход по клику, а не
    # загрузка: CSP её не режет, поэтому она считается отдельно.
    links: list[str] = []
    for f in (full, art):
        text = f.read_text(encoding="utf-8")
        tags = re.findall(r'<(\w+)[^>]*?(?:src|href)="(?!data:|#)([^"]+)"', text)
        outside = [u for tag, u in tags if tag.lower() != "a"]
        links += [u for tag, u in tags if tag.lower() == "a"]
        if outside:
            raise SystemExit(f"{f.name}: внешние ресурсы {outside[:3]} — CSP их срежет")
    print("Внешних ресурсов нет — CSP артефакта не помешает.")
    for u in dict.fromkeys(links):
        print("  ссылка по клику:", u)


if __name__ == "__main__":
    main()
