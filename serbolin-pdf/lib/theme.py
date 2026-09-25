"""
Токены дизайн-системы Crimson, приведённые к печатным единицам.

Источник — design_handoff_crimson_funnel/README.md. Здесь только то, что реально
нужно для PDF: светлая («бумажная») схема для внутренних страниц и тёмная для
обложек. Веб-специфику (backdrop-filter, ховеры, моушн) не тащим — в PDF её нет.

ДВА СОЗНАТЕЛЬНЫХ ОТСТУПЛЕНИЯ ОТ ХЕНДОФФА, оба вынужденные:

1. Display-гарнитура — Manrope, а не Space Grotesk.
   У Space Grotesk нет кириллицы (Google Fonts отдаёт только latin/latin-ext/
   vietnamese), а весь текст русский. Manrope — не самодеятельность: это ровно
   та гарнитура, которую тот же хендофф назначает светлой «печатной» схеме
   («Студия»: Manrope 800/700/400), а наши страницы как раз светлые.

2. Эмодзи уровней (🔍 ⚙️ 🧩 🛡) оставлены, хотя хендофф говорит «без эмодзи
   совсем». Так решил владелец проекта: эмодзи уже живут в текстах спеки, в
   typeOf() квиза и в сообщениях бота, рядом с которыми лежит PDF.

Размеры физические (mm / pt), а не CSS-пиксели: PDF печатают и читают с
телефона, и только физические единицы дают предсказуемый кегль на бумаге.
"""
from dataclasses import dataclass

# ─────────────────────────── цвет ───────────────────────────

# Светлая («бумажная») схема — внутренние страницы.
# Значения взяты из макета «Бумага, а не лендинг» в Crimson Funnel Kit,
# а не из таблицы светлой веб-схемы в README: на бумаге у системы своя
# гамма — заголовок почти чёрный #111, а не графит #292F3B, и текст
# чек-листов темнее абзацев.
BG = "#F5F6F9"
SURFACE = "#FFFFFF"
SURFACE_2 = "#F5F5F5"    # блок «Заметка»
SURFACE_3 = "#EDEEF2"
BAR = "#E7E9EF"          # трек прогресса, пустые ячейки таблиц
INK = "#111111"          # заголовки страниц
INK_TEXT = "#222222"     # строки чек-листов и нумерованных списков
INK_2 = "#4A4A4A"        # текст абзацев
INK_3 = "#8990A0"
INK_4 = "#9AA0AE"        # подписи, мета
LINE = "#E0E0E0"
LINE_SOFT = "rgba(41,47,59,0.09)"

# Тёмная схема — обложки
VOID = "#0B0B0C"
PLATE = "#131315"
PLATE_2 = "#1B1B1E"
D_TEXT = "#FFFFFF"
D_TEXT_2 = "#C8C8CE"
D_TEXT_3 = "#9A9AA0"
D_TEXT_4 = "#6B6B72"
D_LINE = "rgba(255,255,255,0.07)"

# Акцент. Правило хендоффа: не больше ~20% площади страницы,
# и никогда внутри абзаца — только метки, чекбоксы, номера, ссылки.
ACCENT = "#D8232A"
ACCENT_HI = "#F4363D"      # акцентный текст на тёмном
ACCENT_LIGHT = "#E8323A"   # алый в светлой схеме
ACCENT_DEEP = "#9E1319"    # eyebrow-метки на бумаге
ACCENT_SOFT = "rgba(216,35,42,0.10)"
ACCENT_EDGE = "rgba(216,35,42,0.45)"
# Крупные алые поля — клин обложки, заливка в половину листа. Базовая система
# в светлой сцене («Демо 02 — медиа-лендинг») заливает блок 44%×56% именно
# #B01A20, а не #D8232A: горячий алый на такой площади начинает жечь глаза и
# съедает акцент у меток, которые обязаны оставаться самым ярким на странице.
ACCENT_FIELD = "#B01A20"

# ─────────────────────────── геометрия ───────────────────────────


@dataclass(frozen=True)
class Page:
    """Физический размер страницы и её внутренние поля."""
    name: str
    w_mm: float
    h_mm: float
    pad_top_mm: float
    pad_x_mm: float
    pad_bottom_mm: float
    base_pt: float          # кегль основного текста

    @property
    def size(self) -> dict:
        return {"width": f"{self.w_mm}mm", "height": f"{self.h_mm}mm"}


