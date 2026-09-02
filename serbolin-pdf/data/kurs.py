"""
Содержимое курса «Первые шаги к форме» — тёмная золотая версия.

Тексты перенесены из канвы Claude Design, которую утвердил владелец
(`Курс - Первые шаги к форме.dc.html`), а она, в свою очередь, собрана из
спеки `source/tripvaer-14-dney-Serbolin.md`. Сочинять здесь ничего нельзя:
если текст меняется, он меняется в спеке, а сюда переносится.

Что изменилось против канвы, и почему:

* холст ушёл с #222222 на #08080A, плитки собраны из стекла — просьба
  владельца «больше файлов в тёмном премиальном цвете»;
* появились фотографии из лендинга: обложка, четыре разделителя уровней,
  страница разбора и «точка А → точка Б». Раньше на их месте стояли
  пустые слоты;
* эмодзи уровней (🔍 ⚙️ 🧩 🛡) заменены штриховыми иконками. Так в канве,
  и на тёмном листе эмодзи выглядели чужеродно;
* заголовок обложки набран Bebas прописными. Это единственное место, где
  правило «sentence case в заголовках» отступает: обложка работает как
  марка, а не как заголовок.

Страницы дней не персонализируются: род нейтральный, имени нет. Персональные
данные живут в лид-магните, у него своя сборка.
"""
from build_course import CALC_URL
from data import atlas
from data import programmy
from lib import blocks as b
from lib import gold as g

PHOTO = "../assets/photo"
AVATAR = "../assets/avatar.png"

SLOGAN = "Терпение + Дисциплина = Результат"


# ─────────────────────────── обложка ───────────────────────────

def cover() -> dict:
    lv = "".join(
        f'<div class="tile" style="padding:26px 28px">'
        f'<div style="display:flex;align-items:center;gap:16px;margin-bottom:14px">'
        f'{b.icon(l["icon"], 30)}'
        f'<span style="font-family:\'Intro\',sans-serif;font-size:17px;letter-spacing:2.4px;'
        f'text-transform:uppercase;color:{g.TEXT_4}">Уровень {l["n"]}</span></div>'
        f'<div style="font-size:30px;font-weight:700;line-height:1.2">{l["name"]}</div>'
        f'<div class="small" style="margin-top:8px">дни {l["days"][0]}–{l["days"][1]}</div>'
        f'</div>'
        for l in g.LEVELS)

    body = f"""
<div style="position:relative;height:760px;flex:none">
  {b.photo(f"{PHOTO}/eduard-zal.webp", 760, pos="center 22%", style="border-radius:0;box-shadow:none")}
  <div style="position:absolute;top:56px;left:{g.PAD}px;right:{g.PAD}px;
              display:flex;align-items:center;gap:20px">
    <img src="{AVATAR}" style="width:74px;height:74px;border-radius:50%;
         border:2px solid {g.GOLD_EDGE}">
    <div>
      <div class="eyebrow">Эдуард Серболин</div>
      <div class="eyebrow mute" style="margin-top:7px">онлайн-тренер</div>
    </div>
  </div>
</div>

<div class="pad" style="margin-top:-96px;position:relative">
  <div class="eyebrow" style="letter-spacing:6px">Курс · 14 дней</div>
  <div class="wordmark" style="margin-top:26px">Первые шаги<br>к форме</div>
  <div class="lead" style="margin-top:28px;max-width:840px">
    Четырнадцать дней, после которых не надо начинать заново с понедельника.
    Один короткий урок в день и одно действие.
  </div>

  <div class="bento two" style="margin-top:52px">{lv}</div>

  <div class="tile gold" style="margin-top:26px;padding:30px 34px">
    <div style="display:flex;align-items:baseline;justify-content:space-between;gap:26px">
      <div class="cap" style="margin-bottom:0;font-size:19px">Твои 14 дней</div>
      <div style="font-family:'Intro',sans-serif;font-size:17px;letter-spacing:2.2px;
           text-transform:uppercase;color:{g.GOLD}">{SLOGAN}</div>
    </div>
    {b.fields(["Старт", "Финиш"], cols=2)}
    <div class="note" style="margin-top:14px">Впиши обе даты прямо сейчас, до первого
      урока. Курс без даты старта откладывается на понедельник, которого не будет.</div>
  </div>
</div>
"""
    return {"slug": "kurs-00-oblozhka", "body": body, "chrome": False}


# ─────────────────────────── оглавление ───────────────────────────

_TOC = {
    1: [("00", "Перед стартом · дело не в силе воли"), ("01", "Аудит режима"),
        ("02", "Тарелка из трёх элементов"), ("03", "Вода и жидкие калории")],
    2: [("04", "Первая тренировка"), ("05", "День без тренировки — тоже часть плана"),
        ("06", "Голодать — не нужно"), ("07", "Первый чекпоинт")],
    3: [("08", "Питание на три дня вперёд"), ("09", "Вторая тренировка + замер"),
        ("10", "«Вредная еда» без запретов")],
    4: [("11", "Тренировка, когда некогда"), ("12", "Как не бросить"),
        ("13", "Третья тренировка — тест прогресса"), ("14", "Точка А → Точка Б")],
}


def toc() -> dict:
    cards = []
    for lv in g.LEVELS:
        items = "".join(
            f'<div style="display:flex;gap:20px;padding:10px 0;border-top:1px solid {g.LINE_SOFT}">'
            f'<span class="mono" style="color:{g.GOLD};flex:none">{n}</span>'
            f'<span style="font-size:27px;line-height:1.3">{t}</span></div>'
            for n, t in _TOC[lv["n"]])
        cards.append(
            f'<div class="tile" style="padding:22px 28px">'
            f'<div style="display:flex;align-items:center;gap:16px;margin-bottom:14px">'
            f'{b.icon(lv["icon"], 32)}'
            f'<span style="font-family:\'Intro\',sans-serif;font-size:18px;letter-spacing:2.6px;'
            f'text-transform:uppercase;color:{g.GOLD}">Уровень {lv["n"]} · {lv["name"]}</span></div>'
            f'{items}</div>')

    body = f"""
{b.head("Оглавление", "25 листов")}
<div class="content pad" style="padding-top:40px">
  <h2>Что будет за 14 дней</h2>
  <div class="lead" style="margin-top:16px;max-width:840px">
    Один урок и одно действие в день. Четыре уровня, каждый следующий
    опирается на предыдущий.
  </div>
  <div class="bento" style="margin-top:28px;gap:16px">{"".join(cards)}</div>
  <div class="note" style="margin-top:20px">После четырнадцатого дня — твоя
    программа тренировок и разбор под твои цифры.</div>
</div>
{b.foot()}
"""
    return {"slug": "kurs-00-oglavlenie", "body": body}


