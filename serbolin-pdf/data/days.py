"""
Содержимое 14 страниц трипваера.

Каждая страница — практический артефакт дня, а НЕ пересказ урока. Что именно
должно быть на странице, взято из подпунктов «PDF-страница:» / «PDF:» в
source/tripvaer-14-dney-Serbolin.md; детали (конкретные вопросы таблиц,
формулировки принципов) подтянуты из текста самого урока, чтобы они не
потерялись. Там, где спека не расписывает содержание явно, артефакт собран по
аналогии с соседними днями и остаётся инструментом, а не прозой.

Из урока в PDF попадает максимум одна врезка с ключевой мыслью — полный текст
живёт в сообщении бота и здесь не дублируется.

Каждый день описан словарём:
    title      — название дня
    page       — theme.PHONE или theme.A4
    lead       — одна-две строки, зачем эта страница (не пересказ урока)
    body       — HTML артефакта
    css        — дополнительный CSS только для этой страницы
"""
from lib import components as c
from lib import theme

A4, PHONE = theme.A4, theme.PHONE


# ── переиспользуемые куски ────────────────────────────────────

def _workout_rows(items: list[tuple[str, str, str]], cols: list[str]) -> str:
    """Строки комплекса: пиктограмма, название, щадящий вариант, ячейки записи."""
    head_cells = "".join(f"<th class='num'>{x}</th>" for x in cols)
    rows = []
    for kind, name, easy in items:
        cells = "".join("<td class='num'><div class='slot'></div></td>" for _ in cols)
        rows.append(
            "<tr>"
            f"<td class='fig'>{c.figure(kind, 11)}</td>"
            f"<td class='nm'><b>{name}</b><div class='easy'>{easy}</div></td>"
            f"{cells}</tr>"
        )
    return (
        "<table class='wk'><thead><tr><th></th><th>Упражнение</th>"
        f"{head_cells}</tr></thead><tbody>{''.join(rows)}</tbody></table>"
    )


_WORKOUT_CSS = """
table.wk { margin-top: 2.4mm; }
table.wk td { padding-top: 1.2mm; padding-bottom: 1.2mm; }
table.wk td.fig { width: 11mm; padding-right: 0; }
table.wk td.nm { width: auto; }
table.wk td.nm b { font-size: 0.96em; }
table.wk td.nm .easy { font-size: 0.76em; color: #8990A0; margin-top: 0.4mm; line-height: 1.3; }
table.wk th.num, table.wk td.num { width: 11mm; text-align: center; padding-left: 0; padding-right: 0; }
table.wk th.num { text-align: center; }
table.wk td.num .slot {
  height: 5.4mm; border: 0.25mm dashed #9AA0AE; border-radius: 1mm; background: #FFFFFF;
}
"""

# Комплекс 20 минут, дом, без оборудования. В уроке дня 4 состав не перечислен —
# он собран под заявленные там ограничения: 5 упражнений, без прыжков и ударной
# нагрузки, с щадящим вариантом под колени и голеностоп.
BASE_WORKOUT = [
    ("squat", "Приседания", "Колени берегут: садись до стула, не ниже"),
    ("pushup", "Отжимания от опоры", "Опора выше — стол, подоконник, стена"),
    ("bridge", "Ягодичный мостик", "Лёжа на спине, нагрузки на колени нет"),
    ("lunge", "Выпады назад", "Больно коленям — замени отведением ноги назад стоя"),
    ("plank", "Планка", "Тяжело — с колен, но спина прямая"),
]

SHORT_WORKOUT = [
    ("squat", "Приседания", "До стула, спокойный темп"),
    ("pushup", "Отжимания от опоры", "Опора выше — легче"),
    ("plank", "Планка", "С колен, если тяжело"),
]


# ── дни ───────────────────────────────────────────────────────