# A4 — для страниц, которые реально печатают и заполняют ручкой:
# таблица суток (день 1), список покупок (день 8), правило возврата (день 12).
# Кегль 12pt — прямое правило системы: «Текст не мельче 12pt на реальном A4,
# строка до 70 знаков». Поля 19 мм дают колонку 172 мм, это ~68 знаков.
A4 = Page("a4", 210, 297, 17, 19, 15, 12)

# Вертикальный «под телефон» — 9:16. Открывается в Telegram и читается свайпом
# без зума. Ширина 130 мм подобрана так, чтобы кегль основного текста остался
# не мельче 10pt (правило брендбука) и строка не вылезала за ~60 знаков.
PHONE = Page("phone", 130, 231, 12, 12, 10, 10.5)

# Обложки — тот же вертикальный формат, чтобы комплект выглядел единым.
COVER = Page("cover", 130, 231, 14, 13, 13, 10.5)

# Радиусы макета (px при 96dpi) переведены в миллиметры:
# чекбокс 5px, «Заметка» 14px, карточка 20px, крупная 28px.
RADIUS = {
    "check": "1.3mm",
    "chip": "999px",
    "util": "3.7mm",
    "card": "5.3mm",
    "big": "7.4mm",
}

# ─────────────────────────── уровни курса ───────────────────────────

# Названия под новичка: курс отвечает на «с чего начать», а не «почему
# срываюсь» (бриф v2 §5.4). Прогресс-бар подхватывает их сам.
LEVELS = [
    {"n": 1, "emoji": "🔍", "name": "Точка старта", "days": (1, 3)},
    {"n": 2, "emoji": "⚙️", "name": "Первые шаги", "days": (4, 7)},
    {"n": 3, "emoji": "🧩", "name": "Твоя система", "days": (8, 10)},
    {"n": 4, "emoji": "🛡", "name": "Уже привычка", "days": (11, 14)},
]


def level_for_day(day: int) -> dict:
    for lv in LEVELS:
        lo, hi = lv["days"]
        if lo <= day <= hi:
            return lv
    raise ValueError(f"нет уровня для дня {day}")


# ─────────────────────────── CSS ───────────────────────────

FONT_STACK_DISPLAY = "'Manrope', 'Inter', sans-serif"
FONT_STACK_BODY = "'Inter', 'Manrope', sans-serif"
FONT_STACK_MONO = "'JetBrains Mono', ui-monospace, monospace"
# Noto Color Emoji стоит в системе; подмешиваем последним, чтобы эмодзи
# не превращались в пустые квадраты.
EMOJI = "'Noto Color Emoji'"