# ─────────────────────────── перед стартом ───────────────────────────

def intro() -> dict:
    """Два листа: на одном всё это не помещается, а резать текст нельзя —
    он из спеки."""
    three = b.numlist(cols=1, items=[
        ("Привычка",
         "Действие, которое больше не требует решения. Пока каждый шаг решаешь "
         "заново, ты платишь за него силой воли. А она к вечеру кончается, "
         "и вечер выигрывает."),
        ("Мышление",
         "Фраза, которая приходит в голову после плохого дня. «Ну всё, опять не "
         "получилось», и две недели вне плана. «День закрыт, дальше по плану», "
         "и завтра продолжается. Между этими двумя вечерами и лежит весь результат."),
        ("Дисциплина",
         "Расписание, в котором нужное действие стоит в удобное время. Тогда себя "
         "не надо заставлять, а долго заставлять не выходит ни у кого."),
    ])

    sheet1 = f"""
{b.head("Перед стартом", "00 / 14")}
<div class="content pad" style="padding-top:26px">
  <h2>Дело не в силе воли</h2>
  <div class="lead" style="margin-top:16px;max-width:860px">
    Кто-то начинает с нуля, кто-то возвращается после перерыва. Вопрос один:
    с чего начать, чтобы не бросить.
  </div>
  <div style="margin-top:24px">
    {b.plate("Планы ломаются от нестыковки: план требует тренировку в 19:00, "
             "а в 19:00 ты забираешь ребёнка. План был хороший, просто "
             "не про твою жизнь.")}
  </div>
  <div class="tile" style="margin-top:22px;padding:30px 34px">
    <div class="cap">На чём держится результат</div>
    {three}
  </div>
</div>
{b.foot()}
"""

    sheet2 = f"""
{b.head("Перед стартом", "00 / 14")}
<div class="content pad" style="padding-top:26px">
  <div class="tile gold">
    <div style="font-size:34px;font-weight:700;line-height:1.3">
      Мотивации хватает ненадолго. Дальше работает только то,
      что встроено в день.
    </div>
  </div>

  <div class="body" style="margin-top:24px;max-width:900px;font-size:33px">
    Мотивационных речей по утрам не будет. Будет один урок и одно действие
    в день: небольшое, которое реально сделать сегодня. За две недели из них
    собирается система, которая держит уже без силы воли.
  </div>
  <div class="body" style="margin-top:18px;max-width:900px;font-size:33px;color:{g.TEXT_3}">
    Дойди до четырнадцатого дня, и появится то, чего не даёт ни одна диета:
    опыт, что ты доводишь начатое до конца. После него не надо начинать заново
    с понедельника.
  </div>

  <div style="margin-top:36px;flex:1;min-height:0;display:flex">
    {b.photo(f"{PHOTO}/eduard-kuhnya.webp", 0, pos="center 34%", style="flex:1;height:auto;border-radius:28px")}
  </div>
</div>
{b.foot()}
"""
    return {"slug": "kurs-00-pered-startom", "body": [sheet1, sheet2]}


# ─────────────────────────── разделители уровней ───────────────────────────

_DIVIDER = {
    1: ("Три дня без запретов и без диеты. Сначала смотрим, с чем работаем: "
        "режим, тарелка, вода. Менять будем потом, и точечно.",
        "do-posle-74-54", "center",
        "74 → 54 кг. Восемь месяцев, а не четырнадцать дней — пишу это "
        "специально. Курс даёт старт, остальное делает время."),
    2: ("Начинаются действия: первая тренировка, день отдыха по плану, вечерняя "
        "еда без голода. В конце недели — честный чекпоинт.",
        "do-posle-136-105", "center",
        "136 → 105 кг за четыре месяца. Начинается это всегда одинаково: "
        "одна тренировка и один обычный день, записанный честно."),
    3: ("Отдельные действия собираются в конструкцию: еда решена на три дня "
        "вперёд, цифры в тренировке растут, любимая еда стоит в плане.",
        "do-posle-106-85", "center",
        "106 → 85 кг за четыре месяца. Без новой диеты: то же самое, "
        "повторённое много раз."),
    4: ("Последние четыре дня про то, что будет после курса: короткая версия "
        "на аврал, правило возврата и цифры, которые выросли.",
        "do-posle-chempion", "center 34%",
        "Эльнур, мой клиент. Между кадрами четыре месяца, дальше были четыре "
        "абсолютных чемпионских титула по бодибилдингу. А начиналось с того "
        "же, что у тебя: режим, тарелка и записанные повторы."),
}


def divider(n: int) -> dict:
    lv = g.LEVELS[n - 1]
    lead, ph, pos, caption = _DIVIDER[n]
    days = [(d, dict(_TOC[n])[f"{d:02d}"]) for d in range(lv["days"][0], lv["days"][1] + 1)]
    chips = "".join(
        f'<div class="tile" style="padding:18px 20px">'
        f'<div class="mono" style="color:{g.GOLD};font-size:20px">День {d}</div>'
        f'<div style="font-size:23px;line-height:1.25;margin-top:7px">{t}</div></div>'
        for d, t in days)

    body = f"""
<div class="pad" style="padding-top:64px">
  <div style="display:flex;align-items:center;justify-content:space-between">
    <div style="display:flex;align-items:center;gap:16px">
      {b.icon(lv["icon"], 34)}
      <span class="eyebrow">Уровень {lv["n"]}</span>
    </div>
    <span class="eyebrow mute">дни {lv["days"][0]}–{lv["days"][1]}</span>
  </div>

  <div style="font-family:'Raydis',sans-serif;font-size:240px;line-height:0.8;
       margin-top:26px;color:transparent;-webkit-text-stroke:2px {g.GOLD_EDGE}">
    {lv["n"]:02d}
  </div>
  <h1 style="margin-top:-14px">{lv["name"]}</h1>
  <div class="lead" style="margin-top:22px;max-width:800px">{lead}</div>
</div>

<div style="margin-top:36px;flex:1;min-height:0;display:flex">
  {b.photo(f"{PHOTO}/{ph}.webp", 0, pos=pos, style="flex:1;height:auto;border-radius:28px 28px 0 0")}
</div>

<div class="pad" style="margin-top:16px">
  <div class="note" style="line-height:1.35">{caption}</div>
</div>

<div class="pad" style="margin-top:22px">
  <div class="bento" style="grid-template-columns:repeat({len(days)},1fr);gap:14px">
    {chips}
  </div>
</div>
{b.foot()}
"""
    return {"slug": f"kurs-uroven-{n}", "body": body}


# ─────────────────────────── каркас дня ───────────────────────────