def day1() -> dict:
    hours = [
        "Подъём", "Завтрак", "Перекус", "Обед",
        "Перекус", "Ужин", "После ужина", "Отбой",
    ]
    rows = "".join(
        f"<tr><td class='ev'>{h}</td><td class='tm'></td><td class='nt'></td></tr>"
        for h in hours
    )
    return {
        "title": "Аудит режима",
        "page": A4,
        "lead": "Ничего сегодня не меняем, только смотрим, с чем работаем. "
                "Один обычный день, не показательный вторник.",
        "body": f"""
{c.pull("Сегодня ты не начинаешь худеть. Читай ещё раз: не начинаешь.")}

<div class="sec">
  <div class="eyebrow">Таблица суток</div>
  <p class="small muted">Время ставь как было. Что именно было в тарелке —
  не пиши, содержание нас сегодня не интересует.</p>
  <table class="day">
    <thead><tr><th>Событие</th><th>Время</th><th>Заметка одним словом</th></tr></thead>
    <tbody>{rows}</tbody>
  </table>
</div>

<div class="sec two">
  {c.note("Мои два окна по 20–30 минут",
          "<p class='small muted'>Не «можно найти», а реально свободны.</p>"
          f"<div class='win'>1. {c.fill(52)}</div>"
          f"<div class='win'>2. {c.fill(52)}</div>")}
  {c.note("Сколько вышло сна",
          f"<div class='win'>Отбой {c.fill(22)} → подъём {c.fill(22)}</div>"
          f"<div class='win'>Итого часов: {c.fill(22)}</div>")}
</div>

<div class="sec">
  <div class="eyebrow muted">Зачем это</div>
  <p class="small">План ломается не от слабости, а от нестыковки: он требует
  тренировку в 19:00, а в 19:00 ты забираешь ребёнка. Сначала описываем твою
  жизнь — строить будем по ней.</p>
</div>""",
        "css": """
table.day td.ev { width: 38mm; font-weight: 600; color: #292F3B; }
table.day td.tm { width: 32mm; background: #F5F6F9; }
table.day td.tm, table.day td.nt { height: 9mm; }
.sec { margin-top: 6mm; }
.sec.two { display: grid; grid-template-columns: 1fr 1fr; gap: 5mm; }
.win { margin-top: 2.4mm; font-size: 0.92em; }
""",
    }


def day2() -> dict:
    # Цвета колонок совпадают с секторами тарелки выше и держатся внутри
    # одного акцента: алый → полупрозрачный алый → нейтральный серый.
    # Третий цвет в палитре не заводим, это правило Crimson.
    cols = [
        ("Белок", "#D8232A", ["Курица, индейка", "Рыба", "Творог, яйца",
                              "Говядина", "Греческий йогурт"]),
        ("Овощи", "rgba(216,35,42,0.45)", ["Салат", "Помидоры, огурцы",
                                           "Брокколи", "Капуста",
                                           "Замороженная смесь"]),
        ("Энергия", "#C9CCD4", ["Рис", "Гречка", "Картошка",
                                "Паста", "Хлеб"]),
    ]
    cells = "".join(
        f"<div class='col'><div class='ch' style='background:{col}'></div>"
        f"<div class='cn'>{name}</div>"
        + "".join(f"<div class='it'>{i}</div>" for i in items)
        + "</div>"
        for name, col, items in cols
    )
    return {
        "title": "Тарелка из трёх элементов",
        "page": PHONE,
        "lead": "Запретов не будет, калории не считаем — на старте это лишний "
                "слой, его бросают на четвёртый день. Вместо него один принцип, "
                "который закрывает 80% работы.",
        "body": f"""
<div class="plate">
  <svg viewBox="0 0 120 120" width="34mm" height="34mm" xmlns="http://www.w3.org/2000/svg">
    <circle cx="60" cy="60" r="57" fill="none" stroke="#E0E0E0" stroke-width="2"/>
    <path d="M60 60 L60 3 A57 57 0 0 1 109 88 Z" fill="rgba(216,35,42,0.16)"/>
    <path d="M60 60 L109 88 A57 57 0 0 1 11 88 Z" fill="rgba(158,19,25,0.10)"/>
    <path d="M60 60 L11 88 A57 57 0 0 1 60 3 Z" fill="#F2F3F6"/>
    <path d="M60 60 L60 3 M60 60 L109 88 M60 60 L11 88" stroke="#FFFFFF" stroke-width="2.4"/>
    <circle cx="60" cy="60" r="57" fill="none" stroke="#D8232A" stroke-width="1.4"/>
  </svg>
  <div class="plegend">
    <div><span class="dot" style="background:rgba(216,35,42,0.55)"></span>Белок</div>
    <div><span class="dot" style="background:rgba(158,19,25,0.35)"></span>Овощи</div>
    <div><span class="dot" style="background:#E7E9EF"></span>Энергия</div>
  </div>
</div>

<div class="cols">{cells}</div>

<div class="ex">
  <div class="eyebrow">Собирается так</div>
  <div>Курица + салат + рис · Творог + помидоры + хлеб · Рыба + брокколи + картошка</div>
</div>

{c.note("Задание на сегодня",
        "<p class='small muted'>Собери по принципу два приёма пищи. "
        "Не все, два.</p>"
        + c.checks(["Приём 1: белок / овощи / энергия на месте",
                    "Приём 2: белок / овощи / энергия на месте"]))}

<p class="small muted mt">Отметь, какого элемента у тебя обычно не хватает.
Почти у всех это белок: <b>{c.fill(34)}</b></p>""",
        "css": """
.plate { display: flex; gap: 5mm; align-items: center; margin-top: 4mm; }
.plegend { font-size: 0.85em; line-height: 1.9; }
.plegend .dot { display: inline-block; width: 2.6mm; height: 2.6mm; border-radius: 999px;
  margin-right: 1.8mm; vertical-align: middle; }
.cols { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 3mm; margin-top: 5mm; }
.cols .ch { height: 1.1mm; border-radius: 999px; }
.cols .cn { font-weight: 700; color: #292F3B; font-size: 0.9em; margin: 1.6mm 0 1mm; }
.cols .it { font-size: 0.82em; color: #4A4A4A; line-height: 1.65; }
.ex { margin-top: 5mm; font-size: 0.86em; }
.ex .eyebrow { display: block; margin-bottom: 1.4mm; }
.mt { margin-top: 4mm; }
""",
    }


