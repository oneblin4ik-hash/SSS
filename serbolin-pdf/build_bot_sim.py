#!/usr/bin/env python3
"""
Симулятор чата с ботом: весь курс от покупки до последнего касания.

    python3 build_bot_sim.py

На выходе два файла в out/:

    bot-simulyator.html            открывается двойным кликом
    bot-simulyator-artifact.html   то же без обёртки документа — под артефакт

Зачем. Тексты бота разбросаны по двум спекам и по дням, и увидеть целиком,
как это будет выглядеть в Telegram, до запуска нельзя. Здесь всё сведено
в одну ленту: покупка, часовой пояс, 14 дней уроков с заданиями и PDF,
вечерние чек-ины с обеими реакциями, четыре экрана уровней и три касания
допродажи.

Откуда берутся тексты:

* уроки, задания и экраны уровней — разбором из
  source/tripvaer-14-dney-Serbolin.md, тем же парсером, что у build_course.py;
* сообщение после оплаты, карточка заявки и реакции на чек-ин — дословно
  из source/bot-integratsiya-Serbolin.md;
* кнопка «Посчитать свои КБЖУ» в дне 1 — из того же урока. Ссылка на
  бота-калькулятор пока не выдана, поэтому в CALC_URL пусто и кнопка
  подписана как неподключённая;
* размеры и имена PDF — с диска, из out/. Не выдуманные.

ЧТО НАПИСАНО ЗДЕСЬ, А НЕ ВЗЯТО ИЗ СПЕКИ. Двух сообщений в спеках нет —
вопрос про часовой пояс и строка самого вечернего чек-ина (там описаны
только кнопки). Оба написаны в голосе бренда и помечены в коде
константой WRITTEN_HERE: если владелец сформулирует иначе, менять надо тут.

Оформление — тёмная тема Telegram, а не палитра Crimson. Смысл файла в том,
чтобы владелец увидел, как сообщения лягут в настоящем клиенте; бренд
здесь живёт в содержании и аватаре, а не в цвете пузырей.

Всё встроено: шрифты и аватар в base64, внешних хостов нет.
"""
import base64
import html as html_mod
import pathlib
import re

from build_course import GAIN_SUFFIX, avatar_b64, emoji, font_css, inline, parse
from data import days as days_data

ROOT = pathlib.Path(__file__).parent
SOURCE = ROOT / "source" / "tripvaer-14-dney-Serbolin.md"
OUT = ROOT / "out"

NAME = "Галина"
CODE = "A7F3"
# Кнопка на бота-калькулятор КБЖУ в уроке дня 1. Ссылку владелец даёт
# отдельно; пока пусто — кнопка рисуется и подписана как ещё не подключённая,
# чтобы в симуляторе было видно, что там дырка.
CALC_URL = ""
SLOGAN = "Терпение + Дисциплина = Результат"

# Единственные два текста, которых нет ни в одной спеке. См. шапку файла.
WRITTEN_HERE = {
    "tz": "Последнее перед стартом: в каком часовом поясе ты живёшь? "
          "Уроки будут приходить в 8 утра по твоему времени, а не по моему.",
    "checkin": "Вечерний чек-ин. Как прошёл день?",
}


# ─────────────────────────── разбор спеки ───────────────────────────

def levels() -> dict[int, dict]:
    """Экраны «Уровень пройден». В спеке они идут блок-цитатой с ### внутри.

    Парсер build_course.py их не видит: он собирает только дни. Ключ —
    номер дня, после которого экран показывается.
    """
    after = {1: 3, 2: 7, 3: 10, 4: 14}
    out: dict[int, dict] = {}
    cur: dict | None = None
    for ln in SOURCE.read_text(encoding="utf-8").split("\n"):
        m = re.match(r"^> ### (.+?)\s*$", ln)
        if m:
            title = m.group(1)
            n = int(re.search(r"[1-4]", title).group()) if "Уровень" in title else 4
            cur = {"title": inline(title), "lines": []}
            out[after[n]] = cur
            continue
        if cur is None:
            continue
        if ln.startswith(">"):
            body = ln.lstrip("> ").strip()
            if body:
                cur["lines"].append(inline(body))
        else:
            cur = None
    if len(out) != 4:
        raise SystemExit(f"экранов уровней найдено {len(out)} вместо 4")
    return out


