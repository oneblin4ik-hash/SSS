#!/usr/bin/env python3
"""
Страница оффера трипваера «План на первые 14 дней».

Собирается по секции «Оффер без давления» из Crimson Funnel Kit: сетка
1.25fr / 1fr, карточка оффера на #131315 с алым кругом-декором, крупная цена,
состав чекбоксами, кнопка-пилюля и условие рядом с ней, справа — колонка
доказательств и FAQ-аккордеон.

СОДЕРЖИМОЕ — из source/lid-magnit-kviz-Serbolin.md, раздел «ОФФЕР ТРИПВАЕРА».

ЧЕГО В МАКЕТЕ БРАТЬ НЕЛЬЗЯ. Хендофф сам помечает контент секции как черновой
(«цифры отзывов, тексты FAQ — заменяются реальными материалами клиента»).
Там стоят: отзыв «Артём, 34», «1 240 прошли разбор», оценка «4,9»,
зачёркнутая старая цена 4 900 ₽ с чипом «−80%» и возврат денег за три дня.
Ничего этого в спеке нет. Это не оформление, а фактические утверждения и
финансовые обязательства, поэтому они НЕ придуманы: блоки стоят явными
заглушками с пометкой «нужны реальные цифры». Владелец подставляет свои —
или блок удаляется целиком, страница без него не разваливается.

ТАЙМЕРА НЕТ СОЗНАТЕЛЬНО. Crimson запрещает таймеры и «осталось 3 места».
Правило «цена держится 48 часов после теста» из спеки оставлено обычной
строкой рядом с кнопкой: это условие сделки, а не обратный отсчёт.

Персонализация — те же плейсхолдеры, что у лид-магнита ({{name}}, {{level}}),
чтобы бот подставлял значения из одного и того же JSON квиза.

Запуск:  python3 build_offer.py
Результат: out/offer.html и out/offer-artifact.html
"""
import base64
import pathlib
import re

HERE = pathlib.Path(__file__).parent
FONT_DIR = HERE / "fonts"
OUT = HERE / "out"

# ── содержимое из спеки ──────────────────────────────────────

LEVELS = [
    ("🔍", "Диагностика", "дни 1–3", "где ты стоишь, без диеты и зала"),
    ("⚙️", "Первые шаги", "дни 4–7", "первая тренировка, вечерний голод, день отдыха"),
    ("🧩", "Система", "дни 8–10", "питание на 3 дня вперёд, замеры, «вредная еда» без запретов"),
    ("🛡", "Закрепление", "дни 11–14", "тренировка когда некогда, протокол срыва, тест прогресса"),
]

INCLUDED = [
    ("📋", "Карта твоего дня", "два реальных окна под тренировку, найденные не «в теории», а в твоём расписании"),
    ("🍽", "Библиотека из 9 блюд", "три завтрака, три обеда, три ужина, которые ты умеешь и любишь"),
    ("🛒", "Список покупок", "собирается сам из этой библиотеки"),
    ("🏋️", "Три тренировки по 20 минут", "дома, без оборудования, с щадящим вариантом под колени и голеностоп"),
    ("⚡", "Тренировка на 15 минут", "для недель, когда всё горит"),
    ("📊", "Твои цифры прогресса", "таблица за дни 4, 9 и 13 — доказательство, что тело меняется, даже когда весы молчат"),
    ("🥧", "Схема, как есть любимое", "1–2 раза в неделю без вины и без откатов"),
    ("🌙", "Разобранный вечерний голод", "почему пробивает в 21:00 и что съесть днём, чтобы не пробивало"),
    ("🛡", "Протокол срыва на 4 шага", "распечатанный, на холодильник"),
    ("📄", "14 PDF-страниц", "по одной на день, можно печатать и держать под рукой"),
]

# Ответы собраны из фактов спеки, а не сочинены: состав уровней, формат
# тренировок, правило про врача и кнопка «Не вышло» описаны в
# tripvaer-14-dney-Serbolin.md и bot-integratsiya-Serbolin.md.
FAQ = [
    ("Я совсем новичок — потяну?",
     "Первые три дня идут вообще без диеты и без зала: смотрим твой режим, "
     "собираем тарелку, разбираем воду. Тренировка появляется только на "
     "четвёртый день, и она на 20 минут."),
    ("Нужен зал или оборудование?",
     "Нет. Все тренировки дома, без оборудования. Есть щадящий вариант под "
     "колени и голеностоп — без прыжков и ударной нагрузки."),
    ("А если пропущу день?",
     "Вечером в боте две кнопки: «Сделал» и «Не вышло». Вторая не для "
     "статистики — она отвечает без морали: перенесли на завтра, курс не "
     "сгорел. Именно из-за неё люди доходят до конца."),
    ("Что останется после четырнадцатого дня?",
     "Библиотека блюд, протокол срыва, твои цифры и все PDF. Курс "
     "заканчивается, инструменты остаются — пользоваться ими можно годами."),
    ("У меня проблемы с сердцем или диабет.",
     "Тогда первый — врач, а не тренер: нужно разрешение на нагрузку и "
     "понимание, чего тебе нельзя. Курс про режим, питание и протокол срыва, "
     "а не про рекорды, но начинать надо с бумажки от доктора."),
]