def day3() -> dict:
    # Калорийность — округлённый ориентир на типовую порцию, не измерение.
    drinks = [
        ("Латте на молоке", "300 мл", "≈ 150"),
        ("Капучино на молоке", "250 мл", "≈ 110"),
        ("Сок пакетированный", "250 мл", "≈ 110"),
        ("Сладкая газировка", "500 мл", "≈ 210"),
        ("Пиво", "500 мл", "≈ 215"),
        ("Чай с двумя ложками сахара", "200 мл", "≈ 40"),
        ("Вода, чай и кофе без сахара", "—", "0"),
    ]
    rows = "".join(
        f"<tr{' class=zero' if v == '0' else ''}><td>{n}</td>"
        f"<td class='k'>{p}</td><td class='kcal'>{v}</td></tr>"
        for n, p, v in drinks
    )
    glasses = "".join('<div class="gl"></div>' for _ in range(8))
    return {
        "title": "Вода и жидкие калории",
        "page": PHONE,
        "lead": "Скучная тема, которую все пропускают. Пропустишь — будешь "
                "удивляться, почему устаёшь и хочешь есть.",
        "body": f"""
{c.pull("Жидкие калории не насыщают. Организм не считает их едой, а энергию оттуда берёт.")}

<div class="sec">
  <div class="eyebrow">Напитки за сегодня</div>
  <table class="dr">
    <thead><tr><th>Напиток</th><th>Порция</th><th class="kcal">Ккал</th></tr></thead>
    <tbody>{rows}</tbody>
  </table>
  <p class="small muted mt">Цифры — округлённый ориентир на порцию, а не
  измерение. Смотрим не на точность, а на порядок.</p>
</div>

<div class="sec">
  <div class="eyebrow">Стаканы воды за день</div>
  <div class="glasses">{glasses}</div>
</div>

{c.note("Задание на сегодня",
        c.checks(["Посчитать, сколько сладких и молочных напитков за день",
                  "Заменить <b>один</b> из них на воду или чай без сахара"])
        + f"<p class='small mt'>Замена: {c.fill(46)}</p>")}""",
        "css": """
table.dr td { padding-top: 1.15mm; padding-bottom: 1.15mm; }
table.dr td.kcal, table.dr th.kcal { text-align: right; white-space: nowrap;
  font-family: 'JetBrains Mono', monospace; }
table.dr tr.zero td { color: #9E1319; font-weight: 600; }
.glasses { display: flex; gap: 2.4mm; margin-top: 2.5mm; }
.glasses .gl { flex: 1; height: 7mm; border: 0.3mm solid #D8232A; border-radius: 0 0 1.6mm 1.6mm; }
.sec { margin-top: 4mm; }
.mt { margin-top: 2mm; }
""",
    }


def day4() -> dict:
    return {
        "title": "Первая тренировка",
        "page": PHONE,
        "lead": "20 минут, дома, без оборудования. Покажется мало — так и "
                "задумано: кто в первый день выкладывается до отказа, на второй "
                "не может сесть на унитаз.",
        "body": f"""
{_workout_rows(BASE_WORKOUT, ["1", "2", "3"])}
<p class="small muted mt">В ячейки — количество повторов в каждом подходе.
Планку записывай в секундах.</p>

{c.note("Правило дня",
        "<p class='small'>Записывай, сколько получилось. Не для отчёта мне — "
        "для себя. Через десять дней вернёшься к этой записи, и она будет "
        "доказательством, что что-то происходит. Весы могут молчать, "
        "записи — нет.</p>")}

<p class="small muted mt">Серая подпись под каждым упражнением — щадящий
вариант под колени и голеностоп. Боль — это стоп, а не «потерпи».</p>

<p class="small mt">Дата: {c.fill(20)}</p>""",
        "css": _WORKOUT_CSS + """
.sec { margin-top: 3.6mm; }
.mt { margin-top: 2.4mm; }
""",
    }


