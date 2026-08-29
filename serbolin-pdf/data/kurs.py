"""
Содержимое 22 страниц курса «Первые шаги к форме» — тёмная золотая версия.

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
from lib import blocks as b
from lib import gold as g

PHOTO = "../assets/photo"
AVATAR = "../assets/avatar.png"

PRICE = "1 890 ₽"
SLOGAN_HTML = 'Терпение + Дисциплина =<br><b>Результат</b>'


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
  <div class="lead" style="margin-top:30px;max-width:820px">
    14 дней — с чего начать и как не бросить. Один короткий урок в день
    и одно действие, а не теория на потом.
  </div>

  <div class="bento two" style="margin-top:52px">{lv}</div>

  <div class="tile gold" style="margin-top:26px;display:flex;align-items:center;
       justify-content:space-between;gap:30px;padding:34px 38px">
    <div>
      <div style="font-family:'Bebas',sans-serif;font-size:76px;line-height:0.9;
           color:{g.GOLD_HI}">{PRICE}</div>
      <div class="small" style="margin-top:10px">один раз, навсегда твоё · без подписки и доплат</div>
    </div>
    <div class="slogan" style="font-size:19px">{SLOGAN_HTML}</div>
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
{b.head("Оглавление", "22 страницы")}
<div class="content pad" style="padding-top:40px">
  <h2>Что будет за 14 дней</h2>
  <div class="lead" style="margin-top:16px;max-width:840px">
    Один урок и одно действие в день. Четыре уровня, каждый следующий
    опирается на предыдущий.
  </div>
  <div class="bento" style="margin-top:28px;gap:16px">{"".join(cards)}</div>
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
         "получилось» — и две недели вне плана. «День закрыт, дальше по плану» — "
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
             "а в 19:00 ты забираешь ребёнка. План был хороший — просто "
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
    в день — небольшое, которое реально сделать сегодня. За две недели из них
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
        "режим, тарелка, вода. Менять будем потом — и точечно.",
        "do-posle-74-54", "center"),
    2: ("Начинаются действия: первая тренировка, день отдыха по плану, вечерняя "
        "еда без голода. В конце недели — честный чекпоинт.",
        "eduard-shtanga", "center 40%"),
    3: ("Отдельные действия собираются в конструкцию: еда решена на три дня "
        "вперёд, цифры в тренировке растут, любимая еда стоит в плане.",
        "do-posle-106-85", "center"),
    4: ("Последние четыре дня про то, что будет после курса: короткая версия "
        "на аврал, правило возврата и цифры, которые выросли.",
        "do-posle-chempion", "center 34%"),
}


def divider(n: int) -> dict:
    lv = g.LEVELS[n - 1]
    lead, ph, pos = _DIVIDER[n]
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

<div style="margin-top:40px;flex:1;min-height:0;display:flex">
  {b.photo(f"{PHOTO}/{ph}.webp", 0, pos=pos, style="flex:1;height:auto;border-radius:28px 28px 0 0")}
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

def day_page(n: int, title: str, lead: str, body: str, star: bool = False) -> dict:
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
    return {"slug": f"kurs-{n:02d}-" + _SLUGS[n], "body": inner}


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
.wk .nm {{ padding: 10px 26px; }}
.wk .nm b {{ display: block; font-size: 28px; font-weight: 700; }}
.wk .nm .easy {{ display: block; font-size: 21px; color: {g.TEXT_4}; margin-top: 4px;
  line-height: 1.3; }}
.wk .cell {{ height: 42px; margin: 0 9px; border-radius: 10px;
  border: 1px dashed rgba(255,255,255,0.18); background: rgba(255,255,255,0.02); }}

.grid3 {{ display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 18px; }}
.chiplist {{ display: flex; flex-wrap: wrap; gap: 10px; }}
.grid2tools {{ display: grid; grid-template-columns: 1fr 1fr; gap: 0 32px; }}
.chiplist span {{ font-size: 23px; padding: 9px 18px; border-radius: 999px;
  background: rgba(255,255,255,0.05); border: 1px solid {g.LINE};
  color: {g.TEXT_2}; }}
.note {{ font-size: 23px; line-height: 1.4; color: {g.TEXT_4}; }}
.chain {{ display: flex; align-items: center; gap: 12px; }}
.chain .st {{ flex: 1; text-align: center; font-size: 22px; line-height: 1.25;
  padding: 18px 10px; border-radius: 14px; background: rgba(255,255,255,0.04);
  border: 1px solid {g.LINE}; }}
.chain .ar {{ color: {g.GOLD}; font-size: 26px; }}
.week {{ display: grid; grid-template-columns: 1fr repeat(7, 72px); align-items: center;
  gap: 0 8px; }}
.week .h {{ font-family: 'JetBrains Mono', monospace; font-size: 21px;
  color: {g.TEXT_4}; text-align: center; }}
.week .l {{ font-size: 27px; padding: 22px 0; }}
.week .bx {{ width: 44px; height: 44px; margin: 0 auto; border-radius: 12px;
  border: 2px solid {g.GOLD_EDGE}; background: rgba(212,168,67,0.07); }}
"""


