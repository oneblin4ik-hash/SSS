#!/usr/bin/env python3
"""
Собирает инструкцию по запуску воронки в Telegram в самодостаточный HTML.

    python3 build_guide.py

Содержимое лежит в guide.html рядом — здесь только обвязка: шрифты из
quiz-test/fonts вшиваются в base64, потому что в артефактах на claude.ai
строгий CSP и внешние хосты режутся молча. Сборка проверяет результат.

На выходе out/zapusk-v-telegram.html — его и публикуем.
"""
import base64
import pathlib
import re
import sys

HERE = pathlib.Path(__file__).parent
FONTS = HERE.parent / "quiz-test" / "fonts"
OUT = HERE / "out"

FACES = [
    ("Manrope", 400), ("Manrope", 600), ("Manrope", 700), ("Manrope", 800),
    ("Inter", 400), ("Inter", 500), ("Inter", 600), ("Inter", 700),
    ("JetBrains Mono", 500),
]


def font_css() -> str:
    out = []
    for name, weight in FACES:
        slug = name.lower().replace(" ", "-")
        for subset in ("cyrillic", "latin"):
            path = FONTS / f"{slug}-{weight}-{subset}.woff2"
            if not path.exists():
                sys.exit(f"нет шрифта {path}")
            b64 = base64.b64encode(path.read_bytes()).decode("ascii")
            out.append(
                f"@font-face{{font-family:'{name}';font-style:normal;"
                f"font-weight:{weight};font-display:swap;"
                f"src:url(data:font/woff2;base64,{b64}) format('woff2')}}"
            )
    return "".join(out)


def main() -> None:
    src = (HERE / "guide.html").read_text(encoding="utf-8")
    page = src.replace("/*FONTS*/", font_css())

    OUT.mkdir(exist_ok=True)
    dst = OUT / "zapusk-v-telegram.html"
    dst.write_text(page, encoding="utf-8")

    outside = re.findall(r'(?:src|href)="(?!data:|#)([^"]+)"', page)
    if outside:
        sys.exit(f"внешние ресурсы {outside[:3]} — CSP их срежет")
    print(f"  {dst.name} ({dst.stat().st_size // 1024} КБ)")
    print("Внешних ресурсов нет.")


if __name__ == "__main__":
    main()