def day_page(n: int, title: str, lead: str, body: str, star: bool = False,
             suffix: str = "") -> dict:
    lv = g.level_for_day(n)
    st = (f'<span style="margin-left:14px">{b.icon("star", 30)}</span>') if star else ""
    head = f"""
<div class="head pad">
  <div class="line">
    <div style="display:flex;align-items:center;gap:14px">
      {b.icon(lv["icon"], 30)}
      <span class="eyebrow">Уровень {lv["n"]} · {lv["name"]}</span>
    </div>
    <div class="eyebrow mute">{n:02d} / 14</div>
  </div>
  {b.rail(lv["n"])}
</div>"""
    inner = f"""
{head}
<div class="content pad" style="padding-top:28px">
  <div style="display:flex;align-items:center">
    <h2>{title}</h2>{st}
  </div>
  <div class="lead" style="margin-top:16px;max-width:860px">{lead}</div>
  <div style="margin-top:30px;display:flex;flex-direction:column;gap:18px">{body}</div>
</div>
{b.foot(b.done_row())}
"""
    return {"slug": f"kurs-{n:02d}-" + _SLUGS[n] + suffix, "body": inner}


_SLUGS = {
    1: "audit-rezhima", 2: "tarelka", 3: "voda", 4: "pervaya-trenirovka",
    5: "den-otdyha", 6: "golodat-ne-nuzhno", 7: "pervyy-chekpoint",
    8: "pitanie-na-tri-dnya", 9: "vtoraya-trenirovka", 10: "vrednaya-eda",
    11: "trenirovka-kogda-nekogda", 12: "kak-ne-brosit",
    13: "test-progressa", 14: "tochka-a-tochka-b",
}


def _table(head_cells: list[str], rows: list[tuple[str, str]], cols: int,
           col_w: str = "88px") -> str:
    """Таблица: название, щадящий вариант и пустые ячейки под запись."""
    th = "".join(f'<div class="th">{c}</div>' for c in head_cells)
    tr = []
    for name, easy in rows:
        cells = "".join('<div class="cell"></div>' for _ in range(cols))
        sub = f'<span class="easy">{easy}</span>' if easy else ""
        tr.append(f'<div class="tr"><div class="nm"><b>{name}</b>{sub}</div>{cells}</div>')
    return (f'<div class="wk" style="--cols:{cols};--cw:{col_w}">'
            f'<div class="tr thead">{th}</div>{"".join(tr)}</div>')


WK_CSS = f"""
.wk {{ border-radius: 20px; overflow: hidden; border: 1px solid {g.GLASS_EDGE}; }}
.wk .tr {{ display: grid; grid-template-columns: 1fr repeat(var(--cols), var(--cw, 88px));
  align-items: center; gap: 0; border-top: 1px solid {g.LINE_SOFT}; }}
.wk .tr:first-child {{ border-top: 0; }}
.wk .thead {{ background: rgba(255,255,255,0.04); }}
.wk .th {{ font-family: 'Intro', sans-serif; font-size: 15px; letter-spacing: 1.6px;
  text-transform: uppercase; color: {g.TEXT_4}; padding: 18px 0; text-align: center; }}
.wk .th:first-child {{ text-align: left; padding-left: 28px; }}
.wk .nm {{ padding: 7px 26px; }}
.wk .nm b {{ display: block; font-size: 28px; font-weight: 700; }}
.wk .nm .easy {{ display: block; font-size: 21px; color: {g.TEXT_4}; margin-top: 4px;
  line-height: 1.3; }}
.wk .cell {{ height: 38px; margin: 0 9px; border-radius: 9px;
  background: #FFFFFF; box-shadow: 0 2px 10px rgba(0,0,0,0.45); }}

.grid3 {{ display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 18px; }}
.chiplist {{ display: flex; flex-wrap: wrap; gap: 10px; }}
.grid2tools {{ display: grid; grid-template-columns: 1fr 1fr; gap: 0 32px; }}
.chiplist span {{ font-size: 23px; padding: 9px 18px; border-radius: 999px;
  background: rgba(255,255,255,0.05); border: 1px solid {g.LINE};
  color: {g.TEXT_2}; }}
.note {{ font-size: 23px; line-height: 1.4; color: {g.TEXT_4}; }}
.week {{ display: grid; grid-template-columns: 1fr repeat(7, 72px); align-items: center;
  gap: 0 8px; }}
.week .h {{ font-family: 'JetBrains Mono', monospace; font-size: 21px;
  color: {g.TEXT_4}; text-align: center; }}
.week .l {{ font-size: 27px; padding: 22px 0; }}
.week .bx {{ width: 44px; height: 44px; margin: 0 auto; border-radius: 11px;
  background: #FFFFFF; box-shadow: 0 2px 10px rgba(0,0,0,0.45); }}
"""


# ─────────────────────────── дни 1–7 ───────────────────────────

# Базовый комплекс дней 4, 9, 11 и 13 — четыре версии: место × пол.
# Коды из атласа, чтобы щадящий вариант жил в одном месте.
#
# Пять слотов одинаковы во всех версиях: ноги, жим, тяга или задняя цепь,
# пресс, статика. Так три колонки цифр за четвёртый, девятый и тринадцатый
# день остаются сравнимыми, куда бы человек ни ходил.
#
# По полу различается один слот. Решение владельца: мужчинам ягодичный мостик
# не даём. Дома его место занимают приседания у стены, в зале — гиперэкстензия.
# Оговорка про заднюю цепь дома записана в §2 спеки программ.
_COMPLEX = {
    ("dom", "zh"): ("Д4", "Д12", "Д3", "Д13", "Д5"),
    ("dom", "m"): ("Д4", "Д12", "Д8", "Д13", "Д5"),
    ("zal", "zh"): ("З1", "З6", "З4", "З8", "Д13"),
    ("zal", "m"): ("З1", "З6", "З4", "З2", "Д13"),
}
# В колонке таблицы полное название атласа переносится на две строки и
# ломает строй. Здесь оно короче — движение то же.
_SHORT = {
    "Д5": "Планка", "Д13": "Скручивания на пресс",
    "З1": "Приседания с гирей", "З4": "Тяга верхнего блока",
    "З8": "Мостик с опорой на скамью",
}


def workout(sex: str, place: str = "dom") -> list[tuple[str, str]]:
    return [(_SHORT.get(c, atlas.ex(c)["name"]), atlas.ex(c)["easy"])
            for c in _COMPLEX[(place, sex)]]


SEXES = ("m", "zh")
PLACES = ("dom", "zal")
GOALS = ("cut", "gain")


