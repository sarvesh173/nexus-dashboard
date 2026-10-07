#!/usr/bin/env python3
"""Real-browser mount check: catches any runtime error the dashboard throws."""
import sys
from playwright.sync_api import sync_playwright

URL = "http://127.0.0.1:5173/"
errors, console_errors = [], []

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--no-sandbox"])
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
    sys.exit(0 if ok else 1)

if __name__ == '__main__':
    main()