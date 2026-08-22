#!/usr/bin/env python3
"""
Собирает комплект трипваера «Первые шаги к форме»:
обложку и 14 отдельных PDF — по одному файлу на день, чтобы бот присылал
страницу вместе с текстом урока.

Запуск:
    python3 build_tripwire.py            # обложка + все 14 дней
    python3 build_tripwire.py 12         # только день 12
    python3 build_tripwire.py cover      # только обложка
    python3 build_tripwire.py intro      # только «Перед стартом»

Результат — out/tripvaer-00-oblozhka.pdf и out/tripvaer-01..14-<слаг>.pdf
"""
import sys
import unicodedata

from data import days as days_data
from data import intro as intro_data
from lib import components as c
from lib import render, theme

COURSE = "Первые шаги к форме"

# Основная раскладка обложки. «Клин слева» — приём, который базовая
# система прямо подписывает как «Герой товара, обложка». «Горизонт»
# собирается по запросу как альтернатива: python3 build_tripwire.py horizon
DEFAULT_COVER = "wedge"
SLOGAN = "Терпение + Дисциплина = Результат"


def _slug(text: str) -> str:
    """Транслит для имён файлов: бот и файловые системы не любят кириллицу."""
    table = {
        "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "ё": "e",
        "ж": "zh", "з": "z", "и": "i", "й": "y", "к": "k", "л": "l", "м": "m",
        "н": "n", "о": "o", "п": "p", "р": "r", "с": "s", "т": "t", "у": "u",
        "ф": "f", "х": "h", "ц": "ts", "ч": "ch", "ш": "sh", "щ": "sch",
        "ъ": "", "ы": "y", "ь": "", "э": "e", "ю": "yu", "я": "ya",
    }
    out = []
    for ch in text.lower():
        if ch in table:
            out.append(table[ch])
        elif ch.isalnum() and unicodedata.category(ch)[0] in "LN":
            out.append(ch)
        elif ch in " -_":
            out.append("-")
    slug = "".join(out)
    while "--" in slug:
        slug = slug.replace("--", "-")
    return slug.strip("-")[:40]


# ─────────────────────────── страница дня ───────────────────────────

def day_page(day: int) -> tuple[str, str, theme.Page]:
    d = days_data.get(day)
    page = d["page"]
    star = c.emo("⭐") if d["star"] else ""

    # Тёмные страницы — те, что читают и запоминают; светлые — те, что
    # заполняют ручкой. Печатать сплошной чёрный лист и писать по нему
    # нечем, поэтому рабочие бланки остаются белыми.
    dark = d.get("dark", False)
    body = f"""
<div class="sheet{' dark' if dark else ''}">
  {'<div class="wedge"></div>' if dark else ''}
  {c.head(day)}
  {c.levels_bar(day)}
  <div class="content">
    <div class="tw">
      {c.level_chip(day)}
      <h1>{d["title"]} {star}</h1>
      <p class="lead">{d["lead"]}</p>
    </div>
    {d["body"]}
  </div>
  {c.foot(day)}
</div>"""

    css = theme.base_css(page) + f"""
.tw {{ margin-top: {page.base_pt * 0.55:.2f}pt; }}
.tw .lvchip {{ margin-bottom: {page.base_pt * 0.52:.2f}pt; }}
.tw h1 {{ margin-bottom: {page.base_pt * 0.34:.2f}pt; }}
.tw .lead {{ color: {theme.INK_2}; font-size: {page.base_pt * 0.92:.2f}pt;
  line-height: 1.38; }}
.sheet.dark .tw .lead {{ color: {theme.D_TEXT_2}; }}
""" + d["css"]

    slug = f"tripvaer-{day:02d}-{_slug(d['title'])}"
    return render.document(css, body, f"День {day}. {d['title']}"), slug, page


# ─────────────────────────── страница «Перед стартом» ───────────────────────

