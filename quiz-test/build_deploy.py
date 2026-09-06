#!/usr/bin/env python3
"""
Готовит папку для выкладки квиза на статический хостинг.

    python3 build_deploy.py

Кладёт боевой `kviz-serbolin.html` в `dist/index.html` — чтобы адрес был
без имени файла, `https://…/`, а не `https://…/kviz-serbolin.html`. Этот
адрес вписывается в бота один раз и потом не меняется, поэтому короткий
лучше.

Перед копированием проверяет три вещи, на которых Mini App ломается молча:

1. `CFG.API` пуст. Результат уходит через `Telegram.WebApp.sendData`, и это
   работает только при запуске из reply-keyboard кнопки. Непустой API
   означает, что кто-то переключил схему на бэкенд, а его нет.
2. `CFG.FIGURES` заполнен — по шесть картинок на пол. Пустой массив не
   ломает квиз, но человек увидит контурные силуэты вместо фигур.
3. Внешние адреса — только шрифты Google и скрипт Telegram. Всё остальное
   в закрытом окружении не откроется, и это надо заметить здесь, а не
   по жалобе «у меня белый экран».
"""
import pathlib
import re
import shutil
import sys

HERE = pathlib.Path(__file__).parent
SRC = HERE / "kviz-serbolin.html"
DIST = HERE / "dist"

ALLOWED = (
    "https://fonts.googleapis.com",
    "https://fonts.gstatic.com",
    "https://telegram.org/js/telegram-web-app.js",
)


def main() -> int:
    html = SRC.read_text(encoding="utf-8")
    bad = []

    api = re.search(r'API:\s*"([^"]*)"', html)
    if api and api.group(1):
        bad.append(f'CFG.API не пуст: "{api.group(1)}" — sendData работать не будет')

    for sex, human in (("f", "женских"), ("m", "мужских")):
        block = re.search(rf"\b{sex}:\s*\[(.*?)\]", html, re.S)
        n = block.group(1).count("data:image") if block else 0
        if n != 6:
            bad.append(f"{human} фигур {n}, а нужно 6")

    # Ищем только то, что браузер реально пойдёт грузить: src, href и fetch.
    # Просто «все https в файле» не годится — в комментариях лежит пример
    # адреса для CFG.API, и он каждый раз поднимал ложную тревогу.
    used = re.findall(r'(?:src|href)="(https://[^"]+)"', html)
    used += re.findall(r'fetch\(\s*["\'](https://[^"\']+)', html)
    outside = {u for u in used if not u.startswith(ALLOWED)}
    for u in sorted(outside):
        bad.append(f"внешний адрес, которого быть не должно: {u}")

    if bad:
        print("Не выкладываем:")
        for b in bad:
            print("  •", b)
        return 1

    DIST.mkdir(exist_ok=True)
    dst = DIST / "index.html"
    shutil.copyfile(SRC, dst)
    print(f"Готово: {dst.relative_to(HERE.parent)} ({dst.stat().st_size // 1024} КБ)")
    print("Внешнего только шрифты Google и скрипт Telegram — так и задумано.")
    print()
    print("Дальше: залить папку dist на статический хостинг и вписать")
    print("полученный адрес в бота, в WebAppInfo(url=…).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