# ─────────────────────────── дни 1–7 ───────────────────────────

_WORKOUT = [
    ("Приседания", "Колени берегут: садись до стула, не ниже"),
    ("Отжимания от опоры", "Опора выше — стол, подоконник, стена"),
    ("Ягодичный мостик", "Лёжа на спине, нагрузки на колени нет"),
    ("Выпады назад", "Больно коленям — замени отведением ноги назад стоя"),
    ("Планка", "Тяжело — с колен, но спина прямая"),
]


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
  <div class="note" style="margin-bottom:16px">Время ставь как было. Что именно было
    в тарелке — не пиши, содержание нас сегодня не интересует.</div>
  {table}
</div>
{b.bento([
    b.tile(b.fields(["1.", "2."], cols=2), "Мои два окна по 20–30 минут"),
    b.tile(b.fields(["Отбой → подъём", "Итого часов"], cols=2), "Сколько вышло сна"),
])}
{b.tile(b.fields(["Ккал", "Белки", "Жиры", "Углеводы"], cols=4),
        "Моя норма из калькулятора КБЖУ")}
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


def day3() -> dict:
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
    glasses = "".join('<div style="flex:1;height:46px;border:1px solid ' + g.GOLD_EDGE +
                      ';border-radius:0 0 10px 10px;background:rgba(212,168,67,0.05)"></div>'
                      for _ in range(8))
    body = f"""
{b.plate('Жидкие калории не насыщают. Организм не считает их едой, '
         'а энергию оттуда берёт.')}
{b.tile(rows + '<div class="note" style="margin-top:14px">Цифры — округлённый '
        'ориентир на порцию, а не измерение. Смотрим не на точность, а на порядок.</div>',
        "Напитки за сегодня")}
{b.tile('<div style="display:flex;gap:12px">' + glasses + '</div>', "Стаканы воды за день")}
{b.tile(b.checks(["Посчитать, сколько сладких и молочных напитков за день",
                  "Заменить один из них на воду или чай без сахара"]) +
        b.fields(["Замена"], cols=1), "Задание на сегодня")}
"""
    return day_page(3, "Вода и жидкие калории",
                    "Скучная тема, которую все пропускают. Пропустишь — будешь "
                    "удивляться, почему устаёшь и хочешь есть.", body)


def day4() -> dict:
    body = f"""
{_table(["Упражнение", "1", "2", "3"], _WORKOUT, 3)}
<div class="note">В ячейки — количество повторов в каждом подходе.
  Планку записывай в секундах.</div>
{b.tile('<div class="body">Записывай, сколько получилось. Не для отчёта мне — для себя. '
        'Через десять дней вернёшься к этой записи, и она будет доказательством, '
        'что что-то происходит. Весы могут молчать, записи — нет.</div>',
        "Правило дня", "gold")}
<div class="note">Серая подпись под каждым упражнением — щадящий вариант под колени
  и голеностоп. Боль — это стоп, а не «потерпи».</div>
{b.tile(b.fields(["Дата"], cols=1), "")}
"""
    return day_page(4, "Первая тренировка",
                    "20 минут, дома, без оборудования. Покажется мало — так и задумано: "
                    "кто в первый день выкладывается до отказа, на второй не может "
                    "сесть на унитаз.", body)