def intro_page() -> tuple[str, str, theme.Page]:
    """Лист, который бот присылает между обложкой и первым уроком.

    Единственная страница комплекта, где нет ни таблицы, ни чек-листа: её
    читают один раз перед стартом. Поэтому она тёмная — по тому же правилу,
    что дни 2, 6 и 10.

    Полоса прогресса пустая во всех четырёх сегментах: курс ещё не начат,
    и это видно с первого взгляда. Подвала с «Сделал / Не вышло» тоже нет —
    отмечать пока нечего.

    Материал не сочинён с нуля: «нестыковка вместо слабости» — из урока
    дня 1, две реакции на плохой вечер — из протокола срыва (день 12),
    «Терпение + Дисциплина = Результат» — фирменная фраза из брендбука.
    """
    page = theme.PHONE
    d = intro_data

    rows = "".join(
        f'<div class="pil"><div class="pn">{i}</div>'
        f"<div><b>{name}</b><p>{text}</p></div></div>"
        for i, (name, text) in enumerate(d.PILLARS, 1)
    )
    after = "".join(f"<p>{para}</p>" for para in d.AFTER)

    body = f"""
<div class="sheet dark">
  <div class="wedge"></div>
  {c.head(0, left="Перед стартом", right="0 / 14")}
  {c.levels_bar(0)}
  <div class="content">
    <div class="tw">
      <h1>{d.TITLE}</h1>
      <p class="lead">{d.LEAD}</p>
    </div>

    <p>{d.BEFORE}</p>

    <div class="sec">
      <div class="eyebrow">{d.PILLARS_LABEL}</div>
      {rows}
    </div>

    {c.pull(d.PULL)}
    {after}

    <div class="sign">{d.SIGN}</div>
  </div>
</div>"""

    css = theme.base_css(page) + f"""
.tw {{ margin-top: {page.base_pt * 0.35:.2f}pt; }}
.tw h1 {{ margin-bottom: {page.base_pt * 0.34:.2f}pt; }}
.tw .lead {{ color: {theme.D_TEXT_2}; font-size: {page.base_pt * 0.92:.2f}pt;
  line-height: 1.38; }}
/* Интерлиньяж плотнее базовых 1.55: лист сплошной прозой, и на 1.55
   последний абзац уезжает за поля. 1.42 на 10.5pt — всё ещё комфортно
   для чтения с телефона. */
.content p {{ line-height: 1.42; }}
.tw {{ margin-bottom: 2.2mm; }}
.sec {{ margin-top: 3mm; }}
.sec .eyebrow {{ display: block; margin-bottom: 2.6mm; }}

.pil {{ display: flex; gap: 3mm; margin-bottom: 2mm; }}
.pil .pn {{
  flex: 0 0 5mm; height: 5mm; border-radius: 999px;
  background: {theme.ACCENT}; color: #fff;
  font-family: {theme.FONT_STACK_MONO}; font-size: {page.base_pt * 0.66:.2f}pt;
  display: flex; align-items: center; justify-content: center;
  margin-top: 0.4mm;
}}
.pil b {{ display: block; margin-bottom: 0.8mm; }}
.pil p {{ margin: 0; font-size: {page.base_pt * 0.85:.2f}pt; line-height: 1.38;
  color: {theme.D_TEXT_2}; }}
/* Врезка на этой странице зажата плотнее обычного: лист и так набит
   сплошным текстом, а воздух вокруг неё съедает целую мысль. */
.pull {{ margin-top: 3.4mm; margin-bottom: 3.4mm; }}

/* Подпись вместо подвала: отмечать на этой странице нечего, но лист
   должен закрываться, а не обрываться. */
.sign {{
  margin-top: 3.4mm; padding-top: 2.6mm;
  border-top: 0.3mm solid rgba(255,255,255,0.28);
  font-family: {theme.FONT_STACK_DISPLAY}; font-weight: 800;
  font-size: {page.base_pt * 0.95:.2f}pt; letter-spacing: -0.03em;
  color: {theme.D_TEXT};
}}
"""
    return (render.document(css, body, "Перед стартом"),
            "tripvaer-00-pered-startom", page)


# ─────────────────────────── обложка комплекта ───────────────────────────