def day1() -> dict:
    hours = ["Подъём", "Завтрак", "Перекус", "Обед", "Перекус", "Ужин",
             "После ужина", "Отбой"]
    rows = "".join(
        f'<div class="tr"><div class="nm"><b>{h}</b></div>'
        f'<div class="cell"></div><div class="cell"></div></div>' for h in hours)
    table = (f'<div class="wk" style="--cols:2;--cw:170px">'
             f'<div class="tr thead"><div class="th">Событие</div>'
             f'<div class="th">Время</div><div class="th">Заметка</div></div>'
             f'{rows}</div>')
    body = f"""
{b.plate('Сегодня ты не начинаешь худеть. <span class="hl">Читай ещё раз: не начинаешь.</span>')}
<div>
  <div class="cap" style="font-family:'Intro',sans-serif;font-size:17px;letter-spacing:3px;
       text-transform:uppercase;color:{g.GOLD};margin-bottom:10px">Таблица суток</div>
  <div class="note" style="margin-bottom:14px">Время ставь как было.
    Что было в тарелке, сегодня не пиши.</div>
  {table}
</div>
{b.tile(b.fields(["Окно 1", "Окно 2", "Отбой → подъём", "Итого часов"], cols=4),
        "Два окна по 20–30 минут и сколько вышло сна")}
<div class="tile">
  <div class="cap">Моя норма из калькулятора КБЖУ</div>
  {b.fields(["Ккал", "Белки", "Жиры", "Углеводы"], cols=4)}
  <div style="margin-top:14px;display:flex;align-items:center;gap:22px">
    {b.btn("Посчитать КБЖУ", CALC_URL, "calc")}
    <span class="note">Считает мой бот, за две минуты.</span>
  </div>
</div>
"""
    return day_page(1, "Аудит режима",
                    "Ничего сегодня не меняем, только смотрим, с чем работаем. "
                    "Один обычный день, не показательный вторник.", body)


def day2() -> dict:
    groups = [
        ("Белок", ["Курица", "Индейка", "Рыба", "Творог", "Яйца"]),
        ("Углеводы", ["Рис", "Макароны", "Картофель", "Гречка", "Овсянка", "Хлеб"]),
        ("Овощи", ["Огурцы", "Брокколи", "Перец", "Салат", "Капуста", "Сельдерей"]),
    ]
    cards = [b.tile('<div class="chiplist">' +
                    "".join(f"<span>{x}</span>" for x in items) + "</div>", cap)
             for cap, items in groups]
    body = f"""
{b.bento(cards, cols=3, gap=16)}
{b.tile('<div style="font-size:28px;line-height:1.45;color:' + g.TEXT_2 + '">'
        'Курица + рис + огурцы&nbsp;· Творог + хлеб + перец&nbsp;· '
        'Рыба + гречка + брокколи</div>'
        '<div class="note" style="margin-top:14px">Овощи тут не для галочки: '
        'клетчатка помогает белку усваиваться, а пищеварению — работать нормально.</div>',
        "Собирается так", "gold")}
{b.tile(b.checks(["Приём 1: белок / углеводы / овощи на месте",
                  "Приём 2: белок / углеводы / овощи на месте"]) +
        '<div class="note" style="margin-top:14px">Отметь, какого элемента обычно '
        'не хватает. Почти у всех это белок и овощи.</div>' +
        b.fields(["Чего не хватает"], cols=1),
        "Задание на сегодня")}
"""
    return day_page(2, "Тарелка из трёх элементов",
                    "Запретов не будет. Норму ты посчитал вчера, а сегодня — принцип, "
                    "по которому собирается любой приём пищи.", body)


def day3(goal: str = "cut") -> dict:
    drinks = [("Латте на молоке", "300 мл", "≈ 150"), ("Капучино на молоке", "250 мл", "≈ 110"),
              ("Сок пакетированный", "250 мл", "≈ 110"), ("Сладкая газировка", "500 мл", "≈ 210"),
              ("Пиво", "500 мл", "≈ 215"), ("Чай с двумя ложками сахара", "200 мл", "≈ 40"),
              ("Вода, чай и кофе без сахара", "—", "0")]
    rows = "".join(
        f'<div style="display:grid;grid-template-columns:1fr 130px 120px;'
        f'padding:11px 0;border-top:1px solid {g.LINE_SOFT};align-items:baseline">'
        f'<span style="font-size:27px">{n}</span>'
        f'<span class="mono" style="color:{g.TEXT_4}">{v}</span>'
        f'<span class="mono" style="color:{g.GOLD};text-align:right">{k}</span></div>'
        for n, v, k in drinks)
    glasses = "".join('<div style="flex:1;height:42px;border-radius:0 0 10px 10px;'
                      'background:#FFFFFF;box-shadow:0 2px 10px rgba(0,0,0,0.45)"></div>'
                      for _ in range(8))
    gain = goal == "gain"
    body = f"""
{b.plate('Жидкие калории не насыщают. Значит, ими добирают норму, когда еда '
         'уже не лезет.' if gain else
         'Жидкие калории не насыщают. Организм не считает их едой, '
         'а энергию оттуда берёт.')}
{b.tile(rows + '<div class="note" style="margin-top:14px">Цифры тут округлённый '
        'ориентир на порцию, а не измерение. Смотрим не на точность, а на порядок.</div>',
        "Напитки за сегодня")}
{b.tile('<div style="display:flex;gap:12px">' + glasses + '</div>', "Стаканы воды за день")}
{b.tile(b.checks(["Посчитать, сколько калорий за день пришло с напитками",
                  "Добавить один калорийный напиток"] if gain else
                 ["Посчитать, сколько сладких и молочных напитков за день",
                  "Заменить один из них на воду или чай без сахара"]) +
        b.fields(["Добавил" if gain else "Замена"], cols=1), "Задание на сегодня")}
"""
    return day_page(3, "Вода и жидкие калории",
                    "У тебя на наборе эта тема работает в плюс: через напитки "
                    "норма добирается легче всего." if gain else
                    "Скучная тема, которую все пропускают. Пропустишь — будешь "
                    "удивляться, почему устаёшь и хочешь есть.", body,
                    suffix="-nabor" if gain else "")


def day4(sex: str = "m", place: str = "dom") -> dict:
    secs = {("dom", "m"): "Приседания у стены и планку", ("dom", "zh"): "Планку",
            ("zal", "m"): "", ("zal", "zh"): ""}[(place, sex)]
    body = f"""
{_table(["Упражнение", "1", "2", "3"], workout(sex, place), 3)}
<div class="note">В ячейки ставь количество повторов в каждом подходе.
  {f"{secs} записывай в секундах." if secs else "Рабочий вес пиши рядом с повторами."}</div>
{b.tile('<div class="body">Записывай, сколько получилось. Не для отчёта мне, для себя. '
        'Через десять дней вернёшься к этой записи, и она будет доказательством, '
        'что что-то происходит. Весы могут молчать, записи — нет.</div>',
        "Правило дня", "gold")}
<div class="note">Серая подпись под каждым упражнением: щадящий вариант под колени
  и голеностоп. Боль — это стоп, а не «потерпи».</div>
{b.tile(b.fields(["Дата"], cols=1), "")}
"""
    lead = ("20 минут в зале, пять упражнений и лёгкий вес. "
            if place == "zal" else "20 минут, дома, без оборудования. ")
    return day_page(4, "Первая тренировка",
                    lead + "Покажется мало — так и задумано: кто в первый день "
                    "выкладывается до отказа, на второй не может сесть "
                    "на унитаз.", body, suffix=f"-{sex}-{place}")