def day5() -> dict:
    body = f"""
{b.plate('Это не пропущенная тренировка. Это то, что назначено на сегодня.')}
{b.tile(b.numlist([
    ("Мышцы растут не на тренировке",
     "На тренировке ты создаёшь запрос. Выполняется он во сне и в покое."),
    ("Семь дней в неделю — меньше результата",
     "Больше сил отдано, запрос не успевает выполниться."),
    ("Здесь ломаются попытки",
     "«Не потренировался → я слился → раз слился, можно что попало» → "
     "выпал на две недели."),
]), "Почему отдых — это работа")}
{b.tile(b.checks(["Ходьба 20–30 минут",
                  "Лечь спать на полчаса раньше обычного",
                  "Вода в течение дня"]) +
        b.fields(["Отбой сегодня", "Обычно"], cols=2), "Чек-лист дня отдыха")}
"""
    return day_page(5, "День без тренировки — тоже часть плана",
                    "Сегодня не тренируемся. Это не поблажка, это работа.", body)


def day6() -> dict:
    meals = ["Творог с ягодами", "Омлет из двух яиц", "Греческий йогурт",
             "Курица + огурцы", "Рыба + брокколи", "Индейка + салат"]
    body = f"""
{b.plate('Худеют не от голода. От голода срываются.')}
{b.tile(b.numlist([
    ("Норма", "Попадаешь в свои цифры КБЖУ за день — время приёма роли не играет."),
    ("Дефицит", "Цель похудение — за день выходит минус. Это и решает вес."),
    ("Самочувствие", "Хорошо спишь после позднего ужина — ужинай поздно. "
                     "Тяжело — двигай раньше."),
]), "Что на самом деле решает")}
{b.tile('<div class="chiplist">' + "".join(f"<span>{m}</span>" for m in meals) + "</div>"
        '<div class="note" style="margin-top:14px">Белок держит сытость до утра. '
        'Быстрые углеводы перед сном её не дают — через час снова потянет на кухню.</div>',
        "Вечерний приём: белок или белок + овощи")}
{b.tile(b.checks(["Вечерний приём собран из белка или белка с овощами"]) +
        b.fields(["Что именно", "Утром: как спалось"], cols=2), "Сегодня")}
"""
    return day_page(6, "Голодать — не нужно",
                    "«После шести нельзя» — миф. Считается день целиком, "
                    "а не часы на часах.", body)


def day7() -> dict:
    lines = ["Тренировка была", "Тарелка по принципу", "Вечер по плану", "Сон 7+ часов"]
    head = '<div class="l"></div>' + "".join(
        f'<div class="h">{i}</div>' for i in range(1, 8))
    rows = "".join(
        f'<div class="l">{t}</div>' + "".join('<div class="bx"></div>' for _ in range(7))
        for t in lines)
    body = f"""
{b.plate('Если вес не сдвинулся — это нормально и ожидаемо. '
         'Люди бросают ровно здесь.')}
{b.tile(f'<div class="week">{head}{rows}</div>', "Неделя по дням")}
{b.bento([
    b.tile('<div class="note">Это не провал, это данные. Идеально не делает никто, '
           'включая меня.</div>' + b.fields(["Дней"], cols=1),
           "Сколько дней вышло неидеально"),
    b.tile('<div class="note">Один, не список. На второй неделе работаем именно '
           'с ним.</div>' + b.fields(["Пункт"], cols=1), "Мой слабый пункт"),
])}
"""
    return day_page(7, "Первый чекпоинт",
                    "Прошла неделя. Смотрим честно: без самобичевания и без "
                    "натягивания. Если весы стоят — это ожидаемо, я предупреждал.", body)


# ─────────────────────────── дни 8–14 ───────────────────────────

