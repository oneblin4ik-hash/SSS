#!/usr/bin/env python3
"""
Галерея материалов воронки — всё, что человек видит глазами, одной страницей.

    python3 build_gallery.py

На выходе два файла в out/:

    galereya-voronki.html            открывается двойным кликом
    galereya-voronki-artifact.html   то же без обёртки документа — под артефакт

Что показывает, по порядку прохождения:

1. страница оффера — то, что открывается после лид-магнита;
2. обложка курса и лист «Перед стартом»;
3. все 14 страниц дней — по одной на урок.

Растр берётся из preview/ (прогони preview.py, если давно не обновлял),
подпись под каждой страницей — поле lead из data/days.py, то есть ровно
то, зачем эта страница нужна. Второй раз тексты нигде не пишутся.

Скриншот оффера страница делает сама, через Chromium из образа: держать
его картинкой в репозитории смысла нет, он протухнет на первой же правке.

Клик по странице открывает её крупно — в сетке текст мелкий, а проверять
надо именно текст.
"""
import base64
import html
import pathlib
import re
import sys

from data import days as days_data
from data import intro as intro_data
from build_course import avatar_b64, font_css

ROOT = pathlib.Path(__file__).parent
PREVIEW = ROOT / "preview"
OUT = ROOT / "out"
OFFER = ROOT.parent / "offer-page" / "out" / "offer.html"
SHOT = OUT / ".offer-shot.png"

ACCENT = "#D8232A"


# ─────────────────────────── картинки ───────────────────────────

def png_b64(path: pathlib.Path) -> str:
    if not path.exists():
        raise SystemExit(f"нет {path.name} — прогони preview.py")
    return "data:image/png;base64," + base64.b64encode(path.read_bytes()).decode("ascii")


def sheet(day: int) -> pathlib.Path:
    if day == 0:
        return PREVIEW / "tripvaer-00-pered-startom.png"
    hits = sorted(PREVIEW.glob(f"tripvaer-{day:02d}-*.png"))
    if not hits:
        raise SystemExit(f"нет превью дня {day} — прогони preview.py")
    return hits[0]


def offer_shot() -> str:
    """Снимает страницу оффера целиком. Ширина 1180 — на ней сетка ещё
    двухколоночная, как её увидят с десктопа."""
    if not OFFER.exists():
        raise SystemExit("нет offer-page/out/offer.html — прогони build_offer.py")
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        b = p.chromium.launch(
            executable_path="/opt/pw-browsers/chromium-1194/chrome-linux/chrome")
        pg = b.new_page(viewport={"width": 1180, "height": 1000},
                        device_scale_factor=1)
        pg.goto(OFFER.resolve().as_uri(), wait_until="load")
        pg.evaluate("document.fonts.ready")
        pg.wait_for_timeout(500)
        pg.screenshot(path=str(SHOT), full_page=True)
        b.close()
    data = png_b64(SHOT)
    SHOT.unlink(missing_ok=True)
    return data


# ─────────────────────────── разметка ───────────────────────────

def card(src: str, num: str, title: str, note: str, tall: bool = False) -> str:
    cls = " tall" if tall else ""
    return (
        f'<figure class="card{cls}">'
        f'<button class="shot" type="button" data-full="{src}" '
        f'aria-label="Открыть крупно: {html.escape(title)}">'
        f'<img src="{src}" alt="" loading="lazy"></button>'
        f'<figcaption><span class="n">{num}</span>'
        f'<b>{html.escape(title)}</b><p>{html.escape(note)}</p></figcaption>'
        "</figure>"
    )


