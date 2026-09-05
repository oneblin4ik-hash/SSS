#!/usr/bin/env python3
"""
Оффер трипваера «Первые шаги к форме» — три слайда.

СТРУКТУРА (решение владельца, три слайда вместо одной длинной страницы):

  1. Обложка. Кто говорит, что за курс, персональная плашка по тесту,
     три числа-факта и одна мысль, ради которой листают дальше.
  2. Ценность. Что внутри четырнадцати дней и что останется на руках,
     когда они кончатся.
  3. Решение. Отзывы, цена, кнопка и частые вопросы.

ЧЕМ ЭТО ОТДАЁТСЯ ЧЕЛОВЕКУ. Владелец разрешил выбрать: PDF или Mini App.
Выбран Mini App как основной носитель, PDF — вдогонку, и вот почему.

Работа оффера держится на кнопке. В Mini App «Написать Эдуарду» открывает
диалог в одно касание, не выводя человека из Telegram. В PDF та же ссылка
живёт внутри просмотрщика, куда человек уходит из чата, и возвращается он
оттуда уже без запала. Плюс FAQ: семь вопросов гармошкой занимают семь
строк, а развёрнутые — половину слайда, и в бумаге они развёрнуты всегда.

PDF всё равно собирается: это то, что остаётся в переписке, сохраняется и
пересылается мужу или подруге. Источник у обоих один — функции ниже, —
поэтому разъехаться тексты не могут физически.

Разметка одна, отличий ровно два: в PDF FAQ печатается развёрнутым, а
кнопки-навигации между слайдами нет — там их роль выполняет прокрутка.

ФОРМАТ PDF. Ширина 130 мм — как у остальных PDF воронки (theme.PHONE),
чтобы комплект выглядел одним комплектом. А вот высота у трёх страниц
разная, и это сделано намеренно.

Слайды не равны по объёму: обложка это пол-экрана, а на третьем лежат
отзывы, цена и семь вопросов — почти втрое больше. Одна высота на всех
даёт выбор из двух плохих: либо резать третий слайд, либо оставить первые
два наполовину пустыми. Поэтому сборка сначала меряет каждый слайд, а
потом печатает страницу ровно под него — через именованные @page, которые
Chromium разрешает делать разного размера в одном документе.

Читателю шва не видно: PDF в Telegram листают вертикально, страницы идут
встык и одной ширины. Побочный эффект приятный — переполнения тут в
принципе не бывает, страница подстраивается под текст, а не наоборот.

СОДЕРЖИМОЕ — из source/lid-magnit-kviz-Serbolin.md, раздел «ОФФЕР
ТРИПВАЕРА», и из bot-integratsiya-Serbolin.md, §5.4.

ЧЕГО В МАКЕТЕ БРАТЬ НЕЛЬЗЯ. Хендофф сам помечает контент секции как
черновой («цифры отзывов, тексты FAQ — заменяются реальными материалами
клиента»). Там стоят: «1 240 прошли разбор», оценка «4,9», зачёркнутая
цена 4 900 ₽ с чипом «−80%» и возврат денег за три дня. Ничего этого в
спеке нет. Это не оформление, а фактические утверждения и финансовые
обязательства, поэтому они НЕ придуманы: блок стоит явной заглушкой.

ВЫДУМАННЫХ ОТЗЫВОВ НА СТРАНИЦЕ НЕТ. Курс ещё никто не прошёл, значит
отзывов о нём не существует, и блок прямо об этом говорит. Прежние три
«примера оформления» сняты вместе с кодом.

Вместо них работают три вещи, и каждую можно проверить: фотографии «до/после»
со сроками, вшитыми в кадр; шесть учеников со ссылками на посты, где человек
говорит сам; три листа курса целиком. Для трипваера за 1 890 ₽ увидеть товар
до оплаты сильнее, чем прочитать про него отзыв.

ПЛАТЁЖНОЙ СИСТЕМЫ НЕТ. Кнопка ведёт в личку @Mr_Serbolin с заранее набранным
сообщением: реквизиты Эдуард называет сам в переписке, на странице их нет.

ТАЙМЕРА НЕТ СОЗНАТЕЛЬНО. Crimson запрещает таймеры и «осталось 3 места».

ЗАЧЁРКНУТОЙ ЦЕНЫ ТОЖЕ НЕТ. При разнице в сто рублей «старая» цифра стала бы
украшением, а цена, по которой не продавали, в этой роли — недостоверная
реклама. Убрана совсем.

Персонализация — плейсхолдеры {{name}} и {{type}}, те же, что у лид-магнита.
{{type}} это тип старта из payload v2 («Чистый лист», «Второй заход»,
«Рывками»). В PDF их нет: файл один на всех, поэтому там плашка стоит в
безымянном виде.

Запуск:  python3 build_offer.py
Результат: out/offer.html, out/offer-artifact.html, out/offer-template.html,
           out/offer.pdf
"""
import base64
import os
import pathlib
import re

HERE = pathlib.Path(__file__).parent
FONT_DIR = HERE / "fonts"
OUT = HERE / "out"
BUILD = HERE / "build"

# Ширина страницы PDF — как у PHONE из serbolin-pdf/lib/theme.py. Высота у
# каждого слайда своя, её считает сама сборка; PDF_MIN_H_MM — нижняя граница,
# чтобы обложка не съёжилась в открытку.
PDF_W_MM = 130
PDF_MIN_H_MM = 231
PDF_PAD_MM = 4      # воздух под последней строкой слайда
MM = 96 / 25.4      # CSS-пикселей в миллиметре

PRICE = "1 890 ₽"

TG_LINK = (
    "https://t.me/Mr_Serbolin?text="
    "%D0%A5%D0%BE%D1%87%D1%83%20%D0%BA%D1%83%D1%80%D1%81%20%C2%AB"
    "%D0%9F%D0%B5%D1%80%D0%B2%D1%8B%D0%B5%20%D1%88%D0%B0%D0%B3%D0%B8%20"
    "%D0%BA%20%D1%84%D0%BE%D1%80%D0%BC%D0%B5%C2%BB"
)

# ── содержимое из спеки ──────────────────────────────────────