def day8() -> dict:
    slots = []
    for meal in ("Завтрак", "Обед", "Ужин"):
        for i in (1, 2, 3):
            slots.append(
                f'<div class="tile" style="padding:20px 22px">'
                f'<div class="mono" style="color:{g.GOLD};font-size:20px">{meal} {i}</div>'
                f'<div class="field" style="margin-top:12px;height:38px"></div>'
                f'<div class="note" style="font-size:19px;margin-top:8px">'
                f'белок · овощи · энергия</div></div>')
    shop = b.bento([
        b.tile(b.fields([""], cols=1) + b.fields([""], cols=1), "Белок и молочное"),
        b.tile(b.fields([""], cols=1) + b.fields([""], cols=1), "Овощи, зелень, фрукты"),
        b.tile(b.fields([""], cols=1) + b.fields([""], cols=1), "Крупы, хлеб, картошка"),
    ], cols=3, gap=16)
    body = f"""
<div>
  <div class="cap" style="font-family:'Intro',sans-serif;font-size:17px;letter-spacing:3px;
       text-transform:uppercase;color:{g.GOLD};margin-bottom:10px">Библиотека из девяти блюд</div>
  <div class="note" style="margin-bottom:16px">Каждое — из трёх элементов. Дальше ты
    не выбираешь из бесконечности, ты берёшь из девяти.</div>
  <div class="grid3">{"".join(slots)}</div>
</div>
{b.plate('Еда выходит из-под контроля не от голода, а от того, что к вечеру '
         'заканчивается способность решать.', accent=True)}
<div>
  <div class="cap" style="font-family:'Intro',sans-serif;font-size:17px;letter-spacing:3px;
       text-transform:uppercase;color:{g.GOLD};margin-bottom:10px">Список покупок</div>
  {shop}
</div>
<div class="note">Скучно? Да. Работает? Тоже да. Результат дают повторяющиеся
  действия, а не новизна.</div>
"""
    return day_page(8, "Питание на три дня вперёд",
                    "Еда выходит из-под контроля не от голода. Она выходит из-за того, "
                    "что к вечеру заканчивается способность решать. Поэтому решать "
                    "больше не придётся: девять блюд, которые ты умеешь и любишь.", body)


def day9() -> dict:
    body = f"""
{b.plate('Прогрессия — единственная причина, по которой тело меняется.')}
{_table(["Упражнение", "Д4", "Д9"], _WORKOUT, 2)}
<div class="note">В «Д4» перенеси результат четвёртого дня, в «Д9» — сегодняшний.
  Прибавка нужна минимальная, но нужна.</div>
{b.tile('<div class="body">Две записи рядом — первое объективное доказательство '
        'прогресса. Не ощущения и не зеркало в плохом свете. Цифры.</div>' +
        b.fields(["Где прибавка"], cols=1), "Сравни две колонки", "gold")}
"""
    return day_page(9, "Вторая тренировка + замер",
                    "Тот же комплекс, что и в четвёртый день, только сегодня чуть "
                    "больше: на одно повторение или на пять секунд в планке. "
                    "Этого хватит.", body)


def day10() -> dict:
    chain = ["Сорвался на запретное", "«Всё испортил»", "«Раз испортил, доедаю»",
             "Неделя вне плана"]
    steps = f'<span class="ar">{b.icon("arrow", 22)}</span>'.join(
        f'<div class="st">{s}</div>' for s in chain)
    body = f"""
{b.tile(f'<div class="chain">{steps}</div>'
        '<div class="note" style="margin-top:16px">Один пирожок превращается '
        'в потерянный месяц. Не из-за калорий пирожка, а из-за мысли, которая '
        'пришла следом.</div>', "Как ломается запрет")}
{b.plate('Мы не запрещаем — планируем. <span class="hl">Заранее</span> — '
         'ключевое слово.')}
{b.tile(b.checks(["1–2 раза в неделю, не «когда захочется»",
                  "В конкретный день, назначенный заранее",
                  "В понятном объёме, а не «сколько пойдёт»",
                  "За столом, без телефона и не из пакета"]), "Правило встраивания")}
{b.bento([
    b.tile(b.fields(["что именно", "какой день"], cols=2),
           "Мой запланированный вкусный приём"),
    b.tile('<div class="note">Почти всегда там нет привычной вины — а именно вина '
           'и выбивала тебя раньше.</div>' + b.fields([""], cols=1),
           "Что чувствую после"),
])}
"""
    return day_page(10, "«Вредная еда» без запретов",
                    "Запрещённых продуктов в этой системе нет. И дело не в доброте: "
                    "запрет держится недели три, а потом один пирожок превращается "
                    "в потерянный месяц.", body)