def upsell() -> list[tuple[str, str]]:
    """Три касания после курса: дни 15, 18, 25."""
    text = SOURCE.read_text(encoding="utf-8")
    tail = text.split("## ДОПРОДАЖА")[1]
    hits = re.findall(r"\*\*День (\d+):\*\*\n> (.+)", tail)
    if len(hits) != 3:
        raise SystemExit(f"касаний допродажи найдено {len(hits)} вместо 3")
    return [(d, inline(t)) for d, t in hits]


def pdf_meta(day: int, goal: str = "cut") -> tuple[str, str]:
    """Имя и размер настоящего файла из out/ — не выдуманные.

    Версия под набор массы отбирается по суффиксу: дефис сортируется раньше
    точки, и без фильтра `-nabor` встал бы первым и подменил основную.
    """
    if day == 0:
        hits = [OUT / "tripvaer-00-pered-startom.pdf"]
    else:
        want_gain = goal == "gain"
        hits = sorted(
            h for h in OUT.glob(f"tripvaer-{day:02d}-*.pdf")
            if h.stem.endswith(GAIN_SUFFIX) == want_gain
        )
    if not hits:
        raise SystemExit(f"нет PDF дня {day} — прогони build_tripwire.py")
    f = hits[0]
    return f.name, f"{f.stat().st_size / 1024:.0f} КБ"


def plural(n: int, one: str, few: str, many: str) -> str:
    if n % 10 == 1 and n % 100 != 11:
        return one
    if 2 <= n % 10 <= 4 and not 12 <= n % 100 <= 14:
        return few
    return many


# ─────────────────────────── сообщения ───────────────────────────

def bubble(body: str, time: str, cls: str = "", buttons: str = "") -> str:
    return (f'<div class="msg in {cls}"><div class="bub">{body}'
            f'<span class="tm">{time}</span></div>{buttons}</div>')


def out_bubble(text: str, time: str, branch: str = "") -> str:
    cls = f" branch {branch}" if branch else ""
    return (f'<div class="msg out{cls}"><div class="bub">{html_mod.escape(text)}'
            f'<span class="tm">{time} <b>✓✓</b></span></div></div>')


def keys(*labels: str) -> str:
    items = ""
    for l in labels:
        pending = ("КБЖУ" in l and not CALC_URL)
        cls = "key pending" if pending else "key"
        note = '<span class="tbd">ссылка не подключена</span>' if pending else ""
        items += f'<button class="{cls}" type="button">{l}{note}</button>'
    return f'<div class="keys">{items}</div>'


def doc(day: int, time: str, caption: str, name: str = "",
        goal: str = "cut") -> str:
    if name:
        f = OUT / name
        fname, size = f.name, f"{f.stat().st_size / 1024:.0f} КБ"
    else:
        fname, size = pdf_meta(day, goal)
    return (
        '<div class="msg in"><div class="bub doc">'
        '<div class="file"><div class="ico">PDF</div>'
        f'<div class="fi"><b>{fname}</b><span>{size} · страница дня</span></div></div>'
        f'<div class="cap">{caption}</div>'
        f'<span class="tm">{time}</span></div></div>'
    )


def day_sep(label: str) -> str:
    return f'<div class="sep"><span>{label}</span></div>'


def note(text: str) -> str:
    """Врезка «это видит Эдуард, а не ученик»."""
    return f'<div class="aside"><span class="lbl">Личный чат Эдуарда</span>{text}</div>'