def body() -> str:
    days = [(n, days_data.get(n)) for n in range(1, 15)]
    cards = "".join(
        card(png_b64(sheet(n)), f"{n:02d}", d["title"], d["lead"])
        for n, d in days
    )
    return f"""
<header class="top">
  <div class="brand"><img src="{avatar_b64()}" alt="">
    <div>Эдуард Серболин<span>Первые шаги к форме · 14 дней</span></div></div>
  <h1>Что человек видит глазами</h1>
  <p class="lead">Страница оффера, обложка и все шестнадцать листов курса —
  в том порядке, в котором они приходят. Клик по странице открывает её крупно.</p>
</header>

<section class="sec">
  <div class="sec-head"><span class="eyebrow">Шаг 1</span>
    <h2>После лид-магнита — оффер</h2>
    <p>Открывается из бота сразу за персональным разбором. Кнопка ведёт
    в личку к Эдуарду: платёжной системы нет, реквизиты он называет сам.</p></div>
  <div class="one">{card(offer_shot(), "—", "Страница оффера",
      "1 890 ₽, состав курса, отзывы-заглушки и FAQ. Одна страница, один переход.",
      tall=True)}</div>
</section>

<section class="sec">
  <div class="sec-head"><span class="eyebrow">Шаг 2</span>
    <h2>Сразу после покупки</h2>
    <p>Два листа приходят в чат тем же вечером, до первого урока.</p></div>
  <div class="grid">
    {card(png_b64(PREVIEW / "tripvaer-00-oblozhka.png"), "00", "Обложка курса",
          "Название, четыре уровня и цена. Лежит первой в комплекте.")}
    {card(png_b64(sheet(0)), "00", intro_data.TITLE,
          "Перед стартом: на чём держится результат — привычка, мышление, дисциплина.")}
  </div>
</section>

<section class="sec">
  <div class="sec-head"><span class="eyebrow">Шаг 3</span>
    <h2>14 дней — по листу на урок</h2>
    <p>Каждое утро вместе с уроком и заданием. Лист печатный: его заполняют
    ручкой, а не читают с экрана.</p></div>
  <div class="grid">{cards}</div>
</section>

<div class="lb" id="lb" hidden>
  <button class="lb-x" type="button" aria-label="Закрыть">×</button>
  <img id="lbimg" src="" alt="">
</div>

<script>
(function(){{
  var lb = document.getElementById('lb'), img = document.getElementById('lbimg');
  function open(src){{ img.src = src; lb.hidden = false; document.body.style.overflow = 'hidden'; }}
  function close(){{ lb.hidden = true; img.src = ''; document.body.style.overflow = ''; }}
  document.querySelectorAll('.shot').forEach(function(b){{
    b.onclick = function(){{ open(b.dataset.full); }};
  }});
  lb.onclick = close;
  document.addEventListener('keydown', function(e){{ if (e.key === 'Escape') close(); }});
}})();
</script>"""