def day5() -> dict:
    return {
        "title": "День без тренировки — тоже часть плана",
        "page": PHONE,
        "lead": "Сегодня не тренируемся. Это не поблажка, это работа.",
        "body": f"""
{c.pull("Это не пропущенная тренировка. Это то, что назначено на сегодня.")}

<div class="three">
  <div class="tc"><div class="n">01</div><b>Мышцы растут не на тренировке</b>
  <p class="small">На тренировке ты создаёшь запрос. Выполняется он во сне
  и в покое.</p></div>
  <div class="tc"><div class="n">02</div><b>Семь дней в неделю — меньше результата</b>
  <p class="small">Больше сил отдано, запрос не успевает выполниться.</p></div>
  <div class="tc"><div class="n">03</div><b>Здесь ломаются попытки</b>
  <p class="small">«Не потренировался → я слился → раз слился, можно что
  попало» → выпал на две недели.</p></div>
</div>

{c.note("Чек-лист дня отдыха",
        c.checks(["Ходьба 20–30 минут",
                  "Лечь спать на полчаса раньше обычного",
                  "Вода в течение дня"]))}

<p class="small mt">Отбой сегодня: {c.fill(24)} · Обычно: {c.fill(24)}</p>""",
        "css": """
.three { display: flex; flex-direction: column; gap: 3.4mm; margin-top: 4.5mm;
  margin-bottom: 5mm; }
.tc { border-left: 0.7mm solid #E7E9EF; padding-left: 3.4mm; }
.tc .n { font-family: 'JetBrains Mono', monospace; font-size: 0.78em;
  color: #D8232A; font-weight: 700; margin-bottom: 0.8mm; }
.tc b { display: block; color: #292F3B; font-size: 0.94em; }
.tc p { margin-top: 0.8mm; }
.mt { margin-top: 4mm; }
""",
    }


def day6() -> dict:
    snacks = [
        "Творог с ягодами", "Два варёных яйца", "Греческий йогурт",
        "Кусок отварной курицы", "Сыр с помидором", "Горсть орехов",
        "Протеиновый коктейль", "Творожный сыр на хлебце",
    ]
    slots = [
        ("Завтрак", "с белком, не кофе на бегу", True),
        ("Обед", "полноценный, а не печенье", True),
        ("Перекус 16:00–17:00", "белковый — вот он и решает вечер", True),
        ("Ужин", "спокойный, по принципу тарелки", True),
        ("21:00–23:00", "зона, где обычно пробивает", False),
    ]
    line = "".join(
        f"<div class='sl{'' if ok else ' risk'}'><div class='bar'></div>"
        f"<b>{n}</b><div class='small muted'>{d}</div></div>"
        for n, d, ok in slots
    )
    return {
        "title": "Вечерний голод",
        "page": PHONE,
        "lead": "Днём человек герой, а вечером стоит у холодильника и не "
                "понимает, что происходит. Это счёт за день, и оплачивают его "
                "завтраком.",
        "body": f"""
<div class="tl">{line}</div>

<div class="sec">
  <div class="eyebrow">Перекус за 15 секунд — выбери свой</div>
  <div class="sn">{"".join(f"<div class='s'>{s}</div>" for s in snacks)}</div>
</div>

{c.note("Сегодня",
        c.checks(["Добавить белковый перекус в 16:00–17:00"])
        + f"<p class='small mt'>Что именно: {c.fill(44)}</p>")}

<div class="sec">
  <div class="eyebrow">Вечером отметь честно</div>
  <div class="cmp">
    <div><div class="box"></div>Тянуло так же</div>
    <div><div class="box"></div>Тянуло меньше</div>
    <div><div class="box"></div>Не тянуло вообще</div>
  </div>
</div>""",
        "css": """
.tl { display: flex; gap: 2mm; margin-top: 4mm; }
.tl .sl { flex: 1; }
.tl .sl .bar { height: 1.4mm; border-radius: 999px; background: rgba(216,35,42,0.30);
  margin-bottom: 1.6mm; }
.tl .sl.risk .bar { background: #D8232A; }
.tl .sl b { font-size: 0.74em; color: #292F3B; display: block; line-height: 1.25; }
.tl .sl .small { font-size: 0.68em; line-height: 1.3; margin-top: 0.6mm; }
.sn { display: grid; grid-template-columns: 1fr 1fr; gap: 1.8mm; margin-top: 2.4mm; }
.sn .s { background: #F2F3F6; border-radius: 2.4mm; padding: 1.8mm 2.4mm; font-size: 0.8em; }
.cmp { display: flex; gap: 4mm; margin-top: 2.4mm; font-size: 0.85em; }
.cmp > div { display: flex; gap: 1.6mm; align-items: center; }
.sec { margin-top: 5mm; }
.mt { margin-top: 2.4mm; }
""",
    }


