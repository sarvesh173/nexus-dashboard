"""The rebuilt Logs surface must not reintroduce the button explosion.

The old implementation rendered every log line as its own <button>: a screen
full of logs produced ~90 tab stops and ~90 focus rings, which is what made the
page feel unusable. V3 keeps exactly one tab stop for the whole list.

Run: python3 tests/test_logs_v3_surface.py   -> exit 0 pass, 1 fail
"""
import asyncio
import sys

from playwright.async_api import async_playwright

PROBE = """
() => {
  const vis = (e) => e.offsetParent !== null;
  const panel = document.querySelector('[data-testid="logs-v3"]');
  if (!panel) return { missing: true };
  const btns = Array.from(panel.querySelectorAll('button')).filter(vis);
  const rows = panel.querySelectorAll('[data-log-row]');
  const list = panel.querySelector('[role="listbox"]');
  const header = panel.querySelector('header');
  return {
    buttons: btns.length,
    labels: btns.map((x) => (x.innerText || x.getAttribute('aria-label') || '').trim().slice(0, 16)),
    domRows: rows.length,
    rowTag: rows[0] ? rows[0].tagName.toLowerCase() : null,
    rowIsButton: rows[0] ? rows[0].tagName.toLowerCase() === 'button' : null,
    listTabIndex: list ? list.tabIndex : null,
    hasListbox: Boolean(list),
    headerText: header ? header.innerText.replace(/\\s+/g, ' ').trim() : '',
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
        await page.wait_for_timeout(3500)

        got = await page.evaluate(PROBE)

        # Selecting a row must open the inspector, and rows must not be buttons.
        if not got.get("missing"):
            rows = page.locator("[data-log-row]")
            if await rows.count():
                await rows.first.click()
                await page.wait_for_timeout(500)
                got["detailOpened"] = await page.locator('[data-testid="log-detail-panel"]').count() > 0

        await browser.close()

    if got.get("missing"):
        return ["logs-v3 did not mount"]

    for k, v in got.items():
        print(f"  {k}: {v}")

    # The whole point: control count must be tiny regardless of row count.
    if got["buttons"] > 16:
        fails.append(f"too many buttons in the panel: {got['buttons']} (old version had 108)")
    if got["rowIsButton"]:
        fails.append("log rows are <button> again — that is the regression we are fixing")
    if not got["hasListbox"]:
        fails.append("no role=listbox container; keyboard model is missing")
    if got["listTabIndex"] != 0:
        fails.append(f"list tabIndex is {got['listTabIndex']}, expected 0 (one tab stop)")
    if got["domRows"] > 120:
        fails.append(f"{got['domRows']} rows in the DOM; list is not virtualized")
    if got.get("detailOpened") is False:
        fails.append("clicking a row did not open the detail panel")
    # Readouts are information and must survive the cull.
    for needle in ("shown", "gateway"):
        if needle not in got["headerText"].lower():
            fails.append(f"header lost the {needle!r} readout: {got['headerText']!r}")

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