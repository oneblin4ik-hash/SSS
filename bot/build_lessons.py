#!/usr/bin/env python3
"""
Переносит четырнадцать уроков из спеки в код бота.

    python3 build_lessons.py

Читает `serbolin-pdf/source/tripvaer-14-dney-Serbolin.md` и пишет
`src/lessons.js`. Руками эти тексты не копируются: четыреста восемьдесят
строк, шесть развилок и три кнопки — при переносе вручную что-нибудь
обязательно разъедется, а заметит это человек, которому урок придёт
не тот.

Источник остаётся один. Правишь спеку, гоняешь скрипт — бот меняется.

ЧТО РАЗБИРАЕТСЯ

    ## День N. Заголовок      начало урока
    **Урок:**  > абзацы       тело, каждая строка с «> »
    **Задание:** …            одно действие на сегодня
    **PDF…:** …               описание для дизайнера, в бота не идёт

МЕТКИ РАЗВИЛОК стоят в начале абзаца и наследуются строками списка:

    [дефицит] — только тем, чья цель loss или tone
    [профицит] — только тем, кто набирает массу
    [дом] / [зал] — по тому, где человек собрался заниматься
    [ж] / [м] — по полу. На дне 7 это два абзаца про то, как вес гуляет
      по циклу: мужчине они не нужны, а женщину именно здесь чаще всего
      и теряют — увидела плюс килограмм перед месячными и бросила.

КНОПКИ записаны как `**[ Текст ]**` отдельным абзацем и превращаются
в url-кнопки, а не в текст: строка в скобках посреди сообщения выглядит
как недоделка.
"""
import json
import pathlib
import re
import sys

HERE = pathlib.Path(__file__).parent
SRC = HERE.parent / "serbolin-pdf" / "source" / "tripvaer-14-dney-Serbolin.md"
OUT = HERE / "src" / "lessons.js"

CALC_URL = "https://t.me/MoyaNormaBot"
RAZBOR_URL = "https://t.me/Mr_Serbolin?text=РАЗБОР"

BUTTONS = {
    "Посчитать свои КБЖУ": CALC_URL,
    "Записаться на разбор — созвон 30 минут": RAZBOR_URL,
    "Забрать разбор — созвон 30 минут": RAZBOR_URL,
}

TAGS = {"дефицит": "cut", "профицит": "gain", "дом": "dom", "зал": "zal",
        "ж": "f", "м": "m"}


def to_telegram(text):
    """Markdown спеки → Markdown Telegram.

    В спеке жирный записан по-человечески, `**слово**`. Telegram в режиме
    Markdown ждёт одну звёздочку и на двух спотыкается: отвечает ошибкой
    разбора и НЕ ОТПРАВЛЯЕТ сообщение вообще. То есть урок просто не дошёл
    бы, и узнали бы мы об этом от человека, а не от бота.

    Заодно проверяем символы, на которых тот же разбор ломается: одиночное
    подчёркивание, обратная кавычка, квадратная скобка. В текстах их быть
    не должно, но появиться они могут в любой правке спеки — пусть лучше
    падает сборка здесь, чем отправка там.
    """
    text = re.sub(r"\*\*(.+?)\*\*", r"*\1*", text)
    for ch, why in (("_", "подчёркивание"), ("`", "обратная кавычка"),
                    ("[", "квадратная скобка")):
        if ch in text:
            sys.exit(f"В тексте «{text[:60]}…» есть {why} — "
                     f"Telegram не разберёт такое сообщение и не отправит. "
                     f"Убери символ в спеке или экранируй здесь.")
    return text

# Базовые слаги PDF по дням. Суффиксы вариантов добавляет уже бот:
# дни 3, 6, 7 расходятся по цели, дни 4, 9, 11, 13 — по полу и месту.
SLUGS = {
    1: "kurs-01-audit-rezhima", 2: "kurs-02-tarelka", 3: "kurs-03-voda",
    4: "kurs-04-pervaya-trenirovka", 5: "kurs-05-den-otdyha",
    6: "kurs-06-golodat-ne-nuzhno", 7: "kurs-07-pervyy-chekpoint",
    8: "kurs-08-pitanie-na-tri-dnya", 9: "kurs-09-vtoraya-trenirovka",
    10: "kurs-10-vrednaya-eda", 11: "kurs-11-trenirovka-kogda-nekogda",
    12: "kurs-12-kak-ne-brosit", 13: "kurs-13-test-progressa",
    14: "kurs-14-tochka-a-tochka-b",
}


def parse():
    text = SRC.read_text(encoding="utf-8")
    # Режем по заголовкам дней. Заголовок дня 12 несёт звёздочку — её
    # в название не тащим, это пометка уровня, а не часть темы.
    chunks = re.split(r"^## День (\d+)\. (.+)$", text, flags=re.M)[1:]
    days = {}
    for i in range(0, len(chunks), 3):
        n, title, body = int(chunks[i]), chunks[i + 1].strip(" ⭐"), chunks[i + 2]
        # День 14 последний, и без этой обрезки в него затекает всё, что
        # идёт ниже: экран «Курс пройден» и три касания допродажи. Ловится
        # это только глазами, поэтому режем сразу.
        body = re.split(r"^#{1,3} ", body, flags=re.M)[0]
        days[n] = build(n, title, body)
    return days, finale(text), upsell(text)


