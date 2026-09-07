#!/usr/bin/env python3
"""
Собирает кликабельную демо-версию квиза из app/kviz-serbolin.html.

Зачем нужна отдельная сборка: оригинал рассчитан на запуск внутри Telegram и
тянет три внешних ресурса — SDK Telegram и два обращения к Google Fonts.
В артефакте на claude.ai работает строгий CSP: любой внешний хост режется, и
страница молча уезжает на системный шрифт, а часть логики отваливается.
Поэтому здесь всё внешнее превращается во встроенное.

Что именно меняется — исчерпывающий список:
  1. Выкидывается <script> Telegram SDK и <link> на Google Fonts.
  2. Вместо них — @font-face с woff2 в base64 (кириллица и латиница).
  3. К строке `console.log('QUIZ RESULT', data)` дописывается вызов оверлея.
  4. Перед </body> добавляется тест-оверлей с payload.

Логика квиза не трогается ВООБЩЕ. Это принципиально: тестировать нужно то, что
поедет в прод, а не его пересказ. Трогать ничего и не пришлось — автор везде
проверяет `tg` на null (`const tg = window.Telegram ? ... : null`), а submit()
без Telegram и без CFG.API сам сваливается в console.log. Мы просто цепляемся
к этой ветке.

Запуск:  python3 build_quiz_demo.py
Результат: out/kviz-demo.html — один файл, открывается двойным кликом.
"""
import base64
import pathlib
import re
import shutil
import urllib.request

HERE = pathlib.Path(__file__).parent
FONT_DIR = HERE / "fonts"
OUT = HERE / "out"
SRC = HERE / "kviz-serbolin.html"