# Три числа на обложке. Все три — факты из tripvaer-14-dney-Serbolin.md,
# а не рекламные округления: уроков ровно четырнадцать, тренировка идёт
# двадцать минут, первая появляется на четвёртый день.
FACTS = [
    ("14", "дней", "по одному короткому уроку"),
    ("20", "минут", "столько идёт тренировка"),
    ("4-й", "день", "раньше не тренируемся вообще"),
]

LEVELS = [
    ("🔍", "Точка старта", "дни 1–3", "где ты сейчас, без диеты и без зала"),
    ("⚙️", "Первые шаги", "дни 4–7", "первая тренировка, день отдыха, вечерняя еда без голодания"),
    ("🧩", "Твоя система", "дни 8–10", "питание на 3 дня вперёд, замеры, «вредная еда» без запретов"),
    ("🛡", "Уже привычка", "дни 11–14", "тренировка когда некогда, как не бросить, тест прогресса"),
]

INCLUDED = [
    ("📋", "Карта твоего дня", "два реальных окна под тренировку, найденные в твоём расписании, а не в теории"),
    ("🧮", "Своя норма КБЖУ", "посчитана в первый день, дальше все решения про еду опираются на неё"),
    ("🍽", "Библиотека из 9 блюд", "три завтрака, три обеда, три ужина, которые ты умеешь и любишь"),
    ("🛒", "Список покупок", "собирается сам из этой библиотеки"),
    ("🏋️", "Три тренировки по 20 минут", "дома, без оборудования, с щадящим вариантом под колени и голеностоп"),
    ("⚡", "Тренировка на 15 минут", "для недель, когда всё горит"),
    ("📊", "Твои цифры прогресса", "таблица за дни 4, 9 и 13: доказательство, что тело меняется, даже когда весы молчат"),
    ("🥧", "Схема, как есть любимое", "1–2 раза в неделю, без вины и без откатов"),
    ("🌙", "Схема вечерней еды", "без «после шести нельзя»: что съесть вечером и почему голодать не надо"),
    ("🛡", "Правило возврата на 4 шага", "чтобы пропущенный день не превращался в брошенный месяц"),
    ("📄", "14 PDF-страниц", "по одной на день, можно печатать и держать под рукой"),
]


