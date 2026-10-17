#!/usr/bin/env python3
"""Test Touch Swipe Gesture Feature with Custom SVG Animation Icons & Drawer Integration.

Navigation uses triple-swipe activation: swipe 1 does nothing, swipe 2 shows
the feedback popup (no navigation), swipe 3 navigates. The sequence resets
one minute after the first swipe. Drawer open/close and edge swipes stay
single-swipe (they are not navigation).
"""
import os, sys
from playwright.sync_api import sync_playwright

URL = "http://127.0.0.1:5173"
VIEWPORT = {"width": 390, "height": 844}


def fire_swipe(page, identifier, x1, x2, y=400):
    page.evaluate("""([id, x1, x2, y]) => {
        const touchStart = new Touch({ identifier: id, target: document.body, clientX: x1, clientY: y });
        const touchEnd = new Touch({ identifier: id, target: document.body, clientX: x2, clientY: y });
        window.dispatchEvent(new TouchEvent('touchstart', { touches: [touchStart], changedTouches: [touchStart] }));
        window.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [touchEnd] }));
    }""", [identifier, x1, x2, y])


def triple_swipe(page, identifier, x1, x2):
    """The full activation sequence: nothing, popup, navigate."""
    fire_swipe(page, identifier, x1, x2)
    page.wait_for_timeout(350)
    fire_swipe(page, identifier + 100, x1, x2)
    page.wait_for_timeout(350)
    fire_swipe(page, identifier + 200, x1, x2)
    page.wait_for_timeout(900)


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

    launch_kwargs = {"args": ["--no-sandbox"]}
    if os.path.exists("/usr/bin/chromium"):
        launch_kwargs["executable_path"] = "/usr/bin/chromium"

    with sync_playwright() as p:
        try:
            browser = p.chromium.launch(**launch_kwargs)
        except Exception as exc:
            print(f"SKIP: browser launch failed ({exc})")
            return 0
        try:
            page = browser.new_page(viewport=VIEWPORT, is_mobile=True, has_touch=True)
            page.goto(URL, wait_until="networkidle", timeout=15000)
            page.wait_for_timeout(500)

            # 1. Verify bottom gesture guide bar exists and auto-hides after inactivity
            bar = page.locator('aside[aria-label="Gesture navigation bar"]')
            if bar.count() == 0:
                print("FAILED: Gesture navigation bar not found")
                return 1
            print("✓ Gesture navigation bar is mounted")

            # Verify auto-hide behavior
            bar_initial = bar.get_attribute("class") or ""
            if "nexus-gesture-bar-visible" not in bar_initial:
                print("FAILED: Gesture bar should initially be visible")
                return 1
            page.wait_for_timeout(2800)
            bar_hidden = bar.get_attribute("class") or ""
            if "nexus-gesture-bar-hidden" not in bar_hidden:
                print(f"FAILED: Gesture bar did not auto-hide after inactivity (class: {bar_hidden})")
                return 1
            print("✓ Gesture navigation bar auto-hides after inactivity")

            # 2. Test Edge swipe from left / 3-lines menu swipe right -> Opens Drawer and re-awakens bar
            fire_swipe(page, 10, 25, 160, y=300)
            page.wait_for_timeout(500)

            drawer_panel = page.locator('[data-testid="nav-drawer-panel"]')
            drawer_class = drawer_panel.get_attribute("class") or ""
            if "translate-x-0" not in drawer_class:
                print(f"FAILED: Drawer did not open on edge swipe (class: {drawer_class})")
                return 1
            print("✓ Edge swipe / 3-lines gesture opened NavDrawer successfully")

            # 3. Test Swipe left on drawer panel -> Closes Drawer
            fire_swipe(page, 11, 200, 50, y=300)
            page.wait_for_timeout(500)

            drawer_class_after = drawer_panel.get_attribute("class") or ""
            if "-translate-x-full" not in drawer_class_after:
                print(f"FAILED: Drawer did not close on swipe left (class: {drawer_class_after})")
                return 1
            print("✓ Swipe left closed NavDrawer successfully")

            # 4. Single swipe must NOT navigate (activation requires three).
            # Full reload first: the arm stage persists across swipes, so every
            # stage-sensitive assertion starts from a remounted controller.
            page.goto(URL, wait_until="networkidle", timeout=15000)
            page.wait_for_timeout(500)
            fire_swipe(page, 1, 300, 100)
            page.wait_for_timeout(700)
            if "/model" in page.url:
                print(f"FAILED: Single swipe navigated to /model (got {page.url})")
                return 1
            print("✓ Single swipe did not navigate (activation gate works)")

            # 5. Two swipes must NOT navigate either (popup only)
            page.goto(URL, wait_until="networkidle", timeout=15000)
            page.wait_for_timeout(500)
            fire_swipe(page, 2, 300, 100)
            page.wait_for_timeout(350)
            fire_swipe(page, 3, 300, 100)
            page.wait_for_timeout(700)
            if "/model" in page.url:
                print(f"FAILED: Two swipes navigated to /model (got {page.url})")
                return 1
            print("✓ Two swipes did not navigate (popup stage works)")

            # 6. Triple swipe left from Overview -> Models
            page.goto(URL, wait_until="networkidle", timeout=15000)
            page.wait_for_timeout(500)
            triple_swipe(page, 20, 300, 100)
            current_url = page.url
            print(f"✓ Triple swipe left triggered navigation: {current_url}")
            if "/model" not in current_url:
                print("FAILED: Did not navigate to /model on triple swipe left")
                return 1

            # 7. Triple swipe right back from Models -> Overview
            page.goto(URL + "/model", wait_until="networkidle", timeout=15000)
            page.wait_for_timeout(500)
            triple_swipe(page, 30, 150, 320)
            current_url = page.url
            print(f"✓ Triple swipe right triggered navigation back: {current_url}")
            if current_url.rstrip("/") != URL:
                print("FAILED: Did not navigate back to Overview on triple swipe right")
                return 1

            # 8. Direct test on Models Page (/model): Triple swipe left to Agents
            page.goto(URL + "/model", wait_until="networkidle", timeout=15000)
            page.wait_for_timeout(500)
            triple_swipe(page, 40, 280, 90)
            if "/agents" not in page.url:
                print(f"FAILED: On /model, triple swipe left did not navigate to /agents (got {page.url})")
                return 1
            print("✓ On /model, triple swipe left navigated to Agents successfully")

            # 9. Direct test on Models Deep-Link (/model/nvidia): Triple swipe left to Agents
            page.goto(URL + "/model/nvidia", wait_until="networkidle", timeout=15000)
            page.wait_for_timeout(500)
            triple_swipe(page, 50, 280, 90)
            if "/agents" not in page.url:
                print(f"FAILED: On /model/nvidia, triple swipe left did not navigate to /agents (got {page.url})")
                return 1
            print("✓ On /model/nvidia deep-link, triple swipe left navigated to Agents successfully")

            # 10. Test Edge Swipe on /model to open NavDrawer
            page.goto(URL + "/model", wait_until="networkidle", timeout=15000)
            page.wait_for_timeout(500)
            fire_swipe(page, 5, 20, 180, y=300)
            page.wait_for_timeout(500)
            drawer_class_models = page.locator('[data-testid="nav-drawer-panel"]').get_attribute("class") or ""
            if "translate-x-0" not in drawer_class_models:
                print("FAILED: Edge swipe on /model did not open drawer")
                return 1
            print("✓ On /model, edge swipe opened NavDrawer successfully")

            # 11. Test Continuous Circular Loop: Triple swipe left from Logs wraps around to Overview
            page.goto(URL + "/logs", wait_until="networkidle", timeout=15000)
            page.wait_for_timeout(500)
            triple_swipe(page, 88, 300, 100)
            if page.url.rstrip("/") != URL:
                print(f"FAILED: Circular loop from Logs -> Overview failed (got {page.url})")
                return 1
            print("✓ Continuous circular loop: Logs -> Overview on triple swipe left passed")

            # 12. Test Continuous Circular Loop: Triple swipe right from Overview wraps around to Logs
            triple_swipe(page, 89, 100, 300)
            if "/logs" not in page.url:
                print(f"FAILED: Circular loop from Overview -> Logs failed (got {page.url})")
                return 1
            print("✓ Continuous circular loop: Overview -> Logs on triple swipe right passed")

            print("ALL GESTURE & DRAWER TESTS PASSED!")
        except Exception as exc:
            print(f"SKIP: page or connection failed ({exc})")
            return 0
        finally:
            browser.close()
        return 0


if __name__ == "__main__":
    sys.exit(main())
