"""
Профиль человека из квиза → значения для подстановки в шаблон лид-магнита.

На вход идёт ровно тот JSON, который Mini App отдаёт боту через sendData
(схема описана в source/bot-integratsiya-Serbolin.md, раздел 3). Никакого
второго формата данных не заводим: что бот получил — то и передал сюда.

Вся производная логика (ИМТ, тип старта, число тренировок, прогноз) повторяет
app/kviz-serbolin.html один в один. Это принципиально: PDF человек открывает
через минуту после экрана диагностики, и цифры обязаны совпасть. Если логика
в квизе меняется — правится и здесь, оба места помечены ссылками на функции
оригинала.

Схема payload — v2. Ось сегментации теперь опыт (never | quit | onoff),
а не точка срыва: ветка про срывы из теста убрана целиком.
"""
from dataclasses import dataclass, field
from datetime import date, timedelta
from math import floor

# Повторяют TR_BY_FREQ и PACE_BY_TR из квиза. Реже тренируешься — дольше
# идёшь: показывать один и тот же срок при одной и при четырёх тренировках
# в неделю было бы обманом.
TR_BY_FREQ = {"1": 1, "2": 2, "3": 3, "4+": 4}
PACE_BY_TR = {1: 1.3, 2: 1.0, 3: 0.9, 4: 0.85}

MONTHS_GEN = [
    "января", "февраля", "марта", "апреля", "мая", "июня",
    "июля", "августа", "сентября", "октября", "ноября", "декабря",
]


_RATE = {
    "m": {"gain": 0.35, "loss_big": 0.7, "loss": 0.55},
    "f": {"gain": 0.2, "loss_big": 0.55, "loss": 0.45},
}


def _round_half_up(x: float) -> int:
    """Math.round() из JS: 0.5 округляется вверх, а не к чётному.

    round() в Python банковский — round(2.5) == 2, и на границах прогноз
    в PDF расходился бы с экраном на неделю.
    """
    return int(floor(x + 0.5))


def ru_date(d: date) -> str:
    return f"{d.day} {MONTHS_GEN[d.month - 1]} {d.year}"


