#!/usr/bin/env python3
"""
Сверяет lib/profile.py с настоящим JS квиза.

CLAUDE.md §9 требует, чтобы typeOf(), plan(), bmi() и chartMode() в
quiz-test/kviz-serbolin.html и в lib/profile.py совпадали один в один: PDF
человек открывает через минуту после экрана диагностики, и цифры обязаны
сойтись. Требование записано, но до сих пор ничем не проверялось — сверять
глазами два языка на каждой правке никто не станет.

Тест берёт из HTML квиза кусок между «состояние» и «рендер» (в нём вся
арифметика и ни одного обращения к DOM), выполняет его в node, прогоняет
через десяток профилей и сравнивает с тем, что даёт Profile на тех же
ответах. Расхождение в любом поле — падение с указанием, где именно.

Запуск:  python3 test_profile_parity.py
"""
import json
import pathlib
import subprocess
import sys

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from lib.profile import Profile                                  # noqa: E402

HERE = pathlib.Path(__file__).parent
QUIZ = HERE.parent / "quiz-test" / "kviz-serbolin.html"

BEGIN = "/* ------------------------- состояние ------------------------- */"
END = "/* ------------------------- рендер ------------------------- */"

# Профили подобраны так, чтобы задеть каждую развилку: три типа старта,
# жёсткий порядок в typeOf(), режим формы и режим веса, набор массы,
# этапный прогноз при большой разнице и все четыре значения частоты.
CASES = [
    dict(name="Галина", gender="f", age=36, height=165, weight_now=78,
         weight_goal=66, goal="loss", zone="belly", form_now=4, form_goal=2,
         exp="quit", last="m1", did="home", mins="30", freq="2"),
    dict(name="Пётр", gender="m", age=52, height=178, weight_now=96,
         weight_goal=88, goal="loss", zone="back", form_now=5, form_goal=3,
         exp="never", last="long", did="home", mins="15", freq="1"),
    dict(name="Марина", gender="f", age=29, height=170, weight_now=63,
         weight_goal=61, goal="tone", zone="legs", form_now=2, form_goal=4,
         exp="quit", last="y1", did="gym", mins="45", freq="3"),
    # этапный прогноз: разница больше 10% массы тела и больше 12 кг
    dict(name="Игорь", gender="m", age=44, height=182, weight_now=124,
         weight_goal=85, goal="loss", zone="belly", form_now=5, form_goal=2,
         exp="onoff", last="m6", did="diet", mins="30", freq="3"),
    # набор массы, четыре тренировки
    dict(name="Костя", gender="m", age=22, height=186, weight_now=64,
         weight_goal=76, goal="mass", zone="top", form_now=0, form_goal=4,
         exp="never", last="long", did="home", mins="90", freq="4+"),
    # режим формы: вес почти не меняется
    dict(name="Оля", gender="f", age=33, height=162, weight_now=57,
         weight_goal=56, goal="tone", zone="all", form_now=1, form_goal=3,
         exp="onoff", last="m1", did="group", mins="30", freq="2"),
    # граница typeOf(): бросил, но пауза длинная — остаётся quit
    dict(name="Женя", gender="f", age=40, height=168, weight_now=72,
         weight_goal=64, goal="loss", zone="legs", form_now=3, form_goal=5,
         exp="quit", last="m6", did="cardio", mins="45", freq="4+"),
    # тонус при заметной разнице в весе — режим всё-таки весовой
    dict(name="Слава", gender="m", age=37, height=175, weight_now=88,
         weight_goal=82, goal="tone", zone="belly", form_now=4, form_goal=2,
         exp="onoff", last="y1", did="gym", mins="90", freq="1"),
]

def js_results(cases: list[dict]) -> list[dict]:
    """Гоняет логику квиза в node на тех же ответах."""
    src = QUIZ.read_text(encoding="utf-8")
    begin, end = src.index(BEGIN), src.index(END)
    logic = src[begin:end]

    script = (
        logic
        + """
const CASES = JSON.parse(process.argv[2]);
const out = CASES.map((C) => {
  S.name = C.name; S.gender = C.gender; S.age = C.age; S.height = C.height;
  S.wNow = C.weight_now; S.wGoal = C.weight_goal;
  S.goal = C.goal; S.zone = C.zone;
  S.formNow = C.form_now; S.formGoal = C.form_goal;
  S.exp = C.exp; S.last = C.last; S.did = C.did;
  S.mins = C.mins; S.freq = C.freq;
  const p = plan();
  return { t: typeOf(), tr: p.tr, wk: p.weeks, mode: p.mode,
           stage: !!p.stage, stages: p.stages, target: p.target,
           bmi: bmi(), cm: chartMode() };
});
console.log(JSON.stringify(out));
"""
    )
    # В куске логики есть обращение к window (Telegram) — подставляем заглушки.
    script = "const window = {}; const document = { getElementById: () => null };\n" + script

    tmp = HERE / ".parity.js"
    tmp.write_text(script, encoding="utf-8")
    try:
        res = subprocess.run(
            ["node", str(tmp), json.dumps(cases, ensure_ascii=False)],
            capture_output=True, text=True, check=True,
        )
    finally:
        tmp.unlink(missing_ok=True)
    return json.loads(res.stdout)


def py_results(cases: list[dict]) -> list[dict]:
    out = []
    for c in cases:
        p = Profile(**c)
        plan = p.plan
        out.append({
            "t": p.type_code, "tr": p.trainings, "wk": plan["weeks"],
            "mode": plan["mode"], "stage": bool(plan["stage"]),
            "stages": plan["stages"], "target": plan["target"],
            "bmi": p.bmi, "cm": p.chart_mode,
        })
    return out


def main() -> int:
    if not QUIZ.exists():
        print("!", QUIZ, "не найден")
        return 1

    js = js_results(CASES)
    py = py_results(CASES)

    errors: list[str] = []
    for case, a, b in zip(CASES, js, py):
        for key in sorted(a):
            if a[key] != b.get(key):
                errors.append(
                    f"{case['name']} · {key}: квиз {a[key]!r}, "
                    f"profile.py {b.get(key)!r}"
                )
        print(f"  {case['name']:<8} тип {a['t']:<6} "
              f"{a['wk']} нед. · {a['tr']} трен. · ИМТ {a['bmi']} · {a['cm']}")

    if errors:
        print("\nРАСХОЖДЕНИЯ квиза и profile.py:")
        for e in errors:
            print("  !", e)
        return 1
    print(f"\nВсё сходится: {len(CASES)} профилей, "
          "квиз и profile.py дают одинаковые цифры.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