def css() -> str:
    return f"""
*{{box-sizing:border-box;margin:0;padding:0}}
:root{{
  --void:#0B0B0C; --plate:#131315; --plate-2:#1B1B1E;
  --line:rgba(255,255,255,.08); --line-2:rgba(255,255,255,.16);
  --accent:{ACCENT}; --accent-hi:#F4363D;
  --text:#fff; --text-2:#C8C8CE; --text-3:#9A9AA0; --text-4:#6B6B72;
}}
html{{-webkit-text-size-adjust:100%}}
body{{background:var(--void);color:var(--text-2);
  font:400 16px/1.5 'Inter',system-ui,'Noto Color Emoji',sans-serif;
  -webkit-font-smoothing:antialiased;padding:44px 26px 90px}}
h1,h2,b{{font-family:'Manrope','Inter',sans-serif;color:var(--text)}}
h1,h2{{font-weight:800;letter-spacing:-.035em;line-height:1.06;text-wrap:balance}}

.top{{max-width:1320px;margin:0 auto 54px}}
.brand{{display:flex;align-items:center;gap:13px;margin-bottom:52px;
  font:700 15px/1.3 'Manrope',sans-serif;color:var(--text)}}
.brand img{{width:42px;height:42px;border-radius:999px}}
.brand span{{display:block;font:400 13px/1.3 'Inter',sans-serif;
  color:var(--text-4);margin-top:3px}}
.top h1{{font-size:clamp(34px,5.4vw,54px)}}
.top .lead{{margin-top:18px;max-width:56ch;font-size:17.5px;color:var(--text-3)}}

.sec{{max-width:1320px;margin:0 auto 64px}}
.sec-head{{margin-bottom:26px;padding-bottom:20px;border-bottom:1px solid var(--line)}}
.eyebrow{{display:block;font:600 11px/1 'Inter',sans-serif;letter-spacing:2.2px;
  text-transform:uppercase;color:var(--accent-hi);margin-bottom:14px}}
.sec-head h2{{font-size:clamp(23px,2.7vw,31px)}}
.sec-head p{{margin-top:11px;max-width:62ch;font-size:15.5px;color:var(--text-3)}}

.grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(238px,1fr));gap:26px}}
.one{{max-width:820px}}

.card{{background:var(--plate);border:1px solid var(--line);border-radius:16px;
  overflow:hidden;display:flex;flex-direction:column}}
.shot{{display:block;width:100%;padding:0;border:0;background:var(--plate-2);
  cursor:zoom-in;line-height:0}}
.shot img{{width:100%;height:auto;display:block}}
.card.tall .shot{{max-height:560px;overflow:hidden}}
.card.tall .shot img{{object-fit:cover;object-position:top}}
.shot:focus-visible{{outline:2px solid var(--accent);outline-offset:-2px}}
figcaption{{padding:16px 17px 18px;border-top:1px solid var(--line)}}
figcaption .n{{font:500 11.5px/1 'JetBrains Mono',ui-monospace,monospace;
  color:var(--accent-hi);letter-spacing:.6px}}
figcaption b{{display:block;margin-top:7px;font-size:15.5px;letter-spacing:-.01em}}
figcaption p{{margin-top:7px;font-size:13.5px;line-height:1.45;color:var(--text-4)}}

.lb{{position:fixed;inset:0;z-index:50;background:rgba(4,4,5,.94);
  display:flex;align-items:flex-start;justify-content:center;
  overflow:auto;padding:34px 18px;cursor:zoom-out}}
.lb[hidden]{{display:none}}
.lb img{{max-width:min(900px,100%);height:auto;border-radius:10px;
  box-shadow:0 30px 90px rgba(0,0,0,.6)}}
.lb-x{{position:fixed;top:16px;right:20px;width:42px;height:42px;border:0;
  border-radius:999px;background:var(--plate-2);color:var(--text);
  font-size:24px;line-height:1;cursor:pointer}}

@media (max-width:620px){{
  body{{padding:30px 16px 60px}}
  .grid{{grid-template-columns:1fr 1fr;gap:16px}}
  figcaption{{padding:12px 12px 14px}}
  figcaption b{{font-size:14px}}
  figcaption p{{display:none}}
}}
"""


def main() -> None:
    OUT.mkdir(exist_ok=True)
    inner = f"<title>Материалы воронки</title>\n<style>{font_css()}{css()}</style>{body()}"

    doc = ('<!DOCTYPE html>\n<html lang="ru">\n<head>\n<meta charset="utf-8">\n'
           '<meta name="viewport" content="width=device-width,initial-scale=1">\n'
           f'{inner.split("</style>")[0]}</style>\n</head>\n<body>'
           f'{inner.split("</style>", 1)[1]}\n</body>\n</html>')
    (OUT / "galereya-voronki.html").write_text(doc, encoding="utf-8")
    (OUT / "galereya-voronki-artifact.html").write_text(inner, encoding="utf-8")

    for f in ("galereya-voronki.html", "galereya-voronki-artifact.html"):
        mb = (OUT / f).stat().st_size / 1024 / 1024
        print(f"  {f} ({mb:.1f} МБ)")
        if mb > 15:
            raise SystemExit("больше 15 МБ — артефакт не примет, уменьши растр")

    live = re.findall(r'(?:src|href)\s*=\s*"(https?://[^"]+)"', doc)
    if live:
        print("\nВнешние ресурсы — в артефакте их срежет CSP:")
        for u in dict.fromkeys(live):
            print("  !", u)
        raise SystemExit(1)
    print("Внешних ресурсов нет — CSP артефакта не помешает.")


if __name__ == "__main__":
    main()
