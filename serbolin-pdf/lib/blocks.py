"""
Блоки страниц курса — функции, возвращающие HTML.

Тот же приём, что в старом `components.py`: никакого шаблонизатора, просто
строки. Иконки нарисованы кодом — библиотеки иконок в проекте нет и не
заводим. Набор повторяет тот, что стоит в утверждённой канве (lucide):
поиск, шестерёнка, пазл, щит, стрелка, звезда, блокнот, реплика, флаг,
калькулятор, галка.
"""
from . import gold as g

# ─────────────────────────── иконки ───────────────────────────

_ICONS = {
    "search":    '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4.2-4.2"/>',
    "settings":  ('<circle cx="12" cy="12" r="3"/>'
                  '<path d="M12 3v3M12 18v3M3 12h3M18 12h3'
                  'M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/>'),
    "puzzle":    ('<path d="M10 4h4v2.2a1.8 1.8 0 1 0 3.6 0V4H20v4h-2.2a1.8 1.8 0 1 0 0 3.6H20V20h-4v-2.2'
                  'a1.8 1.8 0 1 0-3.6 0V20H8v-4H5.8a1.8 1.8 0 1 1 0-3.6H8V8h2z"/>'),
    "shield":    '<path d="M12 3l7 3v5.5c0 4.6-3 8-7 9.5-4-1.5-7-4.9-7-9.5V6z"/>',
    "arrow":     '<path d="M4 12h15M13 6l6 6-6 6"/>',
    "star":      '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.7l5.9-.8z"/>',
    "note":      ('<path d="M6 3h9l4 4v9"/><path d="M6 3v18h8"/>'
                  '<path d="M20 15l-5.5 5.5-3 .6.6-3L17.6 13z"/>'),
    "message":   '<path d="M20 12a7.5 7.5 0 0 1-10.9 6.7L4 20l1.3-5A7.5 7.5 0 1 1 20 12z"/>',
    "flag":      '<path d="M6 21V4M6 4h11l-2.5 4L17 12H6"/>',
    "calc":      ('<rect x="5" y="3" width="14" height="18" rx="2.5"/>'
                  '<path d="M8.5 7.5h7M8.5 12h.01M12 12h.01M15.5 12h.01'
                  'M8.5 16h.01M12 16h.01M15.5 16h.01"/>'),
    "check":     '<path d="M5 12.5l4.5 4.5L19 7"/>',
    "clock":     '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    "flame":     ('<path d="M12 3c3 3.6 5.5 6.2 5.5 9.6A5.5 5.5 0 0 1 6.5 13C6.5 9.4 9.5 8 12 3z"/>'
                  '<path d="M12 20a3 3 0 0 0 3-3c0-1.6-1.4-2.6-3-4.6-1.6 2-3 3-3 4.6a3 3 0 0 0 3 3z"/>'),
}


# ─────────────────────── фигуры упражнений ───────────────────────
#
# Три упражнения из атласа рисуются кодом, а не показываются кадром из видео.
# Решение владельца: пересъёмки не будет, а по присланным кадрам движение
# не читалось — на планке человек лежал плашмя, на тяге в кадр попали двое
# стоящих людей, на гиперэкстензии видно было скамью и таз, но не разгибание.
# Рисунок здесь честнее фотографии: он показывает позу, а не мешает её увидеть.
#
# Сетка 100×100, пол на y=88. Голова — круг, тело — штрих, снаряд рисуется
# тем же штрихом потоньше, чтобы не спорить с фигурой. У каждой фигуры свой
# квадрат видимости: рисунки разной высоты, и общая рамка оставляла бы
# у планки полокна пустоты.

