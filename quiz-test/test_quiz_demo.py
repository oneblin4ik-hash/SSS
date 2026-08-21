#!/usr/bin/env python3
"""
Прогоняет собранную демку через настоящий браузер: 14 экранов до конца и
проверка, что тест-оверлей показал корректный payload.

Смысл не в том, чтобы протестировать логику квиза (она уже проверялась через
jsdom на пяти персонажах), а в том, чтобы поймать поломки самой сборки:
не подхватился шрифт, не сработал хук, ошибка в JS оверлея. Такое глазами по
скриншоту не всегда видно, а кликать 14 экранов руками на каждой правке долго.

Запуск:  python3 test_quiz_demo.py
"""
import json
import pathlib
import sys

from playwright.sync_api import sync_playwright

HERE = pathlib.Path(__file__).parent
# По умолчанию проверяем автономный файл; аргументом можно передать вариант
# для артефакта, у которого снята обёртка документа.
DEMO = HERE / "out" / (sys.argv[1] if len(sys.argv) > 1 else "kviz-demo.html")
SHOTS = HERE / "shots"

# Персонаж прогона — Галина из спеки: 165 см, 78 → 66 кг, срыв на 2-3 неделе,
# 4-6 заходов. Ожидаемый тип — 4 «Начинаю и срываюсь».
EXPECT = {"n": "Галина", "g": "f", "h": 165, "t": 4}


def main() -> int:
    SHOTS.mkdir(exist_ok=True)
    errors: list[str] = []

    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path="/opt/pw-browsers/chromium-1194/chrome-linux/chrome"
        )
        page = browser.new_page(viewport={"width": 420, "height": 880})

        page.on("pageerror", lambda e: errors.append(f"JS error: {e}"))
        page.on("console", lambda m: errors.append(f"console.error: {m.text}")
                if m.type == "error" else None)
        # Любой сетевой запрос наружу — провал: в артефакте его срежет CSP.
        page.on("request", lambda r: errors.append(f"внешний запрос: {r.url}")
                if r.url.startswith("http") and "claudeusercontent" not in r.url
                else None)

        page.goto(DEMO.as_uri(), wait_until="load")
        page.evaluate("document.fonts.ready")

        # Экран 0 → старт
        page.click("#bottom .btn")

        # Экран 1: имя
        page.fill("input", EXPECT["n"])
        page.click("#bottom .btn")
        page.screenshot(path=str(SHOTS / "01-name.png"))

        # Экран 2: пол + ползунки. Женский — первая карточка.
        page.click(".card, .opt, .gender .card" if page.locator(".card").count()
                   else "#screen button")
        # На этом экране пол — карточки, а ползунков ровно два: возраст и рост.
        _set_range(page, 0, 36)     # возраст
        _set_range(page, 1, 165)    # рост
        page.click("#bottom .btn")

        # Экран 3: вес сейчас / цель
        _set_range(page, 0, 78)
        _set_range(page, 1, 66)
        page.screenshot(path=str(SHOTS / "03-weight.png"))
        page.click("#bottom .btn")

        # Дальше — экраны выбора. Индекс варианта на каждом шаге подобран так,
        # чтобы получился тип 4: цель «похудеть», редкие тренировки,
        # 4-6 заходов, срыв на 2-3 неделе.
        picks = [
            0,   # цель: похудеть
            4,   # фигура сейчас
            2,   # фигура цель
            1,   # образ жизни: иногда
            2,   # заходов: 4-6
            2,   # где ломается: 2-3 недели  ← определяет тип
            0,   # что сбивает: вечерний голод (мультивыбор)
            6,   # здоровье: ничего из этого
        ]
        for n, idx in enumerate(picks):
            _pick(page, idx)
            page.click("#bottom .btn")
            page.wait_for_timeout(120)

        # У кривой прогноза анимация отрисовки на 1.1s (stroke-dashoffset).
        # Без паузы в кадр попадает пустой график.
        page.wait_for_timeout(1400)
        page.screenshot(path=str(SHOTS / "12-forecast.png"), full_page=True)
        page.click("#bottom .btn")     # прогноз → диагностика
        page.screenshot(path=str(SHOTS / "13-diag.png"), full_page=True)
        page.click("#bottom .btn")     # диагностика → «День 0»
        page.click("#bottom .btn")     # «День 0» → submit

        page.wait_for_selector(".tst.on", timeout=5000)
        page.wait_for_timeout(300)
        page.screenshot(path=str(SHOTS / "14-payload.png"), full_page=True)

        payload = json.loads(page.evaluate("document.getElementById('tst').__json"))
        browser.close()

    print("payload:", json.dumps(payload, ensure_ascii=False))
    for k, want in EXPECT.items():
        if payload.get(k) != want:
            errors.append(f"{k}: ожидалось {want!r}, пришло {payload.get(k)!r}")

    for key in ("bmi", "wk", "tr", "cm", "bp"):
        if payload.get(key) in (None, "", []):
            errors.append(f"поле {key} пустое")

    if errors:
        print("\nОШИБКИ:")
        for e in dict.fromkeys(errors):
            print("  !", e)
        return 1
    print("\nВсё чисто: 14 экранов пройдены, payload корректный, "
          "внешних запросов нет.")
    return 0


def _set_range(page, idx: int, value: int) -> None:
    page.eval_on_selector_all(
        "#screen input[type=range]",
        """(els, arg) => {
             const el = els[arg.i]; if (!el) return;
             el.value = arg.v;
             el.dispatchEvent(new Event('input', {bubbles:true}));
             el.dispatchEvent(new Event('change', {bubbles:true}));
           }""",
        {"i": idx, "v": value},
    )
    page.wait_for_timeout(60)


def _pick(page, idx: int) -> None:
    """Кликает вариант по порядковому номеру, какой бы класс у него ни был."""
    page.evaluate(
        """(i) => {
             const sc = document.getElementById('screen');
             const els = sc.querySelectorAll(
               '.card,.opt,.fig,.choice,[data-v],button:not(.btn)');
             if (els[i]) els[i].click();
           }""",
        idx,
    )
    page.wait_for_timeout(80)


if __name__ == "__main__":
    sys.exit(main())
