#!/usr/bin/env python3
"""
Лид-магнит «Твоя диагностика» — персональный PDF на выходе из квиза.

═══════════════════════════════════════════════════════════════════════
КОНТРАКТ ПЛЕЙСХОЛДЕРОВ — читать разработчику бота
═══════════════════════════════════════════════════════════════════════

Формат: {{имя_поля}} — двойные фигурные скобки, латиница и подчёркивание.
Выбран потому, что не конфликтует ни с CSS, ни с f-строками Python, ищется
grep-ом одной командой и заменяется любым шаблонизатором, если бот
когда-нибудь переедет с Python.

Шаблон страницы лежит в page_template() ниже. Все токены собираются в
build_context(profile) — одно место, где значение получает текст.

ПРОСТЫЕ ПОЛЯ (приходят из квиза как есть):
    {{name}}          имя                                   n
    {{gender}}        'f' | 'm' — влияет на окончания       g
    {{age}}           возраст                               a
    {{height}}        рост, см                              h
    {{weight_now}}    вес сейчас, кг                        w
    {{weight_goal}}   вес цель, кг                          wg
    {{issued}}        дата выдачи, «13 августа 2026»        —

ВЫЧИСЛЯЕМЫЕ (логика повторяет kviz-serbolin.html, см. lib/profile.py):
    {{bmi}}           ИМТ, одна десятая
    {{bmi_text}}      «норма» / «выше нормы» / …
    {{goal_text}}     задача по цели: похудение | рекомпозиция | набор …
    {{task_text}}     абзац про задачу + предупреждение про стрелку весов
    {{first_changes}} что изменится первым (по полу)
    {{trainings}}     тренировок в неделю (2 или 3)
    {{training_line}} абзац про тренировки с учётом колен и спины
    {{dont_items}}    <li> четырёх пунктов «чего не делать»
    {{plan_weeks}}    недель до цели первого этапа
    {{plan_target}}   вес на конец первого этапа
    {{plan_date}}     дата достижения, «16 сентября»

БЛОЧНЫЕ (готовый HTML, подставляется целиком):
    {{type_emoji}} {{type_name}} {{type_level}}   шапка блока «Твой тип»
    {{type_block}}      полный текст одного из четырёх типов, <p> подряд
    {{health_warning}}  абзац про врача — НЕПУСТОЙ, если в hl есть
                        heart или diab. Формулировка скопирована из
                        квиза дословно и меняться не должна.

Как боту получить готовый PDF:

    from lib.profile import Profile
    from build_lead_magnet import build

    payload = json.loads(message.web_app_data.data)   # JSON из квиза
    pdf = build(Profile.from_quiz(payload))           # -> pathlib.Path
    await message.answer_document(FSInputFile(pdf))

Запуск демо (Галина, персонаж из спеки):
    python3 build_lead_magnet.py
═══════════════════════════════════════════════════════════════════════
"""
import pathlib
import re

from data import lead_magnet_text as T
from lib import components as c
from lib import render, theme
from lib.profile import Profile, ru_date

PAGE = theme.PHONE
SLOGAN = "Терпение + Дисциплина = Результат"


# ─────────────────────────── контекст ───────────────────────────

def build_context(p: Profile) -> dict[str, str]:
    """Собирает значения всех плейсхолдеров для одного человека."""
    t = T.TYPES[p.type_n]
    plan = p.plan

    type_block = "".join(f"<p>{par}</p>" for par in t["paragraphs"](p))
    dont_items = "".join(f"<li>{x}</li>" for x in T.dont_list(p))

    warning = T.health_warning(p)
    health_warning = f'<div class="warn">{warning}</div>' if warning else ""

    return {
        "name": p.name,
        "gender": p.gender,
        "age": str(p.age),
        "height": str(p.height),
        "weight_now": _num(p.weight_now),
        "weight_goal": _num(p.weight_goal),
        "issued": ru_date(p.issued),

        "bmi": f"{p.bmi:.1f}".replace(".", ","),
        "bmi_text": p.bmi_text,
        "goal_text": T.GOAL_TASK[p.goal],
        "task_text": T.task_text(p),
        "first_changes": T.first_changes(p),
        "trainings": str(p.trainings),
        "training_line": T.training_line(p),
        "nutrition_line": T.NUTRITION_LINE,
        "dont_items": dont_items,
        "forecast": T.FORECAST,

        "plan_weeks": str(plan["weeks"]),
        "plan_target": _num(plan["target"]),
        "plan_date": p.plan_date,

        "type_emoji": t["emoji"],
        "type_name": t["name"],
        "type_level": t["level"],
        "type_block": type_block,
        "health_warning": health_warning,
    }