def fork_cls(goal: str | None, sex: str | None) -> str:
    """Классы для абзаца с меткой. Оси независимы: у абзаца может быть и цель,
    и пол сразу, и тогда он показывается только на пересечении."""
    return " ".join(x for x in ("fork", goal, sex and f"sex-{sex}") if x)


def transcript() -> tuple[str, int]:
    days = parse()
    lv = levels()
    parts: list[str] = []
    count = 0

    def add(html_s: str, msg: bool = True) -> None:
        nonlocal count
        parts.append(html_s)
        if msg:
            count += 1

    # ── покупка ──────────────────────────────────────────────
    parts.append('<div class="anchor" id="d-buy"></div>')
    add(day_sep("Покупка"), msg=False)
    add(note(
        f'<p class="you">{NAME} → Эдуарду в личку</p>'
        f'<p>Хочу курс «Первые шаги к форме». Код {CODE}</p>'), msg=False)
    add(note(
        '<p class="you">Бот → Эдуарду</p>'
        f'<p>🔔 Заявка · код <b>{CODE}</b></p>'
        f'<p>{NAME}, @galina_ok, 36 лет<br>'
        'Тип: ⚡ Рывками<br>'
        'Рост 165, вес 78 → 66. ИМТ 28.7<br>'
        'Окна: 7:30 и 20:00 · зона риска: вечер<br>'
        'Тест пройден 40 минут назад</p>'
        '<p class="btns">[ Включить курс ] [ Отказался ]</p>'), msg=False)

    add(bubble(
        f"<p><b>{NAME}, ты в деле.</b></p>"
        "<p>Первый урок придёт завтра в 8 утра. Ничего сегодня не начинай — "
        "серьёзно, не начинай. День 1 идёт без диеты и без зала, и это не "
        "подарок, а часть метода: пять изменений одновременно не выдерживает "
        "никто.</p>"
        f"<p>{SLOGAN}. До завтра.</p>", "19:42"))
    add(bubble(f"<p>{WRITTEN_HERE['tz']}</p>", "19:42",
               buttons=keys("Москва, UTC+3", "Калининград, UTC+2",
                            "Екатеринбург, UTC+5", "Другой")))
    add(out_bubble("Москва, UTC+3", "19:43"))
    add(bubble("<p>Записал. Значит в 8:00 по Москве.</p>"
               "<p>Пока держи обложку и страницу «Перед стартом» — прочитай "
               "сегодня, она короткая. Завтра начинаем.</p>", "19:43"))
    add(doc(0, "19:43", "Обложка курса", name="tripvaer-00-oblozhka.pdf"))
    add(doc(0, "19:43", "Перед стартом · до первого урока"))

    # ── 14 дней ──────────────────────────────────────────────
    streak = 0
    for d in days:
        n = d["n"]
        streak += 1
        parts.append(f'<div class="anchor" id="d-{n}"></div>')
        add(day_sep(f"День {n} · {html_mod.unescape(d['title'])}"), msg=False)

        lesson = d["lesson"]
        cta = ""
        if lesson and lesson[-1][2].startswith("<b>["):
            label = re.sub(r"</?b>|\[|\]", "", lesson[-1][2]).strip()
            cta = keys(label)
            lesson = lesson[:-1]
        # Абзац с меткой цели уходит только своей половине аудитории.
        # В симуляторе обе лежат рядом, показывает их переключатель.
        body = "".join(
            f"<p>{text}</p>" if goal is None and sex is None
            else f'<span class="{fork_cls(goal, sex)}"><p>{text}</p></span>'
            for goal, sex, text in lesson
        )
        add(bubble(body, "8:00", buttons=cta))
        add(bubble(f'<p class="eyebrow">Задание на сегодня</p><p>{d["task"]}</p>',
                   "8:00"))
        cap_txt = f"День {n} · {html_mod.unescape(d['title'])}"
        if n in days_data.GOAL_PAGES:
            # У этих дней страница своя под каждую цель — показываем ту же,
            # что выбрана переключателем, иначе имя файла врало бы.
            # Два варианта одного и того же сообщения — в ленте оно одно,
            # поэтому и считается один раз.
            add('<span class="goal cut">' + doc(n, "8:01", cap_txt) + "</span>"
                + '<span class="goal gain">'
                + doc(n, "8:01", cap_txt, goal="gain") + "</span>")
        else:
            add(doc(n, "8:01", cap_txt))

        add(bubble(f"<p>{WRITTEN_HERE['checkin']}</p>", "20:00",
                   buttons=keys("Сделал", "Не вышло")))
        add(out_bubble("Сделал", "20:14", branch="done"))
        parts.append(out_bubble("Не вышло", "20:14", branch="fail"))
        word = plural(streak, "день", "дня", "дней")
        add(bubble(
            f'<span class="branch done"><p>Отметил. {streak} {word} подряд. '
            'Так и держим.</p></span>'
            '<span class="branch fail"><p>Бывает. Ничего не компенсируем и не '
            'догоняем: завтра просто идём по плану. Один пропущенный день '
            'ничего не решает, решает выход из графика на неделю.</p></span>',
            "20:14"))

        if n in lv:
            scr = lv[n]
            lines = scr["lines"]
            cta = ""
            if lines and lines[-1].startswith("<b>["):
                label = re.sub(r"</?b>|\[|\]", "", lines[-1]).strip()
                cta = keys(label)
                lines = lines[:-1]
            body = "".join(f"<p>{x}</p>" for x in lines).replace("{{name}}", NAME)
            add(bubble(f'<div class="stamp">{emoji_fix(scr["title"])}</div>{body}',
                       "20:15", cls="level", buttons=cta))

    # ── допродажа ────────────────────────────────────────────
    parts.append('<div class="anchor" id="d-after"></div>')
    for day_no, text in upsell():
        add(day_sep(f"День {day_no} · после курса"), msg=False)
        add(bubble(f'<p>{text.replace("{{name}}", NAME)}</p>', "11:00"))

    return "".join(parts), count


