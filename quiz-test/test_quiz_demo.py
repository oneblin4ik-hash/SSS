#!/usr/bin/env python3
"""
Прогоняет собранную демку через настоящий браузер: весь сценарий до конца и
проверка, что тест-оверлей показал корректный payload.

Ловит две вещи. Первая — поломки самой сборки: не подхватился шрифт, не
сработал хук, ошибка в JS оверлея. Такое глазами по скриншоту не всегда видно,
а кликать полтора десятка экранов руками на каждой правке долго.

Вторая — сегментация. Проходов три, по одному на каждый тип старта из §5.1
брифа. Один из них специально проверяет жёсткий порядок в typeOf():
«занималась раньше, бросила» + «последний раз меньше месяца назад» — это не
длинная пауза, а те же урывки, и тип обязан выйти onoff, а не quit.

Заодно проверяется ветвление сценария: у новичка экраны «когда последний раз»
и «что делал» не показываются, поэтому шагов меньше.

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

# Сценарии прогона. picks — порядковые номера вариантов на экранах выбора,
# по порядку следования экранов. У новичка экранов на два меньше: «когда
# последний раз» и «что делал» ему не показываются.
#
#   цель · зона · фигура сейчас · фигура цель · опыт ·
#   [последний раз · что делал] · где заниматься · минут · раз в неделю · здоровье
RUNS = [
    {
        "why": "Галина: занималась, бросила, но последний раз меньше месяца "
               "назад — жёсткий порядок в typeOf() обязан дать onoff, не quit",
        "name": "Галина", "gender": 0, "age": 36, "height": 165,
        "w_now": 78, "w_goal": 66,
        "picks": [0, 0, 4, 2, 1, 0, 1, 0, 1, 1, 6],
        "steps": 17,
        "expect": {"n": "Галина", "g": "f", "h": 165, "t": "onoff",
                   "ex": "quit", "ls": "m1", "zn": "belly", "tr": 2, "pl": "home"},
        "shots": "onoff",
    },
    {
        "why": "Пётр: никогда не занимался — ветка never, два экрана про опыт "
               "пропускаются",
        "name": "Пётр", "gender": 1, "age": 52, "height": 178,
        "w_now": 96, "w_goal": 88,
        "picks": [0, 3, 5, 3, 0, 1, 0, 0, 6],
        "steps": 15,
        "expect": {"n": "Пётр", "g": "m", "h": 178, "t": "never",
                   "ex": "never", "ls": None, "dd": None, "tr": 1, "pl": "gym"},
        "shots": "never",
    },
    {
        "why": "Марина: длинная пауза и цель «в форму» — ветка quit целиком",
        "name": "Марина", "gender": 0, "age": 29, "height": 170,
        "w_now": 63, "w_goal": 61,
        "picks": [2, 1, 2, 4, 1, 2, 0, 2, 2, 2, 6],
        "steps": 17,
        "expect": {"n": "Марина", "g": "f", "t": "quit",
                   "ex": "quit", "ls": "y1", "gl": "tone", "tr": 3, "pl": "any"},
        "shots": "quit",
    },
]


def main() -> int:
    SHOTS.mkdir(exist_ok=True)
    errors: list[str] = []

    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path="/opt/pw-browsers/chromium-1194/chrome-linux/chrome"
        )
        for run in RUNS:
            print(f"\n— {run['why']}")
            errors += _run(browser, run)
        browser.close()

    if errors:
        print("\nОШИБКИ:")
        for e in dict.fromkeys(errors):
            print("  !", e)
        return 1
    print("\nВсё чисто: три сценария пройдены, payload корректный, "
          "внешних запросов нет.")
    return 0


def _run(browser, run: dict) -> list[str]:
    errors: list[str] = []
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
    page.fill("input", run["name"])
    page.click("#bottom .btn")

    # Экран 2: пол + ползунки (возраст, рост)
    _pick(page, run["gender"])
    _set_range(page, 0, run["age"])
    _set_range(page, 1, run["height"])
    page.click("#bottom .btn")

    # Экран 3: вес сейчас / цель
    _set_range(page, 0, run["w_now"])
    _set_range(page, 1, run["w_goal"])
    page.click("#bottom .btn")

    # Дальше — экраны выбора. Заодно снимаем длину теста: она считается по
    # видимым экранам, и у новичка обязана выйти короче. Читаем на последнем
    # экране выбора: до ответа про опыт длина ещё не определена.
    steps = None
    for idx in run["picks"]:
        _pick(page, idx)
        steps = _total_steps(page)
        page.click("#bottom .btn")
        page.wait_for_timeout(120)

    if steps != run["steps"]:
        errors.append(f"{run['name']}: шагов в тесте {steps}, "
                      f"ожидалось {run['steps']}")

    # У кривой прогноза анимация отрисовки на 1.1s (stroke-dashoffset).
    # Без паузы в кадр попадает пустой график.
    page.wait_for_timeout(1400)
    page.screenshot(path=str(SHOTS / f"forecast-{run['shots']}.png"),
                    full_page=True)
    page.click("#bottom .btn")     # прогноз → диагностика
    page.screenshot(path=str(SHOTS / f"diag-{run['shots']}.png"),
                    full_page=True)
    page.click("#bottom .btn")     # диагностика → «День 0»
    page.click("#bottom .btn")     # «День 0» → submit

    page.wait_for_selector(".tst.on", timeout=5000)
    page.wait_for_timeout(300)
    page.screenshot(path=str(SHOTS / f"payload-{run['shots']}.png"),
                    full_page=True)

    payload = json.loads(page.evaluate("document.getElementById('tst').__json"))
    page.close()

    print("  payload:", json.dumps(payload, ensure_ascii=False))
    for k, want in run["expect"].items():
        if payload.get(k) != want:
            errors.append(f"{run['name']} · {k}: ожидалось {want!r}, "
                          f"пришло {payload.get(k)!r}")

    for key in ("bmi", "wk", "tr", "cm", "ex", "mn", "fq"):
        if payload.get(key) in (None, "", []):
            errors.append(f"{run['name']}: поле {key} пустое")

    return errors


def _total_steps(page) -> int:
    """Читает «Шаг N из M» в шапке и возвращает M."""
    txt = page.inner_text("#stepTxt")
    return int(txt.rsplit(" ", 1)[-1])


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