def _num(x: float) -> str:
    """72.0 → «72», 72.5 → «72,5»."""
    return (f"{x:g}").replace(".", ",")


# ─────────────────────────── шаблон ───────────────────────────

def page_template() -> str:
    """HTML документа с плейсхолдерами {{…}} — до подстановки значений."""
    return f"""
<!-- ОБЛОЖКА -->
<div class="sheet dark cover">
  <div class="diag"></div>
  <div class="inner">
    <div class="brand">
      <img class="ava" src="../assets/avatar.png" alt="">
      <div class="bt">Эдуард Серболин<span>онлайн-тренер</span></div>
    </div>
    <div class="eyebrow hot">Твоя диагностика</div>
    <h1>{{{{name}}}}</h1>
    <p class="sub">Разбор по твоим ответам: где ты сейчас, почему прошлые
    заходы заканчивались одинаково и что делать дальше.</p>
    <div class="bottom">
      <div class="meta">{{{{issued}}}}</div>
      <div class="slogan">{SLOGAN}</div>
    </div>
  </div>
</div>

<!-- БЛОК 1 -->
<div class="sheet">
  <div class="head"><div class="left">Блок 1</div>
    <div class="right">{{{{name}}}}</div></div>
  <div class="content">
    <h2>Что с тобой сейчас</h2>
    <div class="stats">
      <div class="st"><b>{{{{height}}}}</b><span>рост, см</span></div>
      <div class="st"><b>{{{{weight_now}}}}</b><span>вес сейчас</span></div>
      <div class="st"><b>{{{{weight_goal}}}}</b><span>цель</span></div>
      <div class="st hot"><b>{{{{bmi}}}}</b><span>ИМТ · {{{{bmi_text}}}}</span></div>
    </div>
    <p>При росте {{{{height}}}} и весе {{{{weight_now}}}} кг твой ИМТ —
    <b class="acc">{{{{bmi}}}}</b>, это {{{{bmi_text}}}}.</p>
    <p>{{{{task_text}}}}</p>
    <p class="small muted">Оценку формы по картинке считай грубым ориентиром.
    Это не измерение, привязываться к ней не надо.</p>
    {{{{health_warning}}}}
    <div class="note">
      <span class="eyebrow">Что изменится первым</span>
      <p>{{{{first_changes}}}}. Тело станет собраннее, уйдёт ощущение мягкости.
      Первые признаки — через 2–4 недели стабильного режима.</p>
    </div>
  </div>
</div>

<!-- БЛОК 2 -->
<div class="sheet">
  <div class="head"><div class="left">Блок 2</div>
    <div class="right">{{{{name}}}}</div></div>
  <div class="content">
    <h2>Твой тип — почему не получалось раньше</h2>
    <div class="seal">
      <div class="ico"><span class="emo">{{{{type_emoji}}}}</span></div>
      <div>
        <div class="tn">{{{{type_name}}}}</div>
        <div class="tl">{{{{type_level}}}}</div>
      </div>
    </div>
    {{{{type_block}}}}
  </div>
</div>

<!-- БЛОК 3 -->
<div class="sheet">
  <div class="head"><div class="left">Блок 3</div>
    <div class="right">{{{{name}}}}</div></div>
  <div class="content">
    <h2>Что делать и чего не делать</h2>
    <p>{{{{training_line}}}}</p>
    <p>{{{{nutrition_line}}}}</p>
    <div class="dont">
      <span class="eyebrow"><span class="emo">⚠️</span> Чего не делать</span>
      <ul>{{{{dont_items}}}}</ul>
    </div>
    <div class="note">
      <span class="eyebrow">Если ничего не менять</span>
      <p>{{{{forecast}}}}</p>
    </div>
  </div>
</div>

<!-- БЛОК 4 -->
<div class="sheet">
  <div class="head"><div class="left">Блок 4</div>
    <div class="right">{{{{name}}}}</div></div>
  <div class="content">
    <h2>День 0 — сделай прямо сейчас</h2>
    <p>Отпускать тебя с текстом и надеждой я не буду. Дальше одно задание,
    бесплатное, минут на десять.</p>
    <p>Ни диеты. Ни тренировки. Ни весов. Прошлые заходы начинались одинаково:
    «с понедельника меняю всё» — и заканчивались тоже одинаково. Поэтому
    сегодня не меняем ничего, только смотрим, с чем работаем.</p>
    <div class="cta">
      <div class="ct">Открой бота и нажми «День 0»</div>
      <div class="cs">Четыре вопроса в чате — соберём твою стартовую точку:
      режим, два реальных окна под нагрузку и время вечернего голода.</div>
    </div>
    <div class="note">
      <span class="eyebrow">Что будет на руках</span>
      <p>Конкретное место поломки и конкретные окна под нагрузку — то, чего
      не было ни в одном из прошлых заходов.</p>
    </div>
    <div class="sign">{SLOGAN}</div>
  </div>
</div>
"""


