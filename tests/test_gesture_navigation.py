#!/usr/bin/env python3
"""Test Touch Swipe Gesture Feature with Custom SVG Animation Icons."""
import os, sys
from playwright.sync_api import sync_playwright

URL = "http://127.0.0.1:5173"
VIEWPORT = {"width": 390, "height": 844}

def main():
    launch_kwargs = {"args": ["--no-sandbox"]}
    if os.path.exists("/usr/bin/chromium"):
        launch_kwargs["executable_path"] = "/usr/bin/chromium"

    with sync_playwright() as p:
        browser = p.chromium.launch(**launch_kwargs)
        page = browser.new_page(viewport=VIEWPORT, is_mobile=True, has_touch=True)
        page.goto(URL, wait_until="networkidle", timeout=15000)
        page.wait_for_timeout(500)

        # 1. Verify bottom gesture guide bar exists
        bar = page.locator('aside[aria-label="Gesture navigation bar"]')
        if bar.count() == 0:
            print("FAILED: Gesture navigation bar not found")
            return 1
        print("✓ Gesture navigation bar is mounted")

        # 2. Simulate swipe left from Overview -> Models
        page.mouse.move(320, 400)
        page.mouse.down()
        page.mouse.move(80, 400, steps=8)
        page.mouse.up()

        # Touch event simulation via touch API in page
        page.evaluate("""() => {
            const touchStart = new Touch({ identifier: 1, target: document.body, clientX: 300, clientY: 400 });
            const touchEnd = new Touch({ identifier: 1, target: document.body, clientX: 100, clientY: 400 });
            window.dispatchEvent(new TouchEvent('touchstart', { touches: [touchStart], changedTouches: [touchStart] }));
            window.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [touchEnd] }));
        }""")
        page.wait_for_timeout(400)

        current_url = page.url
        print(f"✓ Swipe left triggered navigation: {current_url}")
        if "/model" not in current_url:
            print("FAILED: Did not navigate to /model on swipe left")
            return 1

        # 3. Simulate swipe right back from Models -> Overview
        page.evaluate("""() => {
            const touchStart = new Touch({ identifier: 2, target: document.body, clientX: 100, clientY: 400 });
            const touchEnd = new Touch({ identifier: 2, target: document.body, clientX: 300, clientY: 400 });
            window.dispatchEvent(new TouchEvent('touchstart', { touches: [touchStart], changedTouches: [touchStart] }));
            window.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [touchEnd] }));
        }""")
        page.wait_for_timeout(400)

        current_url = page.url
        print(f"✓ Swipe right triggered navigation back: {current_url}")
        if current_url.rstrip("/") != URL:
            print("FAILED: Did not navigate back to Overview on swipe right")
            return 1

        print("ALL GESTURE TESTS PASSED!")
        browser.close()
        return 0

if __name__ == "__main__":
    sys.exit(main())