# ── шрифты ───────────────────────────────────────────────────

def font_css() -> str:
    """Встраивает woff2 в base64: в артефакте CSP режет внешние хосты."""
    faces = []
    for f in sorted(FONT_DIR.glob("*.woff2")):
        name, weight, subset = f.stem.rsplit("-", 2)
        family = {"manrope": "Manrope", "inter": "Inter",
                  "jetbrains-mono": "JetBrains Mono"}.get(name)
        if not family:
            continue
        b64 = base64.b64encode(f.read_bytes()).decode("ascii")
        rng = ("U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116"
               if subset == "cyrillic" else
               "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+2000-206F,U+2122")
        faces.append(
            f"@font-face{{font-family:'{family}';font-style:normal;"
            f"font-weight:{weight};font-display:swap;"
            f"src:url(data:font/woff2;base64,{b64}) format('woff2');"
            f"unicode-range:{rng};}}"
        )
    return "\n".join(faces)


# ── разметка ─────────────────────────────────────────────────

def levels_html() -> str:
    return "".join(
        f'<li class="lv"><span class="emo">{e}</span>'
        f'<div><b>{name}</b> <span class="days">{days}</span>'
        f'<div class="d">{desc}</div></div></li>'
        for e, name, days, desc in LEVELS
    )


def included_html() -> str:
    return "".join(
        f'<li class="inc"><span class="emo">{e}</span>'
        f'<div><b>{title}</b> — {desc}</div></li>'
        for e, title, desc in INCLUDED
    )


def faq_html() -> str:
    items = []
    for i, (q, a) in enumerate(FAQ):
        items.append(
            f'<details class="q"{" open" if i == 0 else ""}>'
            f"<summary>{q}<span class='chev' aria-hidden='true'></span></summary>"
            f"<p>{a}</p></details>"
        )
    return "".join(items)


def body() -> str:
    return f"""
<div class="wrap">

  <header class="hero">
    <div class="brand">
      <img class="ava" src="../assets/avatar.png" alt="">
      <div>Эдуард Серболин<span>онлайн-тренер · 12 лет практики</span></div>
    </div>
    <p class="eyebrow">Курс · 14 дней</p>
    <h1>План на первые<br>14 дней</h1>
    <p class="lead">Один короткий урок в день и одно действие. Не теория —
    то, что делаешь сегодня.</p>
    <ul class="levels">{levels_html()}</ul>
  </header>

  <!-- Персональная плашка. Плейсхолдеры те же, что у лид-магнита, —
       бот подставляет из того же JSON квиза. -->
  <aside class="personal">
    <p><b>{{{{name}}}}, по тесту твой уровень — {{{{level}}}}.</b> Начнём с
    диагностики, как все, но упор сделаем туда, где ты падала раньше.</p>
  </aside>

  <main class="grid">
    <section class="offer">
      <div class="decor" aria-hidden="true"></div>
      <div class="inner">
        <p class="eyebrow hot">Что забираешь</p>
        <h2>Инструменты, которые останутся после курса</h2>
        <p class="sub">Через две недели курс закончится, а библиотека блюд,
        протокол срыва и твои цифры останутся. Пользоваться ими можно годами.</p>

        <div class="price">
          <span class="rub">690 ₽</span>
          <span class="was"><s>1&thinsp;990 ₽</s> обычная цена</span>
          <span class="once">один раз, навсегда твоё</span>
        </div>

        <ul class="included">{included_html()}</ul>

        <div class="cta-row">
          <a class="btn" href="#">Забрать план — 690 ₽</a>
          <p class="terms">690 ₽ держатся 48 часов после теста, дальше 1&thinsp;990 ₽.<br>
          Оплата один раз, подписки нет.</p>
        </div>
      </div>
    </section>

    <aside class="side">
      <!-- ЗАГЛУШКА. В макете тут отзыв, число прошедших и оценка. В спеке
           таких данных нет, поэтому цифры не выдуманы — подставь свои или
           удали блок целиком, вёрстка не поедет. -->
      <div class="ph">
        <p class="eyebrow muted">Место под доказательства</p>
        <p>Отзыв, число прошедших курс и оценка. Нужны реальные цифры —
        выдуманные тут стоять не будут.</p>
      </div>

      <div class="faq">
        <p class="eyebrow muted">Частые вопросы</p>
        {faq_html()}
      </div>
    </aside>
  </main>

  <footer class="foot">
    <p>Хочешь сначала поговорить со мной? Напиши в личку — разберу твою
    ситуацию бесплатно. Беру несколько разборов в неделю, живая очередь.</p>
    <p class="slogan">Терпение + Дисциплина = Результат</p>
  </footer>

</div>"""