def day11() -> dict:
    short = [("Приседания", "До стула, спокойный темп"),
             ("Отжимания от опоры", "Опора выше — легче"),
             ("Планка", "С колен, если тяжело")]
    body = f"""
{b.plate('Сравнивать надо не с идеальной тренировкой, а с нулём. '
         'Лучше плохо, чем никак.')}
{_table(["Упражнение", "1", "2"], short, 2)}
<div class="note">Два подхода, спокойный темп, без прыжков. Если совсем горит —
  один подход.</div>
{b.tile('<div class="body">Нужно почувствовать, что 15 минут — это реально, '
        'а не теория. В аврал ты не будешь ничего придумывать: достанешь '
        'готовое.</div>' +
        b.checks(["Сделать короткую версию сегодня",
                  "Занести её в заметки телефона — чтобы в аврал не думать"]),
        "Зачем делать её сегодня, когда время есть")}
{b.tile('<div style="font-size:30px;line-height:1.35;font-weight:700">Короткая версия '
        'сохраняет не мышцы, а цепочку. Она не порвалась — значит в понедельник ты '
        'возвращаешься, а не начинаешь с нуля.</div>', "", "gold")}
"""
    return day_page(11, "Тренировка, когда некогда",
                    "Неделя аврала придёт обязательно — работа, болезнь ребёнка, "
                    "гости. На этот случай есть версия на 15 минут: три упражнения, "
                    "прямо в комнате, в чём стоишь.", body)


def day12() -> dict:
    body = f"""
{b.plate('Мотивация кончится. Держит не она.')}
{b.tile(b.numlist([
    ("День закрыт", "Он уже в прошлом, а прошлое не редактируется."),
    ("Ничего не отрабатывай", "Не голодай назавтра, не удваивай тренировку. "
                              "Компенсация — это качели."),
    ("Дальше — следующий шаг по плану", "Не с понедельника и не с первого числа. "
                                        "Следующий по счёту."),
    ("Запиши, что помешало", "Аврал? Усталость? Не поел днём? Это данные, "
                             "а не самокопание: помеха повторится."),
]), "Правило возврата")}
{b.tile('<div class="note">То, что сделаешь даже в худшем состоянии.</div>' +
        b.fields([""], cols=1), "Мой минимум на плохой день")}
{b.tile('<div style="font-size:30px;line-height:1.35;font-weight:700">Один пропущенный '
        'день из 14 — это 13 сделанных. Серия рвётся не от пропуска, а от решения '
        'начать заново.</div>', "", "gold")}
"""
    return day_page(12, "Как не бросить",
                    "Самый важный лист в курсе. Распечатай и повесь на видное место — "
                    "он должен попадаться на глаза раньше, чем мысль «начну заново».",
                    body, star=True)


def day13() -> dict:
    body = f"""
{_table(["Упражнение", "Д4", "Д9", "Д13"], _WORKOUT, 3)}
<div class="note">Сегодня — максимум, что можешь без боли. С коленями
  и голеностопом амплитуду не выкручиваем.</div>
{b.plate('Цифры честнее зеркала. Делаешь больше, чем девять дней назад, — '
         'тело уже изменилось.')}
{b.tile('<div style="display:flex;align-items:baseline;gap:18px">'
        f'<div class="field" style="flex:1"></div>'
        '<div style="font-family:Bebas,sans-serif;font-size:56px;color:' + g.GOLD + '">%</div>'
        '</div><div class="note" style="margin-top:12px">Считай грубо: на сколько '
        'выросла сумма повторов относительно четвёртого дня.</div>', "Мой прирост", "gold")}
"""
    return day_page(13, "Третья тренировка — тест прогресса",
                    "Тот же комплекс, третий раз. Достань записи за четвёртый "
                    "и девятый дни — сейчас увидишь то, чего не было ни в один "
                    "прошлый заход: три колонки цифр, которые растут.", body)