def day5() -> dict:
    body = f"""
{b.tile('<div class="body">Четыре дня подряд всё шло. На пятый вечер не сложился: '
        'работа, ребёнок, гости. И в голове щёлкает: «не потренировался, значит '
        'слился». Раз слился, вечером можно что попало. Утром можно не вставать. '
        'Через две недели человек ровно там, откуда начинал, и уверен, что дело '
        'в лени.</div>'
        '<div class="body" style="margin-top:16px">Дело не в лени. У него пятый '
        'день был пустой, поэтому его нечем было закрыть. У тебя он занят: '
        'сегодня отдых стоит в плане, и ты его выполняешь.</div>',
        "Где обычно ломается вторая неделя")}
{b.tile(b.numlist([
    ("Мышцы растут не на тренировке",
     "На тренировке ты создаёшь запрос. Выполняется он во сне и в покое."),
    ("Семь дней в неделю дают меньше",
     "Сил отдано больше, а запрос не успевает выполниться."),
], cols=2), "Почему отдых — это работа")}
{b.tile(b.checks(["Ходьба 20–30 минут",
                  "Лечь спать на полчаса раньше обычного",
                  "Вода в течение дня"]) +
        b.fields(["Отбой сегодня", "Обычно"], cols=2), "Чек-лист дня отдыха")}
"""
    return day_page(5, "День без тренировки — тоже часть плана",
                    "Сегодня не тренируемся. Это не поблажка, это работа.", body)


def day6(goal: str = "cut") -> dict:
    gain = goal == "gain"
    meals = (["Творог с мёдом и овсянкой", "Курица с рисом", "Омлет с хлебом и сыром",
              "Рыба с картофелем", "Йогурт с гранолой", "Индейка с гречкой"] if gain else
             ["Творог с ягодами", "Омлет из двух яиц", "Греческий йогурт",
              "Курица + огурцы", "Рыба + брокколи", "Индейка + салат"])
    body = f"""
{b.plate('Худеют не от голода. От голода срываются.')}
{b.tile(b.numlist([
    ("Норма", "Попадаешь в свои цифры КБЖУ за день, и время приёма роли не играет."),
    ("Профицит", "Цель набор: за день выходит плюс. Без него масса не растёт.")
    if gain else
    ("Дефицит", "Цель похудение: за день выходит минус. Это и решает вес."),
    ("Самочувствие", "Хорошо спишь после позднего ужина — ужинай поздно. "
                     "Тяжело, двигай раньше."),
]), "Что на самом деле решает")}
{b.tile('<div class="chiplist">' + "".join(f"<span>{m}</span>" for m in meals) + "</div>"
        + ('<div class="note" style="margin-top:14px">Белок работает на мышцы, пока '
           'ты спишь. Но одним белком норму не добрать, поэтому рядом с ним '
           'углеводы.</div>' if gain else
           '<div class="note" style="margin-top:14px">Белок держит сытость до утра. '
           'Быстрые углеводы перед сном её не дают: через час снова потянет на '
           'кухню.</div>'),
        "Вечерний приём: белок + углеводы" if gain
        else "Вечерний приём: белок или белок + овощи")}
{b.tile(b.checks(["Вечерний приём собран из белка с углеводами" if gain
                  else "Вечерний приём собран из белка или белка с овощами"]) +
        b.fields(["Что именно", "Утром: как спалось"], cols=2), "Сегодня")}
"""
    return day_page(6, "Голодать — не нужно",
                    "«После шести нельзя» — миф. Считается день целиком, и вечер "
                    "у тебя не для терпения, а чтобы закрыть норму." if gain else
                    "«После шести нельзя» — миф. Считается день целиком, "
                    "а не часы на часах.", body,
                    suffix="-nabor" if gain else "")


def day7(goal: str = "cut") -> dict:
    gain = goal == "gain"
    lines = ["Тренировка была", "Тарелка по принципу", "Вечер по плану", "Сон 7+ часов"]
    head = '<div class="l"></div>' + "".join(
        f'<div class="h">{i}</div>' for i in range(1, 8))
    rows = "".join(
        f'<div class="l">{t}</div>' + "".join('<div class="bx"></div>' for _ in range(7))
        for t in lines)
    # На наборе неделя без прироста — это данные, а не спокойствие: тут вес
    # выносится отдельной строкой с ориентиром из прогноза после теста.
    weight = b.tile(
        b.fields(["В понедельник", "Сегодня"], cols=2) +
        '<div class="note" style="margin-top:12px">Ориентир стоял в прогнозе сразу '
        'после теста. Ноль или меньше: добавь еды. Заметно больше: сбавь.</div>',
        "Вес за неделю") if gain else ""
    body = f"""
{b.plate('Стрелка обязана ползти вверх. Стоит на месте — добавляй еду, '
         'а не тренировки.' if gain else
         'Если вес не сдвинулся — это нормально и ожидаемо. '
         'Люди бросают ровно здесь.')}
{weight}
{b.tile(f'<div class="week">{head}{rows}</div>', "Неделя по дням")}
{b.bento([
    b.tile('<div class="note">Это данные для второй недели. Идеально не делает '
           'никто, включая меня.</div>' + b.fields(["Дней"], cols=1),
           "Сколько дней вышло неидеально"),
    b.tile('<div class="note">Один, не список. На второй неделе работаем именно '
           'с ним.</div>' + b.fields(["Пункт"], cols=1) +
           '<div class="note" style="margin-top:12px;color:' + g.GOLD + '">'
           'Запиши его. Это первое, что я спрашиваю на разборе.</div>',
           "Мой слабый пункт"),
])}
"""
    return day_page(7, "Первый чекпоинт",
                    "Прошла неделя. Смотрим честно, без натягивания. Если весы "
                    "стоят, это сигнал: еды мало." if gain else
                    "Прошла неделя. Смотрим честно: без самобичевания и без "
                    "натягивания. Если весы стоят, это ожидаемо, я предупреждал.",
                    body, suffix="-nabor" if gain else "")


# ─────────────────────────── дни 8–14 ───────────────────────────