_FIGURES = {
    # имя: (квадрат видимости, рисунок)
    # планка на предплечьях: корпус почти горизонтален, плечо строго над
    # локтем, предплечье лежит на полу, носки упираются в пол
    "plank": ("6 24 88 88", (
        "GEAR<path d='M6 88h88'/>/GEAR"
        "<circle cx='21' cy='57' r='8'/>"
        "<path d='M31 62 L58 68 L74 72 L85 76 L90 87'/>"
        "<path d='M31 62 L31 82'/>"
        "<path d='M31 82 L13 83'/>"
    )),
    # гиперэкстензия: таз на подушке, корпус разогнут в линию с ногами,
    # щиколотки под валиком
    "hyper": ("6 20 88 88", (
        "GEAR<path d='M6 88h88'/><path d='M47 67h19'/><path d='M56 67 L56 88'/>"
        "<circle cx='80' cy='57' r='5'/><path d='M86 88 L86 66'/>/GEAR"
        "<circle cx='18' cy='48' r='8'/>"
        "<path d='M27 52 L56 62 L70 64 L82 66'/>"
        "<path d='M30 56 L41 61'/>"
    )),
    # горизонтальная тяга: корпус вертикально, рукоять у живота,
    # трос уходит к стопке блинов
    "row": ("6 11 88 88", (
        "GEAR<path d='M6 88h88'/><path d='M52 74 L84 74'/><path d='M68 74 L68 88'/>"
        "<path d='M24 66 L24 84'/><path d='M12 42 L12 82'/>"
        "<path d='M5 50h14M5 58h14M5 66h14'/><path d='M44 56 L15 52'/>/GEAR"
        "<circle cx='64' cy='30' r='8'/>"
        "<path d='M64 38 L64 63'/>"
        "<path d='M64 63 L42 66 L31 78 L26 80'/>"
        "<path d='M64 42 L52 52 L44 56'/>"
    )),
}


def figure(name: str, size: int = 112, color: str = None,
           stroke: float = 4.0) -> str:
    """Фигура упражнения, нарисованная кодом. Снаряд рисуется тем же штрихом,
    но тоньше и глуше: он подсказывает обстановку, а не забирает внимание."""
    col = color or g.GOLD
    box, art = _FIGURES[name]
    gear = f"<g stroke='{g.GOLD_DEEP}' stroke-width='{stroke * 0.6:.1f}'>"
    body = art.replace("GEAR", gear, 1).replace("/GEAR", "</g>", 1)
    return (
        f'<svg viewBox="{box}" width="{size}" height="{size}" fill="none" '
        f'stroke="{col}" stroke-width="{stroke}" stroke-linecap="round" '
        f'stroke-linejoin="round" style="display:block">{body}</svg>')


def icon(name: str, size: int = 34, color: str = None, stroke: float = 1.8) -> str:
    """Штриховая иконка 24×24, растянутая до size пикселей канвы."""
    path = _ICONS.get(name, _ICONS["check"])
    col = color or g.GOLD
    return (f'<svg viewBox="0 0 24 24" width="{size}" height="{size}" fill="none" '
            f'stroke="{col}" stroke-width="{stroke}" stroke-linecap="round" '
            f'stroke-linejoin="round" style="flex:none;display:block">{path}</svg>')


# ─────────────────────────── шапка и подвал ───────────────────────────

def rail(active: int) -> str:
    """Четыре уровня курса полосой. Пройденные и текущий — золотом."""
    segs, names = [], []
    for lv in g.LEVELS:
        on = " on" if lv["n"] <= active else ""
        segs.append(f'<div class="seg{on}"></div>')
        names.append(f'<div class="nm{" on" if lv["n"] == active else ""}">{lv["name"]}</div>')
    return (f'<div class="rail">{"".join(segs)}</div>'
            f'<div class="rail" style="margin-top:0">{"".join(names)}</div>')


def head(eyebrow: str, right: str = "", level: int = 0) -> str:
    r = f'<div class="eyebrow mute">{right}</div>' if right else ""
    tail = rail(level) if level else ""
    return (f'<div class="head pad"><div class="line">'
            f'<div class="eyebrow">{eyebrow}</div>{r}</div>{tail}</div>')


def foot(left: str = "", slogan: bool = True) -> str:
    sl = ('<div class="slogan">Терпение + Дисциплина =<br><b>Результат</b></div>'
          if slogan else "")
    return f'<div class="foot pad">{left or "<div></div>"}{sl}</div>'


def done_row() -> str:
    """Вечерний чек-ин: страница не заполняется, ответ уходит боту одной кнопкой."""
    return ('<div style="display:flex;align-items:center;gap:34px">'
            f'<div class="checkline" style="padding:0;gap:14px">{checkbox()}'
            '<span style="font-size:27px;font-weight:700">Сделал</span></div>'
            f'<div class="checkline" style="padding:0;gap:14px">{checkbox()}'
            '<span style="font-size:27px;color:' + g.TEXT_3 + '">Не вышло</span></div></div>')


def checkbox() -> str:
    return '<div class="checkbox"></div>'


# ─────────────────────────── плитки ───────────────────────────

