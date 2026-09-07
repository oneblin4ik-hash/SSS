#!/usr/bin/env python3
"""Растрирует готовые PDF в PNG, чтобы посмотреть на реальный рендер глазами.

Вёрстка в HTML и то, что печатает Chromium, расходятся регулярно: переносы,
переполнение блока, обрезанный подвал. Поэтому после каждой сборки — сюда.

Запуск:  python3 preview.py [имя.pdf ...]   (без аргументов — все out/*.pdf)
"""
import pathlib
import sys

import pypdfium2 as pdfium

ROOT = pathlib.Path(__file__).parent
OUT, PREV = ROOT / "out", ROOT / "preview"


def main() -> None:
    PREV.mkdir(exist_ok=True)
    names = sys.argv[1:]
    pdfs = [OUT / n for n in names] if names else sorted(OUT.glob("*.pdf"))
    for pdf in pdfs:
        doc = pdfium.PdfDocument(str(pdf))
        for i, page in enumerate(doc):
            img = page.render(scale=2.1).to_pil()
            suffix = "" if len(doc) == 1 else f"-{i + 1}"
            img.save(PREV / f"{pdf.stem}{suffix}.png")
        print(f"{pdf.name}: {len(doc)} стр., {doc[0].get_size()}")


if __name__ == "__main__":
    main()