def emoji_fix(s: str) -> str:
    return re.sub(r"[🔍⚙🧩🛡⭐⚡🌱🔁]️?", lambda m: emoji(m.group()[0]), s)


# ─────────────────────────── оформление ───────────────────────────

def css() -> str:
    """Тёмная тема Telegram. Цвета взяты у клиента, а не у бренда: файл
    показывает, как сообщения лягут в настоящем приложении."""
    return """
*{box-sizing:border-box;margin:0;padding:0}
:root{
  --app:#0E1621; --panel:#17212B; --panel-2:#1D2A37;
  --in:#182533; --out:#2B5278; --line:rgba(255,255,255,.07);
  --tx:#FFFFFF; --tx-2:#AEBAC5; --tx-3:#7D8E98;
  --link:#6AB3F3; --brand:#D8232A;
}
html{-webkit-text-size-adjust:100%}
body{
  background:var(--app); color:var(--tx);
  font:400 15px/1.42 'Inter',system-ui,'Noto Color Emoji',sans-serif;
  -webkit-font-smoothing:antialiased;
}
b,strong{font-weight:600}
.emo{font-family:'Noto Color Emoji',sans-serif;font-size:.94em;line-height:1}

.shell{display:grid;grid-template-columns:236px minmax(0,1fr);
  gap:0;max-width:940px;margin:0 auto;min-height:100vh}

/* ── боковая навигация ── */
.rail{position:sticky;top:0;align-self:start;height:100vh;overflow-y:auto;
  border-right:1px solid var(--line);padding:20px 14px 40px;background:var(--panel)}
.rail h2{font:800 17px/1.2 'Manrope',sans-serif;letter-spacing:-.02em;margin-bottom:4px}
.rail .sub{font-size:12.5px;color:var(--tx-3);line-height:1.4;margin-bottom:18px}
.rail a{display:flex;gap:9px;align-items:baseline;padding:7px 9px;border-radius:7px;
  color:var(--tx-2);text-decoration:none;font-size:13.5px;line-height:1.3}
.rail a:hover{background:var(--panel-2);color:var(--tx)}
.rail a .n{flex:none;width:20px;font:500 11.5px/1.4 'JetBrains Mono',monospace;color:var(--tx-3)}
.rail .grp{font:600 10.5px/1 'Inter',sans-serif;letter-spacing:1.6px;
  text-transform:uppercase;color:var(--tx-3);margin:16px 0 6px 9px}

.switch{margin:18px 0 6px;padding:12px;border:1px solid var(--line);border-radius:9px}
.switch .lbl{font:600 10.5px/1 'Inter',sans-serif;letter-spacing:1.4px;
  text-transform:uppercase;color:var(--tx-3);margin-bottom:9px;display:block}
.switch .row{display:flex;gap:6px}
.switch button{flex:1;padding:7px 4px;border:0;border-radius:7px;cursor:pointer;
  background:var(--panel-2);color:var(--tx-2);font:600 12.5px/1 'Inter',sans-serif}
.switch button[aria-pressed="true"]{background:var(--out);color:#fff}
.switch p{margin-top:9px;font-size:11.5px;line-height:1.45;color:var(--tx-3)}

/* ── шапка чата ── */
.chat{min-width:0;position:relative}
.top{position:sticky;top:0;z-index:5;display:flex;align-items:center;gap:11px;
  padding:10px 18px;background:var(--panel);border-bottom:1px solid var(--line)}
.top img{width:40px;height:40px;border-radius:999px}
.top .who{font:600 15px/1.25 'Inter',sans-serif}
.top .who span{display:block;font-size:12.5px;color:var(--tx-3);font-weight:400;margin-top:2px}
.top .bot{margin-left:auto;font:600 10px/1 'Inter',sans-serif;letter-spacing:1.2px;
  text-transform:uppercase;color:var(--tx-3);border:1px solid var(--line);
  border-radius:4px;padding:4px 6px}

.feed{padding:16px 18px 80px;display:flex;flex-direction:column;gap:9px}
.anchor{scroll-margin-top:64px}

.sep{display:flex;justify-content:center;margin:14px 0 6px}
.sep span{background:rgba(0,0,0,.4);color:var(--tx-2);border-radius:999px;
  padding:5px 13px;font:500 12px/1 'Inter',sans-serif}

.msg{display:flex;flex-direction:column;max-width:min(560px,86%)}
.msg.in{align-self:flex-start}
.msg.out{align-self:flex-end;align-items:flex-end}
.bub{position:relative;padding:8px 12px 7px;border-radius:12px 12px 12px 4px;
  background:var(--in);font-size:15px;line-height:1.45}
.msg.out .bub{background:var(--out);border-radius:12px 12px 4px 12px}
.bub p+p{margin-top:9px}
/* Столбик продуктов внутри сообщения — как список в настоящем чате. */
.bub .li{display:block;padding-left:15px;position:relative;line-height:1.7}
.bub .li::before{content:"";position:absolute;left:2px;top:.72em;width:4px;height:4px;
  border-radius:999px;background:var(--link)}
.bub .tm{float:right;margin:6px 0 0 10px;font-size:11.5px;color:var(--tx-3);
  line-height:1;position:relative;top:4px}
.msg.out .bub .tm{color:rgba(255,255,255,.55)}
.bub .eyebrow{font:600 10.5px/1 'Inter',sans-serif;letter-spacing:1.5px;
  text-transform:uppercase;color:var(--link);margin-bottom:7px}

/* ── документ ── */
.file{display:flex;align-items:center;gap:11px}
.file .ico{flex:none;width:42px;height:42px;border-radius:999px;background:var(--link);
  color:#0E1621;display:flex;align-items:center;justify-content:center;
  font:800 11px/1 'Manrope',sans-serif;letter-spacing:.3px}
.file .fi b{display:block;font-size:14px;word-break:break-all}
.file .fi span{display:block;font-size:12.5px;color:var(--tx-3);margin-top:2px}
.doc .cap{margin-top:9px;font-size:14.5px;color:var(--tx-2)}

/* ── инлайн-клавиатура ── */
.keys{display:flex;flex-direction:column;gap:2px;margin-top:2px}
.key{width:100%;padding:10px;border:0;border-radius:5px;cursor:default;
  background:rgba(24,37,51,.9);color:var(--link);
  font:400 14.5px/1.2 'Inter',sans-serif}
.key.pending{color:var(--tx-3)}
.key .tbd{display:block;margin-top:3px;font-size:11px;color:#C4744B}
.keys .key:first-child{border-radius:5px 5px 3px 3px}
.keys .key:last-child{border-radius:3px 3px 8px 8px}

/* ── экран уровня ── */
.msg.level .bub{background:linear-gradient(180deg,#1D3348,var(--in))}
.stamp{font:800 16px/1.25 'Manrope',sans-serif;letter-spacing:-.02em;
  color:#fff;margin-bottom:8px}

/* ── ветки чек-ина ── */
/* Абзац с меткой виден по умолчанию, а прячется тот, чья метка не совпала
   с выбранным. Так пересечение «цель + пол» получается само: достаточно,
   чтобы не сработало ни одно из правил ниже. Перебирать четыре сочетания
   положительными правилами не нужно. */
body[data-goal="cut"] .fork.gain,
body[data-goal="gain"] .fork.cut,
body[data-sex="f"] .fork.sex-m,
body[data-sex="m"] .fork.sex-f{display:none}
.branch{display:none}
body[data-branch="done"] .branch.done{display:block}
body[data-branch="fail"] .branch.fail{display:block}
/* .msg — флекс-колонка, block ей сломал бы выравнивание пузыря по краю */
body[data-branch="done"] .msg.branch.done,
body[data-branch="fail"] .msg.branch.fail{display:flex}

/* ── врезка «личный чат Эдуарда» ── */
.aside{align-self:stretch;border:1px dashed rgba(216,35,42,.5);border-radius:11px;
  padding:13px 15px;background:rgba(216,35,42,.06);font-size:14px;line-height:1.45}
.aside .lbl{display:block;font:600 10px/1 'Inter',sans-serif;letter-spacing:1.5px;
  text-transform:uppercase;color:#F4363D;margin-bottom:8px}
.aside .you{color:var(--tx-3);font-size:12.5px;margin-bottom:5px}
.aside p+p{margin-top:7px}
.aside .btns{color:var(--link);font-size:13px}

@media (max-width:860px){
  .shell{grid-template-columns:1fr}
  .rail{position:static;height:auto;border-right:0;border-bottom:1px solid var(--line)}
  .rail .days{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:2px}
  .msg{max-width:92%}
}
"""