def day7() -> dict:
    rows = [
        "Тренировка была",
        "Тарелка по принципу",
        "Вечер без срыва",
        "Сон 7+ часов",
    ]
    head = "".join(f"<th class='d'>{i}</th>" for i in range(1, 8))
    body = "".join(
        f"<tr><td class='rl'>{r}</td>"
        + "".join("<td class='d'><div class='box'></div></td>" for _ in range(7))
        + "</tr>"
        for r in rows
    )
    return {
        "title": "Первый чекпоинт",
        "page": PHONE,
        "lead": "Прошла неделя. Смотрим честно: без самобичевания и без "
                "натягивания. Если весы стоят — это ожидаемо, я предупреждал.",
        "body": f"""
{c.pull("Если вес не сдвинулся — это нормально и ожидаемо. Люди бросают ровно здесь.")}

<div class="sec">
  <div class="eyebrow">Неделя по дням</div>
  <table class="wk7">
    <thead><tr><th></th>{head}</tr></thead>
    <tbody>{body}</tbody>
  </table>
</div>

<div class="sec">
  <div class="eyebrow">Сколько дней вышло не идеально</div>
  <p class="small">Это не провал, это данные. Идеально не делает никто,
  включая меня. Дней: {c.fill(18)}</p>
</div>

{c.note("Мой слабый пункт",
        "<p class='small muted'>Один, не список. На второй неделе работаем "
        "именно с ним.</p>"
        f"<div class='mt'>{c.fill(60)}</div>")}""",
        "css": """
table.wk7 td.rl { font-size: 0.82em; color: #292F3B; padding-left: 0; }
table.wk7 th.d, table.wk7 td.d { width: 8.5mm; text-align: center; padding-left: 0; padding-right: 0; }
table.wk7 td.d .box { margin: 0 auto; }
table.wk7 th.d { text-align: center; font-family: 'JetBrains Mono', monospace; }
.sec { margin-top: 5mm; }
.mt { margin-top: 2.8mm; }
""",
    }


def day8() -> dict:
    meals = ["Завтрак 1", "Завтрак 2", "Завтрак 3",
             "Обед 1", "Обед 2", "Обед 3",
             "Ужин 1", "Ужин 2", "Ужин 3"]
    grid = "".join(
        f"<div class='m'><div class='mt'>{m}</div>"
        "<div class='ln'></div><div class='ln'></div><div class='ln'></div>"
        "<div class='tag'>белок · овощи · энергия</div></div>"
        for m in meals
    )
    cats = ["Белок и молочное", "Овощи, зелень, фрукты", "Крупы, хлеб, картошка"]
    shop = "".join(
        f"<div class='cat'><div class='eyebrow'>{cat}</div>"
        + "".join("<div class='ln'></div>" for _ in range(6))
        + "</div>"
        for cat in cats
    )
    return {
        "title": "Питание на три дня вперёд",
        "page": A4,
        "lead": "Срывы в еде начинаются не с голода. Они начинаются с того, "
                "что к вечеру заканчивается способность решать. Поэтому решать "
                "больше не придётся: девять блюд, которые ты умеешь и любишь.",
        "body": f"""
{c.pull("Срыв в еде — не от голода. Он от того, что к вечеру заканчивается способность решать.")}

<div class="sec">
  <div class="eyebrow">Библиотека из девяти блюд</div>
  <p class="small muted">Каждое — из трёх элементов. Дальше ты не выбираешь из
  бесконечности, ты берёшь из девяти.</p>
  <div class="lib">{grid}</div>
</div>

<div class="sec">
  <div class="eyebrow">Список покупок</div>
  <p class="small muted">Собирается сам: пройди по библиотеке и выпиши, чего
  нет в холодильнике.</p>
  <div class="shop">{shop}</div>
</div>

<p class="small muted foot-note">Скучно? Да. Работает? Тоже да. Результат дают
повторяющиеся действия, а не новизна.</p>""",
        "css": """
.lib { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 3.5mm; margin-top: 3mm; }
.lib .m { border: 0.3mm solid #E0E0E0; border-radius: 3.2mm; padding: 2.6mm 3mm; }
.lib .m .mt { font-size: 0.76em; font-weight: 700; letter-spacing: 0.1em;
  text-transform: uppercase; color: #9E1319; margin-bottom: 1.8mm; }
.lib .m .ln { border-bottom: 0.25mm solid #E0E0E0; height: 4.1mm; }
.lib .m .tag { font-size: 0.66em; color: #9AA0AE; margin-top: 1.6mm; }
.shop { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6mm; margin-top: 3mm; }
.shop .cat .ln { border-bottom: 0.25mm dotted #9AA0AE; height: 5.6mm; }
.shop .cat .eyebrow { display: block; margin-bottom: 1.4mm; }
.sec { margin-top: 5mm; }
.foot-note { margin-top: 3mm; }
""",
    }