# Стартовый набор, чтобы девять карточек не встречали человека пустотой.
# Продукты — те же, что перечислены в дне 2: ничего нового покупать не надо.
# Каждое блюдо собрано по принципу трёх элементов, и любое меняется на своё:
# белое окно под карточкой ровно для этого.
_MEALS = {
    "Завтрак": ["Омлет из двух яиц · хлеб · огурцы",
                "Овсянка на молоке · творог · ягоды",
                "Яичница с сыром · гречка · перец"],
    "Обед": ["Курица · рис · капустный салат",
             "Индейка · гречка · брокколи",
             "Рыба · картофель · огурцы"],
    "Ужин": ["Творог · хлеб · огурцы",
             "Курица · макароны · салат",
             "Рыба · рис · брокколи"],
}


def day8() -> dict:
    slots = []
    for meal, dishes in _MEALS.items():
        for i, dish in enumerate(dishes, 1):
            slots.append(
                f'<div class="tile" style="padding:16px 18px">'
                f'<div class="mono" style="color:{g.GOLD};font-size:19px">{meal} {i}</div>'
                f'<div style="font-size:19px;line-height:1.28;margin-top:5px;'
                f'min-height:48px">{dish}</div>'
                f'<div class="field" style="margin-top:7px;height:32px"></div></div>')
    shop = b.bento([
        b.tile(b.fields([""], cols=1) + b.fields([""], cols=1), "Белок и молочное"),
        b.tile(b.fields([""], cols=1) + b.fields([""], cols=1), "Овощи, зелень, фрукты"),
        b.tile(b.fields([""], cols=1) + b.fields([""], cols=1), "Крупы, хлеб, картошка"),
    ], cols=3, gap=16)
    body = f"""
<div>
  <div class="cap" style="font-family:'Intro',sans-serif;font-size:17px;letter-spacing:3px;
       text-transform:uppercase;color:{g.GOLD};margin-bottom:10px">Библиотека из девяти блюд</div>
  <div class="note" style="margin-bottom:14px">Каждое из трёх элементов. Это
    стартовый набор: любое блюдо меняй на своё — для этого белое окно под
    карточкой. Дальше ты не выбираешь из бесконечности, берёшь из девяти.</div>
  <div class="grid3">{"".join(slots)}</div>
</div>
{b.plate('Еда выходит из-под контроля не от голода, а от того, что к вечеру '
         'заканчивается способность решать.', accent=True)}
<div>
  <div class="cap" style="font-family:'Intro',sans-serif;font-size:17px;letter-spacing:3px;
       text-transform:uppercase;color:{g.GOLD};margin-bottom:10px">Список покупок</div>
  {shop}
</div>
<div class="note" style="font-size:22px">Скучно? Да. Работает? Тоже да.
  <span style="color:{g.GOLD}">Набор не подошёл — перепиши под себя, это десять
  минут. Не идёт совсем — на разборе соберём вдвоём.</span></div>
"""
    return day_page(8, "Питание на три дня вперёд",
                    "Еда выходит из-под контроля не от голода. Она выходит из-за того, "
                    "что к вечеру заканчивается способность решать. Поэтому решать "
                    "больше не придётся: девять блюд, которые ты умеешь и любишь.", body)


def day9(sex: str = "m", place: str = "dom") -> dict:
    body = f"""
{_table(["Упражнение", "Д4", "Д9"], workout(sex, place), 2)}
<div class="note">В «Д4» перенеси результат четвёртого дня, в «Д9» — сегодняшний.
  Прибавка нужна минимальная, но нужна.</div>
{b.tile('<div class="body">Две записи рядом — первое объективное доказательство '
        'прогресса. Не ощущения и не зеркало в плохом свете. Цифры.</div>' +
        b.fields(["Где прибавка"], cols=1), "Сравни две колонки", "gold")}
"""
    return day_page(9, "Вторая тренировка + замер",
                    "Тот же комплекс, что и в четвёртый день, только сегодня чуть "
                    "больше: на одно повторение, пять секунд или "
                    + ("два с половиной килограмма." if place == "zal"
                       else "пять секунд в планке.")
                    + " Этого хватит.", body, suffix=f"-{sex}-{place}")


def day10() -> dict:
    body = f"""
{b.tile('<div class="body">Съел пирожок. Через минуту в голове: «ну всё, день '
        'испорчен». Раз испорчен, доедаем что осталось и начинаем с '
        'понедельника. В понедельник запрет возвращается, держится дня три, '
        'и всё идёт по кругу.</div>'
        '<div class="note" style="margin-top:14px">Месяц теряется не от пирожка. '
        'От мысли, которая приходит следом.</div>', "Как ломается запрет")}
{b.plate('Мы ничего не запрещаем. Мы планируем, и <span class="hl">заранее</span> '
         'здесь ключевое слово.')}
{b.tile(b.checks(["1–2 раза в неделю, не «когда захочется»",
                  "В конкретный день, назначенный заранее",
                  "В понятном объёме, а не «сколько пойдёт»",
                  "За столом, без телефона и не из пакета"]), "Правило встраивания")}
{b.bento([
    b.tile(b.fields(["что именно", "какой день"], cols=2),
           "Мой запланированный вкусный приём"),
    b.tile('<div class="note">Почти всегда там нет привычной вины, а именно вина '
           'и выбивала тебя раньше.</div>' + b.fields([""], cols=1),
           "Что чувствую после"),
])}
"""
    return day_page(10, "«Вредная еда» без запретов",
                    "Запрещённых продуктов в этой системе нет. И дело не в доброте: "
                    "запрет держится недели три, а потом один пирожок превращается "
                    "в потерянный месяц.", body)


def day11(sex: str = "m", place: str = "dom") -> dict:
    # Комплекс здесь домашний всегда, даже у тех, кто ходит в зал: неделя
    # аврала — это ровно та неделя, когда до зала не доезжают.
    note = ("Комплекс домашний: в аврал до зала не доехать, а это делается "
            "в комнате, в чём стоишь. Два подхода, спокойный темп."
            if place == "zal" else
            "Тот же комплекс, что в дни 4 и 9, только два подхода вместо трёх. "
            "Спокойный темп, без прыжков.")
    body = f"""
{_table(["Упражнение", "1", "2"], workout(sex, "dom"), 2)}
<div class="note">{note} Если совсем горит — один подход.</div>
{b.tile('<div class="body">Нужно почувствовать, что 15 минут — это реально, '
        'а не теория. В аврал ты не будешь ничего придумывать: достанешь '
        'готовое.</div>' +
        b.checks(["Сделать короткую версию сегодня",
                  "Занести её в заметки телефона, чтобы в аврал не думать"]),
        "Зачем делать её сегодня, когда время есть")}
{b.plate('Короткая версия сохраняет не мышцы, а цепочку. Она не порвалась — '
         'значит в понедельник ты возвращаешься, а не начинаешь с нуля.', accent=True)}
"""
    return day_page(11, "Тренировка, когда некогда",
                    "Неделя аврала придёт обязательно: работа, болезнь ребёнка, "
                    "гости. На этот случай есть урезанная версия: "
                    + ("пять упражнений дома, без всякого оборудования."
                       if place == "zal" else
                       "тот же комплекс, только в два подхода."), body,
                    suffix=f"-{sex}-{place}")


