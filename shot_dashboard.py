#!/usr/bin/env python3
"""
Скриншоты восьми страниц дашборда — визуальная проверка перед сдачей.

Правило репозитория: вёрстка и то, что реально рисует браузер, расходятся
регулярно, поэтому дизайн не сдают, не посмотрев на растр. Для PDF эту роль
играет preview.py, для квиза — test_quiz_demo.py, здесь то же для дашборда.

    python3 shot_dashboard.py          # все страницы в shots-dash/

Почему это не «просто открыть index.html»:

* Babel компилирует .jsx в браузере через XHR, а на file:// такой запрос
  режет CORS — приложение молча не смонтируется. Нужен http, поэтому скрипт
  поднимает временный сервер.
* React, ReactDOM и Babel приезжают с unpkg, шрифты — с Google Fonts. В
  закрытом окружении оба хоста недоступны, страница отрисуется голым HTML.
  Скрипт кладёт библиотеки в .vendor-cache/ (curl умеет через прокси, а
  headless-браузер — нет) и подменяет ссылки в копии index.html. Сам
  index.html не трогается: в бою он ходит на CDN, как и раньше.
* Шрифты берутся из serbolin-pdf/fonts — те же woff2, что уже лежат в
  репозитории, чтобы кириллица не уехала на системный гротеск.
"""
import asyncio
import http.server
import pathlib
import re
import socketserver
import subprocess
import threading

from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).parent
OUT = ROOT / "shots-dash"
CACHE = ROOT / ".vendor-cache"
PORT = 0   # свободный порт выбирает ОС: фиксированный может быть занят

# Chromium берём из образа — тот же путь, что в serbolin-pdf/lib/render.py.
# Playwright по умолчанию ищет headless-shell, которого в образе нет, и
# советует «playwright install»; скачивать браузер здесь не нужно.
CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"

CDN = {
    "https://unpkg.com/react@18/umd/react.production.min.js": "react.js",
    "https://unpkg.com/react-dom@18/umd/react-dom.production.min.js": "react-dom.js",
    "https://unpkg.com/@babel/standalone/babel.min.js": "babel.js",
}

# Порядок совпадает с порядком пунктов сайдбара в AppShell.jsx.
PAGES = ["home", "character", "quests", "workouts",
         "content", "crm", "wallet", "achievements"]


def prepare() -> pathlib.Path:
    """Кладёт библиотеки в кэш и собирает офлайн-копию index.html."""
    CACHE.mkdir(exist_ok=True)
    for url, name in CDN.items():
        dst = CACHE / name
        if not dst.exists():
            print("  качаю", name)
            subprocess.run(["curl", "-sSL", url, "-o", str(dst)], check=True)

    html = (ROOT / "index.html").read_text(encoding="utf-8")
    for url, name in CDN.items():
        html = html.replace(url, f".vendor-cache/{name}")
    # Google Fonts недоступны — подставляем те же гарнитуры из репозитория.
    html = re.sub(
        r'<link href="https://fonts\.googleapis\.com[^"]*" rel="stylesheet">',
        '<base href="/">\n  <link rel="stylesheet" href="serbolin-pdf/fonts/fonts.css">',
        html,
    )
    offline = ROOT / ".preview-index.html"
    offline.write_text(html, encoding="utf-8")
    return offline


class _QuietHandler(http.server.SimpleHTTPRequestHandler):
    """Тот же файловый сервер, но без строки в лог на каждый шрифт."""

    def log_message(self, *args) -> None:
        pass


def serve() -> socketserver.TCPServer:
    handler = lambda *a, **kw: _QuietHandler(*a, directory=str(ROOT), **kw)
    socketserver.TCPServer.allow_reuse_address = True
    srv = socketserver.TCPServer(("127.0.0.1", PORT), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


async def shoot(url: str) -> list[str]:
    OUT.mkdir(exist_ok=True)
    errors: list[str] = []
    async with async_playwright() as pw:
        exe = CHROME if pathlib.Path(CHROME).exists() else None
        browser = await pw.chromium.launch(executable_path=exe)
        page = await browser.new_page(viewport={"width": 1440, "height": 1000})
        page.on("pageerror", lambda e: errors.append(str(e)))
        await page.goto(url)
        await page.wait_for_selector(".ss-app", timeout=30000)
        await page.wait_for_timeout(2500)          # Babel + шрифты
        nav = page.locator(".ss-nav-item")
        for i, name in enumerate(PAGES):
            await nav.nth(i).click()
            await page.wait_for_timeout(900)       # переходы страниц
            await page.screenshot(path=str(OUT / f"{name}.png"), full_page=True)
            print("  ", name)
        await browser.close()
    return errors


def main() -> None:
    offline = prepare()
    srv = serve()
    try:
        port = srv.server_address[1]
        errors = asyncio.run(shoot(f"http://127.0.0.1:{port}/{offline.name}"))
    finally:
        srv.shutdown()
        offline.unlink(missing_ok=True)

    if errors:
        print("\nОшибки в консоли — страницы отрисованы не полностью:")
        for e in errors[:10]:
            print("  !", e)
    else:
        print("Готово, ошибок в консоли нет.")


if __name__ == "__main__":
    main()
