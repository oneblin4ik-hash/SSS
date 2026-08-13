#!/usr/bin/env python3
"""
Скачивает woff2-подмножества шрифтов с Google Fonts в fonts/ и собирает fonts.css.

Зачем локально, а не <link> на Google Fonts:
рендер PDF должен быть детерминированным и работать без сети. Плюс при рендере
из file:// внешние шрифты подгружаются нестабильно, и Chromium успевает
напечатать страницу дефолтным шрифтом.

Важно про выбор гарнитур:
в Crimson-хендоффе для display указан Space Grotesk, но у него НЕТ кириллицы
(Google Fonts отдаёт только latin / latin-ext / vietnamese). Весь наш текст
русский, поэтому display = Manrope — это ровно та гарнитура, которую тот же
хендофф задаёт для светлой «печатной» схемы («Студия»: Manrope 800/700/400),
а наши страницы как раз светлые. Inter и JetBrains Mono кириллицу имеют.

Запуск:  python3 fetch_fonts.py
"""
import pathlib
import re
import urllib.request

HERE = pathlib.Path(__file__).parent
FONT_DIR = HERE / "fonts"

# UA современного Chrome — иначе Google Fonts отдаёт ttf вместо woff2
UA = ("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

FAMILIES = [
    "Manrope:wght@400;500;600;700;800",
    "Inter:wght@400;500;600;700",
    "JetBrains+Mono:wght@400;500;700",
]

# Оставляем только те подмножества, что реально нужны: кириллица и латиница.
# greek/vietnamese выкидываем, чтобы не таскать лишние файлы.
KEEP_SUBSETS = {"cyrillic", "cyrillic-ext", "latin", "latin-ext"}


def get(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def main() -> None:
    FONT_DIR.mkdir(exist_ok=True)
    css_out: list[str] = [
        "/* Сгенерировано fetch_fonts.py — руками не править. */\n"
    ]

    for fam in FAMILIES:
        css = get(
            f"https://fonts.googleapis.com/css2?family={fam}&display=swap"
        ).decode("utf-8")

        # CSS от Google — это последовательность:
        #   /* subset */
        #   @font-face { ... }
        blocks = re.split(r"/\*\s*([a-z-]+)\s*\*/", css)
        # blocks = ['', subset, face, subset, face, ...]
        for i in range(1, len(blocks) - 1, 2):
            subset, face = blocks[i], blocks[i + 1]
            if subset not in KEEP_SUBSETS:
                continue

            m = re.search(r"src:\s*url\((https://[^)]+\.woff2)\)", face)
            if not m:
                continue
            url = m.group(1)

            fam_name = re.search(r"font-family:\s*'([^']+)'", face).group(1)
            weight = re.search(r"font-weight:\s*(\d+)", face).group(1)

            slug = fam_name.lower().replace(" ", "-")
            fname = f"{slug}-{weight}-{subset}.woff2"
            path = FONT_DIR / fname
            if not path.exists():
                path.write_bytes(get(url))
                print(f"  скачан {fname}")

            local_face = face.replace(url, fname)
            css_out.append(local_face.strip())

    (FONT_DIR / "fonts.css").write_text("\n\n".join(css_out), encoding="utf-8")
    n = len(list(FONT_DIR.glob("*.woff2")))
    print(f"Готово: {n} файлов шрифтов + fonts.css")


if __name__ == "__main__":
    main()