def tile(body: str, cap: str = "", cls: str = "", style: str = "") -> str:
    c = f'<div class="cap">{cap}</div>' if cap else ""
    st = f' style="{style}"' if style else ""
    return f'<div class="tile {cls}"{st}>{c}{body}</div>'


def bento(tiles: list[str], cols: int = 2, gap: int = 20, style: str = "") -> str:
    kind = {1: "", 2: "two", 3: "three"}[cols]
    return (f'<div class="bento {kind}" style="gap:{gap}px;{style}">'
            f'{"".join(tiles)}</div>')


def plate(html: str, accent: bool = False, pad: str = "40px 42px") -> str:
    """Плашка с главной мыслью дня — то, что человек прочитает, даже если
    остальное пролистает.

    `pad` поджимается только там, где на листе две плашки: на дне 14 при
    обычных сорока пикселях сверху и снизу контент вылезает за 1920 px.
    """
    cls = "tile gold" if accent else "tile solid"
    return (f'<div class="{cls}" style="padding:{pad}">'
            f'<div style="font-size:34px;line-height:1.32;font-weight:700">{html}</div></div>')


def rows(items: list[tuple[str, str]]) -> str:
    r = "".join(f'<div class="r"><div class="t">{t}</div><div class="v">{v}</div></div>'
                for t, v in items)
    return f'<div class="rows">{r}</div>'


def checks(items: list[str]) -> str:
    r = "".join(f'<div class="checkline">{checkbox()}'
                f'<span style="font-size:28px;line-height:1.35">{t}</span></div>'
                for t in items)
    return r


def fields(labels: list[str], cols: int = 2) -> str:
    """Поля под запись. Их немного и они короткие: страница не анкета."""
    # Подпись растягивается, окно прижато к низу: иначе двухстрочная подпись
    # («Отбой → подъём») роняет своё окно ниже соседних, и ряд едет.
    cells = "".join(
        f'<div style="display:flex;flex-direction:column">'
        f'<div class="small" style="flex:1;margin-bottom:8px">{l}</div>'
        f'<div class="field"></div></div>' for l in labels)
    return (f'<div style="display:grid;grid-template-columns:repeat({cols},1fr);'
            f'gap:14px 26px;margin-top:4px">{cells}</div>')


def numlist(items: list[tuple[str, str]], cols: int = 1) -> str:
    """Нумерованный список. В три колонки он занимает втрое меньше высоты —
    на листе 1920 px это разница между «влезло» и «обрезалось»."""
    out = []
    for i, (title, text) in enumerate(items, 1):
        out.append(
            '<div style="display:flex;gap:18px;align-items:flex-start">'
            f'<div style="font-family:\'Bebas\',sans-serif;font-size:44px;line-height:1;'
            f'color:{g.GOLD};flex:none;width:36px">{i}</div>'
            f'<div><div style="font-size:29px;font-weight:700;margin-bottom:4px">{title}</div>'
            f'<div class="body" style="font-size:27px;color:{g.TEXT_3}">{text}</div></div></div>')
    if cols > 1:
        return (f'<div style="display:grid;grid-template-columns:repeat({cols},1fr);'
                f'gap:26px 30px">{"".join(out)}</div>')
    return f'<div style="display:flex;flex-direction:column;gap:20px">{"".join(out)}</div>'


def btn(label: str, href: str = "", icon_name: str = "arrow") -> str:
    tag_open = f'<a class="btn" href="{href}">' if href else '<div class="btn">'
    tag_close = "</a>" if href else "</div>"
    ic = icon(icon_name, 30, "#1A1206", 2.2)
    return f'{tag_open}<span>{label}</span>{ic}{tag_close}'


def photo(src: str, height: int, scrim: bool = True, style: str = "",
          pos: str = "center") -> str:
    sc = '<div class="scrim"></div>' if scrim else ""
    return (f'<div class="photo" style="height:{height}px;{style}">'
            f'<img src="{src}" style="object-position:{pos}" alt="">{sc}</div>')


def level_chip(level: dict) -> str:
    return ('<div style="display:inline-flex;align-items:center;gap:14px;'
            f'padding:14px 26px;border-radius:999px;background:{g.GOLD_SOFT};'
            f'border:1px solid {g.GOLD_EDGE}">'
            f'{icon(level["icon"], 28)}'
            f'<span style="font-family:\'Intro\',sans-serif;font-size:19px;'
            f'letter-spacing:2.6px;text-transform:uppercase;color:{g.GOLD}">'
            f'Уровень {level["n"]} · {level["name"]}</span></div>')