@dataclass
class Profile:
    """Поля соответствуют ключам JSON из квиза (см. таблицу в ТЗ на бота)."""
    name: str                       # n
    gender: str                     # g  — 'f' | 'm'
    age: int                        # a
    height: int                     # h  — см
    weight_now: float               # w  — кг
    weight_goal: float              # wg — кг
    goal: str                       # gl — loss | mass | tone
    place: str                      # pl — home | gym | any («ещё не решил» → дом)
    zone: str = "all"               # zn — belly | legs | top | back | all
    form_now: int = 0               # fn — 0…5
    form_goal: int = 0              # fg — 0…5
    exp: str = "never"              # ex — never | quit | onoff
    last: str = "long"              # ls — m1 | m6 | y1 | long
    did: str = "home"               # dd — gym | home | cardio | group | diet | sport
    mins: str = "30"                # mn — 15 | 30 | 45 | 90
    freq: str = "2"                 # fq — 1 | 2 | 3 | 4+
    health: list[str] = field(default_factory=list)     # hl
    issued: date = field(default_factory=date.today)

    # ── согласование по роду ────────────────────────────────
    # Тот же приём, что f() в квизе (строка 234): одна функция, оба варианта
    # рядом, чтобы при правке текста нельзя было забыть про мужской род.
    @property
    def at_gym(self) -> bool:
        """«Ещё не решил» ведёт в домашний вариант: начать дома можно сегодня,
        а перейти в зал получится в любой момент."""
        return self.place == "gym"

    def f(self, fem: str, masc: str) -> str:
        return fem if self.gender == "f" else masc

    # ── производные величины ────────────────────────────────

    @property
    def bmi(self) -> float:
        return round(self.weight_now / (self.height / 100) ** 2, 1)

    @property
    def bmi_text(self) -> str:
        b = self.bmi
        if b < 18.5:
            return "ниже нормы"
        if b < 25:
            return "норма"
        if b < 30:
            return "выше нормы"
        return "значительно выше нормы"

    @property
    def chart_mode(self) -> str:
        """Повторяет chartMode() из квиза."""
        d = abs(self.weight_now - self.weight_goal)
        if self.goal == "tone":
            return "weight" if d >= 4 else "form"
        return "weight" if d >= 2 else "form"

    @property
    def type_code(self) -> str:
        """Повторяет typeOf(). Порядок проверок жёсткий: «бросил, но последний
        раз меньше месяца назад» — это не длинная пауза, а те же урывки, и
        разбор человеку нужен другой."""
        if self.exp == "never":
            return "never"
        if self.exp == "quit" and self.last == "m1":
            return "onoff"
        return self.exp or "never"

    @property
    def trainings(self) -> int:
        """Повторяет trainings(): число берётся из прямого ответа про частоту."""
        return TR_BY_FREQ.get(self.freq, 2)

    @property
    def plan(self) -> dict:
        """Повторяет plan(): прогноз только на первый этап.

        Обещать «минус 35 кг за полгода» — врать, а на доверии держится всё
        остальное. Комментарий сохранён из оригинала намеренно.
        """
        gain = self.weight_goal > self.weight_now
        d_all = round(abs(self.weight_now - self.weight_goal), 1)
        pace = PACE_BY_TR.get(self.trainings, 1.0)

        if self.chart_mode == "form":
            gap = max(1, abs(self.form_goal - self.form_now))
            weeks = max(6, _round_half_up(min(30, max(6, gap * 7)) * pace))
            return {"mode": "form", "weeks": weeks, "d": d_all, "gain": gain,
                    "stage": False, "stages": 1, "target": self.weight_goal}

        # Один в один с RATE в квизе. При равном относительном дефиците
        # мужчина теряет быстрее — больше сухой массы и суточный расход;
        # на наборе разрыв почти двукратный. Меняешь тут — меняй и там.
        r = _RATE.get(self.gender, _RATE["f"])
        rate = r["gain"] if gain else (r["loss_big"] if d_all > 15 else r["loss"])
        cap = max(4, round(self.weight_now * 0.1))
        stage = (not gain) and d_all > cap and d_all > 12
        d = cap if stage else d_all
        weeks = max(4, min(44, _round_half_up(d / rate * pace) or 6))
        return {
            "mode": "weight", "weeks": weeks, "d": d, "gain": gain,
            "stage": stage,
            "stages": -(-int(d_all) // int(cap)) if stage else 1,
            "target": round(self.weight_now - d, 1) if stage else self.weight_goal,
        }

    @property
    def plan_date(self) -> str:
        d = self.issued + timedelta(weeks=self.plan["weeks"])
        return f"{d.day} {MONTHS_GEN[d.month - 1]}"

    # ── флаги здоровья ──────────────────────────────────────

    @property
    def knee(self) -> bool:
        return "knee" in self.health or "joint" in self.health

    @property
    def back(self) -> bool:
        return "back" in self.health

    @property
    def medic(self) -> bool:
        """Сердце/давление или диабет — обязателен абзац про врача."""
        return "heart" in self.health or "diab" in self.health

    @classmethod
    def from_quiz(cls, payload: dict) -> "Profile":
        """Собирает профиль из JSON квиза (ключи как в sendData, схема v2)."""
        return cls(
            name=payload["n"],
            gender=payload.get("g", "f"),
            age=payload.get("a", 30),
            height=payload["h"],
            weight_now=payload["w"],
            weight_goal=payload["wg"],
            goal=payload.get("gl", "loss"),
            place=payload.get("pl", "home"),
            zone=payload.get("zn") or "all",
            form_now=payload.get("fn", 0),
            form_goal=payload.get("fg", 0),
            exp=payload.get("ex") or "never",
            last=payload.get("ls") or "long",
            did=payload.get("dd") or "home",
            mins=payload.get("mn") or "30",
            freq=payload.get("fq") or "2",
            health=payload.get("hl", []),
        )