def rail(days: list[dict]) -> str:
    links = "".join(
        f'<a href="#d-{d["n"]}"><span class="n">{d["n"]:02d}</span>'
        f'<span>{html_mod.unescape(d["title"])}</span></a>' for d in days)
    return f"""
<nav class="rail">
  <h2>Курс в Telegram</h2>
  <p class="sub">Весь диалог бота с учеником: от заявки до последнего касания.
  Тексты те же, что уйдут в прод.</p>

  <div class="switch">
    <span class="lbl">Пол ученика</span>
    <div class="row">
      <button type="button" data-sex="f" aria-pressed="true">Женщина</button>
      <button type="button" data-sex="m" aria-pressed="false">Мужчина</button>
    </div>
    <p>В тексте расходится только день 7 — про цикл. Остальное меняет
    программу тренировок и цифры прогноза, а не уроки.</p>
  </div>

  <div class="switch">
    <span class="lbl">Цель ученика</span>
    <div class="row">
      <button type="button" data-goal="cut" aria-pressed="true">Похудение</button>
      <button type="button" data-goal="gain" aria-pressed="false">Набор массы</button>
    </div>
    <p>Питание в днях 2, 3, 6, 7, 8 и 10 расходится. Остальное общее.</p>
  </div>

  <div class="switch">
    <span class="lbl">Вечерний чек-ин</span>
    <div class="row">
      <button type="button" data-branch="done" aria-pressed="true">Сделал</button>
      <button type="button" data-branch="fail" aria-pressed="false">Не вышло</button>
    </div>
    <p>Переключает ответ бота во всех 14 днях сразу.</p>
  </div>

  <div class="grp">Старт</div>
  <a href="#d-buy"><span class="n">—</span><span>Покупка и часовой пояс</span></a>
  <div class="grp">Уроки</div>
  <div class="days">{links}</div>
  <div class="grp">Потом</div>
  <a href="#d-after"><span class="n">—</span><span>Дни 15, 18, 25</span></a>
</nav>"""