def css() -> str:
    p = PAGE
    return theme.base_css(p) + f"""
/* ── обложка ── */
.cover {{ padding: 0; }}
.cover .diag {{
  position: absolute; inset: 0; background: {theme.ACCENT};
  clip-path: polygon(0 62%, 100% 34%, 100% 100%, 0 100%); opacity: 0.92;
}}
.cover .inner {{
  position: relative; height: 100%; display: flex; flex-direction: column;
  padding: {p.pad_top_mm + 2}mm {p.pad_x_mm}mm {p.pad_bottom_mm + 2}mm;
}}
.cover .brand {{ display: flex; align-items: center; gap: 3mm; margin-bottom: 16mm; }}
.cover .brand .ava {{ width: 11mm; height: 11mm; border-radius: 999px; }}
.cover .brand .bt {{ font-size: {p.base_pt * 0.76:.2f}pt; font-weight: 700;
  color: {theme.D_TEXT}; line-height: 1.25; }}
.cover .brand .bt span {{ display: block; font-weight: 400;
  color: {theme.D_TEXT_4}; font-size: {p.base_pt * 0.68:.2f}pt; }}
/* Заголовочный блок держим в верхней, чёрной части листа. Диагональ по
   системе поднимается до 34% у правого края, и центрированный блок заезжал
   на алое: подзаголовок #C8C8CE по #D8232A давал контраст около 2.4:1.
   Нижнюю половину занимает сама диагональ — пустоты там больше нет. */
.cover .eyebrow.hot {{ color: {theme.ACCENT_HI}; }}
.cover h1 {{ color: {theme.D_TEXT}; font-size: {p.base_pt * 3.4:.2f}pt;
  line-height: 0.98; letter-spacing: -0.05em; margin-top: 4mm; }}
.cover .sub {{ color: {theme.D_TEXT_2}; font-size: {p.base_pt * 0.92:.2f}pt;
  max-width: 84mm; margin-top: 5mm; }}
.cover .bottom {{ margin-top: auto; }}
.cover .meta {{ font-family: {theme.FONT_STACK_MONO};
  font-size: {p.base_pt * 0.76:.2f}pt; color: rgba(255,255,255,0.85); }}
.cover .slogan {{ margin-top: 4mm; padding-top: 3.4mm;
  border-top: 0.3mm solid rgba(255,255,255,0.28);
  font-family: {theme.FONT_STACK_DISPLAY}; font-weight: 800;
  font-size: {p.base_pt * 0.92:.2f}pt; letter-spacing: -0.03em;
  color: {theme.D_TEXT}; }}

/* ── внутренние страницы ── */
/* Лист — флекс-колонка, чтобы подпись садилась на низ страницы, а не
   висела сразу под текстом. Правило Crimson «одна мысль — одна страница»
   оставляет много воздуха, и его лучше собрать снизу, чем размазать. */
.sheet {{ display: flex; flex-direction: column; }}
.content {{ flex: 1; display: flex; flex-direction: column; }}
.sign {{ margin-top: auto; }}

h2 {{ margin: {p.base_pt * 1.1:.2f}pt 0 {p.base_pt * 0.85:.2f}pt; }}
.content p + p {{ margin-top: {p.base_pt * 0.85:.2f}pt; }}
.acc {{ color: {theme.ACCENT_DEEP}; }}

.stats {{ display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 2mm;
  margin-bottom: {p.base_pt * 0.9:.2f}pt; }}
.stats .st {{ background: {theme.SURFACE_2}; border-radius: 2.6mm;
  padding: 2.2mm 1.6mm; text-align: center; }}
.stats .st.hot {{ background: {theme.ACCENT_SOFT}; }}
.stats .st b {{ display: block; font-family: {theme.FONT_STACK_DISPLAY};
  font-weight: 800; font-size: {p.base_pt * 1.15:.2f}pt; letter-spacing: -0.03em;
  color: {theme.INK}; }}
.stats .st.hot b {{ color: {theme.ACCENT_DEEP}; }}
.stats .st span {{ display: block; margin-top: 0.8mm;
  font-size: {p.base_pt * 0.58:.2f}pt; color: {theme.INK_4}; line-height: 1.2; }}

/* Предупреждение про врача. Красная рамка, не мелкий шрифт —
   требование ТЗ на бота: «фраза должна быть, и не мелким шрифтом». */
.warn {{ margin-top: {p.base_pt * 0.85:.2f}pt;
  border-left: 0.9mm solid {theme.ACCENT}; background: {theme.ACCENT_SOFT};
  border-radius: 0 2.6mm 2.6mm 0; padding: 2.6mm 3mm;
  font-size: {p.base_pt * 0.92:.2f}pt; }}
.warn b {{ color: {theme.ACCENT_DEEP}; }}

.note {{ margin-top: {p.base_pt * 1.3:.2f}pt; }}
.note .eyebrow {{ display: block; margin-bottom: 1.6mm; }}

.seal {{ display: flex; align-items: center; gap: 3mm;
  margin: {p.base_pt * 0.5:.2f}pt 0 {p.base_pt * 1.0:.2f}pt; }}
.seal .ico {{ width: 12mm; height: 12mm; border-radius: 999px;
  background: {theme.ACCENT_SOFT}; border: 0.3mm solid {theme.ACCENT_EDGE};
  display: flex; align-items: center; justify-content: center; }}
.seal .ico .emo {{ font-size: {p.base_pt * 1.35:.2f}pt; }}
.seal .tn {{ font-family: {theme.FONT_STACK_DISPLAY}; font-weight: 800;
  font-size: {p.base_pt * 1.15:.2f}pt; letter-spacing: -0.03em; color: {theme.INK}; }}
.seal .tl {{ font-size: {p.base_pt * 0.72:.2f}pt; font-weight: 600;
  letter-spacing: 0.12em; text-transform: uppercase; color: {theme.ACCENT_DEEP};
  margin-top: 0.8mm; }}

.dont {{ margin-top: {p.base_pt * 0.95:.2f}pt; background: {theme.ACCENT_SOFT};
  border-radius: 3.2mm; padding: 3mm 3.4mm; }}
.dont .eyebrow {{ display: block; margin-bottom: 1.8mm; }}
.dont ul {{ margin: 0; padding-left: 4.4mm; }}
.dont li {{ margin-bottom: 1.4mm; }}
.dont li::marker {{ color: {theme.ACCENT}; }}

.cta {{ margin-top: {p.base_pt * 1.0:.2f}pt; border: 0.4mm solid {theme.ACCENT};
  border-radius: 3.6mm; padding: 3.4mm 3.6mm; }}
.cta .ct {{ font-family: {theme.FONT_STACK_DISPLAY}; font-weight: 800;
  font-size: {p.base_pt * 1.1:.2f}pt; letter-spacing: -0.03em;
  color: {theme.ACCENT_DEEP}; }}
.cta .cs {{ margin-top: 1.8mm; font-size: {p.base_pt * 0.88:.2f}pt; }}

.sign {{ padding-top: 2.6mm;
  border-top: 0.3mm solid {theme.LINE};
  font-family: {theme.FONT_STACK_DISPLAY}; font-weight: 800;
  font-size: {p.base_pt * 0.92:.2f}pt; letter-spacing: -0.03em;
  color: {theme.INK}; }}
"""


