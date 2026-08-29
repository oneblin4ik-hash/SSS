"""
HTML → PDF через headless Chromium (Playwright).

Почему не reportlab: страницам нужны градиенты, clip-path, SVG-иконки,
цветные эмодзи и веб-шрифты с кириллицей. Разложить это на примитивы холста
можно, но поддерживать невозможно. Навык pdf разрешает путь html-to-pdf.

Почему file://, а не set_content: страницы подтягивают локальные шрифты и
avatar.png по относительным путям. Из about:blank относительные пути не
резолвятся, и Chromium печатает страницу дефолтной гарнитурой.
"""
import os
import pathlib

from playwright.sync_api import sync_playwright

# Ищем контент, который вылез за нижнее поле листа или заехал под подвал.
# .sheet стоит overflow:hidden, поэтому в PDF это выглядит как обрезанный
# текст, а не как съехавшая вёрстка — глазами ловится плохо, особенно когда
# страниц пятнадцать.
_OVERFLOW_JS = """
() => {
  const out = [];
  document.querySelectorAll('.sheet').forEach((sheet, i) => {
    const content = sheet.querySelector('.content');
    if (!content) return;
    const foot = sheet.querySelector('.foot');
    const limit = foot
      ? foot.getBoundingClientRect().top
      : sheet.getBoundingClientRect().bottom
        - parseFloat(getComputedStyle(sheet).paddingBottom);
    const over = content.getBoundingClientRect().bottom - limit;
    if (over > 1) {
      const mm = over / (96 / 25.4);
      out.push(`стр. ${i + 1} — контент вылезает за поля на ${mm.toFixed(1)} мм`);
    }
  });
  return out.length ? out.join('; ') : null;
}
"""

ROOT = pathlib.Path(__file__).resolve().parent.parent
BUILD = ROOT / "build"
OUT = ROOT / "out"

# Chromium уже стоит в образе; качать ничего не нужно.
os.environ.setdefault("PLAYWRIGHT_BROWSERS_PATH", "/opt/pw-browsers")
_CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"


def _executable() -> str | None:
    return _CHROME if pathlib.Path(_CHROME).exists() else None


class Renderer:
    """Один запуск браузера на весь комплект — иначе 15 холодных стартов."""

    def __init__(self, overflow_js: str | None = None) -> None:
        BUILD.mkdir(exist_ok=True)
        OUT.mkdir(exist_ok=True)
        self._pw = None
        self._browser = None
        # У курса своя вёрстка и свой признак переполнения: лист там ужат
        # трансформом, и мерить миллиметры по экранным координатам нельзя.
        self._overflow_js = overflow_js or _OVERFLOW_JS
        # Сюда падают страницы, где контент вылез за поля. У .sheet стоит
        # overflow:hidden, поэтому в PDF переполнение выглядит как молча
        # обрезанный текст — глазами это ловится не всегда.
        self.warnings: list[str] = []

    def __enter__(self) -> "Renderer":
        self._pw = sync_playwright().start()
        self._browser = self._pw.chromium.launch(
            executable_path=_executable(),
            args=["--font-render-hinting=none"],
        )
        return self

    def __exit__(self, *exc) -> None:
        if self._browser:
            self._browser.close()
        if self._pw:
            self._pw.stop()

    def render(self, html: str, slug: str, page_size) -> pathlib.Path:
        """Кладёт html в build/<slug>.html и печатает out/<slug>.pdf."""
        src = BUILD / f"{slug}.html"
        src.write_text(html, encoding="utf-8")
        dst = OUT / f"{slug}.pdf"

        pg = self._browser.new_page()
        pg.goto(src.as_uri(), wait_until="load")
        # Без этого Chromium успевает напечатать до подгрузки woff2.
        pg.evaluate("document.fonts.ready")

        overflow = pg.evaluate(self._overflow_js)
        if overflow:
            self.warnings.append(f"{slug}: {overflow}")

        pg.pdf(
            path=str(dst),
            width=page_size.size["width"],
            height=page_size.size["height"],
            print_background=True,
            margin={"top": "0", "bottom": "0", "left": "0", "right": "0"},
            prefer_css_page_size=True,
        )
        pg.close()
        return dst


def document(css: str, body: str, title: str = "") -> str:
    """Обёртка страницы. Отдельная функция, чтобы каркас был в одном месте."""
    return f"""<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>{title}</title>
<style>{css}</style>
</head>
<body>{body}</body>
</html>"""
