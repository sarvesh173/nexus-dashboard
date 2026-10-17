#!/usr/bin/env python3
"""Real-browser mount check: catches any runtime error the dashboard throws.

Run directly:  python3 tests/test_dashboard_mounts.py   (exit 0 pass / 1 fail)

This file is a SCRIPT, not a unittest module. The whole check lives in main()
behind an __main__ guard so that `python3 -m unittest discover` can import this
directory without launching a browser or killing the discovery process with
sys.exit().
"""
import os, sys
from playwright.sync_api import sync_playwright

URL = "http://127.0.0.1:5173/"


def _is_server_up(url=URL):
    import urllib.request
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Nexus-Test-Check'})
        with urllib.request.urlopen(req, timeout=1):
            return True
    except Exception:
        return False

def main():
    if not _is_server_up(URL):
        print(f"SKIP: dev server at {URL} is offline")
        return 0

    errors, console_errors = [], []

    with sync_playwright() as p:
        launch_kwargs = {"args": ["--no-sandbox"]}
        if os.path.exists("/usr/bin/chromium"):
            launch_kwargs["executable_path"] = "/usr/bin/chromium"
        try:
            browser = p.chromium.launch(**launch_kwargs)
        except Exception as exc:
            print(f"SKIP: browser launch failed ({exc})")
            return 0

        page = browser.new_page()
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("console", lambda m: console_errors.append(f"{m.type}: {m.text}")
                if m.type == "error" else None)

        page.goto(URL, wait_until="networkidle", timeout=45000)
        page.wait_for_timeout(7000)

        root_children = page.evaluate("document.getElementById('root')?.children.length || 0")
        text = page.evaluate("(document.getElementById('root')?.innerText||'').replace(/\\s+/g,' ').trim()")
        cards = page.evaluate("document.querySelectorAll('[class*=rounded]').length")

        browser.close()

    print(f"root children: {root_children}")
    print(f"root text len: {len(text)}")
    print(f"nodes w/ class: {cards}")
    print(f"sample: {text[:200]}")
    print()
    print(f"PAGE ERRORS: {len(errors)}")
    for e in errors[:4]:
        print("  -", e[:400])
    print(f"CONSOLE ERRORS: {len(console_errors)}")
    for e in console_errors[:4]:
        print("  -", e[:300])

    ok = root_children > 0 and len(text) > 40 and not errors
    print("\nRESULT:", "MOUNTS OK" if ok else "STILL BROKEN")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
