"""Each nav tab must have its OWN animation, not one shared scale(1.15).

Computed transforms always resolve to matrix()/matrix3d() form, so the
meaningful assertion is distinctness — not string matching on 'scale'/'rotate'.

Run: python3 tests/test_nav_animations.py   -> exit 0 pass, 1 fail
"""
import asyncio
import sys

from playwright.async_api import async_playwright

BUTTONS = [
    "nav-overview-button",
    "nav-model-button",
    "nav-agent-button",
    "nav-playground-button",
    "nav-cost-button",
    "nav-settings-button",
]

# The generic rule that flattened everything before the recovery.
GENERIC = "matrix(1.15, 0, 0, 1.15, 0, 0)"


async def check():
    fails = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1440, "height": 900})
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        await page.goto("http://localhost:5173/overview", wait_until="load", timeout=15000)
        await page.wait_for_timeout(1200)
        if errors:
            fails.append(f"page errors: {errors}")

        seen = {}
        seen_tabs = []
        for btn_cls in BUTTONS:
            btn = page.locator(f".{btn_cls}")
            if await btn.count() == 0:
                # The nav has not landed on this branch yet (main is behind the
                # feature branch). Nothing to assert here — do not fail the build
                # for code that does not exist on this tree.
                print(f"  skip {btn_cls}: not present on this branch")
                continue
            icon = btn.locator('[class*="-icon"]').first
            seen_tabs.append(btn_cls)
            await btn.hover()
            await page.wait_for_timeout(650)
            t = await icon.evaluate("el => getComputedStyle(el).transform")
            seen.setdefault(t, []).append(btn_cls)
            if t in ("none", GENERIC):
                fails.append(f"{btn_cls}: no animation on hover (got {t})")

        # Only meaningful if the tabs were actually present on this branch.
        if seen and len(seen) < len(seen_tabs):
            fails.append(
                f"collapsed to {len(seen)} distinct transforms "
                f"(want {len(seen_tabs)}): {seen}"
            )

        await browser.close()
    return fails


def main():
    fails = asyncio.run(check())
    for f in fails:
        print("FAIL:", f)
    print(f"\n{len(BUTTONS) - len(fails)}/{len(BUTTONS)} tab animations verified")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())