"""
Профиль человека из квиза → значения для подстановки в шаблон лид-магнита.

На вход идёт ровно тот JSON, который Mini App отдаёт боту через sendData
(схема описана в source/bot-integratsiya-Serbolin.md, раздел 3). Никакого
второго формата данных не заводим: что бот получил — то и передал сюда.

Вся производная логика (ИМТ, тип срыва, число тренировок, прогноз) повторяет
app/kviz-serbolin.html один в один. Это принципиально: PDF человек открывает
через минуту после экрана диагностики, и цифры обязаны совпасть. Если логика
в квизе меняется — правится и здесь, оба места помечены ссылками на функции
оригинала.
"""
from dataclasses import dataclass, field
from datetime import date, timedelta

MONTHS_GEN = [
    "января", "февраля", "марта", "апреля", "мая", "июня",
    "июля", "августа", "сентября", "октября", "ноября", "декабря",
]


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
    goal: str                       # gl — loss | mass | tone | power
    form_now: int = 0               # fn — 0…5
    form_goal: int = 0              # fg — 0…5
    life: str = "sit"               # lf — sit | some | reg | much
    attempts: str = "1"             # at — 1 | 2-3 | 4-6 | many
    break_point: str = "days"       # bp — days | week | 2-3w | month | none
    breakers: list[str] = field(default_factory=list)   # br
    health: list[str] = field(default_factory=list)     # hl
    issued: date = field(default_factory=date.today)

    # ── согласование по роду ────────────────────────────────
    # Тот же приём, что f() в квизе (строка 234): одна функция, оба варианта
    # рядом, чтобы при правке текста нельзя было забыть про мужской род.
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
        if self.goal in ("tone", "power"):
            return "weight" if d >= 4 else "form"
        return "weight" if d >= 2 else "form"

    @property
    def type_n(self) -> int:
        """Повторяет typeOf(). Порядок проверок жёсткий: точка срыва сильнее
        образа жизни — этот баг уже ловили, см. CLAUDE.md."""
        if self.break_point == "none":
            return 3
        if self.break_point in ("2-3w", "month") or self.attempts in ("4-6", "many"):
            return 4
        if self.break_point == "days" or self.attempts == "1":
            return 1
        if self.life in ("reg", "much"):
            return 3
        return 2

    @property
    def trainings(self) -> int:
        """Повторяет tr из plan()."""
        return 2 if self.life in ("sit", "some") else 3

    @property
    def plan(self) -> dict:
        """Повторяет plan(): прогноз только на первый этап.

        Обещать «минус 35 кг за полгода» — врать, а на доверии держится всё
        остальное. Комментарий сохранён из оригинала намеренно.
        """
        gain = self.weight_goal > self.weight_now
        d_all = round(abs(self.weight_now - self.weight_goal), 1)

        if self.chart_mode == "form":
            gap = max(1, abs(self.form_goal - self.form_now))
            weeks = min(30, max(6, gap * 7))
            return {"mode": "form", "weeks": weeks, "d": d_all, "gain": gain,
                    "stage": False, "stages": 1, "target": self.weight_goal}

        rate = 0.35 if gain else (0.7 if d_all > 15 else 0.55)
        cap = max(4, round(self.weight_now * 0.1))
        stage = (not gain) and d_all > cap and d_all > 12
        d = cap if stage else d_all
        weeks = max(4, min(40, round(d / rate) or 6))
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
        """Собирает профиль из JSON квиза (ключи как в sendData)."""
        return cls(
            name=payload["n"],
            gender=payload.get("g", "f"),
            age=payload.get("a", 30),
            height=payload["h"],
            weight_now=payload["w"],
            weight_goal=payload["wg"],
            goal=payload.get("gl", "loss"),
            form_now=payload.get("fn", 0),
            form_goal=payload.get("fg", 0),
            life=payload.get("lf", "sit"),
            attempts=payload.get("at", "1"),
            break_point=payload.get("bp", "days"),
            breakers=payload.get("br", []),
            health=payload.get("hl", []),
        )
