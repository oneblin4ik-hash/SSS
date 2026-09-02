#!/usr/bin/env python3
"""
Курс «Первые шаги к форме» — тёмная золотая версия, страница на PDF.

    python3 build_kurs.py

На выходе в out/: kurs-*.pdf по странице на файл плюс kurs-polnyy.pdf —
один связный курс одним документом, чтобы смотреть подряд.

Варианты. Три страницы расходятся по цели (дни 3, 6, 7 — суффикс -nabor),
четыре по полу (дни 4, 9, 11, 13 — суффикс -m или -zh: базовый комплекс
у мужчин без ягодичного мостика, решение владельца). Файлов поэтому больше,
чем страниц у одного человека: бот выбирает по ответам квиза и присылает
по одному файлу в день. В kurs-polnyy.pdf уходит показательная сборка —
похудение, мужчина; её собирает kurs.book().

Чем это отличается от build_tripwire.py. Тот собирает прежний набор в
алой светлой системе и остаётся на месте: на него завязаны лид-магнит,
галерея и симулятор бота. Здесь новая система — тёмная, золотая, с бенто
и стеклом, по канве, которую владелец собрал в Claude Design. Пока живут
обе; когда новый курс примут, старую можно снимать.

Лист. Макет нарисован в 1080×1920 px, печатается на 130×231 мм — та же
ширина, что у прежних страниц дня. Пропорция 9:16 совпадает, поэтому лист
ужимается целиком, без перекомпоновки: что в канве, то и в PDF.

Проверка. Своя, а не общая из render.py: страница ужата трансформом, и
экранные координаты меряются в масштабе. Считаем прямо в пикселях канвы.
"""
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))

from data import kurs
from lib import gold as g
from lib.render import Renderer, document

ROOT = pathlib.Path(__file__).parent
OUT = ROOT / "out"

# Контент не должен вылезать за нижний край листа. Меряем в пикселях канвы:
# .stage ужат трансформом, поэтому берём scrollHeight, а не рект.
OVERFLOW_JS = """
() => {
  const out = [];
  document.querySelectorAll('.stage').forEach((st, i) => {
    const over = st.scrollHeight - %d;
    if (over > 1) out.push(`лист ${i + 1}: контент вылезает на ${over} px макета`);
  });
  return out.length ? out.join('; ') : null;
}
""" % g.DESIGN_H


def page_html(body) -> str:
    """body — строка или список строк: страница из одного листа или из двух."""
    css = g.base_css(g.PHONE) + kurs.WK_CSS
    sheets = body if isinstance(body, list) else [body]
    html = "".join(f'<div class="sheet"><div class="stage">{s}</div></div>'
                   for s in sheets)
    return document(css, html, "Первые шаги к форме")


def merge(paths: list[pathlib.Path], dst: pathlib.Path) -> None:
    """Склейка без внешних зависимостей: pypdfium2 уже стоит ради preview."""
    import pypdfium2 as pdfium
    doc = pdfium.PdfDocument.new()
    for p in paths:
        src = pdfium.PdfDocument(p)
        doc.import_pages(src)
    doc.save(dst)


#: Показательная сборка для kurs-polnyy.pdf. Любая комбинация даёт связный
#: курс; эта выбрана как самая частая по ответам квиза.
SHOWCASE = {"goal": "cut", "sex": "m"}


def main() -> None:
    pages = kurs.all_pages()
    made: dict[str, pathlib.Path] = {}

    with Renderer(overflow_js=OVERFLOW_JS) as r:
        for p in pages:
            made[p["slug"]] = r.render(page_html(p["body"]), p["slug"], g.PHONE)
        warnings = list(r.warnings)

    total = sum(p.stat().st_size for p in made.values())
    print(f"Собрано страниц: {len(made)}, {total // 1024} КБ")
    for slug, p in made.items():
        print(f"  {p.name}  {p.stat().st_size // 1024} КБ")

    full = OUT / "kurs-polnyy.pdf"
    merge([made[p["slug"]] for p in kurs.book(**SHOWCASE)], full)
    print(f"\nПоказательная сборка ({SHOWCASE['goal']} · {SHOWCASE['sex']}): "
          f"{full.name}  {full.stat().st_size // 1024} КБ")

    if warnings:
        print("\nПереполнение — контент обрежется молча:")
        for w in warnings:
            print("  !", w)
        raise SystemExit(1)
    print("Готово, переполнений нет.")


if __name__ == "__main__":
    main()