def day12() -> dict:
    steps = [
        ("День закрыт", "Прошлое не редактируется."),
        ("Ничего не отрабатывай", "Не голодай назавтра, не удваивай тренировку."),
        ("Дальше следующий шаг по плану", "Не с понедельника. Следующий по счёту."),
        ("Запиши, что помешало", "Аврал, усталость, не поел днём. Помеха повторится."),
    ]
    lst = "".join(
        f'<div style="display:flex;gap:22px;align-items:baseline;padding:15px 0;'
        f'border-top:1px solid {g.LINE_SOFT}">'
        f'<div style="font-family:Bebas,sans-serif;font-size:56px;line-height:1;'
        f'color:{g.GOLD};flex:none;width:44px">{i}</div><div>'
        f'<div style="font-size:38px;font-weight:700;line-height:1.2">{t}</div>'
        f'<div style="font-size:29px;line-height:1.35;color:{g.TEXT_3};'
        f'margin-top:6px">{v}</div></div></div>'
        for i, (t, v) in enumerate(steps, 1))
    body = f"""
{b.plate('Мотивация кончится. Держит не она.')}
{b.tile(lst, "Правило возврата")}
{b.tile('<div class="note">То, что сделаешь даже в худшем состоянии.</div>' +
        b.fields([""], cols=1), "Мой минимум на плохой день")}
{b.plate('Один пропущенный день из 14 — это 13 сделанных. Серия рвётся не от '
         'пропуска, а от решения начать заново.', accent=True)}
"""
    return day_page(12, "Как не бросить",
                    "Самый важный лист в курсе. Распечатай и повесь на видное место: "
                    "он должен попадаться на глаза раньше, чем мысль «начну заново».",
                    body, star=True)


def day13(sex: str = "m", place: str = "dom") -> dict:
    body = f"""
{_table(["Упражнение", "Д4", "Д9", "Д13"], workout(sex, place), 3)}
<div class="note">Сегодня ставь максимум, что можешь без боли. С коленями
  и голеностопом амплитуду не выкручиваем.</div>
{b.tile('<div style="display:flex;align-items:baseline;gap:18px">'
        f'<div class="field" style="flex:1"></div>'
        '<div style="font-family:Bebas,sans-serif;font-size:56px;color:' + g.GOLD + '">%</div>'
        '</div><div class="note" style="margin-top:12px">Считай грубо: на сколько '
        'выросла сумма повторов относительно четвёртого дня.</div>'
        '<div class="note" style="margin-top:10px;color:' + g.GOLD_HI + '">Эта цифра '
        'плюс листы за четвёртый и девятый день — всё, что мне нужно, чтобы '
        'посчитать твою норму.</div>', "Мой прирост", "gold")}
"""
    return day_page(13, "Третья тренировка — тест прогресса",
                    "Тот же комплекс, третий раз. Достань записи за четвёртый "
                    "и девятый дни. Сейчас увидишь то, чего не было ни в один "
                    "прошлый заход: три колонки цифр, которые растут.", body,
                    suffix=f"-{sex}-{place}")


def day14() -> dict:
    tools = ["Карта дня и два рабочих окна",
             "Своя норма КБЖУ и принцип тарелки",
             "Девять блюд и список покупок",
             "Три тренировки с растущими цифрами",
             "Схема вечерней еды без голодания",
             "Любимая еда в плане, а не в грехах",
             "Короткая тренировка на случай аврала",
             "Правило возврата на четыре шага"]
    tl = "".join(
        f'<div style="display:flex;gap:16px;padding:3px 0;border-top:1px solid {g.LINE_SOFT}">'
        f'<span class="mono" style="color:{g.GOLD};flex:none;font-size:19px">{i:02d}</span>'
        f'<span style="font-size:20px;line-height:1.2">{t}</span></div>'
        for i, t in enumerate(tools, 1))
    body = f"""
{b.plate('Четырнадцать дней доведены до конца. Такого опыта не даёт ни одна '
         'диета.', pad="26px 42px")}
{b.bento([
    b.tile(b.fields(["режим", "окна", "зона риска"], cols=1) +
           '<div class="note" style="font-size:20px;margin-top:12px">Перенеси из '
           'карточки «Дня 0»</div>', "Точка А · День 0"),
    b.tile(b.fields(["режим", "окна", "зона риска"], cols=1) +
           '<div class="note" style="font-size:20px;margin-top:12px">То же самое, '
           'но сегодня</div>', "Точка Б · День 14", "gold"),
])}
{b.tile(b.fields(["1.", "2.", "3."], cols=3), "Три вещи, которые изменились",
        style="padding:22px 32px")}
{b.tile(f'<div class="grid2tools">{tl}</div>', "Инструменты, которые остаются",
        style="padding:22px 32px")}
{b.plate('Всё это остаётся с тобой, даже если сейчас закрыть бота. Дальше два '
         'пути: повторять цикл самому или прийти на разбор. <span class="hl">Второй '
         'путь на последнем листе курса: созвон 30 минут, бесплатно.</span>',
         accent=True, pad="28px 42px")}
"""
    return day_page(14, "Точка А → Точка Б",
                    "Курс заканчивается сегодня, инструменты остаются.", body)


# ─────────────────────────── разбор ───────────────────────────