def base_css(page: Page) -> str:
    """Общий каркас: сброс, шрифты, типографика, повторяющиеся компоненты."""
    p = page
    return f"""
@import url("../fonts/fonts.css");

* {{ margin: 0; padding: 0; box-sizing: border-box; }}

@page {{ size: {p.w_mm}mm {p.h_mm}mm; margin: 0; }}

html, body {{
  width: {p.w_mm}mm;
  height: {p.h_mm}mm;
  font-family: {FONT_STACK_BODY}, {EMOJI};
  font-size: {p.base_pt}pt;
  line-height: 1.55;
  color: {INK_2};
  background: {SURFACE};
  -webkit-font-smoothing: antialiased;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}}

.sheet {{
  position: relative;
  width: {p.w_mm}mm;
  height: {p.h_mm}mm;
  padding: {p.pad_top_mm}mm {p.pad_x_mm}mm {p.pad_bottom_mm}mm;
  overflow: hidden;
  background: {SURFACE};
}}
/* Многостраничный документ: каждый .sheet — отдельный лист. */
.sheet + .sheet {{ break-before: page; }}

/* ── тёмный лист ───────────────────────────────────────────────
   Базовая система Crimson («Один акцент, пять темнот») задаёт для
   тёмной сцены холст #0B0B0C, плитку #131315 и карточку #1B1B1E.
   Алый остаётся ровно одним акцентом: метки, чекбоксы, клин. Красный
   текст абзацами и вторая акцентная краска запрещены прямо в разделе
   «Не так». */
.sheet.dark {{ background: {VOID}; color: {D_TEXT_2}; }}
.sheet.dark h1, .sheet.dark h2, .sheet.dark h3 {{ color: {D_TEXT}; }}
.sheet.dark b, .sheet.dark strong {{ color: {D_TEXT}; }}
.sheet.dark .eyebrow {{ color: {ACCENT_HI}; }}
.sheet.dark .eyebrow.muted {{ color: {D_TEXT_4}; }}
/* На бумаге приглушённый текст — {INK_4}, на тёмном ту же роль играет
   {D_TEXT_3}, а не {D_TEXT_4}: на #0B0B0C серый 6B6B72 даёт 4.2:1 и мелкие
   пояснения перестают читаться. Метки шапки и подвала остаются на {D_TEXT_4} —
   там 6–7pt и роль другая. */
.sheet.dark .muted, .sheet.dark .small.muted {{ color: {D_TEXT_3}; }}
.sheet.dark .lead {{ color: {D_TEXT_2}; }}

.sheet.dark .head {{ border-bottom-color: {D_LINE}; }}
.sheet.dark .head .left {{ color: {ACCENT_HI}; }}
.sheet.dark .head .right {{ color: {D_TEXT_4}; }}

.sheet.dark .levels .lv .bar {{ background: rgba(255,255,255,0.10); }}
.sheet.dark .levels .lv.done .bar {{ background: {ACCENT_EDGE}; }}
.sheet.dark .levels .lv.now .bar {{ background: {ACCENT}; }}
.sheet.dark .levels .lv .cap {{ color: {D_TEXT_4}; }}
.sheet.dark .levels .lv.now .cap {{ color: {ACCENT_HI}; }}

.sheet.dark .lvchip {{ color: {ACCENT_HI}; }}

.sheet.dark .card {{ background: {PLATE}; border-color: {D_LINE}; }}
.sheet.dark .note {{ background: {PLATE}; }}
.sheet.dark .note .eyebrow {{ color: {ACCENT_HI}; }}
.sheet.dark .pull {{ color: {D_TEXT}; }}

.sheet.dark .check {{ color: {D_TEXT_2}; }}
.sheet.dark .fill {{ border-bottom-color: rgba(255,255,255,0.32); }}

.sheet.dark th {{ color: {D_TEXT_4}; border-bottom-color: {D_LINE}; }}
.sheet.dark td {{ border-bottom-color: {D_LINE}; }}
.sheet.dark td.k {{ color: {D_TEXT_4}; }}
.sheet.dark tr.filled td {{ background: {PLATE}; }}

.sheet.dark .foot {{ border-top-color: {D_LINE}; }}
.sheet.dark .foot .ci {{ color: {D_TEXT_4}; }}
.sheet.dark .foot .pg {{ color: {D_TEXT_4}; }}
.sheet.dark .foot .pg b {{ color: {ACCENT_HI}; }}

.sheet.dark .numlist .tx {{ color: {D_TEXT_2}; }}

/* Срез слева — след «Клина слева» с обложки, приведённый к рабочей
   странице. Два сознательных отступления, оба вынужденные форматом:

   1. Ширина в миллиметрах, а не в процентах. В процентах один и тот же
      клин на A4 шире, чем поле страницы (11% от 210 мм — это 23 мм при
      поле 19 мм), и подпись уровня уезжает на алое.
   2. Угол ~1.6°, а не 12–18°. Настоящий клин на вертикальном листе
      обязан быть шириной в треть страницы: 12° на высоту 231 мм — это
      49 мм смещения. Такой клин уместен на обложке, где текст уходит в
      правую колонку, но не на странице, которую читают в одну колонку.
      Полный угол живёт на обложке, здесь остаётся его кромка.

   Полоса {ACCENT_DEEP} вдоль среза — приём из тёмной демо-сцены базовой
   системы, она даёт кромке глубину. */
.sheet.dark .wedge {{
  position: absolute; inset: 0; pointer-events: none;
  background: {ACCENT};
  clip-path: polygon(0 0, 9mm 0, 2.5mm 100%, 0 100%);
  z-index: -1;   /* поверх фона листа, но под текстом */
}}
.sheet.dark .wedge::after {{
  content: ""; position: absolute; inset: 0;
  background: {ACCENT_DEEP}; opacity: .55;
  clip-path: polygon(6mm 0, 9mm 0, 2.5mm 100%, 0 100%);
}}
/* Лист — свой контекст наложения, иначе z-index: -1 у клина утащил бы его
   под фон страницы и клин просто исчез. Трогать position у .head / .foot
   нельзя: подвал прибит absolute к низу листа, и relative его роняет
   в поток — страница уезжает вниз на высоту подвала. */
.sheet.dark {{ isolation: isolate; }}

/* ── типографика ───────────────────────────────────────────── */

h1, h2, h3, .display {{
  font-family: {FONT_STACK_DISPLAY}, {EMOJI};
  font-weight: 800;
  color: {INK};
  letter-spacing: -0.04em;
  line-height: 1.08;
  text-wrap: pretty;
}}
h1 {{ font-size: {p.base_pt * 2.0:.2f}pt; }}
h2 {{ font-size: {p.base_pt * 1.32:.2f}pt; letter-spacing: -0.03em; }}
h3 {{ font-size: {p.base_pt * 1.06:.2f}pt; font-weight: 700; letter-spacing: -0.02em; }}

p {{ text-wrap: pretty; }}
p + p {{ margin-top: {p.base_pt * 0.62:.2f}pt; }}
b, strong {{ font-weight: 700; color: {INK}; }}

/* Эмодзи — это цветной растр из Noto Color Emoji, он всегда выглядит крупнее
   букв того же кегля. Сажаем его на явный размер и слегка опускаем на базовую
   линию, иначе ⭐ в заголовке перевешивает сам заголовок. */
.emo {{
  font-family: {EMOJI};
  font-size: 0.86em;
  line-height: 1;
  vertical-align: -0.04em;
}}

/* Метка-eyebrow. Единственное место, где разрешён ALL-CAPS. */
.eyebrow {{
  font-family: {FONT_STACK_BODY}, {EMOJI};
  font-size: {p.base_pt * 0.66:.2f}pt;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: {ACCENT_DEEP};
}}
.eyebrow.muted {{ color: {INK_4}; letter-spacing: 0.16em; }}

.mono {{ font-family: {FONT_STACK_MONO}; font-variant-numeric: tabular-nums; }}
.small {{ font-size: {p.base_pt * 0.82:.2f}pt; line-height: 1.45; }}
.muted {{ color: {INK_3}; }}

/* ── шапка страницы ────────────────────────────────────────── */

.head {{
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding-bottom: {p.base_pt * 0.7:.2f}pt;
  border-bottom: 0.35mm solid {LINE};
}}
.head .left {{
  font-size: {p.base_pt * 0.68:.2f}pt;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: {ACCENT_DEEP};
}}
.head .right {{
  font-family: {FONT_STACK_MONO};
  font-size: {p.base_pt * 0.68:.2f}pt;
  color: {INK_4};
}}

/* Чип уровня: эмодзи + название. Единственное место в шапке, где эмодзи
   набран достаточно крупно, чтобы его вообще можно было опознать. */
.lvchip {{
  display: inline-flex;
  align-items: center;
  gap: {p.base_pt * 0.4:.2f}pt;
  padding: {p.base_pt * 0.3:.2f}pt {p.base_pt * 0.62:.2f}pt;
  border-radius: {RADIUS["chip"]};
  background: {ACCENT_SOFT};
  border: 0.25mm solid {ACCENT_EDGE};
  font-size: {p.base_pt * 0.78:.2f}pt;
  font-weight: 700;
  color: {ACCENT_DEEP};
  white-space: nowrap;
}}
.lvchip .emo {{ font-size: {p.base_pt * 0.95:.2f}pt; }}

/* ── полоса прогресса: 4 сегмента по уровням курса ─────────── */

.levels {{ display: flex; gap: 1.6mm; margin-top: {p.base_pt * 0.85:.2f}pt; }}
.levels .lv {{ flex: 1; }}
.levels .lv .bar {{
  height: 1.1mm;
  border-radius: 999px;
  background: {BAR};
}}
.levels .lv.done .bar {{ background: {ACCENT_EDGE}; }}
.levels .lv.now .bar {{ background: {ACCENT}; }}
.levels .lv .cap {{
  margin-top: 1.1mm;
  font-size: {p.base_pt * 0.56:.2f}pt;
  letter-spacing: 0.06em;
  color: {INK_4};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}}
.levels .lv.now .cap {{ color: {ACCENT_DEEP}; font-weight: 700; }}

/* ── карточки и блоки ──────────────────────────────────────── */

.card {{
  background: {SURFACE};
  border: 0.3mm solid {LINE};
  border-radius: {RADIUS["card"]};
  padding: {p.base_pt * 0.95:.2f}pt {p.base_pt * 1.05:.2f}pt;
}}
.note {{
  /* Отступ по умолчанию: без него блок прилипает к предыдущему элементу,
     если у страницы не задан свой .sec-margin. */
  margin-top: {p.base_pt * 0.9:.2f}pt;
  background: {SURFACE_2};
  border-radius: {RADIUS["util"]};
  padding: {p.base_pt * 0.9:.2f}pt {p.base_pt * 1.0:.2f}pt;
}}
.note .eyebrow {{ display: block; margin-bottom: {p.base_pt * 0.45:.2f}pt; }}

/* Врезка с ключевой мыслью — единственное место, где цитата из урока
   попадает в PDF крупным кеглем. */
.pull {{
  margin: {p.base_pt * 0.85:.2f}pt 0;
  border-left: 0.9mm solid {ACCENT};
  padding: {p.base_pt * 0.2:.2f}pt 0 {p.base_pt * 0.2:.2f}pt {p.base_pt * 0.85:.2f}pt;
  font-family: {FONT_STACK_DISPLAY}, {EMOJI};
  font-weight: 700;
  font-size: {p.base_pt * 1.12:.2f}pt;
  line-height: 1.28;
  letter-spacing: -0.02em;
  color: {INK};
}}

/* ── чекбоксы и поля для заполнения ────────────────────────── */

/* Строки чек-листа темнее абзацев — так в макете бумажной страницы:
   абзац #4A4A4A, пункт #222. Разница небольшая, но список должен
   читаться как то, что заполняют, а не как продолжение прозы. */
.checks {{ display: flex; flex-direction: column; gap: {p.base_pt * 0.62:.2f}pt; }}
.check {{ display: flex; gap: {p.base_pt * 0.7:.2f}pt; align-items: flex-start;
  color: {INK_TEXT}; }}
.box {{
  flex: none;
  width: {p.base_pt * 0.95:.2f}pt;
  height: {p.base_pt * 0.95:.2f}pt;
  margin-top: {p.base_pt * 0.16:.2f}pt;
  border: 0.4mm solid {ACCENT};
  border-radius: {RADIUS["check"]};
}}
.box.lg {{ width: {p.base_pt * 1.3:.2f}pt; height: {p.base_pt * 1.3:.2f}pt; }}

/* Линейка для вписывания от руки. */
.fill {{
  display: inline-block;
  border-bottom: 0.3mm dotted {INK_4};
  min-width: 18mm;
  height: {p.base_pt * 1.1:.2f}pt;
  vertical-align: baseline;
}}

/* ── таблицы ───────────────────────────────────────────────── */

table {{ width: 100%; border-collapse: collapse; }}
th {{
  font-size: {p.base_pt * 0.7:.2f}pt;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: {INK_4};
  text-align: left;
  padding: 0 0 {p.base_pt * 0.35:.2f}pt;
  border-bottom: 0.35mm solid {LINE};
}}
td {{
  font-size: {p.base_pt * 0.9:.2f}pt;
  padding: {p.base_pt * 0.5:.2f}pt {p.base_pt * 0.3:.2f}pt;
  border-bottom: 0.25mm solid {LINE};
  vertical-align: top;
}}
td.k {{ color: {INK_3}; font-family: {FONT_STACK_MONO}; white-space: nowrap; }}
tr.filled td {{ background: {SURFACE_2}; }}

/* ── подвал ────────────────────────────────────────────────── */

.foot {{
  position: absolute;
  left: {p.pad_x_mm}mm;
  right: {p.pad_x_mm}mm;
  bottom: {p.pad_bottom_mm}mm;
  padding-top: {p.base_pt * 0.6:.2f}pt;
  border-top: 0.35mm solid {LINE};
  display: flex;
  justify-content: space-between;
  align-items: center;
}}
.foot .checkin {{ display: flex; gap: {p.base_pt * 0.85:.2f}pt; align-items: center; }}
.foot .ci {{
  display: flex;
  gap: {p.base_pt * 0.4:.2f}pt;
  align-items: center;
  font-size: {p.base_pt * 0.75:.2f}pt;
  color: {INK_3};
}}
.foot .ci .box {{ margin-top: 0; }}
.foot .pg {{
  font-family: {FONT_STACK_MONO};
  font-size: {p.base_pt * 0.72:.2f}pt;
  color: {INK_4};
}}
.foot .pg b {{ color: {ACCENT_DEEP}; }}

/* Нумерованный список — компонент «Что внутри» из макета:
   номер акцентом в display-гарнитуре, текст по базовой линии рядом. */
.numlist {{ display: flex; flex-direction: column; gap: {p.base_pt * 0.62:.2f}pt; }}
.numlist .it {{ display: flex; gap: {p.base_pt * 0.72:.2f}pt; align-items: baseline; }}
.numlist .n {{
  font-family: {FONT_STACK_DISPLAY};
  font-weight: 800;
  font-size: {p.base_pt * 1.18:.2f}pt;
  letter-spacing: -0.03em;
  color: {ACCENT};
  flex: none;
}}
.numlist .tx {{ font-size: {p.base_pt * 0.95:.2f}pt; line-height: 1.45; color: {INK_TEXT}; }}
"""