def day9() -> dict:
    return {
        "title": "Вторая тренировка + замер",
        "page": PHONE,
        "lead": "Тот же комплекс, что и в четвёртый день, только сегодня чуть "
                "больше: на одно повторение или на пять секунд в планке. "
                "Этого хватит.",
        "body": f"""
{c.pull("Прогрессия — единственная причина, по которой тело меняется.")}

{_workout_rows(BASE_WORKOUT, ["Д4", "Д9"])}
<p class="small muted mt">В «Д4» перенеси результат четвёртого дня, в «Д9» —
сегодняшний. Прибавка нужна минимальная, но нужна.</p>

{c.note("Сравни две колонки",
        "<p class='small'>Две записи рядом — первое объективное доказательство "
        "прогресса. Не ощущения и не зеркало в плохом свете. Цифры.</p>")}

<div class="sec">
  <div class="eyebrow">Где прибавка</div>
  <p class="small">{c.fill(58)}</p>
</div>""",
        "css": _WORKOUT_CSS + """
.sec { margin-top: 3mm; }
.mt { margin-top: 2.2mm; }
""",
    }


def day10() -> dict:
    return {
        "title": "«Вредная еда» без запретов",
        "page": PHONE,
        "lead": "Запрещённых продуктов в этой системе нет. И дело не в доброте: "
                "запрет держится недели три, а потом один пирожок превращается "
                "в потерянный месяц.",
        "body": f"""
<div class="chain">
  <div class="eyebrow">Как ломается запрет</div>
  <div class="ch">
    <span>Сорвался на запретное</span><i>→</i>
    <span>«всё испортил»</span><i>→</i>
    <span>«раз испортил, доедаю»</span><i>→</i>
    <span class="bad">неделя вне плана</span>
  </div>
  <p class="small muted mt">Один пирожок превращается в потерянный месяц. Не
  из-за калорий пирожка, а из-за мысли, которая пришла следом.</p>
</div>

{c.pull("Мы не запрещаем — планируем. Заранее — ключевое слово.")}

<div class="sec">
  <div class="eyebrow">Правило встраивания</div>
  {c.checks(["1–2 раза в неделю, не «когда захочется»",
             "В конкретный день, назначенный заранее",
             "В понятном объёме, а не «сколько пойдёт»",
             "За столом, без телефона и не из пакета"])}
</div>

{c.note("Мой запланированный вкусный приём",
        f"<div class='pl'>{c.fill(40)} &nbsp;в&nbsp; {c.fill(28)}</div>"
        "<div class='small muted mt'>что именно &nbsp;·&nbsp; какой день</div>")}

<div class="sec">
  <div class="eyebrow">Что чувствую после</div>
  <p class="small">{c.fill(58)}</p>
  <p class="small muted">Почти всегда там нет привычной вины — а именно вина и
  выбивала тебя раньше.</p>
</div>""",
        "css": """
.chain { margin-top: 4mm; }
.chain .ch { display: flex; flex-wrap: wrap; gap: 1.6mm; align-items: center;
  margin-top: 2.4mm; font-size: 0.82em; }
.chain .ch span { background: #F2F3F6; border-radius: 2mm; padding: 1.4mm 2.2mm; }
.chain .ch span.bad { background: rgba(216,35,42,0.10); color: #9E1319; font-weight: 700; }
.chain .ch i { color: #9AA0AE; font-style: normal; }
.pl { font-size: 1.05em; }
.sec { margin-top: 5mm; }
.mt { margin-top: 2.4mm; }
""",
    }


