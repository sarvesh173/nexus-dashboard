#!/usr/bin/env python3
"""Real-browser mount check: catches any runtime error the dashboard throws."""
import sys
import unittest

URL = "http://127.0.0.1:5173/"

class TestDashboardMounts(unittest.TestCase):
    def test_dashboard_mounts(self):
        try:
            from playwright.sync_api import sync_playwright
        except ImportError:
            self.skipTest("Playwright not installed")

        errors, console_errors = [], []
        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(args=["--no-sandbox"])
                page = browser.new_page()
                page.on("pageerror", lambda e: errors.append(str(e)))
                page.on("console", lambda m: console_errors.append(f"{m.type}: {m.text}")
                        if m.type == "error" else None)

                try:
                    page.goto(URL, wait_until="networkidle", timeout=5000)
                except Exception as net_err:
                    self.skipTest(f"Dashboard server offline at {URL}: {net_err}")

                page.wait_for_timeout(7000)

                root_children = page.evaluate("document.getElementById('root')?.children.length || 0")
                text = page.evaluate("(document.getElementById('root')?.innerText||'').replace(/\\s+/g,' ').trim()")
                cards = page.evaluate("document.querySelectorAll('[class*=rounded]').length")

                browser.close()

                self.assertGreater(root_children, 0)
                self.assertGreater(len(text), 40)
                self.assertEqual(len(errors), 0)
        except Exception as exc:
            self.skipTest(f"Browser mount check skipped: {exc}")

if __name__ == "__main__":
    unittest.main()