def finale(text):
    """Экран «Курс пройден» — идёт сразу за уроком четырнадцатого дня."""
    m = re.search(r"^> ### 🛡 Курс пройден.*?(?=\n\n---)", text, re.M | re.S)
    if not m:
        sys.exit("Не нашёл экран «Курс пройден».")
    lines = [ln[1:].strip() for ln in m.group(0).splitlines()]
    paras, cur = [], []
    for ln in lines:
        if ln:
            cur.append(ln.lstrip("# ").strip())
        elif cur:
            paras.append("\n".join(cur)); cur = []
    if cur:
        paras.append("\n".join(cur))

    parts, buttons = [], []
    for para in paras:
        btn = re.fullmatch(r"\*\*\[\s*(.+?)\s*\]\*\*", para)
        if btn:
            buttons.append({"text": btn.group(1), "url": BUTTONS[btn.group(1)]})
        else:
            parts.append(to_telegram(para))
    return {"parts": parts, "buttons": buttons}


def upsell(text):
    """Три касания после курса: дни 15, 18 и 25. Ведение, а не курс,
    поэтому живут отдельно от уроков."""
    out = {}
    for m in re.finditer(r"^\*\*День (\d+):\*\*\n> (.+)$", text, re.M):
        out[int(m.group(1))] = to_telegram(m.group(2).strip())
    if sorted(out) != [15, 18, 25]:
        sys.exit(f"Допродажа разобралась не полностью: {sorted(out)}")
    return out


def build(n, title, body):
    lines, task = split_body(body)
    parts, buttons = [], []
    cur_tag, cur = "all", []

    def flush():
        if cur:
            parts.append({"tag": cur_tag, "text": "\n".join(cur)})
            cur.clear()

    for line in lines:
        if line is None:            # пустая строка — конец абзаца
            flush()
            cur_tag = "all"
            continue

        btn = re.fullmatch(r"\*\*\[\s*(.+?)\s*\]\*\*", line)
        if btn:
            flush()
            label = btn.group(1)
            if label not in BUTTONS:
                sys.exit(f"День {n}: кнопка «{label}» без адреса. "
                         f"Добавь её в BUTTONS или убери из спеки.")
            buttons.append({"text": label, "url": BUTTONS[label]})
            continue

        m = re.match(r"\[(\w+)\]\s*", line)
        if m:
            key = m.group(1)
            if key not in TAGS:
                sys.exit(f"День {n}: незнакомая метка [{key}].")
            # Метка может стоять не в начале абзаца, а на строке списка
            # внутри него — так сделан день 6, где общий пункт и развилка
            # идут подряд. Поэтому режем абзац по метке, а не по пустой
            # строке: иначе худеющей уедет абзац про набор.
            if TAGS[key] != cur_tag:
                flush()
                cur_tag = TAGS[key]
            line = line[m.end():]

        cur.append(to_telegram(line))

    flush()
    return {"title": title, "parts": parts, "task": to_telegram(task),
            "slug": SLUGS[n], "buttons": buttons}


def split_body(body):
    """Тело урока — строки с «> ». Задание — абзац после «**Задание:**».
    Всё, что про PDF, остаётся дизайнеру и в бота не идёт."""
    lesson_lines, task = [], None
    for line in body.splitlines():
        if line.startswith(">"):
            lesson_lines.append(line[1:].strip())
        elif line.startswith("**Задание:**"):
            task = line[len("**Задание:**"):].strip()
    if task is None:
        sys.exit("У дня нет задания — проверь спеку.")

    # Отдаём построчно, пустые строки превращаем в None — границу абзаца.
    # Склеивать в абзацы здесь нельзя: метка развилки может стоять
    # на строке внутри абзаца, и её надо увидеть до склейки.
    out, prev_blank = [], True
    for ln in lesson_lines:
        if ln:
            out.append(ln)
            prev_blank = False
        elif not prev_blank:
            out.append(None)
            prev_blank = True
    return out, task


def main():
    days, fin, ups = parse()
    missing = [n for n in range(1, 15) if n not in days]
    if missing:
        sys.exit(f"В спеке нет дней: {missing}")

    dump = lambda o: json.dumps(o, ensure_ascii=False, indent=2)
    OUT.write_text(
        "/* СГЕНЕРИРОВАНО. Руками не править.\n"
        " *\n"
        " * Источник: serbolin-pdf/source/tripvaer-14-dney-Serbolin.md\n"
        " * Пересобрать: cd bot && python3 build_lessons.py\n"
        " *\n"
        " * Правка здесь переживёт ровно до следующей пересборки, а спека\n"
        " * и бот разъедутся молча. Меняй спеку.\n"
        " *\n"
        " * tag у абзаца: all — всем, cut — худеющим, gain — на наборе,\n"
        " * dom и zal — по месту занятий.\n"
        " */\n"
        f"export const LESSONS = {dump(days)};\n\n"
        "/* Экран после четырнадцатого дня. */\n"
        f"export const FINALE = {dump(fin)};\n\n"
        "/* Допродажа ведения: дни 15, 18 и 25 после выдачи курса. */\n"
        f"export const UPSELL = {dump(ups)};\n",
        encoding="utf-8")

    tagged = sum(1 for d in days.values() for p in d["parts"] if p["tag"] != "all")
    btns = sum(len(d["buttons"]) for d in days.values())
    print(f"Готово: {OUT.relative_to(HERE.parent)}")
    print(f"  дней {len(days)}, абзацев "
          f"{sum(len(d['parts']) for d in days.values())}, "
          f"из них с развилкой {tagged}, кнопок {btns}")
    print(f"  экран «Курс пройден»: {len(fin['parts'])} абзаца, "
          f"{len(fin['buttons'])} кнопка")
    print(f"  допродажа: дни {sorted(ups)}")


if __name__ == "__main__":
    main()