def day11() -> dict:
    return {
        "title": "Тренировка, когда некогда",
        "page": PHONE,
        "lead": "Неделя аврала придёт обязательно — работа, болезнь ребёнка, "
                "гости. На этот случай есть версия на 15 минут: три упражнения, "
                "прямо в комнате, в чём стоишь.",
        "body": f"""
{c.pull("Сравнивать надо не с идеальной тренировкой, а с нулём. Лучше плохо, чем никак.")}

{_workout_rows(SHORT_WORKOUT, ["1", "2"])}
<p class="small muted mt">Два подхода, спокойный темп, без прыжков. Если совсем
горит — один подход.</p>

{c.note("Зачем делать её сегодня, когда время есть",
        "<p>Нужно почувствовать, что 15 минут — это реально, а не теория. "
        "В аврал ты не будешь ничего придумывать: достанешь готовое.</p>")}

<div class="sec">
  {c.checks(["Сделать короткую версию сегодня",
             "Занести её в заметки телефона — чтобы в аврал не думать"])}
</div>

<div class="sec">
  <div class="eyebrow">Главное, что сохраняет короткая версия</div>
  <p class="small">Не мышцы, а цепочку. Она не порвалась — значит в
  понедельник ты возвращаешься, а не начинаешь с нуля.</p>
</div>""",
        "css": _WORKOUT_CSS + """
.sec { margin-top: 2.2mm; }
.mt { margin-top: 1.8mm; }
""",
    }


def day12() -> dict:
    steps = [
        ("Стоп", "Съедено — съедено. Прошлое не редактируется, обсуждать нечего."),
        ("Не компенсируй", "Не голодай завтра, не устраивай наказание в зале. "
                           "Компенсация — это качели, из них ещё никто не вышел худым."),
        ("Следующий приём пищи — по плану", "Не с понедельника. Не завтра с утра. "
                                            "Следующий по счёту."),
        ("Запиши триггер", "Усталость? Ссора? Пропущенный обед? Это не "
                           "самокопание, это данные — триггер повторится."),
    ]
    items = "".join(
        f"<div class='st'><div class='no'>{i}</div>"
        f"<div class='tx'><b>{t}</b><p>{d}</p></div></div>"
        for i, (t, d) in enumerate(steps, 1)
    )
    return {
        "title": "Протокол срыва",
        "page": A4,
        "star": True,
        "lead": "Самый важный лист в курсе. Распечатай и повесь на видное место — "
                "он должен попадаться на глаза раньше, чем холодильник.",
        "body": f"""
<div class="hero">Срыв — не событие.<br>Срыв — это <span>реакция</span> на событие.</div>

<div class="steps">{items}</div>

<div class="mine">
  <div class="eyebrow">Мой триггер</div>
  <div class="ln"></div>
  <div class="ln"></div>
  <p class="small muted">Вспомни последний срыв и назови, что было перед ним.</p>
</div>

<div class="math">
  <b>Один плохой вечер в 14 днях — это 13 хороших дней.</b>
  <span>Прервать серию можно только одним способом: не прерывая её.</span>
</div>""",
        "css": """
.hero { font-family: 'Manrope', sans-serif; font-weight: 800; font-size: 24pt;
  line-height: 1.14; letter-spacing: -0.04em; color: #292F3B; margin-top: 6mm; }
.hero span { color: #D8232A; }
.steps { margin-top: 8mm; display: flex; flex-direction: column; gap: 5mm; }
.steps .st { display: flex; gap: 6mm; align-items: flex-start; }
.steps .no { flex: none; width: 13mm; height: 13mm; border-radius: 999px;
  background: #D8232A; color: #fff; font-family: 'Manrope', sans-serif;
  font-weight: 800; font-size: 15pt; display: flex; align-items: center;
  justify-content: center; }
.steps .tx b { font-size: 14pt; letter-spacing: -0.02em; display: block;
  font-family: 'Manrope', sans-serif; font-weight: 800; color: #292F3B; }
.steps .tx p { margin-top: 1.6mm; font-size: 11pt; }
.mine { margin-top: 9mm; border: 0.4mm solid #D8232A; border-radius: 4.4mm; padding: 5mm 6mm; }
.mine .ln { border-bottom: 0.3mm dotted #9AA0AE; height: 9mm; }
.mine p { margin-top: 2.4mm; }
.math { margin-top: 7mm; background: #F2F3F6; border-radius: 4.4mm; padding: 5mm 6mm; }
.math b { display: block; font-size: 13pt; font-family: 'Manrope', sans-serif;
  font-weight: 800; letter-spacing: -0.02em; color: #292F3B; }
.math span { display: block; margin-top: 1.6mm; font-size: 10.5pt; color: #4A4A4A; }
""",
    }