def page() -> tuple[str, int]:
    feed, count = transcript()
    days = parse()
    body = f"""
<div class="shell">
  {rail(days)}
  <main class="chat">
    <header class="top">
      <img src="{avatar_b64()}" alt="">
      <div class="who">Эдуард Серболин<span>Первые шаги к форме · 14 дней</span></div>
      <span class="bot">bot</span>
    </header>
    <div class="feed">{feed}</div>
  </main>
</div>
<script>
(function(){{
  // В автономном файле атрибут стоит в разметке, в артефакте <body> ставит
  // обёртка публикации — поэтому ветку по умолчанию задаём здесь.
  if (!document.body.dataset.branch) document.body.dataset.branch = 'done';
  if (!document.body.dataset.goal) document.body.dataset.goal = 'cut';
  if (!document.body.dataset.sex) document.body.dataset.sex = 'f';
  // Переключателей два и они независимы: цель ученика и ответ на чек-ин.
  // Кнопки одной группы гасят друг друга, чужую группу не трогают.
  ['branch', 'goal', 'sex'].forEach(function(key){{
    var btns = document.querySelectorAll('.switch button[data-' + key + ']');
    btns.forEach(function(b){{
      b.onclick = function(){{
        document.body.dataset[key] = b.dataset[key];
        btns.forEach(function(x){{ x.setAttribute('aria-pressed', x === b); }});
      }};
    }});
  }});
}})();
</script>"""
    head = (f"<title>Курс в Telegram</title>\n<style>{font_css()}{css()}</style>")
    return head + body, count


