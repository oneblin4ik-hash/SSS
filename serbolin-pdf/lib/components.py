"""
Сквозные элементы страниц трипваера: шапка, полоса прогресса, подвал,
чекбоксы, поля под запись, простые пиктограммы упражнений.

Всё, что повторяется на всех 14 днях, живёт здесь — чтобы поменять один раз.
"""
from . import theme

DAYS_TOTAL = 14


def emo(char: str) -> str:
    return f'<span class="emo">{char}</span>'


def head(day: int, left: str | None = None, right: str | None = None) -> str:
    """Колонтитул: слева номер дня, справа он же цифрами.

    Название уровня сюда не дублируем — оно живёт в чипе под полосой
    прогресса, где эмодзи набран достаточно крупно, чтобы читаться.
    """
    return (
        '<div class="head">'
        f'<div class="left">{left or f"День {day}"}</div>'
        f'<div class="right">{right or f"{day} / {DAYS_TOTAL}"}</div>'
        "</div>"
    )


def levels_bar(day: int) -> str:
    """Четыре сегмента по уровням курса. Текущий залит акцентом.

    Повторяет логику прогресса из app/kviz-serbolin.html: пройденные уровни
    закрашены приглушённо, текущий — в полную силу.
    """
    lv_now = theme.level_for_day(day)["n"]
    cells = []
    for lv in theme.LEVELS:
        if lv["n"] < lv_now:
            cls = "lv done"
        elif lv["n"] == lv_now:
            cls = "lv now"
        else:
            cls = "lv"
        cells.append(
            f'<div class="{cls}"><div class="bar"></div>'
            f'<div class="cap">{lv["name"]}</div></div>'
        )
    return '<div class="levels">' + "".join(cells) + "</div>"


def level_chip(day: int) -> str:
    lv = theme.level_for_day(day)
    return (
        f'<span class="lvchip">{emo(lv["emoji"])}'
        f'Уровень {lv["n"]} · {lv["name"]}</span>'
    )


def foot(day: int) -> str:
    """Подвал: бумажный аналог чек-ина из бота + номер дня из 14."""
    return (
        '<div class="foot">'
        '<div class="checkin">'
        '<div class="ci"><div class="box"></div>Сделал</div>'
        '<div class="ci"><div class="box"></div>Не вышло</div>'
        "</div>"
        f'<div class="pg"><b>{day}</b> / {DAYS_TOTAL}</div>'
        "</div>"
    )


def check(text: str, big: bool = False) -> str:
    cls = "box lg" if big else "box"
    return f'<div class="check"><div class="{cls}"></div><div>{text}</div></div>'


def checks(items: list[str], big: bool = False) -> str:
    return '<div class="checks">' + "".join(
        check(t, big) for t in items
    ) + "</div>"


def fill(width_mm: float = 30) -> str:
    """Пунктирная линейка под запись от руки."""
    return f'<span class="fill" style="min-width:{width_mm}mm"></span>'


def note(label: str, inner: str) -> str:
    return f'<div class="note"><span class="eyebrow">{label}</span>{inner}</div>'


def pull(text: str) -> str:
    """Врезка с ключевой мыслью урока — крупным кеглем.

    Единственный разрешённый способ процитировать урок в PDF: страница
    остаётся артефактом, а не копией сообщения бота.
    """
    return f'<div class="pull">{text}</div>'


# ── пиктограммы упражнений ────────────────────────────────────
#
# Фото людей в документах не используем (решение проекта). Иллюстрации —
# контурные фигуры, отрисованные кодом, как золотые силуэты в квизе; здесь
# они в алом, потому что палитра комплекта — Crimson.

_STROKE = f'fill="none" stroke="{theme.ACCENT}" stroke-width="3.4" \
stroke-linecap="round" stroke-linejoin="round"'
_HEAD = f'fill="{theme.ACCENT}"'

_FIGURES = {
    # приседания — таз назад, колени согнуты, руки вперёд
    "squat": '<circle cx="40" cy="16" r="8" {h}/>'
             '<path d="M40 25 L40 46 M40 46 L28 62 L28 78 M40 46 L54 60 L54 78 '
             'M40 30 L62 28" {s}/>',
    # отжимания от опоры — наклонный корпус, руки в упор
    "pushup": '<circle cx="22" cy="24" r="8" {h}/>'
              '<path d="M28 30 L54 52 L54 76 M28 30 L20 52 L20 74 '
              'M14 78 L70 78" {s}/>',
    # ягодичный мостик — лёжа, таз вверх
    "bridge": '<circle cx="16" cy="62" r="8" {h}/>'
              '<path d="M24 62 L44 44 L58 62 L58 78 M24 62 L24 78" {s}/>'
              '<path d="M8 78 L74 78" {s}/>',
    # выпад назад — одна нога отставлена
    "lunge": '<circle cx="38" cy="16" r="8" {h}/>'
             '<path d="M38 25 L38 48 M38 48 L34 64 L34 78 M38 48 L58 66 L64 78 '
             'M38 32 L28 44" {s}/>',
    # планка — прямая линия корпуса на предплечьях
    "plank": '<circle cx="18" cy="46" r="8" {h}/>'
             '<path d="M25 49 L64 60 L64 76 M25 49 L22 62 L14 62 M14 62 L14 76 '
             'M10 78 L72 78" {s}/>',
    # ходьба — бытовая активность дня отдыха
    "walk": '<circle cx="40" cy="16" r="8" {h}/>'
            '<path d="M40 25 L40 48 M40 48 L30 64 L26 78 M40 48 L52 62 L56 78 '
            'M40 32 L30 40 M40 32 L52 40" {s}/>',
}


def figure(kind: str, size_mm: float = 14) -> str:
    """Контурная фигура упражнения. Рисуется кодом, не картинка."""
    body = _FIGURES[kind].format(s=_STROKE, h=_HEAD)
    return (
        f'<svg viewBox="0 0 80 88" width="{size_mm}mm" height="{size_mm * 1.1}mm" '
        f'xmlns="http://www.w3.org/2000/svg">{body}</svg>'
    )
