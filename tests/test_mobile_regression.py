#!/usr/bin/env python3
"""Mobile Viewport Regression Test Suite for Nexus Core Dashboard.
Asserts zero horizontal layout overflow and zero console errors on mobile viewports.
"""
import os, sys
from playwright.sync_api import sync_playwright

VIEWPORT = {"width": 390, "height": 844}
ROUTES = ["/", "/model", "/agents", "/cost", "/settings"]
BASE_URL = "http://127.0.0.1:5173"

def main():
    launch_kwargs = {"args": ["--no-sandbox"]}
    if os.path.exists("/usr/bin/chromium"):
        launch_kwargs["executable_path"] = "/usr/bin/chromium"

    fails = []
    with sync_playwright() as p:
        browser = p.chromium.launch(**launch_kwargs)
        page = browser.new_page(viewport=VIEWPORT, is_mobile=True, has_touch=True)

        for route in ROUTES:
            page_errors, console_errors = [], []
            page.on("pageerror", lambda e: page_errors.append(str(e)))
            page.on("console", lambda m: console_errors.append(m.text) if m.type == "error" else None)

            url = f"{BASE_URL}{route}"
            page.goto(url, wait_until="networkidle", timeout=15000)
            page.wait_for_timeout(500)

            cw = page.evaluate("document.documentElement.clientWidth")
            sw = page.evaluate("document.documentElement.scrollWidth")
            body_sw = page.evaluate("document.body.scrollWidth")

            if sw > cw:
                fails.append(f"{route}: horizontal overflow (clientWidth={cw}, scrollWidth={sw})")
            if body_sw > cw:
                fails.append(f"{route}: body overflow (clientWidth={cw}, bodyScrollWidth={body_sw})")
            if page_errors:
                fails.append(f"{route}: page errors: {page_errors}")
            if console_errors:
                fails.append(f"{route}: console errors: {console_errors}")

            print(f"  ✓ {route:12} [phone {cw}x{VIEWPORT['height']}]: sw={sw}, body_sw={body_sw}")

        browser.close()

    if fails:
        print("\nFAILURES:")
        for f in fails:
            print(f"  ✗ {f}")
        return 1

    print("\nALL MOBILE REGRESSION CHECKS PASSED (0 overflows, 0 errors)")
    return 0

if __name__ == "__main__":
    sys.exit(main())
