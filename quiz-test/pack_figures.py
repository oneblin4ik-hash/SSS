#!/usr/bin/env python3
"""
Кладёт сгенерированные фигуры прямо в мини-апп.

    python3 pack_figures.py

Читает figures/f-1.png … f-6.png и m-1.png … m-6.png, нормализует их и
вписывает в kviz-serbolin.html готовым блоком CFG.FIGURES. После этого
квиз показывает картинки вместо параметрического силуэта, а бот раздаёт
один HTML без единого внешнего запроса.

Почему base64, а не ссылки: мини-апп открывается внутри Telegram на
мобильном интернете, и двенадцать отдельных запросов за картинками — это
двенадцать поводов увидеть пустые плитки. Плюс демка и артефакт живут под
строгим CSP, где внешние хосты режутся молча.

Что скрипт делает с картинками:

1. обрезает прозрачные поля — модель почти всегда оставляет разный отступ,
   и без обрезки фигуры на шкале «прыгают» по высоте;
2. приводит все шесть ступеней одного пола к общей высоте и общему холсту,
   чтобы шкала читалась как шкала, а не как шесть разных картинок;
3. пережимает в WebP с прозрачностью — он вчетверо легче PNG на таком
   сюжете, а альфу держит;
4. считает вес и предупреждает, если пакет распух.

Требует pillow.
"""
import base64
import io
import pathlib
import re
import sys

try:
    from PIL import Image
except ImportError:
    sys.exit("нужен pillow: pip install pillow")

HERE = pathlib.Path(__file__).parent
SRC = HERE / "figures"
QUIZ = HERE / "kviz-serbolin.html"

GENDERS = ("f", "m")
STEPS = 6

# Плитка показывает 104 px по высоте; берём двойной запас под retina.
TARGET_H = 208
# Ширина холста с запасом: самая полная ступень шире самой сухой, и всем
# шести нужен общий холст, иначе центры съедут.
CANVAS_W = 176
# Порог, после которого пакет начинает заметно тормозить открытие мини-аппа.
WARN_KB = 700


def load(gender: str, step: int) -> Image.Image:
    path = SRC / f"{gender}-{step}.png"
    if not path.exists():
        sys.exit(f"нет файла {path.relative_to(HERE)}")
    img = Image.open(path).convert("RGBA")
    box = img.getbbox()          # обрезаем прозрачные поля
    return img.crop(box) if box else img


def normalize(img: Image.Image) -> Image.Image:
    """Общая высота и общий холст: фигура стоит на одной линии со всеми."""
    scale = TARGET_H / img.height
    w = max(1, round(img.width * scale))
    img = img.resize((w, TARGET_H), Image.LANCZOS)

    canvas = Image.new("RGBA", (CANVAS_W, TARGET_H), (0, 0, 0, 0))
    if w > CANVAS_W:             # фигура шире холста — ужимаем по ширине
        scale = CANVAS_W / w
        img = img.resize((CANVAS_W, max(1, round(TARGET_H * scale))), Image.LANCZOS)
        w = CANVAS_W
    canvas.paste(img, ((CANVAS_W - w) // 2, TARGET_H - img.height), img)
    return canvas


def encode(img: Image.Image) -> tuple[str, int]:
    buf = io.BytesIO()
    img.save(buf, "WEBP", quality=88, method=6)
    raw = buf.getvalue()
    return "data:image/webp;base64," + base64.b64encode(raw).decode("ascii"), len(raw)


def main() -> None:
    if not SRC.exists():
        sys.exit(f"положи картинки в {SRC.relative_to(HERE)}/ "
                 "(f-1…f-6.png, m-1…m-6.png)")

    packed: dict[str, list[str]] = {}
    total = 0
    for g in GENDERS:
        urls = []
        for step in range(1, STEPS + 1):
            url, size = encode(normalize(load(g, step)))
            urls.append(url)
            total += size
            print(f"  {g}-{step}: {size // 1024} КБ")
        packed[g] = urls

    body = "\n".join(
        "    " + g + ": [\n" + "".join(f'      "{u}",\n' for u in packed[g]) + "    ],"
        for g in GENDERS
    )
    block = "  FIGURES: {\n" + body + "\n  }"

    html = QUIZ.read_text(encoding="utf-8")
    # Заменяем ровно строку FIGURES внутри CFG, не трогая остальное.
    new, n = re.subn(r"  FIGURES: \{.*?\n  \}(?=\n\};)|  FIGURES: \{[^\n]*\}",
                     block.replace("\\", "\\\\"), html, count=1, flags=re.S)
    if not n:
        sys.exit("в kviz-serbolin.html не найден блок CFG.FIGURES")
    QUIZ.write_text(new, encoding="utf-8")

    kb = total // 1024
    print(f"\nВписано в {QUIZ.name}: 12 фигур, {kb} КБ.")
    if kb > WARN_KB:
        print(f"Тяжеловато: больше {WARN_KB} КБ на картинки — мини-апп будет "
              "открываться заметно дольше. Уменьши TARGET_H или quality.")
    else:
        print("Вес в норме.")


if __name__ == "__main__":
    main()