def main() -> None:
    OUT.mkdir(exist_ok=True)
    inner, count = page()
    doc_html = ('<!DOCTYPE html>\n<html lang="ru">\n<head>\n<meta charset="utf-8">\n'
                '<meta name="viewport" content="width=device-width,initial-scale=1">\n'
                f'{inner.split("</style>")[0]}</style>\n</head>\n'
                f'<body data-branch="done">{inner.split("</style>", 1)[1]}\n'
                '</body>\n</html>')
    (OUT / "bot-simulyator.html").write_text(doc_html, encoding="utf-8")
    # Вариант под артефакт: обёртку документа ставит публикация, своей нет.
    (OUT / "bot-simulyator-artifact.html").write_text(inner, encoding="utf-8")

    for f in ("bot-simulyator.html", "bot-simulyator-artifact.html"):
        kb = (OUT / f).stat().st_size / 1024
        print(f"  {f} ({kb:.0f} КБ)")
    print(f"  сообщений в ленте: {count}")

    live = re.findall(r'(?:src|href)\s*=\s*"(https?://[^"]+)"', doc_html)
    if live:
        print("\nВнешние ресурсы — в артефакте их срежет CSP:")
        for u in dict.fromkeys(live):
            print("  !", u)
        raise SystemExit(1)
    print("Внешних ресурсов нет — CSP артефакта не помешает.")


if __name__ == "__main__":
    main()