def css() -> str:
    return """
*{box-sizing:border-box;margin:0;padding:0}
:root{
  --void:#0B0B0C; --plate:#131315; --plate-2:#1B1B1E;
  --line:rgba(255,255,255,.07); --line-2:rgba(255,255,255,.14);
  --accent:#D8232A; --accent-hi:#F4363D;
  --text:#fff; --text-2:#C8C8CE; --text-3:#9A9AA0; --text-4:#6B6B72;
}
html{-webkit-text-size-adjust:100%}
/* Noto Color Emoji стоит в общем стеке, а не только у .emo: уровень
   подставляется ботом как обычный текст ({{level}} = «🛡 Закрепление»),
   и без этого 🛡 отрисовывается текстовым глифом, похожим на сердечко. */
body{
  background:var(--void); color:var(--text-2);
  font:400 17px/1.55 'Inter',system-ui,'Noto Color Emoji',sans-serif;
  letter-spacing:-.1px; -webkit-font-smoothing:antialiased;
}
h1,h2,h3,b,strong{font-family:'Manrope','Inter','Noto Color Emoji',sans-serif;color:var(--text)}
h1,h2{font-weight:800;letter-spacing:-.04em;line-height:1.04;text-wrap:balance}
.emo{font-family:'Noto Color Emoji',sans-serif;font-size:.92em;line-height:1}

.wrap{max-width:1260px;margin:0 auto;padding:44px 26px 64px}

/* ── шапка ── */
.brand{display:flex;align-items:center;gap:14px;margin-bottom:64px;
  font:700 15px/1.3 'Manrope',sans-serif;color:var(--text)}
.brand .ava{width:44px;height:44px;border-radius:999px}
.brand span{display:block;font:400 13px/1.3 'Inter',sans-serif;color:var(--text-4);margin-top:3px}
.eyebrow{font:600 11px/1 'Inter',sans-serif;letter-spacing:2.2px;
  text-transform:uppercase;color:var(--accent-hi);margin-bottom:18px}
.eyebrow.muted{color:var(--text-4);letter-spacing:1.8px}
.hero h1{font-size:clamp(40px,7vw,62px);letter-spacing:-2.2px}
.hero .lead{font-size:19px;color:var(--text-3);max-width:44ch;margin-top:20px}

.levels{list-style:none;display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));
  gap:18px;margin-top:44px;padding-top:32px;border-top:1px solid var(--line)}
.lv{display:flex;gap:12px;align-items:flex-start}
.lv b{font-size:16px}
.lv .days{font:400 12px/1 'JetBrains Mono',monospace;color:var(--text-4);margin-left:6px}
.lv .d{font-size:14px;line-height:1.45;color:var(--text-4);margin-top:5px}

/* ── персональная плашка ── */
.personal{margin:44px 0 0;padding:18px 22px;border-left:3px solid var(--accent);
  background:rgba(216,35,42,.10);border-radius:0 16px 16px 0;font-size:16px}
.personal b{color:var(--accent-hi)}

/* ── сетка ── */
.grid{display:grid;grid-template-columns:1.25fr 1fr;gap:32px;align-items:start;margin-top:32px}

.offer{position:relative;overflow:hidden;background:var(--plate);
  border:1px solid var(--line);border-radius:28px;padding:38px}
.offer .decor{position:absolute;right:-80px;top:-80px;width:280px;height:280px;
  border-radius:50%;background:rgba(216,35,42,.12)}
.offer .inner{position:relative}
.offer h2{font-size:clamp(28px,3.4vw,38px);letter-spacing:-1.4px;max-width:16ch}
.offer .sub{font-size:16px;color:#B4B4BA;margin-top:16px;max-width:52ch}

.price{display:flex;align-items:baseline;gap:18px;flex-wrap:wrap;margin:32px 0 30px}
.price .rub{font:800 clamp(48px,6vw,62px)/1 'Manrope',sans-serif;
  letter-spacing:-2.6px;color:var(--text)}
.price .was{font-size:15px;color:var(--text-4)}
.price .was s{color:var(--text-3);text-decoration-thickness:1px;
  text-underline-offset:2px;margin-right:6px}
.price .once{font-size:15px;color:var(--text-4)}

.included{list-style:none;display:grid;grid-template-columns:1fr 1fr;gap:14px 22px}
.inc{display:flex;gap:12px;align-items:flex-start;font-size:14.5px;line-height:1.45}
.inc b{font-weight:700}

.cta-row{display:flex;align-items:center;gap:24px;flex-wrap:wrap;margin-top:34px;
  padding-top:30px;border-top:1px solid var(--line)}
.btn{display:inline-block;padding:21px 44px;border-radius:9999px;background:var(--accent);
  color:#fff;text-decoration:none;font:700 14px/1 'Inter',sans-serif;
  letter-spacing:1.8px;text-transform:uppercase;
  box-shadow:0 12px 34px rgba(216,35,42,.3);transition:transform .12s,background .22s}
.btn:hover{background:var(--accent-hi);transform:translateY(-1px)}
.btn:active{transform:scale(.96)}
.btn:focus-visible{outline:2px solid var(--accent);outline-offset:3px}
.terms{font-size:13.5px;line-height:1.45;color:var(--text-4)}

/* ── правая колонка ── */
.side{display:flex;flex-direction:column;gap:20px}
.ph{background:var(--plate);border:1px dashed var(--line-2);border-radius:20px;
  padding:26px;font-size:14.5px;line-height:1.5;color:var(--text-4)}
.ph .eyebrow{display:block;margin-bottom:12px}

.faq{background:var(--plate);border:1px solid var(--line);border-radius:20px;padding:26px}
.faq .eyebrow{display:block;margin-bottom:8px}
.q{border-top:1px solid var(--line)}
.q:first-of-type{border-top:0}
.q summary{display:flex;justify-content:space-between;align-items:center;gap:16px;
  padding:20px 0;cursor:pointer;list-style:none;
  font:600 15.5px/1.35 'Inter',sans-serif;color:var(--text-2)}
.q summary::-webkit-details-marker{display:none}
.q[open] summary{color:var(--text)}
.q .chev{flex:none;width:11px;height:11px;border-right:2px solid var(--text-4);
  border-bottom:2px solid var(--text-4);transform:rotate(45deg) translate(-2px,-2px);
  transition:transform .22s}
.q[open] .chev{border-color:var(--accent);transform:rotate(-135deg) translate(-2px,-2px)}
.q p{padding:0 0 20px;font-size:14.5px;line-height:1.55;color:var(--text-3)}

/* ── подвал ── */
.foot{margin-top:44px;padding-top:32px;border-top:1px solid var(--line);
  display:flex;justify-content:space-between;gap:32px;flex-wrap:wrap;
  font-size:14.5px;color:var(--text-4);max-width:none}
.foot p{max-width:56ch}
.slogan{font:800 15px/1.3 'Manrope',sans-serif;letter-spacing:-.5px;color:var(--text)}

@media (max-width:900px){
  .wrap{padding:28px 18px 48px}
  .brand{margin-bottom:40px}
  .grid{grid-template-columns:1fr;gap:22px}
  .offer{padding:26px 22px;border-radius:22px}
  .included{grid-template-columns:1fr}
  .cta-row{gap:16px}
  .btn{width:100%;text-align:center;padding:20px}
}
@media (prefers-reduced-motion:reduce){*{transition:none!important}}
"""