UA = ("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

# Ровно те гарнитуры и начертания, что объявлены в <link> оригинала.
FAMILIES = [
    "Manrope:wght@400;600;700;800",
    "Inter:wght@400;500;600;700",
    "JetBrains+Mono:wght@500;700",
]
# Только то, на чём реально набран текст. latin-ext и vietnamese выкидываем —
# это лишние сотни килобайт в base64 ни за чем.
KEEP = {"cyrillic", "latin"}


def get(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def font_css() -> str:
    """Скачивает woff2 и возвращает @font-face со шрифтами в base64."""
    FONT_DIR.mkdir(exist_ok=True)
    out = []
    for fam in FAMILIES:
        css = get(
            f"https://fonts.googleapis.com/css2?family={fam}&display=swap"
        ).decode("utf-8")
        blocks = re.split(r"/\*\s*([a-z-]+)\s*\*/", css)
        for i in range(1, len(blocks) - 1, 2):
            subset, face = blocks[i], blocks[i + 1]
            if subset not in KEEP:
                continue
            m = re.search(r"src:\s*url\((https://[^)]+\.woff2)\)", face)
            if not m:
                continue
            url = m.group(1)
            name = re.search(r"font-family:\s*'([^']+)'", face).group(1)
            weight = re.search(r"font-weight:\s*(\d+)", face).group(1)

            cache = FONT_DIR / f"{name.lower().replace(' ', '-')}-{weight}-{subset}.woff2"
            if not cache.exists():
                cache.write_bytes(get(url))
                print(f"  скачан {cache.name}")
            b64 = base64.b64encode(cache.read_bytes()).decode("ascii")
            out.append(
                f"@font-face{{font-family:'{name}';font-style:normal;"
                f"font-weight:{weight};font-display:swap;"
                f"src:url(data:font/woff2;base64,{b64}) format('woff2');}}"
            )
    return "\n".join(out)


# ── тест-оверлей ─────────────────────────────────────────────────────
#
# Оформлен теми же токенами, что квиз (--ink / --gold / --plat / Playfair /
# JetBrains Mono). Своей палитры не заводим: оверлей — часть того же
# документа, и вторая визуальная система тут смотрелась бы как чужая вставка.

FIELDS = [
    ("v", "версия схемы", False),
    ("n", "имя", False),
    ("g", "пол", False),
    ("a", "возраст", False),
    ("h", "рост, см", False),
    ("w", "вес сейчас, кг", False),
    ("wg", "вес цель, кг", False),
    ("gl", "главная цель", False),
    ("fn", "фигура сейчас", False),
    ("fg", "фигура цель", False),
    ("lf", "образ жизни", False),
    ("at", "сколько заходов было", False),
    ("bp", "где ломается", True),
    ("br", "что сбивает план", False),
    ("hl", "здоровье", False),
    ("t", "тип срыва → уровень", True),
    ("wk", "недель до цели этапа", False),
    ("tr", "тренировок в неделю", False),
    ("bmi", "ИМТ", True),
    ("cm", "режим прогноза", False),
]

OVERLAY_CSS = """
/* ---------- тест-оверлей (в проде его нет) ---------- */
.tst{position:fixed;inset:0;z-index:100;background:var(--ink);
  overflow-y:auto;display:none;animation:tstIn .3s cubic-bezier(.2,0,0,1) both}
.tst.on{display:block}
@keyframes tstIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
.tst-in{max-width:520px;margin:0 auto;padding:26px 18px 40px}
.tst .eyebrow{display:flex;align-items:center;gap:8px}
.tst .dot{width:7px;height:7px;border-radius:50%;background:var(--gold);
  box-shadow:0 0 0 3px rgba(212,168,67,.18)}
.tst h2{font-size:26px;margin:10px 0 8px}
.tst .sub{color:var(--muted);font-size:14px;margin-bottom:20px}
.tst .sub b{color:var(--plat);font-weight:600}

.tst .grid{border:1px solid var(--line);border-radius:var(--r);overflow:hidden;
  margin-bottom:18px}
.tst .row{display:grid;grid-template-columns:44px 1fr auto;gap:10px;
  align-items:baseline;padding:9px 13px;border-bottom:1px solid var(--ink-3)}
.tst .row:last-child{border-bottom:0}
.tst .row.key{background:rgba(212,168,67,.07)}
.tst .k{font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--gold);
  font-weight:700}
.tst .lbl{font-size:13px;color:var(--muted);line-height:1.35}
.tst .val{font-family:'JetBrains Mono',monospace;font-size:13px;
  color:var(--plat);text-align:right;font-variant-numeric:tabular-nums;
  overflow-wrap:anywhere;max-width:190px}
.tst .row.key .val{color:var(--gold);font-weight:700}

.tst .derived{background:var(--ink-2);border-radius:var(--r);padding:14px 16px;
  margin-bottom:18px;font-size:14px;line-height:1.55}
.tst .derived .t{color:var(--gold);font-weight:600}
.tst .derived .med{color:var(--risk);font-weight:600}

.tst pre{background:#1B1B1B;border:1px solid var(--line);border-radius:var(--r);
  padding:14px;overflow-x:auto;font-family:'JetBrains Mono',monospace;
  font-size:11.5px;line-height:1.6;color:var(--plat);margin-bottom:8px}
.tst .bytes{font-family:'JetBrains Mono',monospace;font-size:11px;
  color:var(--muted);margin-bottom:20px}
.tst .acts{display:flex;gap:10px;flex-wrap:wrap}
.tst button{flex:1;min-width:150px;border:0;border-radius:var(--r);
  padding:14px 18px;font-family:inherit;font-size:15px;font-weight:600;
  cursor:pointer;transition:transform .12s,filter .2s}
.tst button:active{transform:scale(.96)}
.tst button:focus-visible{outline:2px solid var(--gold);outline-offset:3px}
.tst .primary{background:var(--gold);color:#222}
.tst .ghost{background:transparent;color:var(--plat);
  box-shadow:inset 0 0 0 1px var(--line)}
.tst .toast{position:fixed;left:50%;bottom:26px;transform:translateX(-50%);
  background:var(--ink-2);color:var(--plat);border:1px solid var(--line);
  border-radius:var(--r);padding:12px 18px;font-size:14px;opacity:0;
  pointer-events:none;transition:opacity .25s}
.tst .toast.on{opacity:1}
@media (prefers-reduced-motion:reduce){
  .tst,.tst button{animation:none;transition:none}
}
"""


def overlay_js() -> str:
    rows = ",".join(
        f'{{k:"{k}",l:"{lbl}",key:{str(is_key).lower()}}}'
        for k, lbl, is_key in FIELDS
    )
    return """
/* ==========================================================================
   ТЕСТ-ОВЕРЛЕЙ. В продовой сборке этого блока нет.
   Показывает payload, который ушёл бы боту через sendData.
   ========================================================================== */
(function(){
  var FIELDS=[__ROWS__];
  var TYPES={1:"Хаотичный старт · Диагностика",2:"Собираюсь, но не начинаю · Первые шаги",
             3:"Дисциплина есть, системы нет · Система",4:"Начинаю и срываюсь · Закрепление"};
  var el=document.getElementById('tst');

  window.__quizResult=function(data){
    var json=JSON.stringify(data,null,2);
    var bytes=new TextEncoder().encode(JSON.stringify(data)).length;

    var rows=FIELDS.map(function(f){
      var v=data[f.k];
      if(Array.isArray(v)) v=v.length?v.join(', '):'—';
      if(v===undefined||v==='') v='—';
      return '<div class="row'+(f.key?' key':'')+'">'+
             '<div class="k">'+f.k+'</div>'+
             '<div class="lbl">'+f.l+'</div>'+
             '<div class="val">'+String(v)+'</div></div>';
    }).join('');

    var medic=(data.hl||[]).indexOf('heart')>-1||(data.hl||[]).indexOf('diab')>-1;
    var derived='<div class="derived">'+
      '<div>Тип <span class="t">'+data.t+'</span> — '+(TYPES[data.t]||'?')+'</div>'+
      '<div>ИМТ <span class="t">'+data.bmi+'</span> · прогноз на '+
        '<span class="t">'+data.wk+'</span> нед. · '+
        '<span class="t">'+data.tr+'</span> трен./нед.</div>'+
      (medic?'<div class="med">В ответах heart или diab — в «День 0» и в первый '+
             'урок обязателен абзац про разрешение врача.</div>':'')+
      '</div>';

    el.querySelector('.tst-body').innerHTML=
      derived+'<div class="grid">'+rows+'</div>'+
      '<pre>'+json.replace(/&/g,'&amp;').replace(/</g,'&lt;')+'</pre>'+
      '<div class="bytes">'+bytes+' байт из 4096, лимит sendData</div>';

    el.classList.add('on');
    el.scrollTop=0;
    el.__json=JSON.stringify(data);
  };

  function toast(msg){
    var t=el.querySelector('.toast');
    t.textContent=msg; t.classList.add('on');
    setTimeout(function(){t.classList.remove('on');},2200);
  }

  el.querySelector('.copy').onclick=function(){
    var txt=el.__json||'';
    function fallback(){
      var ta=document.createElement('textarea');
      ta.value=txt; ta.style.position='fixed'; ta.style.opacity='0';
      document.body.appendChild(ta); ta.select();
      try{document.execCommand('copy'); toast('JSON скопирован');}
      catch(e){toast('Не вышло скопировать — выдели вручную');}
      document.body.removeChild(ta);
    }
    if(navigator.clipboard&&navigator.clipboard.writeText){
      navigator.clipboard.writeText(txt)
        .then(function(){toast('JSON скопирован');},fallback);
    } else fallback();
  };
  el.querySelector('.again').onclick=function(){location.reload();};
})();
""".replace("__ROWS__", rows)


OVERLAY_HTML = """
<!-- тест-оверлей: в продовой сборке его нет -->
<div class="tst" id="tst">
  <div class="tst-in">
    <div class="eyebrow"><span class="dot"></span>Тест-режим</div>
    <h2>Данные для бота</h2>
    <p class="sub">Квиз дошёл до конца. Вот payload, который Mini App отдал бы
    боту через <b>sendData</b> — в браузере отправка заглушена, потому что
    Telegram здесь нет. Логика квиза при этом настоящая, ничего не
    подменялось.</p>
    <div class="tst-body"></div>
    <div class="acts">
      <button class="primary copy" type="button">Скопировать JSON</button>
      <button class="ghost again" type="button">Пройти заново</button>
    </div>
  </div>
  <div class="toast" role="status" aria-live="polite"></div>
</div>
"""


def write_artifact_variant(html: str) -> None:
    """Версия для публикации артефактом на claude.ai.

    Публикатор сам оборачивает файл в <!doctype>/<head>/<body>, поэтому свою
    обёртку нужно снять — иначе получится документ внутри документа.
    <title> выносим в самое начало: на заголовок сканируются только первые
    8 КБ файла, а сразу за ним идёт <style> с сотнями килобайт base64.
    """
    body = html
    for pat in (r"<!DOCTYPE html>\s*", r"<html[^>]*>\s*", r"</html>\s*",
                r"<head>\s*", r"</head>\s*", r"<body[^>]*>\s*", r"</body>\s*",
                r'<meta charset="utf-8">\s*', r"<meta name=\"viewport\"[^>]*>\s*"):
        body = re.sub(pat, "", body)

    title = re.search(r"<title>(.*?)</title>", body)
    body = re.sub(r"<title>.*?</title>\s*", "", body)

    out = f"<title>{title.group(1) if title else 'Квиз'}</title>\n{body.strip()}\n"
    dst = OUT / "kviz-artifact.html"
    dst.write_text(out, encoding="utf-8")

    head = out[:8192]
    if "<title>" not in head:
        raise SystemExit("<title> не попал в первые 8 КБ")
    print(f"Для артефакта: {dst} ({dst.stat().st_size / 1024:.0f} КБ)")


def main() -> None:
    OUT.mkdir(exist_ok=True)
    html = SRC.read_text(encoding="utf-8")

    # 1. Убираем всё внешнее: SDK Telegram и Google Fonts.
    #    Ищем по содержимому, а не по номерам строк — иначе сборка развалится
    #    от любой правки выше по файлу.
    drop = [
        r'<script src="https://telegram\.org/js/telegram-web-app\.js"></script>\n',
        r'<link rel="preconnect" href="https://fonts\.googleapis\.com">\n',
        r'<link rel="preconnect" href="https://fonts\.gstatic\.com" crossorigin>\n',
        r'<link href="https://fonts\.googleapis\.com/css2\?[^"]*" rel="stylesheet">\n',
    ]
    for pat in drop:
        html, n = re.subn(pat, "", html)
        if n != 1:
            raise SystemExit(f"не найдено (или найдено {n} раз): {pat}")

    if "https://" in html.split("const AVATAR_B64")[0]:
        raise SystemExit("в <head> остались внешние ссылки")

    # 2. Встроенные шрифты — первым делом в <style>.
    print("Шрифты:")
    html = html.replace("<style>", "<style>\n" + font_css() + "\n", 1)

    # 3. Цепляемся к ветке, куда submit() и так падает без Telegram.
    hook = "console.log('QUIZ RESULT', data);"
    if html.count(hook) != 1:
        raise SystemExit("не найден хук console.log('QUIZ RESULT', data)")
    html = html.replace(
        hook, hook + "\n    if (window.__quizResult) window.__quizResult(data);"
    )

    # 4. Оверлей перед </body>.
    html = html.replace("</style>", OVERLAY_CSS + "\n</style>", 1)
    html = html.replace(
        "</body>",
        OVERLAY_HTML + "<script>" + overlay_js() + "</script>\n</body>",
    )

    # Заголовок: имя продукта без хвоста-пояснения после тире.
    html = html.replace(
        "<title>Тест: где ломается твой план — Эдуард Серболин</title>",
        "<title>Где ломается твой план</title>",
    )

    dst = OUT / "kviz-demo.html"
    dst.write_text(html, encoding="utf-8")
    kb = dst.stat().st_size / 1024
    print(f"Готово: {dst} ({kb:.0f} КБ)")

    write_artifact_variant(html)

    # Ищем именно загружаемые ресурсы. Голый поиск "https://" ругался бы на
    # пример эндпоинта в комментарии рядом с CFG.API, который никуда не ходит.
    live = re.findall(r'(?:src|href)\s*=\s*"(https://[^"]+)"', html)
    live += re.findall(r"url\(\s*['\"]?(https://[^)'\"]+)", html)
    if live:
        print("ВНИМАНИЕ, остались внешние ресурсы:", set(live))
    else:
        print("Внешних ресурсов нет — CSP артефакта не помешает.")


if __name__ == "__main__":
    main()
