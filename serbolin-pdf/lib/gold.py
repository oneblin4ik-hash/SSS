"""
Токены курса «Первые шаги к форме» — тёмная золотая система.

Откуда взялась. Владелец переделал курс в Claude Design и прислал канву
`Курс - Первые шаги к форме.dc.html` вместе с дизайн-системой
`serbolin-classic`. Здесь та же палитра и та же сетка, но темнее: канва
стоит на #222222, а просьба была «больше файлов в тёмном премиальном
цвете», поэтому холст ушёл на #08080A, а плитки собраны из стекла.

Чем это не Crimson. Алого нет совсем: акцент — золото #D4A843. Старая
система (`theme.py`) осталась на месте и обслуживает лид-магнит; трогать
её эта не должна. Если в курсе встретишь алый — это недоделанный кусок.

Единицы. Дизайн нарисован в 1080 px по ширине, а печатать нужно в
миллиметрах. Поэтому вся вёрстка живёт в CSS-пикселях канвы, а лист
получает физический размер и масштаб: 1080 px → 130 мм. Это даёт точное
попадание в макет и предсказуемый кегль на бумаге.
"""
from dataclasses import dataclass

# ─────────────────────────── цвет ───────────────────────────

VOID = "#08080A"          # холст листа
PANEL = "#101013"         # плитка бенто
PANEL_2 = "#16161A"       # плитка на плитке
WELL = "#050506"          # провал: шапка, фото-блок

GLASS = "rgba(255,255,255,0.045)"        # заливка стеклянной карточки
GLASS_EDGE = "rgba(255,255,255,0.10)"    # её кромка
GLASS_TOP = "rgba(255,255,255,0.16)"     # блик по верхней грани
LINE = "rgba(255,255,255,0.08)"
LINE_SOFT = "rgba(255,255,255,0.05)"

TEXT = "#FFFFFF"
TEXT_2 = "#D9D9DE"
TEXT_3 = "#9A9AA3"
TEXT_4 = "#6C6C75"

GOLD = "#D4A843"
GOLD_HI = "#F0CE7A"
GOLD_DEEP = "#B68C28"
GOLD_SOFT = "rgba(212,168,67,0.12)"
GOLD_EDGE = "rgba(212,168,67,0.42)"

# Золотой градиент — единственный «яркий» элемент страницы. Правило акцента
# из брифа никуда не делось: одна кнопка на разворот, не больше.
GOLD_GRAD = ("linear-gradient(135deg,#F7DFA0 0%,#E5BD63 26%,"
             "#D4A843 54%,#B68C28 100%)")
GOLD_GLOW = "0 10px 34px rgba(212,168,67,0.30), 0 0 0 1px rgba(247,223,160,0.35) inset"

# ─────────────────────────── геометрия ───────────────────────────

DESIGN_W = 1080          # ширина макета в пикселях канвы
DESIGN_H = 1920
PAD = 88                 # боковое поле, пиксели канвы


@dataclass(frozen=True)
class Sheet:
    """Физический лист. Пропорция 9:16 — та же, что у макета."""
    name: str
    w_mm: float
    h_mm: float

    @property
    def size(self) -> dict:
        return {"width": f"{self.w_mm}mm", "height": f"{self.h_mm}mm"}

    @property
    def scale(self) -> float:
        """Во сколько раз сжать макет, чтобы 1080 px легли в ширину листа."""
        return self.w_mm / 25.4 * 96 / DESIGN_W


# 130 мм — та же ширина, что у страниц дней в старом наборе: файл открывают
# с телефона, и лист уже листа A4 читается без зумирования.
PHONE = Sheet("phone", 130, 231.1)

RADIUS = {"tile": "28px", "card": "20px", "chip": "999px", "sm": "12px"}


# ─────────────────────────── уровни ───────────────────────────

LEVELS = (
    {"n": 1, "name": "Точка старта",  "days": (1, 3),   "icon": "search"},
    {"n": 2, "name": "Первые шаги",   "days": (4, 7),   "icon": "settings"},
    {"n": 3, "name": "Твоя система",  "days": (8, 10),  "icon": "puzzle"},
    {"n": 4, "name": "Уже привычка",  "days": (11, 14), "icon": "shield"},
)


def level_for_day(day: int) -> dict:
    for lv in LEVELS:
        if lv["days"][0] <= day <= lv["days"][1]:
            return lv
    return LEVELS[-1]


