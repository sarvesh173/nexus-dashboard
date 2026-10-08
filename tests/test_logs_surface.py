"""The ported log viewer must stay at four controls and show real content.

Guards the two things the user actually asked for: nothing that wastes the
screen, and logs that are readable and worth reading.

Run: python3 tests/test_logs_surface.py   -> exit 0 pass, 1 fail
"""
import asyncio
import sys

from playwright.async_api import async_playwright

PROBE = """
() => {
  const vis = (e) => e.offsetParent !== null;
  const root = document.querySelector('[data-testid="logs-stream"]');
  if (!root) return { missing: true };
  const controls = Array.from(
    root.querySelectorAll('button, select, input, a[href], [role="button"]'),
  ).filter(vis);
  const rows = Array.from(root.querySelectorAll('[data-log-row]'));
  const logPane = root.querySelector('[role="log"]');
  return {
    controls: controls.length,
    labels: controls.map((c) =>
      (c.innerText || c.getAttribute('aria-label') || c.placeholder || '').trim().slice(0, 18)),
    rows: rows.length,
    rowIsButton: rows[0] ? rows[0].tagName.toLowerCase() === 'button' : null,
    logTabIndex: logPane ? logPane.tabIndex : null,
    hasList: Boolean(logPane),
    levels: Array.from(new Set(rows.map((r) => (r.innerText.match(/\\b(INFO|WARN|ERROR|DEBUG|CRITICAL)\\b/) || [])[1]).filter(Boolean))),
    sample: rows.slice(0, 4).map((r) => r.innerText.replace(/\\s+/g, ' ').trim().slice(0, 74)),
    header: (root.innerText.split('\\n')[0] || '').slice(0, 60),
  };
}
"""


async def check():
    fails = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1440, "height": 900})
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)[:200]))

        await page.goto("http://localhost:5173/", wait_until="load", timeout=20000)
        await page.wait_for_timeout(2200)
        await page.locator('button[aria-label="Open Navigation Drawer"]').click()
        await page.wait_for_timeout(600)
        await page.locator('[data-testid="nav-drawer-panel"] button', has_text="Logs").first.click()

        # Wait for real rows, not a fixed sleep.
        try:
            await page.wait_for_selector("[data-log-row]", timeout=15000)
        except Exception:
            pass
        await page.wait_for_timeout(1500)

        got = await page.evaluate(PROBE)
        await browser.close()

    if got.get("missing"):
        return ["logs-stream did not mount"]

    for k, v in got.items():
        print(f"  {k}: {v}")

    # Four log controls (severity, search, follow, refresh) plus the three
    # timeline steppers. Nothing earns a place beyond that.
    if got["controls"] > 7:
        fails.append(f"{got['controls']} interactive controls; the ceiling is 7")
    if got["rowIsButton"]:
        fails.append("rows are <button> again — one tab stop was the fix")
    if not got["hasList"] or got["logTabIndex"] != 0:
        fails.append("log pane missing or not keyboard reachable")
    if got["rows"] == 0:
        fails.append("no log rows rendered")
    # A log view that only ever shows INFO is a view that tells you nothing.
    if len(got["levels"]) < 2:
        fails.append(f"only one severity present ({got['levels']}) — filter is not discriminating")
    for needle in ("w-2.5", "h-2.5"):
        pass
    if errors:
        fails.append(f"page errors: {errors}")

    return fails


def main():
    fails = asyncio.run(check())
    for f in fails:
        print("FAIL:", f)
    print("\nPASS" if not fails else "\nFAILED")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())