# ─────────────────────────── сборка ───────────────────────────

_TOKEN = re.compile(r"\{\{(\w+)\}\}")


def fill(template: str, ctx: dict[str, str]) -> str:
    """Подставляет {{токены}}. Незакрытый токен — ошибка, а не пустая строка:
    молча выпавшее имя в персональном документе хуже, чем упавшая сборка."""
    missing = {m for m in _TOKEN.findall(template) if m not in ctx}
    if missing:
        raise KeyError(f"нет значений для плейсхолдеров: {sorted(missing)}")
    return _TOKEN.sub(lambda m: ctx[m.group(1)], template)


def build(p: Profile, slug: str | None = None,
          renderer: render.Renderer | None = None) -> pathlib.Path:
    """Собирает персональный PDF. Возвращает путь к файлу."""
    html = render.document(
        css(), fill(page_template(), build_context(p)),
        f"{p.name} — твоя диагностика",
    )
    slug = slug or f"lid-magnit-{_translit(p.name)}"

    if renderer is not None:
        return renderer.render(html, slug, PAGE)
    with render.Renderer() as r:
        path = r.render(html, slug, PAGE)
        for w in r.warnings:
            print("  !", w)
        return path


def _translit(text: str) -> str:
    table = {"а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e",
             "ё": "e", "ж": "zh", "з": "z", "и": "i", "й": "y", "к": "k",
             "л": "l", "м": "m", "н": "n", "о": "o", "п": "p", "р": "r",
             "с": "s", "т": "t", "у": "u", "ф": "f", "х": "h", "ц": "ts",
             "ч": "ch", "ш": "sh", "щ": "sch", "ъ": "", "ы": "y", "ь": "",
             "э": "e", "ю": "yu", "я": "ya"}
    return "".join(table.get(ch, ch if ch.isalnum() else "-")
                   for ch in text.lower()).strip("-") or "demo"