def day13() -> dict:
    return {
        "title": "Третья тренировка — тест прогресса",
        "page": PHONE,
        "lead": "Тот же комплекс, третий раз. Достань записи за четвёртый и "
                "девятый дни — сейчас увидишь то, чего не было ни в один прошлый "
                "заход: три колонки цифр, которые растут.",
        "body": f"""
{_workout_rows(BASE_WORKOUT, ["Д4", "Д9", "Д13"])}
<p class="small muted mt">Сегодня — максимум, что можешь без боли. С коленями
и голеностопом амплитуду не выкручиваем.</p>

{c.pull("Цифры честнее зеркала. Делаешь больше, чем девять дней назад, — тело уже изменилось.")}

<div class="sec">
  <div class="eyebrow">Мой прирост</div>
  <div class="gain">{c.fill(24)} <span>%</span></div>
  <p class="small muted">Считай грубо: на сколько выросла сумма повторов
  относительно четвёртого дня.</p>
</div>""",
        "css": _WORKOUT_CSS + """
.gain { font-family: 'Manrope', sans-serif; font-weight: 800; font-size: 1.5em;
  color: #292F3B; margin: 1.5mm 0; }
.gain span { color: #D8232A; }
.sec { margin-top: 3mm; }
.mt { margin-top: 2.2mm; }
""",
    }


def day14() -> dict:
    tools = [
        "Карта твоего дня и два рабочих окна",
        "Принцип тарелки из трёх элементов",
        "Библиотека из девяти блюд и список покупок",
        "Три тренировки с растущими цифрами",
        "Разобранный вечерний голод",
        "Любимая еда в плане, а не в списке грехов",
        "Короткая тренировка на случай аврала",
        "Протокол срыва на четыре шага",
    ]
    return {
        "title": "Точка А → Точка Б",
        "page": PHONE,
        "lead": "Четырнадцать дней позади. Курс заканчивается сегодня, "
                "инструменты остаются.",
        "body": f"""
<div class="ab">
  <div class="pt">
    <div class="eyebrow muted">Точка А · День 0</div>
    <div class="ln"></div><div class="ln"></div><div class="ln"></div>
  </div>
  <div class="arw">→</div>
  <div class="pt now">
    <div class="eyebrow">Точка Б · День 14</div>
    <div class="ln"></div><div class="ln"></div><div class="ln"></div>
  </div>
</div>
<p class="small muted mt">Достань карточку стартовой точки из «Дня 0» и
перенеси оттуда режим, окна и зону риска. Справа — то же самое, но сегодня.</p>

<div class="sec">
  <div class="eyebrow">Три вещи, которые изменились</div>
  <div class="th">1. {c.fill(48)}</div>
  <div class="th">2. {c.fill(48)}</div>
  <div class="th">3. {c.fill(48)}</div>
</div>

<div class="sec">
  <div class="eyebrow">Инструменты, которые остаются</div>
  {c.numlist(tools)}
</div>

{c.note("Что дальше",
        "<p class='small'>Это не мотивация на две недели, а инструменты — они "
        "остаются, даже если ты закроешь бота. Дальше два пути: повторять "
        "цикл самому или прийти на разбор, где твои записи за эти 14 дней "
        "считают под твои цифры.</p>")}""",
        "css": """
.ab { display: flex; gap: 3mm; align-items: stretch; margin-top: 4mm; }
.ab .pt { flex: 1; background: #F2F3F6; border-radius: 3.2mm; padding: 3mm 3.4mm; }
.ab .pt.now { background: rgba(216,35,42,0.08); }
.ab .pt .ln { border-bottom: 0.25mm solid #C9CCD4; height: 5.4mm; }
.ab .arw { align-self: center; color: #D8232A; font-weight: 700; font-size: 1.3em; }
.th { margin-top: 2mm; font-size: 0.92em; }
/* Восемь инструментов в одну колонку не помещаются на вертикальный лист —
   раскладываем компонент «Что внутри» в две колонки, сам вид строки
   (акцентный номер + текст по базовой линии) не меняем. */
.numlist { display: grid; grid-template-columns: 1fr 1fr; gap: 2mm 3mm; margin-top: 2.2mm; }
.numlist .n { font-size: 0.95em; }
.numlist .tx { font-size: 0.74em; line-height: 1.3; }
.sec { margin-top: 4.2mm; }
.mt { margin-top: 2.2mm; }
""",
    }


ALL = {
    1: day1, 2: day2, 3: day3, 4: day4, 5: day5, 6: day6, 7: day7,
    8: day8, 9: day9, 10: day10, 11: day11, 12: day12, 13: day13, 14: day14,
}


def get(day: int) -> dict:
    d = ALL[day]()
    d.setdefault("star", False)
    return d