# ─────────────────────────── базовый CSS ───────────────────────────

def base_css(sheet: Sheet = PHONE, fonts_dir: str = "../fonts") -> str:
    """Каркас листа: шрифты, сетка, плитки, стекло, золото."""
    s = sheet
    return f"""
@import url("{fonts_dir}/fonts.css");

@font-face {{ font-family: 'Bebas'; src: url("{fonts_dir}/BebasNeue-Bold.ttf") format('truetype'); font-weight: 700; }}
@font-face {{ font-family: 'Raydis'; src: url("{fonts_dir}/Raydis-Bold.ttf") format('truetype'); font-weight: 700; }}
@font-face {{ font-family: 'Intro'; src: url("{fonts_dir}/Intro-Regular.otf") format('opentype'); font-weight: 400; }}

@page {{ size: {s.w_mm}mm {s.h_mm}mm; margin: 0; }}

* {{ box-sizing: border-box; margin: 0; padding: 0; }}

html, body {{
  background: {VOID};
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}}

/* Лист печати. Держит физический размер: трансформ у .stage — операция
   отрисовки, layout от неё не сжимается, и без этой обёртки Chromium
   разложил бы 1920 px макета на две страницы. */
.sheet {{
  width: {s.w_mm}mm;
  height: {s.h_mm}mm;
  position: relative;
  overflow: hidden;
  background: {VOID};
}}

/* Лист макета: рисуем в пикселях канвы и ужимаем целиком под физический
   размер. Так вёрстка один в один совпадает с тем, что утвердил владелец. */
.stage {{
  position: absolute;
  top: 0; left: 0;
  width: {DESIGN_W}px;
  height: {DESIGN_H}px;
  transform: scale({s.scale:.6f});
  transform-origin: 0 0;
  position: relative;
  overflow: hidden;
  background: {VOID};
  color: {TEXT};
  font-family: 'Inter', sans-serif;
  font-size: 31px;
  line-height: 1.45;
  letter-spacing: -0.2px;
  display: flex;
  flex-direction: column;
}}

/* Мягкое золотое свечение из угла — глубина без второго акцента. */
.stage::before {{
  content: "";
  position: absolute;
  width: 900px; height: 900px;
  top: -380px; right: -320px;
  background: radial-gradient(circle, rgba(212,168,67,0.13) 0%, rgba(212,168,67,0) 62%);
  pointer-events: none;
}}

.pad {{ padding-left: {PAD}px; padding-right: {PAD}px; }}

/* ── типографика ── */
h1, h2, h3 {{ font-family: 'Manrope', sans-serif; font-weight: 800; }}
h1 {{ font-size: 92px; line-height: 0.98; letter-spacing: -3.6px; }}
h2 {{ font-size: 56px; line-height: 1.04; letter-spacing: -1.9px; }}
h3 {{ font-size: 36px; line-height: 1.12; letter-spacing: -0.9px; }}

.wordmark {{
  font-family: 'Bebas', sans-serif;
  font-size: 152px; line-height: 0.84; letter-spacing: 1px;
  text-transform: uppercase;
}}

.eyebrow {{
  font-family: 'Intro', sans-serif;
  font-size: 20px; font-weight: 400;
  letter-spacing: 4.4px; text-transform: uppercase;
  color: {GOLD};
}}
.eyebrow.mute {{ color: {TEXT_4}; }}

.lead {{ font-size: 34px; line-height: 1.45; color: {TEXT_2}; }}
.body {{ font-size: 31px; line-height: 1.52; color: {TEXT_2}; }}
.small {{ font-size: 25px; line-height: 1.45; color: {TEXT_3}; }}
.mono {{ font-family: 'JetBrains Mono', monospace; font-size: 25px; }}
b, strong {{ font-weight: 700; color: {TEXT}; }}
.hl {{ color: {GOLD}; }}

/* ── стекло и бенто ── */
.tile {{
  position: relative;
  background: linear-gradient(180deg, rgba(255,255,255,0.070), rgba(255,255,255,0.022));
  border: 1px solid {GLASS_EDGE};
  border-radius: {RADIUS["tile"]};
  padding: 28px 32px;
  overflow: hidden;
}}
/* Блик по верхней грани — то, что делает плитку стеклом, а не заливкой. */
.tile::after {{
  content: "";
  position: absolute; inset: 0 0 auto 0; height: 1px;
  background: linear-gradient(90deg, transparent, {GLASS_TOP} 22%, {GLASS_TOP} 78%, transparent);
}}
.tile.solid {{ background: {PANEL}; }}
.tile.gold {{
  background: linear-gradient(150deg, rgba(212,168,67,0.20), rgba(212,168,67,0.05) 64%);
  border-color: {GOLD_EDGE};
  box-shadow: 0 18px 44px rgba(0,0,0,0.35);
}}
.tile .cap {{
  font-family: 'Intro', sans-serif;
  font-size: 17px; letter-spacing: 3px; text-transform: uppercase;
  color: {GOLD}; margin-bottom: 18px;
}}

.bento {{ display: grid; gap: 20px; }}
.bento.two {{ grid-template-columns: 1fr 1fr; }}
.bento.three {{ grid-template-columns: 1fr 1fr 1fr; }}

/* ── золотая кнопка ── */
.btn {{
  display: inline-flex; align-items: center; gap: 18px;
  background: {GOLD_GRAD};
  color: #1A1206;
  font-family: 'Intro', sans-serif;
  font-size: 26px; letter-spacing: 1.6px; text-transform: uppercase;
  padding: 26px 44px;
  border-radius: {RADIUS["chip"]};
  box-shadow: {GOLD_GLOW};
  text-decoration: none;
}}
.btn .ar {{ font-size: 30px; line-height: 1; }}

/* ── строки, поля, чекбоксы ── */
.rows {{ border-top: 1px solid {LINE}; }}
.rows .r {{
  display: flex; align-items: center; justify-content: space-between;
  gap: 22px; padding: 20px 0; border-bottom: 1px solid {LINE};
}}
.rows .r .t {{ font-size: 30px; color: {TEXT}; font-weight: 600; }}
.rows .r .v {{ font-size: 26px; color: {TEXT_3}; white-space: nowrap; }}

/* Всё, что заполняют ручкой, — белое окно. Ни подчёркиваний, ни пунктира:
   на чёрном листе писать можно только по белому, остальное нечитаемо и в
   печати, и на экране телефона. Решение владельца, единое для всего курса. */
.field {{
  background: #FFFFFF;
  border-radius: 10px;
  height: 44px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.45);
}}
.checkline {{ display: flex; align-items: center; gap: 18px; padding: 13px 0; }}
.checkbox {{
  width: 34px; height: 34px; flex: none;
  border-radius: 9px;
  background: #FFFFFF;
  box-shadow: 0 2px 10px rgba(0,0,0,0.45);
}}

/* ── фото ── */
.photo {{ position: relative; overflow: hidden; background: {WELL};
  border-radius: {RADIUS["tile"]}; box-shadow: inset 0 0 0 1px {GLASS_EDGE}; }}
.photo.bleed {{ border-radius: 0; box-shadow: none; }}
.photo img {{ width: 100%; height: 100%; object-fit: cover; display: block; }}
.photo .scrim {{
  position: absolute; inset: auto 0 0 0; height: 46%;
  background: linear-gradient(to bottom, rgba(8,8,10,0), {VOID});
}}

/* ── шапка и подвал ── */
.head {{ padding-top: 56px; }}
.head .line {{ display: flex; align-items: baseline; justify-content: space-between; }}
.rail {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 30px; }}
.rail .seg {{ height: 4px; border-radius: 3px; background: rgba(255,255,255,0.12); }}
.rail .seg.on {{ background: {GOLD_GRAD}; }}
.rail .nm {{
  font-family: 'Intro', sans-serif; font-size: 15px; letter-spacing: 2.2px;
  text-transform: uppercase; color: {TEXT_4}; margin-top: 12px;
}}
.rail .nm.on {{ color: {GOLD}; }}

.foot {{
  margin-top: auto;
  display: flex; align-items: center; justify-content: space-between; gap: 30px;
  padding-top: 30px; padding-bottom: 48px;
  border-top: 1px solid {LINE};
}}
.slogan {{
  font-family: 'Intro', sans-serif; font-size: 17px; letter-spacing: 2.4px;
  text-transform: uppercase; color: {TEXT_4}; text-align: right; line-height: 1.6;
}}
.slogan b {{ color: {GOLD}; font-weight: 400; }}

.content {{ flex: 1; display: flex; flex-direction: column; }}
"""