def cover_page(variant: str = DEFAULT_COVER) -> tuple[str, str, theme.Page]:
    """Обложка комплекта в одном из двух срезов базовой системы.

    «Диагональный срез» — подпись Crimson: одна диагональ на композицию,
    12–18° от вертикали. Система даёт три раскладки, и для обложки прямо
    называет «Клин слева» («Герой товара, обложка»). Но её демо — альбомная
    карточка 1240×660, где клин занимает левую половину, а текст уходит в
    правую. На вертикальной странице 130×231 тот же угол требует клина
    шириной 38% листа, и колонка под текст остаётся 66 мм.

    Поэтому здесь два варианта, оба честные:

    * ``horizon``  — диагональ-горизонт, текст на всю ширину. Заголовок
      крупнее, состав курса читается одной колонкой.
    * ``wedge``    — «Клин слева» по букве системы. Текст в правой колонке,
      заголовок мельче, зато композиция ровно та, что нарисована в разделе
      «03 — Геометрия».
    """
    page = theme.COVER

    rows = "".join(
        f'<div class="lv"><span class="emo">{lv["emoji"]}</span>'
        f'<span class="nm">{lv["name"]}</span>'
        f'<span class="dd">дни {lv["days"][0]}–{lv["days"][1]}</span></div>'
        for lv in theme.LEVELS
    )

    cls = {"horizon": "horizon", "wedge": "wedge-cover"}[variant]
    body = f"""
<div class="sheet dark {cls}">
  <div class="diag"></div>
  <div class="inner">
    <div class="brand">
      <img class="ava" src="../assets/avatar.png" alt="">
      <div class="bt">Эдуард Серболин<span>онлайн-тренер</span></div>
    </div>

    <div class="eyebrow hot">Курс · 14 дней</div>
    <h1>Первые шаги<br>к форме</h1>
    <p class="sub">14 дней — с чего начать и как не бросить. Один короткий
    урок в день и одно действие, а не теория на потом.</p>

    <div class="levels-list">{rows}</div>

    <div class="bottom">
      <div class="price"><b>1&thinsp;890 ₽</b><span>один раз, навсегда твоё</span><span>без подписки и доплат</span></div>
      <div class="slogan">{SLOGAN}</div>
    </div>
  </div>
</div>"""

    css = theme.base_css(page) + f"""
.sheet.dark {{ padding: 0; }}
.sheet.dark .wedge {{ display: none; }}   /* у обложки диагональ своя */

/* Крупное алое поле — {theme.ACCENT_FIELD}, а не горячий {theme.ACCENT}:
   так залита большая плашка в светлой сцене базовой системы. На четверти
   листа горячий алый жжёт и отбирает акцент у меток. */
.diag {{ position: absolute; inset: 0; background: {theme.ACCENT_FIELD}; }}

/* Вариант 1 — «Горизонт»: диагональ 62% → 34%, угол 14° от горизонтали.
   Градиента по алому здесь нет: раздел «Не так» базовой системы запрещает
   градиенты на акценте прямым текстом. Поле держим плоским. */
.horizon .diag {{ clip-path: polygon(0 62%, 100% 34%, 100% 100%, 0 100%); }}

/* Вариант 2 — «Клин слева»: 46% сверху → 8% снизу. Смещение 38% от
   130 мм — это 49 мм на высоту 231 мм, ровно 12° от вертикали, нижняя
   граница диапазона системы. Полоса {theme.ACCENT_DEEP} вдоль среза —
   приём из тёмной демо-сцены, она даёт клину глубину. */
.wedge-cover .diag {{ clip-path: polygon(0 0, 46% 0, 8% 100%, 0 100%); }}
.wedge-cover .diag::after {{
  content: ""; position: absolute; inset: 0;
  background: {theme.ACCENT_DEEP}; opacity: .55;
  clip-path: polygon(36% 0, 46% 0, 8% 100%, -2% 100%);
}}
/* Текст целиком уходит правее клина: в самой широкой точке он занимает
   60 мм, колонка начинается с 64 мм. */
.wedge-cover .inner {{ padding-left: 64mm; }}
.wedge-cover h1 {{ font-size: {page.base_pt * 2.15:.2f}pt; }}
.wedge-cover .sub {{ max-width: 100%; }}
.wedge-cover .brand {{ margin-bottom: 10mm; }}
/* Свободное место уходит не в один провал перед ценой, а разводит состав
   курса и цену: список уровней опускается к нижней трети, где клин уже
   сузился, и вся правая колонка читается сплошным столбцом. */
.wedge-cover .levels-list {{ margin-top: auto; margin-bottom: 13mm; }}
.wedge-cover .bottom {{ margin-top: 0; }}
.wedge-cover .price b {{ font-size: {page.base_pt * 2.0:.2f}pt; }}
.inner {{
  position: relative;
  height: 100%;
  padding: {page.pad_top_mm}mm {page.pad_x_mm}mm {page.pad_bottom_mm}mm;
  display: flex; flex-direction: column;
}}

.brand {{ display: flex; align-items: center; gap: 3mm; margin-bottom: 14mm; }}
.brand .ava {{ width: 11mm; height: 11mm; border-radius: 999px; }}
.brand .bt {{
  font-size: {page.base_pt * 0.76:.2f}pt; font-weight: 700; color: {theme.D_TEXT};
  line-height: 1.25;
}}
.brand .bt span {{
  display: block; font-weight: 400; color: {theme.D_TEXT_4};
  font-size: {page.base_pt * 0.68:.2f}pt;
}}

.eyebrow.hot {{ color: {theme.ACCENT_HI}; }}
h1 {{
  color: {theme.D_TEXT};
  font-size: {page.base_pt * 3.0:.2f}pt;
  line-height: 0.98; letter-spacing: -0.05em;
  margin-top: 4mm;
}}
.sub {{
  color: {theme.D_TEXT_2}; font-size: {page.base_pt * 0.92:.2f}pt;
  max-width: 72mm; margin-top: 5mm;
}}

.levels-list {{ margin-top: 9mm; display: flex; flex-direction: column; gap: 2.6mm; }}
.levels-list .lv {{
  display: flex; align-items: center; gap: 2.6mm;
  font-size: {page.base_pt * 0.84:.2f}pt; color: {theme.D_TEXT};
}}
.levels-list .emo {{ font-size: {page.base_pt * 0.95:.2f}pt; }}
.levels-list .nm {{ font-weight: 700; }}
/* Диагональ по системе идёт от 62% слева к 34% справа, поэтому правый край
   списка уровней ложится на алое. Приглушённый серый там пропадает —
   держим светлый полупрозрачный белый: читается и на чёрном, и на алом. */
.levels-list .dd {{ margin-left: auto; color: rgba(255,255,255,.72);
  font-family: {theme.FONT_STACK_MONO}; font-size: {page.base_pt * 0.7:.2f}pt; }}

.bottom {{ margin-top: auto; }}
.price b {{
  display: block; font-family: {theme.FONT_STACK_DISPLAY}; font-weight: 800;
  font-size: {page.base_pt * 2.4:.2f}pt; letter-spacing: -0.045em; color: {theme.D_TEXT};
  line-height: 1;
}}
.price span {{
  display: block; margin-top: 1.6mm; color: rgba(255,255,255,0.78);
  font-size: {page.base_pt * 0.76:.2f}pt;
}}
/* Старая цена — не второй акцент: тот же полупрозрачный белый, что и
   подпись, только зачёркнутый. Алое на обложке остаётся клином. */
.price span s {{ margin-right: 1.4mm; }}
.slogan {{
  margin-top: 6mm; padding-top: 3.4mm;
  border-top: 0.3mm solid rgba(255,255,255,0.28);
  font-family: {theme.FONT_STACK_DISPLAY}; font-weight: 800;
  font-size: {page.base_pt * 0.92:.2f}pt; letter-spacing: -0.03em;
  color: {theme.D_TEXT};
}}
"""
    slug = "tripvaer-00-oblozhka" + ("" if variant == DEFAULT_COVER else f"-{variant}")
    return render.document(css, body, COURSE), slug, page


# ─────────────────────────── сборка ───────────────────────────

def main() -> None:
    args = sys.argv[1:]
    if not args:                       # без аргументов — весь комплект
        covers, nums, want_intro = [DEFAULT_COVER], list(range(1, 15)), True
    else:
        covers = [v for v in ("horizon", "wedge") if v in args]
        if "cover" in args:
            covers = ["wedge", "horizon"]   # обе раскладки, чтобы сравнить
        # «Перед стартом» — день 0, поэтому и аргумент 0.
        nums = [int(a) for a in args if a.isdigit() and a != "0"]
        want_intro = "intro" in args or "0" in args

    with render.Renderer() as r:
        for variant in covers:
            html, slug, page = cover_page(variant)
            print("  ", r.render(html, slug, page).name)
        if want_intro:
            html, slug, page = intro_page()
            print("  ", r.render(html, slug, page).name)
        for n in nums:
            html, slug, page = day_page(n)
            print("  ", r.render(html, slug, page).name)
        warnings = r.warnings

    if warnings:
        print("\nПереполнение — эти страницы обрежутся при печати:")
        for w in warnings:
            print("  !", w)
    else:
        print("Готово, переполнений нет.")


if __name__ == "__main__":
    main()