# Ответы собраны из фактов спеки, а не сочинены: состав уровней, формат
# тренировок, правило про врача и кнопка «Не вышло» описаны в
# tripvaer-14-dney-Serbolin.md и bot-integratsiya-Serbolin.md.
FAQ = [
    ("Я совсем новичок — потяну?",
     "Первые три дня идут без диеты и без зала: смотрим твой режим, собираем "
     "тарелку, разбираем воду. Тренировка появляется только на четвёртый "
     "день, и она на двадцать минут."),
    ("Я занимался раньше — не будет слишком просто?",
     "Первая неделя лёгкая намеренно, и подготовка тут ни при чём. После "
     "долгой паузы суставы догоняют мышцы медленнее всего, и спешка на этом "
     "месте заканчивается травмой. Дальше прогрессия идёт по твоим же "
     "записям: нагрузку задаёшь ты."),
    ("Нужен зал или оборудование?",
     "Нет. Все тренировки дома, без оборудования. Есть щадящий вариант под "
     "колени и голеностоп — без прыжков и ударной нагрузки."),
    ("А после шести есть нельзя?",
     "Можно. Голодать по вечерам я никого не заставляю: считается день "
     "целиком, твоя норма КБЖУ и дефицит, если цель похудение. Вечером лучше "
     "белок или белок с овощами."),
    ("А если пропущу день?",
     "Вечером в боте две кнопки: «Сделал» и «Не вышло». Вторая отвечает без "
     "морали — перенесли на завтра, курс не сгорел. Именно из-за неё люди "
     "доходят до конца."),
    ("Что останется после четырнадцатого дня?",
     "Библиотека блюд, правило возврата, твои цифры и все PDF. Курс "
     "заканчивается, инструменты остаются — пользоваться ими можно годами."),
    ("У меня проблемы с сердцем или диабет.",
     "Тогда первый — врач, а не тренер: нужно разрешение на нагрузку и "
     "понимание, чего тебе нельзя. Начинать надо с бумажки от доктора."),
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


# ── блоки ────────────────────────────────────────────────────

def facts_html() -> str:
    return "".join(
        f'<li class="fact"><b>{num}</b><span class="unit">{unit}</span>'
        f'<span class="d">{desc}</span></li>'
        for num, unit, desc in FACTS
    )


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


def avatar_svg(letter: str) -> str:
    """Аватар заглушки, нарисованный кодом: плашка и буква имени.

    Фотографий людей в проекте нет — единственный «портрет» бренда это
    assets/avatar.png. Рисованная буква ещё и честнее: её никто не примет
    за настоящего человека, а именно этого мы и добиваемся, пока отзывы
    не заменены на живые.
    """
    return (
        '<svg class="rv-ava" viewBox="0 0 64 64" aria-hidden="true">'
        '<circle cx="32" cy="32" r="31" fill="rgba(216,35,42,.14)" '
        'stroke="rgba(216,35,42,.42)" stroke-width="1.4"/>'
        '<text x="32" y="41" text-anchor="middle" fill="#F4363D" '
        "font-family=\"Manrope, sans-serif\" font-size=\"25\" "
        f'font-weight="800">{letter}</text></svg>'
    )


# Снимки «до/после» из папки курса. Имена, сроки и подписи — из постов
# Эдуарда, разобранных в `serbolin-pdf/source/istorii-uchenikov.md`.
#
# Подписей тут долго не было: цифры веса и срок вшиты прямо в кадр, и
# дублировать их снизу — шум. Но имени в кадре нет, а имя превращает
# картинку в человека — Галина с восемью месяцами читается иначе, чем
# безымянный силуэт с цифрами. Поэтому подпись есть, и в ней стоит то,
# чего в кадре не видно: кто это и что стоит за цифрами.
#
# Правило прежнее: ни одного факта сверх того, что владелец назвал сам.
# Двое из шестерых сняты по его решению — снимок той же Жени со старыми
# цифрами и второй ракурс подростка, у которого нет ни имени, ни срока.
#
# Согласие клиентов на публичный показ подтвердил владелец.
# Порядок не случайный. Два кадра во всю ширину держат блок с краёв: Женя
# открывает — минус тридцать семь килограммов, самый крупный результат
# набора; Эльнур закрывает — чемпионский. Между ними три ряда по два, и
# в каждом ряду одна женщина и один мужчина: строчка читается и теми,
# и другими, а не только «своей» половиной.
RESULTS = [
    ("do-posle-zhenya", "Женя, 34 года", "Четыре месяца, 140 → 103 кг. "
     "Руководила сетью салонов связи, жила в режиме «работа — дом — работа». "
     "Колени болели так, что дальше такси не уезжала. Сейчас поднимается "
     "на двенадцатый этаж без одышки.", True),
    ("do-posle-74-54", "Галина", "Восемь месяцев, 74 → 54 кг.", False),
    ("do-posle-106-85", "Артур", "Четыре месяца, 106 → 85 кг.", False),
    ("do-posle-70-62", "Виктория", "Три месяца, 70 → 62 кг. Работали онлайн, "
     "и это с травмами позвоночника.", False),
    # Подпись длиннее соседних намеренно: это единственный кадр, где весы
    # занижают результат, и без объяснения он проигрывает соседям с более
    # круглыми цифрами.
    ("do-posle-137-120", "Александр", "Девять месяцев, 137 → 120 кг. Жира ушло "
     "семнадцать — весы показывают меньше, потому что добавились мышцы. "
     "За те же девять месяцев с нуля выполнил разряд по пауэрлифтингу.",
     False),
    ("do-posle-snezhana", "Снежана", "Шесть месяцев, минус двадцать "
     "килограммов.", False),
    ("do-posle-german", "Герман", "Три месяца между кадрами. До этого шесть "
     "раз пробовал похудеть сам. Сорок пять минут три раза в неделю, калорий "
     "не считали. Кадр «до» снят не в первый день — пару месяцев он "
     "стеснялся фотографироваться.", False),
    ("do-posle-chempion", "Эльнур", "Четыре месяца между кадрами. Дальше — "
     "четыре абсолютных чемпионских титула по бодибилдингу. А начиналось "
     "с того же, что у тебя: режим, тарелка и записанные повторы.", True),
]

PHOTO_DIR = HERE.parent / "serbolin-pdf" / "assets" / "photo"


def photo_b64(stem: str) -> str:
    raw = (PHOTO_DIR / f"{stem}.webp").read_bytes()
    return "data:image/webp;base64," + base64.b64encode(raw).decode("ascii")


def results_html() -> str:
    cells = "".join(
        f'<figure class="rz{" rz-wide" if wide else ""}">'
        f'<img src="{photo_b64(stem)}" alt="" loading="lazy">'
        f'<figcaption><b>{name}</b> {line}</figcaption></figure>'
        for stem, name, line, wide in RESULTS)
    return f"""
      <p class="eyebrow">Результаты учеников</p>
      <div class="rz-grid">{cells}</div>
      <p class="rz-note">От трёх месяцев до девяти. За две недели курса такого
      не будет, и курс говорит об этом прямым текстом. Он даёт старт, остальное
      делает время.</p>
      <div class="rz-reg">
        <div><b>2</b><span>чемпиона по бодибилдингу</span></div>
        <div><b>3</b><span>МСМК</span></div>
        <div><b>13</b><span>мастера спорта</span></div>
        <div><b>18</b><span>КМС</span></div>
      </div>
      <p class="rz-note">Три последние цифры — пауэрлифтинг. К твоей задаче
      отношения не имеют: это про то, что нагрузку под конкретного человека
      Эдуард считать умеет.</p>"""


# Шесть учеников из инстаграма Эдуарда. Ссылки ведут на его же посты, где
# ученик говорит сам — на видео. Здесь стоят не слова учеников, а слова
# Эдуарда о них: подписи к постам отдаёт oEmbed без авторизации, а звук
# из видео вытащить нечем. Поэтому блок подписан как «мои ученики»,
# а не как отзывы, и каждая карточка ведёт туда, где человек говорит сам.
#
# Ни одного факта здесь нет сверх того, что стоит в подписи к посту.
# Проверить любой можно по ссылке рядом — на этом блок и держится.
STUDENTS = [
    ("Д", "Дмитрий Матягин", "тренер и реабилитолог",
     "Девять лет вместе. Раньше были проблемы с дисциплиной и с тем, чего он "
     "вообще хочет. Теперь есть и цель, и дисциплина — и в тренировках, "
     "и в питании.",
     "https://www.instagram.com/p/DD4gSL4ipgB/"),
    ("В", "Виктория", "тренер и спортсменка со стажем",
     "Работали дистанционно, полностью онлайн. Делала всё, что я говорю, "
     "от питания до тренировок — и это при своём стаже. Взяла чемпионат "
     "«Самые сильные ягодицы Тюмени».",
     "https://www.instagram.com/p/DEmBuzbi6cg/"),
    ("И", "Ира Колесникова", "директор, мама двоих сыновей",
     "Ни одного пропущенного приёма пищи и ни одной пропущенной тренировки "
     "за всё время — при её загрузке. Пришла от именитых тренеров и сказала, "
     "что это небо и земля.",
     "https://www.instagram.com/p/DD1_qfYC2TU/"),
    ("И", "Инна Князьнеделева", "пришла похудеть",
     "Была уверена, что для похудения надо голодать. Оказалось наоборот: есть "
     "надо много, просто правильно и сбалансированно. Самое сложное тут "
     "не тренировки, а работа с головой.",
     "https://www.instagram.com/p/DEDPC0jiqa6/"),
    ("Г", "Герман", "мой ученик",
     "Про то, как быть в форме не к лету, а всегда.",
     "https://www.instagram.com/reel/DEZUZ_jCLxX/"),
    ("А", "Алексей", "мой ученик",
     "Рассказывает сам, на видео.",
     "https://www.instagram.com/reel/DGD9Trxoy1S/"),
]


def asset_b64(name: str) -> str:
    raw = (HERE / "assets" / name).read_bytes()
    return "data:image/webp;base64," + base64.b64encode(raw).decode("ascii")


# Три листа курса, растр из готовых PDF (`serbolin-pdf/out/kurs-*.pdf`).
# Показаны разные стороны продукта — измерение, еда, психология, — чтобы
# не выглядело как три копии одной страницы. Обновляются пересборкой курса
# и повторным запуском куска в конце этого файла.
SHEETS = [
    ("list-den1", "День 1 · Аудит режима",
     "Таблица суток, два рабочих окна и кнопка на калькулятор КБЖУ. "
     "Первый день ничего не меняет: сначала смотрим, с чем работаем."),
    ("list-den8", "День 8 · Питание на три дня вперёд",
     "Девять блюд из трёх элементов и список покупок. Дальше человек "
     "не выбирает из бесконечности — он берёт из девяти."),
    ("list-den12", "День 12 · Как не бросить",
     "Правило возврата на четыре шага. Этот лист печатают и вешают "
     "на видное место: он должен попасться на глаза раньше, чем мысль "
     "«начну заново»."),
]


def sheets_html() -> str:
    cells = "".join(
        f'<li class="sh">'
        f'<img src="{asset_b64(f"{stem}.webp")}" alt="" loading="lazy">'
        f"<div><b>{cap}</b><p>{text}</p></div></li>"
        for stem, cap, text in SHEETS)
    return f"""
      <p class="eyebrow" style="margin-top:26px">Как выглядит внутри</p>
      <p class="sub">Двадцать пять листов. Вот три из них — целиком,
      без обрезки.</p>
      <ul class="sh-list">{cells}</ul>"""


def students_html() -> str:
    cards = "".join(
        f'<li class="rv">'
        f'<div class="rv-top">{avatar_svg(letter)}'
        f'<div><b>{name}</b><div class="rv-res">{role}</div></div></div>'
        f"<p>{text}</p>"
        f'<a class="rv-link" href="{url}" target="_blank" rel="noopener">'
        f"Отзыв целиком — в инстаграме</a></li>"
        for letter, name, role, text, url in STUDENTS)
    return (
        '<p class="rv-note">Это мои слова о них. Сам отзыв каждый говорит '
        'на видео — по ссылке под карточкой.</p>'
        f'<ul class="rv-list">{cards}</ul>')


def faq_html(interactive: bool) -> str:
    """Гармошка на экране, развёрнутый список в PDF.

    В бумаге закрытая гармошка напечатала бы одни вопросы, поэтому там
    <details> заменяется обычными блоками. Тексты у обоих одни и те же —
    расходиться им негде.
    """
    if interactive:
        return "".join(
            f'<details class="q"{" open" if i == 0 else ""}>'
            f"<summary>{q}<span class='chev' aria-hidden='true'></span></summary>"
            f"<p>{a}</p></details>"
            for i, (q, a) in enumerate(FAQ)
        )
    return "".join(
        f'<div class="q flat"><p class="qq">{q}</p><p>{a}</p></div>'
        for q, a in FAQ
    )


def nav(target: str, label: str) -> str:
    """Переход на следующий слайд. В PDF вырезается: там листают прокруткой."""
    return (f'<a class="nav" href="#{target}">{label}'
            f'<span class="arr" aria-hidden="true"></span></a>')


# ── слайды ───────────────────────────────────────────────────

def slide_cover(interactive: bool) -> str:
    # Персональная плашка. В Mini App бот подставляет {{name}} и {{type}} из
    # того же JSON квиза, что у лид-магнита. В PDF файл один на всех, поэтому
    # обращение по имени оттуда убрано, а смысл сохранён.
    if interactive:
        personal = ("<p><b>{{name}}, по тесту твой старт — {{type}}.</b> "
                    "Первые три дня одинаковые для всех: смотрим твой день, "
                    "без диеты и без зала. Дальше упор туда, что в твоём "
                    "случае решает.</p>")
    else:
        personal = ("<p><b>Старт у каждого свой — тест его уже определил.</b> "
                    "Первые три дня одинаковые для всех: смотрим твой день, "
                    "без диеты и без зала. Дальше упор туда, что в твоём "
                    "случае решает.</p>")

    return f"""
  <section class="slide cover" id="s1" aria-label="Слайд 1 из 3">
    <div class="col">
      <div class="brand">
        <img class="ava" src="../assets/avatar.png" alt="">
        <div>Эдуард Серболин<span>онлайн-тренер · 12 лет практики</span></div>
      </div>

      <p class="eyebrow">Курс · 14 дней</p>
      <h1>Первые шаги<br>к форме</h1>
      <p class="lead">С чего начать и как не бросить. Один короткий урок в
      день и одно действие — не теория на потом.</p>

      <aside class="personal">{personal}</aside>

      <ul class="facts">{facts_html()}</ul>

      <p class="hook">Тест позади, стартовая точка у тебя на руках. Чего он
      не сказал — <b>что делать завтра утром.</b> Об этом весь курс.</p>

      {nav("s2", "Что внутри") if interactive else ""}
    </div>
  </section>"""


def slide_value(interactive: bool) -> str:
    return f"""
  <section class="slide" id="s2" aria-label="Слайд 2 из 3">
    <div class="col">
      <p class="eyebrow">Что внутри</p>
      <h2>Четырнадцать дней, разбитые на четыре шага</h2>
      <p class="sub">Каждый день — урок на пять минут и одно действие.
      Следующий шаг не начинается, пока не закрыт предыдущий.</p>
      <ul class="levels">{levels_html()}</ul>

      <div class="keep">
        <p class="eyebrow hot">Что останется</p>
        <h3>Инструменты, которые не заканчиваются вместе с курсом</h3>
        <p class="sub">Через две недели курс закончится, а библиотека блюд,
        правило возврата и твои цифры останутся. Пользоваться ими можно
        годами.</p>
        <ul class="included">{included_html()}</ul>
      </div>

      {nav("s3", "Сколько это стоит") if interactive else ""}
    </div>
  </section>"""


def slide_decide(interactive: bool) -> str:
    return f"""
  <section class="slide" id="s3" aria-label="Слайд 3 из 3">
    <div class="col">
      {results_html()}

      {sheets_html()}

      <p class="eyebrow" style="margin-top:26px">Кого я веду</p>
      <div class="reviews">{students_html()}</div>

      <div class="honest">
        <b>Отзывов о самом курсе тут пока нет.</b>
        <p>Курс новый, его ещё никто не прошёл. Когда первые ученики
        закончат и напишут — встанут здесь, с именами. Придумывать их
        я не стану: если проверить нельзя, то и верить нечему.</p>
      </div>

      <!-- ЗАГЛУШКА. В макете тут число прошедших и оценка. В спеке таких
           данных нет, поэтому цифры не выдуманы — подставь свои или удали
           блок целиком, вёрстка не поедет. -->
      <div class="ph">
        <b>Место под цифры:</b> сколько человек прошли курс и с какой оценкой.
        Нужны реальные — выдуманные тут стоять не будут.
      </div>

      <div class="offer">
        <div class="decor" aria-hidden="true"></div>
        <div class="inner">
          <div class="price">
            <span class="rub">{PRICE}</span>
            <span class="once">один раз, навсегда твоё · без подписки и доплат</span>
          </div>
          <p class="sub">Оплатить — минута, а дальше нужно открывать урок
          каждый день. Обычно на этом всё и сыпется, поэтому напоминать буду
          я: бот пишет сам и вечером спрашивает, как прошло.</p>
          <a class="btn" href="{TG_LINK}">Написать Эдуарду</a>
          <p class="terms">Отвечаю сам — не бот и не менеджер. Скажу
          реквизиты, отвечу на вопросы и включу курс.</p>
        </div>
      </div>

      <div class="faq">
        <p class="eyebrow muted">Частые вопросы</p>
        {faq_html(interactive)}
      </div>

      <footer class="foot">
        <p>Хочешь сначала поговорить? Напиши в личку: разберу твою ситуацию
        бесплатно. Созвон 30 минут, с документом после. Беру несколько разборов
        в неделю, живая очередь.</p>
        <p class="slogan">Терпение + Дисциплина = Результат</p>
      </footer>
    </div>
  </section>"""


def dots_html() -> str:
    names = ["Обложка", "Что внутри", "Цена и вопросы"]
    return (
        '<nav class="dots" aria-label="Слайды">'
        + "".join(
            f'<a class="dot" href="#s{i+1}" aria-label="{n}">'
            f'<span class="i">{i+1}</span></a>'
            for i, n in enumerate(names)
        )
        + "</nav>"
    )


def body(interactive: bool) -> str:
    parts = [slide_cover(interactive), slide_value(interactive),
             slide_decide(interactive)]
    if interactive:
        parts.append(dots_html())
    return "\n".join(parts)


# ── стили ────────────────────────────────────────────────────

def css() -> str:
    return """
*{box-sizing:border-box;margin:0;padding:0}
:root{
  --void:#0B0B0C; --plate:#131315; --plate-2:#1B1B1E;
  --line:rgba(255,255,255,.07); --line-2:rgba(255,255,255,.14);
  --accent:#D8232A; --accent-hi:#F4363D;
  --text:#fff; --text-2:#C8C8CE; --text-3:#9A9AA0; --text-4:#6B6B72;
  --pad:26px;
}
html{-webkit-text-size-adjust:100%;scroll-behavior:smooth;scroll-snap-type:y proximity}
/* Noto Color Emoji стоит в общем стеке, а не только у .emo: тип старта
   бот подставляет обычным текстом ({{type}} = «⚡ Рывками»), и без этого
   🛡 отрисовывается текстовым глифом, похожим на сердечко. */
body{
  background:var(--void); color:var(--text-2);
  font:400 17px/1.55 'Inter',system-ui,'Noto Color Emoji',sans-serif;
  letter-spacing:-.1px; -webkit-font-smoothing:antialiased;
}
h1,h2,h3,b,strong{font-family:'Manrope','Inter','Noto Color Emoji',sans-serif;color:var(--text)}
h1,h2,h3{font-weight:800;letter-spacing:-.04em;line-height:1.06;text-wrap:balance}
.emo{font-family:'Noto Color Emoji',sans-serif;font-size:.92em;line-height:1}

/* ── слайд ── */
.slide{
  min-height:100vh; min-height:100svh;
  scroll-snap-align:start;
  display:flex; flex-direction:column; justify-content:safe center;
  padding:44px var(--pad);
  border-bottom:1px solid var(--line);
}
.slide:last-child{border-bottom:0}
.col{width:100%;max-width:760px;margin:0 auto}

.eyebrow{font:600 11px/1 'Inter',sans-serif;letter-spacing:2.2px;
  text-transform:uppercase;color:var(--text-4);margin-bottom:16px}
.eyebrow.hot{color:var(--accent-hi)}
.sub{font-size:16px;color:var(--text-3);margin-top:14px;max-width:56ch}

/* ── слайд 1 ── */
.brand{display:flex;width:fit-content;align-items:center;gap:14px;margin-bottom:40px;
  font:700 15px/1.3 'Manrope',sans-serif;color:var(--text)}
.brand .ava{width:44px;height:44px;border-radius:999px}
.brand span{display:block;font:400 13px/1.3 'Inter',sans-serif;color:var(--text-4);margin-top:3px}
.cover .eyebrow{color:var(--accent-hi)}
.cover h1{font-size:clamp(40px,8vw,62px);letter-spacing:-2.2px}
.cover .lead{font-size:19px;color:var(--text-3);max-width:40ch;margin-top:18px}

.personal{margin:30px 0 0;padding:16px 20px;border-left:3px solid var(--accent);
  background:rgba(216,35,42,.10);border-radius:0 16px 16px 0;font-size:15.5px;
  line-height:1.5}
.personal b{color:var(--accent-hi)}

.facts{list-style:none;display:grid;grid-template-columns:repeat(3,1fr);gap:14px;
  margin-top:30px;padding-top:26px;border-top:1px solid var(--line)}
.fact b{display:block;font:800 clamp(28px,6vw,38px)/1 'Manrope',sans-serif;
  letter-spacing:-1.6px;color:var(--accent-hi)}
.fact .unit{display:block;font:700 13px/1.2 'Manrope',sans-serif;color:var(--text);margin-top:4px}
.fact .d{display:block;font-size:13px;line-height:1.4;color:var(--text-4);margin-top:5px}

.hook{margin-top:28px;font-size:16.5px;line-height:1.55;color:var(--text-3);max-width:52ch}
.hook b{color:var(--text)}

/* ── слайд 2 ── */
.slide h2{font-size:clamp(27px,4.6vw,38px);letter-spacing:-1.4px;max-width:18ch}
.slide h3{font-size:clamp(20px,3vw,25px);letter-spacing:-.8px;max-width:22ch}

.levels{list-style:none;display:grid;grid-template-columns:1fr 1fr;gap:16px 24px;margin-top:26px}
.lv{display:flex;gap:12px;align-items:flex-start}
.lv b{font-size:16px}
.lv .days{font:400 12px/1 'JetBrains Mono',monospace;color:var(--text-4);margin-left:6px}
.lv .d{font-size:14px;line-height:1.45;color:var(--text-4);margin-top:5px}

.keep{margin-top:34px;padding-top:28px;border-top:1px solid var(--line)}
.included{list-style:none;display:grid;grid-template-columns:1fr 1fr;gap:12px 24px;margin-top:22px}
.inc{display:flex;gap:11px;align-items:flex-start;font-size:14.5px;line-height:1.45}

/* ── слайд 3 ── */
.reviews .rv-note{font:400 13px/1.45 'Inter',sans-serif;color:var(--text-4);
  border-left:2px solid var(--line-2);padding-left:11px;margin-bottom:20px}
.rv-list{list-style:none;display:grid;grid-template-columns:1fr;gap:18px}
.rv{background:var(--plate);border:1px solid var(--line);border-radius:18px;padding:20px 22px}
.rv-top{display:flex;align-items:center;gap:13px;margin-bottom:10px}
.rv-ava{flex:none;width:42px;height:42px}
.rv-top b{font:700 15px/1.25 'Manrope',sans-serif;color:var(--text)}
.rv-res{font:600 12.5px/1.35 'Inter',sans-serif;color:var(--accent-hi);margin-top:3px}
.rv p{font-size:14.5px;line-height:1.55;color:var(--text-3)}
.sh-list{list-style:none;display:grid;grid-template-columns:1fr;gap:16px;
  margin-top:14px}
.sh{background:var(--plate);border:1px solid var(--line);border-radius:18px;
  overflow:hidden}
.sh img{display:block;width:100%;height:auto;border-bottom:1px solid var(--line)}
.sh>div{padding:15px 18px 17px}
.sh b{display:block;font:700 15px/1.3 'Manrope',sans-serif;color:var(--text)}
.sh p{margin-top:6px;font-size:14px;line-height:1.5;color:var(--text-3)}

.honest{margin-top:20px;padding:16px 18px;border-radius:16px;
  background:var(--plate);border:1px solid var(--line)}
.honest b{font:700 15px/1.35 'Manrope',sans-serif;color:var(--text)}
.honest p{margin-top:7px;font-size:14px;line-height:1.55;color:var(--text-3)}

.rv-link{display:inline-block;margin-top:11px;color:var(--accent-hi);
  font:600 13px 'Inter',sans-serif;text-decoration:none;
  border-bottom:1px solid rgba(244,54,61,.35);padding-bottom:1px}
.rv-link:hover{border-bottom-color:var(--accent-hi)}

.rz-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}
.rz{position:relative;margin:0;border-radius:14px;overflow:hidden;
  background:var(--plate);border:1px solid var(--line)}
.rz img{display:block;width:100%;height:auto}
/* Нечётное число кадров в сетке из двух колонок оставляет сироту в
   последнем ряду. Последним стоит Эльнур — он и растягивается на всю
   ширину: чемпионский кадр закрывает блок, а не висит половинкой. */
.rz-wide{grid-column:1 / -1}
.rz figcaption{padding:9px 11px 11px;font:400 12px/1.45 'Inter',sans-serif;
  color:var(--text-4)}
.rz figcaption b{color:var(--text-2);font-weight:700}
.rz-note{margin-top:10px;font:400 13px/1.5 'Inter',sans-serif;color:var(--text-4)}
.rz-reg{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:16px}
.rz-reg div{background:var(--plate);border:1px solid var(--line);
  border-radius:12px;padding:12px 10px}
.rz-reg b{display:block;font:800 24px/1 'Manrope',sans-serif;color:var(--accent-hi)}
.rz-reg span{display:block;margin-top:4px;font:500 11px/1.25 'Inter',sans-serif;
  color:var(--text-4)}

.ph{margin-top:16px;border:1px dashed var(--line-2);border-radius:14px;
  padding:14px 18px;font-size:13.5px;line-height:1.5;color:var(--text-4)}
.ph b{color:var(--text-3);font-size:13.5px}

.offer{position:relative;overflow:hidden;background:var(--plate);
  border:1px solid var(--line);border-radius:26px;padding:30px;margin-top:26px}
.offer .decor{position:absolute;right:-70px;top:-70px;width:240px;height:240px;
  border-radius:50%;background:rgba(216,35,42,.12)}
.offer .inner{position:relative}
.price{display:flex;align-items:baseline;column-gap:16px;row-gap:4px;flex-wrap:wrap}
.price .rub{font:800 clamp(42px,7vw,58px)/1 'Manrope',sans-serif;
  letter-spacing:-2.4px;color:var(--text)}
.price .once{flex-basis:100%;font-size:14.5px;color:var(--text-4)}
.offer .sub{margin-top:16px}
.btn{display:inline-block;margin-top:24px;padding:20px 42px;border-radius:9999px;
  background:var(--accent);color:#fff;text-decoration:none;
  font:700 14px/1 'Inter',sans-serif;letter-spacing:1.8px;text-transform:uppercase;
  box-shadow:0 12px 34px rgba(216,35,42,.3);transition:transform .12s,background .22s}
.btn:hover{background:var(--accent-hi);transform:translateY(-1px)}
.btn:active{transform:scale(.96)}
.btn:focus-visible{outline:2px solid var(--accent);outline-offset:3px}
.terms{margin-top:14px;font-size:13.5px;line-height:1.45;color:var(--text-4);max-width:44ch}

.faq{margin-top:30px;padding-top:26px;border-top:1px solid var(--line)}
.q{border-top:1px solid var(--line)}
.q:first-of-type{border-top:0}
.q summary{display:flex;justify-content:space-between;align-items:center;gap:16px;
  padding:17px 0;cursor:pointer;list-style:none;
  font:600 15.5px/1.35 'Inter',sans-serif;color:var(--text-2)}
.q summary::-webkit-details-marker{display:none}
.q[open] summary{color:var(--text)}
.q .chev{flex:none;width:11px;height:11px;border-right:2px solid var(--text-4);
  border-bottom:2px solid var(--text-4);transform:rotate(45deg) translate(-2px,-2px);
  transition:transform .22s}
.q[open] .chev{border-color:var(--accent);transform:rotate(-135deg) translate(-2px,-2px)}
.q p{padding:0 0 17px;font-size:14.5px;line-height:1.55;color:var(--text-3)}
.q.flat .qq{padding:15px 0 5px;font:600 15px/1.35 'Inter',sans-serif;color:var(--text)}
.q.flat p:last-child{padding-bottom:13px}

.foot{margin-top:30px;padding-top:24px;border-top:1px solid var(--line);
  display:flex;justify-content:space-between;align-items:flex-end;gap:26px;
  flex-wrap:wrap;font-size:14px;line-height:1.5;color:var(--text-4)}
.foot p{max-width:48ch}
.slogan{font:800 14px/1.3 'Manrope',sans-serif;letter-spacing:-.4px;color:var(--text)}

/* ── переход между слайдами ── */
/* Не алая: алая на экране ровно одна — «Написать Эдуарду» на третьем слайде.
   Здесь шаг служебный, и подсвечивать его наравне с покупкой нельзя. */
.nav{align-self:flex-start;display:inline-flex;align-items:center;gap:12px;
  margin-top:36px;padding:15px 26px;border:1px solid var(--line-2);border-radius:9999px;
  color:var(--text);text-decoration:none;font:600 14px/1 'Inter',sans-serif;
  letter-spacing:.4px;transition:border-color .2s,background .2s}
.nav:hover{border-color:var(--accent);background:rgba(216,35,42,.08)}
.nav .arr{width:8px;height:8px;border-right:2px solid var(--accent-hi);
  border-bottom:2px solid var(--accent-hi);transform:rotate(45deg) translate(-1px,-1px)}

.dots{position:fixed;right:14px;top:50%;transform:translateY(-50%);
  display:flex;flex-direction:column;gap:10px;z-index:5}
.dot{width:26px;height:26px;border-radius:999px;border:1px solid var(--line-2);
  display:grid;place-items:center;text-decoration:none;background:rgba(11,11,12,.72);
  font:600 11px/1 'JetBrains Mono',monospace;color:var(--text-4);
  transition:border-color .2s,color .2s,background .2s}
.dot[aria-current="true"]{border-color:var(--accent);color:#fff;background:var(--accent)}

@media (max-width:760px){
  :root{--pad:18px}
  /* На телефоне слайд начинается сверху, а не по центру: содержимое
     почти во весь экран, и центрирование съедало нижний отступ —
     кнопка перехода налезала на точки, которые стоят fixed внизу. */
  .slide{padding:30px var(--pad) 96px;justify-content:flex-start}
  .levels,.included,.facts{grid-template-columns:1fr}
  .facts{grid-template-columns:repeat(3,1fr);gap:10px}
  .fact .d{display:none}
  .offer{padding:24px 20px;border-radius:20px}
  .btn{display:block;text-align:center;padding:19px}
  .nav{align-self:stretch;justify-content:center}
  .foot{display:block}
  .slogan{margin-top:14px}
}
/* Точки сбоку живут только там, где рядом с колонкой есть поле. Колонка
   упирается в 760 px плюс отступы, и уже на планшете точки встают ей на
   край — поэтому ниже 900 px они переезжают в правый верхний угол.
   Вниз по центру их ставить нельзя: там кнопка перехода. */
@media (max-width:900px){
  .dots{right:12px;left:auto;top:10px;bottom:auto;transform:none;
    flex-direction:row;background:rgba(11,11,12,.86);padding:5px;border-radius:999px}
  .dot{width:22px;height:22px}
  /* Подпись автора не должна доезжать до пилюли с точками, но и
     переносить её на вторую строку незачем — аватар чуть меньше. */
  .brand{max-width:calc(100% - 92px);gap:11px}
  .brand .ava{width:38px;height:38px}
}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}*{transition:none!important}}
"""


def print_css(heights: list[float] | None = None) -> str:
    """Тот же макет на страницы шириной 130 мм.

    Первый проход идёт без heights: слайды меряются с высотой по содержимому.
    Во втором в CSS подставляются посчитанные высоты — по одной именованной
    @page на слайд, поэтому страницы получаются разной длины.
    """
    pages = ""
    if heights:
        for i, h in enumerate(heights, 1):
            pages += (f"@page p{i}{{size:{PDF_W_MM}mm {h:.1f}mm;margin:0}}\n"
                      f"#s{i}{{page:p{i};height:{h:.1f}mm}}\n")

    return f"""
html{{scroll-snap-type:none}}
body{{font-size:14px;line-height:1.5;-webkit-print-color-adjust:exact;print-color-adjust:exact}}
.slide{{
  min-height:0;height:auto;
  width:{PDF_W_MM}mm;
  padding:14mm 12mm;border-bottom:0;
  justify-content:flex-start;
  break-after:page;page-break-after:always;
}}
.slide:last-child{{break-after:auto;page-break-after:auto}}
.col{{max-width:none}}
.cover h1{{font-size:44px}}
.cover .lead{{font-size:16px}}
.slide h2{{font-size:30px}}
.lv .d,.foot,.rv-note{{color:#8E8E96}}
.slide h3{{font-size:21px}}
.price .rub{{font-size:46px}}
.fact b{{font-size:30px}}
.fact .d{{display:block}}
.levels,.included{{grid-template-columns:1fr}}
.facts{{grid-template-columns:repeat(3,1fr);gap:10px}}
.sub,.hook,.terms,.foot p,.rv p,.personal{{max-width:none}}
.btn{{display:block;text-align:center;padding:17px}}
.foot{{display:block}}
.slogan{{margin-top:12px}}
{pages}"""


def nav_js() -> str:
    """Подсветка активной точки. Порог по средней полосе экрана, а не по
    доле площади: третий слайд выше экрана, и доля до 0.5 не доходит."""
    return """
(function(){
  var slides=[].slice.call(document.querySelectorAll('.slide'));
  var dots=[].slice.call(document.querySelectorAll('.dot'));
  if(!dots.length||!('IntersectionObserver' in window))return;
  function mark(i){dots.forEach(function(d,j){d.setAttribute('aria-current',j===i?'true':'false')});}
  mark(0);
  var io=new IntersectionObserver(function(es){
    es.forEach(function(e){ if(e.isIntersecting) mark(slides.indexOf(e.target)); });
  },{rootMargin:'-45% 0px -45% 0px',threshold:0});
  slides.forEach(function(s){io.observe(s)});
})();
"""


# ── сборка ───────────────────────────────────────────────────

def page(interactive: bool, print_mode: bool = False,
         heights: list[float] | None = None) -> str:
    style = font_css() + "\n" + css()
    if print_mode:
        style += "\n" + print_css(heights)
    script = "" if print_mode else f"<script>{nav_js()}</script>"
    return (f"<title>Первые шаги к форме</title>\n<style>\n{style}\n</style>\n"
            f"{body(interactive)}\n{script}")


def inline_avatar(html: str) -> str:
    """Аватар в base64: артефакт это один файл, относительный путь из него
    не разрешится, а CSP всё равно не пустит наружу."""
    b64 = base64.b64encode((HERE / "assets" / "avatar.png").read_bytes()).decode()
    return html.replace('src="../assets/avatar.png"',
                        f'src="data:image/png;base64,{b64}"')


def document(inner: str) -> str:
    head, rest = inner.split("</style>", 1)
    return ('<!doctype html>\n<html lang="ru">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
            f'{head}</style>\n</head>\n<body>{rest}\n</body>\n</html>')


def print_page(heights: list[float] | None = None) -> str:
    return document(inline_avatar(page(interactive=False, print_mode=True,
                                       heights=heights)))


def render_pdf() -> tuple[pathlib.Path, list[str]]:
    """Печатает три слайда тремя страницами, каждую — под свой слайд.

    Проход первый: слайды стоят с высотой по содержимому, меряем их.
    Проход второй: высоты уезжают в @page, и Chromium печатает страницы
    разной длины. Резать текст под фиксированный лист не приходится, и
    переполнение тут невозможно по построению.
    """
    from playwright.sync_api import sync_playwright

    BUILD.mkdir(exist_ok=True)
    dst = OUT / "offer.pdf"
    src = BUILD / "offer-print.html"

    os.environ.setdefault("PLAYWRIGHT_BROWSERS_PATH", "/opt/pw-browsers")
    chrome = pathlib.Path("/opt/pw-browsers/chromium-1194/chrome-linux/chrome")

    with sync_playwright() as pw:
        br = pw.chromium.launch(
            executable_path=str(chrome) if chrome.exists() else None,
            args=["--font-render-hinting=none"],
        )
        pg = br.new_page(viewport={"width": round(PDF_W_MM * MM), "height": 900})

        src.write_text(print_page(), encoding="utf-8")
        pg.goto(src.as_uri(), wait_until="load")
        pg.evaluate("document.fonts.ready")
        natural = pg.evaluate(
            "(mm) => [].slice.call(document.querySelectorAll('.slide'))"
            ".map(s => s.getBoundingClientRect().height / mm)", MM)

        heights = [max(PDF_MIN_H_MM, round(h + PDF_PAD_MM, 1)) for h in natural]

        src.write_text(print_page(heights), encoding="utf-8")
        pg.goto(src.as_uri(), wait_until="load")
        pg.evaluate("document.fonts.ready")
        pg.pdf(path=str(dst), print_background=True, prefer_css_page_size=True,
               margin={"top": "0", "bottom": "0", "left": "0", "right": "0"})
        br.close()

    notes = [f"  слайд {i}: страница {PDF_W_MM} × {h:.0f} мм"
             for i, h in enumerate(heights, 1)]
    return dst, notes


def check_pdf(path: pathlib.Path) -> None:
    """Три страницы и ни одной лишней.

    Округление высоты вверх иногда добавляет пустую четвёртую страницу —
    глазами в чате её видно сразу, а в консоли сборки нет. Поэтому меряем.
    """
    try:
        import pypdfium2 as pdfium
    except ImportError:
        print("pypdfium2 не установлен, число страниц не проверено")
        return
    doc = pdfium.PdfDocument(str(path))
    sizes = [tuple(round(v / 72 * 25.4) for v in pg.get_size()) for pg in doc]
    if len(sizes) == 3:
        print("Три слайда — три страницы: "
              + ", ".join(f"{w}×{h} мм" for w, h in sizes))
    else:
        print(f"ВНИМАНИЕ: страниц {len(sizes)}, а слайда три — {sizes}")


def main() -> None:
    OUT.mkdir(exist_ok=True)

    # Шаблон для бота: плейсхолдеры на месте, документ полный.
    template = inline_avatar(page(interactive=True))
    # Демо-подстановка, чтобы страницу можно было смотреть как есть.
    demo = template.replace("{{name}}", "Галина").replace("{{type}}", "⚡ Рывками")

    (OUT / "offer-artifact.html").write_text(demo, encoding="utf-8")
    (OUT / "offer.html").write_text(document(demo), encoding="utf-8")
    (OUT / "offer-template.html").write_text(template, encoding="utf-8")

    pdf, notes = render_pdf()

    for f in ("offer.html", "offer-artifact.html", "offer-template.html", "offer.pdf"):
        kb = (OUT / f).stat().st_size / 1024
        print(f"  {f} ({kb:.0f} КБ)")

    print("\n".join(notes))
    check_pdf(pdf)

    # CSP артефакта режет загрузку с внешних хостов: картинки, шрифты, стили,
    # скрипты. Ссылка-переход под это не попадает — по ней читатель уходит
    # сам, страница ничего не тянет. Поэтому ищем только src и те href, что
    # грузят ресурс (<link>), а обычные <a href> пропускаем.
    live = re.findall(r'src\s*=\s*"(https://[^"]+)"', demo)
    live += re.findall(r'<link[^>]+href\s*=\s*"(https://[^"]+)"', demo)
    print("Внешних ресурсов нет." if not live else f"ВНИМАНИЕ: {set(live)}")


if __name__ == "__main__":
    main()