def day14() -> dict:
    tools = ["Карта твоего дня, два рабочих окна и своя норма КБЖУ",
             "Принцип тарелки из трёх элементов",
             "Библиотека из девяти блюд и список покупок",
             "Три тренировки с растущими цифрами",
             "Схема вечерней еды без голодания",
             "Любимая еда в плане, а не в списке грехов",
             "Короткая тренировка на случай аврала",
             "Правило возврата на четыре шага"]
    tl = "".join(
        f'<div style="display:flex;gap:18px;padding:6px 0;border-top:1px solid {g.LINE_SOFT}">'
        f'<span class="mono" style="color:{g.GOLD};flex:none">{i:02d}</span>'
        f'<span style="font-size:22px;line-height:1.25">{t}</span></div>'
        for i, t in enumerate(tools, 1))
    body = f"""
{b.bento([
    b.tile(b.fields(["режим", "окна", "зона риска"], cols=1) +
           '<div class="note" style="font-size:20px;margin-top:12px">Перенеси из '
           'карточки «Дня 0»</div>', "Точка А · День 0"),
    b.tile(b.fields(["режим", "окна", "зона риска"], cols=1) +
           '<div class="note" style="font-size:20px;margin-top:12px">То же самое, '
           'но сегодня</div>', "Точка Б · День 14", "gold"),
])}
{b.tile(b.fields(["1.", "2.", "3."], cols=3), "Три вещи, которые изменились")}
{b.tile(f'<div class="grid2tools">{tl}</div>', "Инструменты, которые остаются")}
{b.tile('<div class="body">Это не мотивация на две недели, а инструменты — они '
        'остаются, даже если ты закроешь бота. Дальше два пути: повторять цикл '
        'самому или прийти на разбор, где твои записи за эти 14 дней считают '
        'под твои цифры.</div>', "Что дальше", "gold")}
"""
    return day_page(14, "Точка А → Точка Б",
                    "Четырнадцать дней позади. Курс заканчивается сегодня, "
                    "инструменты остаются.", body)


# ─────────────────────────── разбор ───────────────────────────

def offer() -> dict:
    items = [("note", "Разбираем твои записи, а не начинаем с нуля"),
             ("calc", "Норма КБЖУ и план тренировок под твой режим"),
             ("message", "Связь со мной, а не с ботом")]
    rows = "".join(
        f'<div class="tile" style="display:flex;align-items:center;gap:22px;'
        f'padding:26px 30px">{b.icon(ic, 34)}'
        f'<span style="font-size:28px;line-height:1.3">{t}</span></div>'
        for ic, t in items)
    body = f"""
<div class="pad" style="padding-top:64px">
  <div class="eyebrow">Дальше</div>
  <h1 style="margin-top:24px;font-size:82px">Разбор<br>под твои цифры</h1>
  <div class="lead" style="margin-top:26px;max-width:840px">
    У тебя уже есть 14 дней записей. Это не анкета «сколько вам лет» — это данные.
    Принеси их, и дальше считаем под тебя, а не под среднего человека.
  </div>
  <div class="bento" style="margin-top:36px;gap:16px">{rows}</div>
</div>

<div style="margin-top:34px;flex:1;min-height:0;display:flex">
  {b.photo(f"{PHOTO}/eduard-zal.webp", 0, pos="center 26%",
           style="flex:1;height:auto;border-radius:28px")}
</div>

<div class="pad" style="margin-top:-70px;position:relative">
  {b.btn("Напиши Эдуарду", "https://t.me/Mr_Serbolin")}
  <div class="note" style="margin-top:22px;max-width:640px">
    Без подписки и автопродлений. Сначала разговор, потом решение.
  </div>
</div>
{b.foot()}
"""
    return {"slug": "kurs-15-razbor", "body": body}


# ─────────────────────────── список страниц ───────────────────────────

def all_pages() -> list[dict]:
    pages = [cover(), toc(), intro()]
    days = {n: globals()[f"day{n}"] for n in range(1, 15)}
    for lv in g.LEVELS:
        pages.append(divider(lv["n"]))
        for n in range(lv["days"][0], lv["days"][1] + 1):
            pages.append(days[n]())
    pages.append(offer())
    return pages