def main() -> None:
    OUT.mkdir(exist_ok=True)
    title = "План на первые 14 дней"
    page = f"<title>{title}</title>\n<style>\n{font_css()}\n{css()}\n</style>\n{body()}"

    # Демо-подстановка, чтобы страницу можно было смотреть как есть.
    demo = page.replace("{{name}}", "Галина").replace("{{level}}", "🛡 Закрепление")

    # Аватар — в base64: артефакт это один файл, относительный путь из него
    # не разрешится, а CSP всё равно не пустит наружу.
    avatar = base64.b64encode((HERE / "assets" / "avatar.png").read_bytes()).decode()
    demo = demo.replace('src="../assets/avatar.png"',
                        f'src="data:image/png;base64,{avatar}"')
    page = page.replace('src="../assets/avatar.png"',
                        f'src="data:image/png;base64,{avatar}"')

    (OUT / "offer-artifact.html").write_text(demo, encoding="utf-8")
    (OUT / "offer.html").write_text(
        "<!doctype html>\n<html lang=\"ru\">\n<head>\n<meta charset=\"utf-8\">\n"
        "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n"
        f"{demo.split('</style>')[0]}</style>\n</head>\n<body>"
        f"{demo.split('</style>', 1)[1]}\n</body>\n</html>",
        encoding="utf-8",
    )
    # Шаблон с неподставленными плейсхолдерами — его отдаём разработчику бота.
    (OUT / "offer-template.html").write_text(page, encoding="utf-8")

    for f in ("offer.html", "offer-artifact.html", "offer-template.html"):
        kb = (OUT / f).stat().st_size / 1024
        print(f"  {f} ({kb:.0f} КБ)")

    live = re.findall(r'(?:src|href)\s*=\s*"(https://[^"]+)"', demo)
    print("Внешних ресурсов нет." if not live else f"ВНИМАНИЕ: {set(live)}")


if __name__ == "__main__":
    main()
