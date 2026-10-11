#!/usr/bin/env python3
"""Test Touch Swipe Gesture Feature with Custom SVG Animation Icons & Drawer Integration."""
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

        # 2. Test Edge swipe from left / 3-lines menu swipe right -> Opens Drawer
        page.evaluate("""() => {
            const touchStart = new Touch({ identifier: 10, target: document.body, clientX: 25, clientY: 300 });
            const touchEnd = new Touch({ identifier: 10, target: document.body, clientX: 160, clientY: 300 });
            window.dispatchEvent(new TouchEvent('touchstart', { touches: [touchStart], changedTouches: [touchStart] }));
            window.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [touchEnd] }));
        }""")
        page.wait_for_timeout(500)

        drawer_panel = page.locator('[data-testid="nav-drawer-panel"]')
        drawer_class = drawer_panel.get_attribute("class") or ""
        if "translate-x-0" not in drawer_class:
            print(f"FAILED: Drawer did not open on edge swipe (class: {drawer_class})")
            return 1
        print("✓ Edge swipe / 3-lines gesture opened NavDrawer successfully")

        # 3. Test Swipe left on drawer panel -> Closes Drawer
        page.evaluate("""() => {
            const touchStart = new Touch({ identifier: 11, target: document.body, clientX: 200, clientY: 300 });
            const touchEnd = new Touch({ identifier: 11, target: document.body, clientX: 50, clientY: 300 });
            window.dispatchEvent(new TouchEvent('touchstart', { touches: [touchStart], changedTouches: [touchStart] }));
            window.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [touchEnd] }));
        }""")
        page.wait_for_timeout(500)

        drawer_class_after = drawer_panel.get_attribute("class") or ""
        if "-translate-x-full" not in drawer_class_after:
            print(f"FAILED: Drawer did not close on swipe left (class: {drawer_class_after})")
            return 1
        print("✓ Swipe left closed NavDrawer successfully")

        # 4. Simulate swipe left from Overview -> Models
        page.evaluate("""() => {
            const touchStart = new Touch({ identifier: 1, target: document.body, clientX: 300, clientY: 400 });
            const touchEnd = new Touch({ identifier: 1, target: document.body, clientX: 100, clientY: 400 });
            window.dispatchEvent(new TouchEvent('touchstart', { touches: [touchStart], changedTouches: [touchStart] }));
            window.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [touchEnd] }));
        }""")
        page.wait_for_timeout(500)

        current_url = page.url
        print(f"✓ Swipe left triggered navigation: {current_url}")
        if "/model" not in current_url:
            print("FAILED: Did not navigate to /model on swipe left")
            return 1

        # 5. Simulate swipe right back from Models -> Overview
        page.evaluate("""() => {
            const touchStart = new Touch({ identifier: 2, target: document.body, clientX: 150, clientY: 400 });
            const touchEnd = new Touch({ identifier: 2, target: document.body, clientX: 320, clientY: 400 });
            window.dispatchEvent(new TouchEvent('touchstart', { touches: [touchStart], changedTouches: [touchStart] }));
            window.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [touchEnd] }));
        }""")
        page.wait_for_timeout(500)

        current_url = page.url
        print(f"✓ Swipe right triggered navigation back: {current_url}")
        if current_url.rstrip("/") != URL:
            print("FAILED: Did not navigate back to Overview on swipe right")
            return 1

        print("ALL GESTURE & DRAWER TESTS PASSED!")
        browser.close()
        return 0

if __name__ == "__main__":
    sys.exit(main())