def offer() -> dict:
    """Финал курса. Два листа: на одном четыре блока разбора и снятие
    возражений не помещаются, а резать их нельзя — здесь решается заявка.

    Что изменилось против первой версии. Раньше слайд не говорил ни формата,
    ни цены, ни того, что человек уносит: «разбираем твои записи» — это
    процесс, а не результат. Теперь три факта стоят в подзаголовке, документ
    после созвона назван прямым текстом, а кнопка несёт слово-ключ, чтобы
    человеку не пришлось придумывать, с чего начать сообщение.
    """
    blocks = [
        ("01", "Питание",
         "Что и сколько ты ешь на самом деле — по твоим записям, а не по памяти. "
         "Где норма, где перебор, из-за чего растёт жир вместо мышц."),
        ("02", "Тренировки",
         "Три колонки повторов у тебя уже есть. Скажу, что убрать, что добавить "
         "и как держать прогрессию дальше, чтобы прирост с тринадцатого дня "
         "не встал."),
        ("03", "Режим",
         "Твоя карта суток с первого дня: сон, активность, два окна, вечер. "
         "У большинства неделя ломается именно здесь, и у тебя это место уже "
         "записано на седьмом."),
        ("04", "Стратегия",
         "Норма КБЖУ, план на ближайший месяц, порядок шагов. Под твой режим, "
         "а не под среднего человека из калькулятора."),
    ]
    cards = "".join(
        f'<div class="tile" style="padding:24px 26px">'
        f'<div style="display:flex;align-items:baseline;gap:14px;margin-bottom:10px">'
        f'<span class="mono" style="color:{g.GOLD};font-size:22px">{n}</span>'
        f'<span style="font-size:30px;font-weight:700">{title}</span></div>'
        f'<div class="small" style="line-height:1.4">{text}</div></div>'
        for n, title, text in blocks)

    sheet1 = f"""
<div class="pad" style="padding-top:60px">
  <div class="eyebrow">Дальше</div>
  <h1 style="margin-top:22px;font-size:80px">Разбор<br>под твои цифры</h1>

  <div class="tile gold" style="margin-top:26px;padding:24px 30px">
    <div style="font-family:'Intro',sans-serif;font-size:21px;letter-spacing:0.9px;
         text-transform:uppercase;color:{g.GOLD_HI};white-space:nowrap">
      Созвон 30 минут · бесплатно · с документом на выходе
    </div>
  </div>

  <div class="lead" style="margin-top:26px;max-width:860px">
    Четырнадцать дней ты писал то, что обычно не пишет никто: свои сутки,
    свою тарелку, свой слабый пункт, три колонки повторов. Ко мне приходят
    с фразой «хочу похудеть». Ты придёшь с данными.
  </div>
</div>

<div class="content pad" style="padding-top:34px">
  <div class="eyebrow" style="margin-bottom:16px">За полчаса разбираем четыре вещи</div>
  <div class="bento two" style="gap:16px">{cards}</div>

  <div class="tile" style="margin-top:22px">
    <div class="cap">Уходишь не с ощущением, а с файлом</div>
    <div style="font-size:31px;line-height:1.4">
      После созвона я присылаю документ: все рекомендации и пошаговая
      стратегия, письменно. Откроешь его через неделю, когда половина
      разговора уже забылась, и пойдёшь по пунктам.
    </div>
  </div>
</div>
{b.foot()}
"""

    sheet2 = f"""
<div class="content pad" style="padding-top:60px">
  {b.bento([
      b.tile('<div class="body">Уговаривать тебя на сопровождение я не стану. '
             'Увижу, что вытянешь сам, так и скажу: иди по второму кругу, вот '
             'что поменяй. Вести человека, которому я не нужен, мне '
             'неинтересно.</div>', "Чего не будет"),
      b.tile('<div class="body">Записи работают, пока они свежие. Через месяц '
             'это уже не данные, а воспоминания. Разбирать будет нечего.</div>',
             "Почему сейчас"),
  ], gap=18)}

  {b.tile(
      '<div style="display:grid;grid-template-columns:1.4fr 1fr 1.3fr 1fr;'
      'gap:20px">' +
      "".join(
          f'<div><div style="font-family:Bebas,sans-serif;font-size:52px;'
          f'line-height:1;color:{g.GOLD}">{num}</div>'
          f'<div class="small" style="margin-top:4px;line-height:1.2">{what}</div></div>'
          for num, what in [("2", "чемпиона по бодибилдингу"),
                            ("3", "МСМК"), ("13", "мастера спорта"),
                            ("18", "КМС")]) +
      '</div>'
      '<div class="note" style="margin-top:14px">Три последние цифры — '
      'пауэрлифтинг. Выступать я тебя не позову, и к твоей цели это отношения '
      'не имеет. Это про то, что нагрузку и еду под конкретного человека '
      'я считать умею. На разборе будет то же самое, только под твои цифры.</div>',
      "Кого я довёл", style="margin-top:18px")}

  <div style="margin-top:22px;flex:1;min-height:0;display:flex">
    {b.photo(f"{PHOTO}/eduard-zal.webp", 0, pos="center 26%",
             style="flex:1;height:auto;max-height:430px;border-radius:28px")}
  </div>

  <div style="margin-top:26px">
    {b.btn("Написать Эдуарду", "https://t.me/Mr_Serbolin?text=РАЗБОР")}
    <div class="body" style="margin-top:20px;margin-bottom:16px;max-width:760px">
      Отправь одно слово: <b>РАЗБОР</b>. Пойму, что ты дошёл до конца курса,
      и отвечу первым.
    </div>
  </div>
</div>
{b.foot()}
"""
    return {"slug": "kurs-16-razbor", "body": [sheet1, sheet2]}


# ─────────────────────────── список страниц ───────────────────────────

# Дни, у которых есть варианты. Цель расходится в питании (дни 3, 6, 7),
# место и пол — в тренировках (дни 4, 9, 11, 13). Человек получает по одному
# файлу на день; бот выбирает вариант по ответам квиза, см. спеку бота.
GOAL_DAYS = (3, 6, 7)
TRAIN_DAYS = (4, 9, 11, 13)


def all_pages() -> list[dict]:
    """Все страницы курса во всех вариантах, по файлу на вариант."""
    pages = [cover(), toc(), intro()]
    days = {n: globals()[f"day{n}"] for n in range(1, 15)}
    for lv in g.LEVELS:
        pages.append(divider(lv["n"]))
        for n in range(lv["days"][0], lv["days"][1] + 1):
            if n in GOAL_DAYS:
                pages += [days[n](goal) for goal in GOALS]
            elif n in TRAIN_DAYS:
                pages += [days[n](sex, place)
                          for place in PLACES for sex in SEXES]
            else:
                pages.append(days[n]())
    pages += programmy.all_programs()
    pages.append(offer())
    return pages


def book(goal: str = "cut", sex: str = "m", place: str = "dom") -> list[dict]:
    """Один связный курс для одного человека — то, что он получит на руки:
    четырнадцать дней в своём варианте, своя программа и разбор. Из него
    собирается kurs-polnyy.pdf, чтобы смотреть подряд глазами."""
    pages = [cover(), toc(), intro()]
    days = {n: globals()[f"day{n}"] for n in range(1, 15)}
    for lv in g.LEVELS:
        pages.append(divider(lv["n"]))
        for n in range(lv["days"][0], lv["days"][1] + 1):
            if n in GOAL_DAYS:
                pages.append(days[n](goal))
            elif n in TRAIN_DAYS:
                pages.append(days[n](sex, place))
            else:
                pages.append(days[n]())
    pages.append(programmy.page(place, goal, sex))
    pages.append(offer())
    return pages