# Демонстрационный экземпляр. Галина — персонаж из спеки лид-магнита:
# рост 165, вес 78 → 66, тип 4 «Начинаю и срываюсь», без противопоказаний.
GALINA = Profile(
    name="Галина", gender="f", age=36, height=165,
    weight_now=78, weight_goal=66, goal="loss",
    form_now=4, form_goal=2, life="some", attempts="4-6",
    break_point="2-3w", breakers=["even", "stress"], health=[],
)

# Второй экземпляр — проверка обязательного абзаца про врача и мужского рода.
PETR = Profile(
    name="Пётр", gender="m", age=52, height=178,
    weight_now=96, weight_goal=88, goal="loss",
    form_now=5, form_goal=3, life="sit", attempts="2-3",
    break_point="week", breakers=["tired", "time"], health=["heart", "knee"],
)


def main() -> None:
    with render.Renderer() as r:
        for prof, slug in ((GALINA, "lid-magnit-demo-galina"),
                           (PETR, "lid-magnit-demo-petr")):
            print("  ", build(prof, slug, renderer=r).name)
        warnings = r.warnings

    if warnings:
        print("\nПереполнение:")
        for w in warnings:
            print("  !", w)
    else:
        print("Готово, переполнений нет.")


if __name__ == "__main__":
    main()
