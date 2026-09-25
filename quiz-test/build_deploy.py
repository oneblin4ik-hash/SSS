#!/usr/bin/env python3
"""
Готовит папку для выкладки квиза на статический хостинг.

    python3 build_deploy.py

Кладёт боевой `kviz-serbolin.html` в `dist/index.html` — чтобы адрес был
без имени файла, `https://…/`, а не `https://…/kviz-serbolin.html`. Этот
адрес вписывается в бота один раз и потом не меняется, поэтому короткий
лучше.

Заодно копирует страницы курса в `dist/kurs/`. Они живут на том же
хостинге не от лени: бот отправляет каждый PDF по ссылке ровно один раз,
Telegram забирает файл себе и возвращает file_id — дальше в сообщение
уходит строка, а не файл. Отдельный проект под сорок пять статических
страниц означал бы лишнюю настройку руками и ещё одно место, которое
однажды забудут обновить.

Перед копированием проверяет три вещи, на которых Mini App ломается молча:

1. `CFG.API` пуст. Результат уходит через `Telegram.WebApp.sendData`, и это
   работает только при запуске из reply-keyboard кнопки. Непустой API
   означает, что кто-то переключил схему на бэкенд, а его нет.
2. `CFG.FIGURES` заполнен — по шесть картинок на пол. Пустой массив не
   ломает квиз, но человек увидит контурные силуэты вместо фигур.
3. Внешние адреса — только шрифты Google и скрипт Telegram. Всё остальное
   в закрытом окружении не откроется, и это надо заметить здесь, а не
   по жалобе «у меня белый экран».
"""
import pathlib
import re
import shutil
import sys

HERE = pathlib.Path(__file__).parent
SRC = HERE / "kviz-serbolin.html"
DIST = HERE / "dist"

ALLOWED = (
    "https://fonts.googleapis.com",
    "https://fonts.gstatic.com",
    "https://telegram.org/js/telegram-web-app.js",
)


def write_pdf_versions(pdf_dir: pathlib.Path) -> None:
    """Отпечаток каждого PDF — боту, в bot/src/pdfver.js.

    Бот отправляет файл по ссылке один раз, а дальше шлёт копию, которую
    Telegram запомнил, — по file_id. Это экономит трафик, но значит и другое:
    пересобранный файл до людей не доезжает. Сервер отдаёт новый, а бот
    всё равно шлёт старый из памяти Telegram. Так оффер без фото продолжал
    бы уходить и после того, как фото в нём появились.

    Поэтому к имени файла в кэше бота приклеивается отпечаток содержимого.
    Файл изменился — отпечаток другой, кэш промахивается, бот отправляет
    по ссылке заново. Руками ничего сбрасывать не надо.
    """
    import hashlib, json
    ver = {f.stem: hashlib.sha256(f.read_bytes()).hexdigest()[:10]
           for f in sorted(pdf_dir.glob("*.pdf"))}
    dst = HERE.parent / "bot" / "src" / "pdfver.js"
    dst.write_text(
        "/* СГЕНЕРИРОВАНО quiz-test/build_deploy.py. Руками не править.\n"
        " *\n"
        " * Отпечаток содержимого каждого PDF. Бот клеит его к ключу кэша\n"
        " * file_id: пересобрал файл — отпечаток сменился — бот отправит\n"
        " * новый, а не старую копию из памяти Telegram. */\n"
        f"export const PDF_VER = {json.dumps(ver, indent=2, ensure_ascii=False)};\n",
        encoding="utf-8")
    print(f"Отпечатки PDF для бота: {len(ver)} файлов → bot/src/pdfver.js")


def main() -> int:
    html = SRC.read_text(encoding="utf-8")
    bad = []

    api = re.search(r'API:\s*"([^"]*)"', html)
    if api and api.group(1):
        bad.append(f'CFG.API не пуст: "{api.group(1)}" — sendData работать не будет')

    for sex, human in (("f", "женских"), ("m", "мужских")):
        block = re.search(rf"\b{sex}:\s*\[(.*?)\]", html, re.S)
        n = block.group(1).count("data:image") if block else 0
        if n != 6:
            bad.append(f"{human} фигур {n}, а нужно 6")

    # Ищем только то, что браузер реально пойдёт грузить: src, href и fetch.
    # Просто «все https в файле» не годится — в комментариях лежит пример
    # адреса для CFG.API, и он каждый раз поднимал ложную тревогу.
    used = re.findall(r'(?:src|href)="(https://[^"]+)"', html)
    used += re.findall(r'fetch\(\s*["\'](https://[^"\']+)', html)
    outside = {u for u in used if not u.startswith(ALLOWED)}
    for u in sorted(outside):
        bad.append(f"внешний адрес, которого быть не должно: {u}")

    if bad:
        print("Не выкладываем:")
        for b in bad:
            print("  •", b)
        return 1

    DIST.mkdir(exist_ok=True)
    dst = DIST / "index.html"
    shutil.copyfile(SRC, dst)
    print(f"Готово: {dst.relative_to(HERE.parent)} ({dst.stat().st_size // 1024} КБ)")

    pdf_src = HERE.parent / "serbolin-pdf" / "out"
    pdf_dst = DIST / "kurs"
    pdf_dst.mkdir(exist_ok=True)
    # kurs-polnyy.pdf — весь курс одним файлом, его собирают для владельца,
    # чтобы смотреть подряд. Боту он не нужен, а на сайте это был бы весь
    # платный курс по одной ссылке, да ещё 15 МБ. Не выкладываем.
    pages = sorted(f for f in pdf_src.glob("kurs-*.pdf") if f.stem != "kurs-polnyy")
    if not pages:
        print("  Страниц курса не нашлось — собери их: python3 build_kurs.py")
        return 1
    size = 0
    for f in pages:
        shutil.copyfile(f, pdf_dst / f.name)
        size += f.stat().st_size
    print(f"Страницы курса: {len(pages)} файлов, {size // 1024 // 1024} МБ")

    # Оффер тремя слайдами. Спека просит его рядом с Mini App, а не вместо:
    # он остаётся в переписке, его пересылают и показывают мужу. Файл один
    # на всех, персонализации в нём нет.
    # Два файла: с ценой и предзапускный, с датой вместо неё. Бот выбирает
    # по LAUNCH_AT — пока дата открытия в будущем, уходит второй.
    for name in ("offer.pdf", "offer-pre.pdf"):
        offer = HERE.parent / "offer-page" / "out" / name
        if not offer.exists():
            break
        shutil.copyfile(offer, pdf_dst / name)
        print(f"Оффер: {name} ({offer.stat().st_size // 1024} КБ)")
    if not offer.exists():
        print("  Оффера нет — собери его: cd offer-page && python3 build_offer.py")

    write_pdf_versions(pdf_dst)
    print("Внешнего только шрифты Google и скрипт Telegram — так и задумано.")
    print()
    print("Дальше: залить папку dist на статический хостинг и вписать")
    print("полученный адрес в бота, в WebAppInfo(url=…).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
