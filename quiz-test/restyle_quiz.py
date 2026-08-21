#!/usr/bin/env python3
"""
Переводит kviz-serbolin.html на дизайн-систему Crimson.

Меняется только оформление. Логика — typeOf(), plan(), bmi(), порядок
экранов, тексты — не трогается ни в одной строке: имена классов сохранены,
поэтому весь рендер-код продолжает работать как был.

Правится три вещи:
  1. <link> на Google Fonts — Playfair Display меняется на Manrope.
  2. Блок <style> целиком заменяется на crimson-quiz.css.
  3. Цвета, зашитые прямо в JS (SVG графика, легенда, плашка этапа),
     переводятся на алую палитру — из CSS они недоступны.

Запуск:  python3 restyle_quiz.py
Идемпотентно: повторный прогон на уже перекрашенном файле ничего не сломает,
но сообщит, что заменять нечего.
"""
import pathlib
import re
import sys

HERE = pathlib.Path(__file__).parent
SRC = HERE / "kviz-serbolin.html"
CSS = HERE / "crimson-quiz.css"

FONTS_OLD = ("https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900"
             "&family=Inter:wght@400;500;600;700"
             "&family=JetBrains+Mono:wght@500;700&display=swap")
FONTS_NEW = ("https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800"
             "&family=Inter:wght@400;500;600;700"
             "&family=JetBrains+Mono:wght@500;700&display=swap")

# Цвета в JS. Слева — золотая палитра, справа — Crimson.
# Порядок важен: сначала длинные и составные строки.
JS_SWAPS = [
    # Telegram красит служебные полосы под фон приложения
    ("tg.setHeaderColor('#222222'); tg.setBackgroundColor('#222222')",
     "tg.setHeaderColor('#0B0B0C'); tg.setBackgroundColor('#0B0B0C')"),

    # Галочка в чекбоксе: была тёмная на золоте, стала белая на алом.
    # currentColor, чтобы цвет задавался из CSS, а не хардкодом.
    ('<path d="M1 6l3.2 3.4L11 2.4" fill="none" stroke="#222"',
     '<path d="M1 6l3.2 3.4L11 2.4" fill="none" stroke="currentColor"'),

    # Плашка «считаю только первый этап» — золотая заливка на алую
    ('border-left-color:var(--gold);background:#2C2820',
     'border-left-color:var(--accent);background:rgba(216,35,42,.10)'),
    ('<b style="color:var(--gold)">Считаю только первый этап.</b>',
     '<b style="color:var(--accent-hi)">Считаю только первый этап.</b>'),

    # ИМТ в тексте диагностики
    ('<b class="mono" style="color:var(--gold)">', '<b class="mono" style="color:var(--accent-hi)">'),

    # Легенда графика
    ('<i style="background:#D4A843"></i>', '<i style="background:#D8232A"></i>'),
    ('<i style="background:#6B6B6B"></i>', '<i style="background:#4E4E56"></i>'),
    ('<i style="background:#D9584C">', '<i style="background:#F4363D">'),
]

# Точечные замены по всему JS-хвосту: силуэты фигур, кривая прогноза,
# метка зоны риска, оси и подписи графика.
JS_COLOR_MAP = {
    "#D4A843": "#D8232A",   # золото → алый: контуры фигур и кривая «с планом»
    "#D9584C": "#F4363D",   # зона риска
    "#6B6B6B": "#4E4E56",   # пунктир «без плана»
    "#3D3D3D": "rgba(255,255,255,.12)",   # ось графика
    "#8F8F8F": "#6B6B72",   # подписи под графиком
}


def main() -> None:
    html = SRC.read_text(encoding="utf-8")
    before = html
    report: list[str] = []

    # 1. шрифты
    if FONTS_OLD in html:
        html = html.replace(FONTS_OLD, FONTS_NEW)
        report.append("шрифты: Playfair Display → Manrope")

    # 2. стили
    css = CSS.read_text(encoding="utf-8").strip()
    new_html, n = re.subn(
        r"<style>.*?</style>",
        lambda _: "<style>\n" + css + "\n</style>",
        html,
        count=1,
        flags=re.S,
    )
    if n != 1:
        sys.exit("не найден блок <style>")
    html = new_html
    report.append(f"стили: заменён блок <style> ({len(css)} символов)")

    # 3. цвета в JS. Работаем только с хвостом после начала скрипта,
    #    чтобы не задеть свежий CSS и base64 аватара.
    head, sep, tail = html.partition("const AVATAR_B64")
    if not sep:
        sys.exit("не найден AVATAR_B64 — файл изменился, проверь скрипт")

    for old, new in JS_SWAPS:
        if old in tail:
            tail = tail.replace(old, new)
            report.append(f"js: {old[:52]}…")

    for old, new in JS_COLOR_MAP.items():
        cnt = tail.count(old)
        if cnt:
            tail = tail.replace(old, new)
            report.append(f"js: {old} → {new} ×{cnt}")

    html = head + sep + tail

    # #E6E6E6 в список не берём: в Crimson это легитимный --text-2.
    leftover = re.findall(r"#(?:D4A843|D9584C|8C6F2C|8F8F8F|2C2820|2E2820|2E2320)", html)
    if leftover:
        report.append(f"ВНИМАНИЕ, остались старые цвета: {set(leftover)}")
    if "--gold" in html:
        report.append(f"ВНИМАНИЕ, остались ссылки на --gold: {html.count('--gold')}")

    if html == before:
        print("Нечего менять — файл уже на Crimson.")
        return

    SRC.write_text(html, encoding="utf-8")
    print("Готово:")
    for line in report:
        print("  ·", line)


if __name__ == "__main__":
    main()
