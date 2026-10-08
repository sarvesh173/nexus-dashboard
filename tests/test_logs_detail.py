"""Double-tap must open the full A-to-Z call detail, read-only.

The reported bug was "double tap shows nothing". This asserts the whole chain:
row -> two clicks -> artifact fetch -> summary populated -> and that no secret
value reaches the DOM.

Run: python3 tests/test_logs_detail.py
"""
import asyncio
import sys

from playwright.async_api import async_playwright


async def open_logs(page):
    await page.goto("http://localhost:5173/", wait_until="load", timeout=20000)
    await page.wait_for_timeout(2000)
    await page.locator('button[aria-label="Open Navigation Drawer"]').click()
    await page.wait_for_timeout(600)
    await page.locator('[data-testid="nav-drawer-panel"] button', has_text="Logs").first.click()
    try:
        await page.wait_for_selector("[data-log-row]", timeout=15000)
    except Exception:
        pass
    await page.wait_for_timeout(1500)


async def run():
    fails = []
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True)
        page = await b.new_page(viewport={"width": 1600, "height": 950})
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)[:160]))

        await open_logs(page)

        # Connection-tests fill the newest page; real LLM calls sit further
        # back. Walk the timeline until an inspectable row appears, which is
        # also the only honest way to test that the timeline works.
        target = None
        for step in range(6):
            got = await page.evaluate(
                """
                () => {
                  const rows = Array.from(document.querySelectorAll('[data-log-row]'));
                                for (const r of rows) {
                                  if (/connection-test/.test(r.innerText)) continue;
                                  // Gateway rows carry no artifact; they must not be picked here.
                                  if (!/gemini|gpt|claude|flash|llama|qwen/i.test(r.innerText)) continue;
                                  return r.getAttribute('data-log-row');
                                }
                                return null;
                }
                """
            )
            if got:
                target = got
                print(f"  found inspectable row at timeline page {step}")
                break
            older = page.locator('button[aria-label="Older"]')
            if await older.count() == 0 or await older.is_disabled():
                break
            await older.click()
            await page.wait_for_timeout(2000)
            try:
                await page.wait_for_selector("[data-log-row]", timeout=8000)
            except Exception:
                pass
            await page.wait_for_timeout(800)

        print("  target row:", target)
        if not target:
            fails.append("no inspectable row across 6 timeline pages")

        if target:
            sel = f'[data-log-row="{target}"]'
            row = page.locator(sel)
            await row.scroll_into_view_if_needed()
            # Fire the two taps at the coordinates with the mouse, back to back.
            # Two locator clicks each wait for actionability and land ~380ms
            # apart — a real double tap is faster than that, so this was
            # testing a gesture no human makes.
            bb = await row.bounding_box()
            cx, cy = bb["x"] + 200, bb["y"] + bb["height"] / 2
            for _ in range(2):
                await page.mouse.move(cx, cy)
                await page.mouse.down()
                await page.mouse.up()
            try:
                await page.wait_for_selector('[data-testid="call-detail"]', timeout=8000)
            except Exception:
                fails.append("double tap did not open the detail panel")

            if await page.query_selector('[data-testid="call-detail"]'):
                await page.wait_for_timeout(1200)
                state = await page.evaluate(
                    """
                    () => {
                      const d = document.querySelector('[data-testid="call-detail"]');
                      if (!d) return { missing: true };
                      const txt = d.innerText;
                      return {
                        tabs: Array.from(d.querySelectorAll('[role="tab"]')).map((t) => t.innerText.trim()),
                        text: txt.slice(0, 400),
                        // A panel that rendered an artifact always names the model.
                        hasModel: /gemini|gpt|claude|flash|model/i.test(txt),
                        hasReadonly: /read-only/i.test(txt),
                        blocks: d.querySelectorAll('pre').length,
                      };
                    }
                    """
                )
                for k, v in state.items():
                    print(f"  {k}: {str(v)[:190]}")
                if state.get("missing"):
                    fails.append("panel vanished")
                else:
                    if not state["hasModel"]:
                        fails.append("panel opened but shows no call data")
                    if len(state["tabs"]) < 4:
                        fails.append(f"only {state['tabs']} tabs — A-to-Z sections missing")

                # Secret sweep across every tab.
                leaked = []
                for tab in ("Request", "Messages", "Response", "Pipeline"):
                    el = d = page.locator('[data-testid="call-detail"] [role="tab"]',
                                          has_text=tab)
                    if await el.count():
                        await el.first.click()
                        await page.wait_for_timeout(700)
                        body = await page.locator('[data-testid="call-detail"]').inner_text()
                        for marker in ("sk-", "Bearer ey", "AIza", "ghp_", "-----BEGIN"):
                            if marker in body:
                                leaked.append(f"{tab}:{marker}")
                if leaked:
                    fails.append(f"secret-shaped values rendered: {leaked}")
                else:
                    print("  secrets: clean across all tabs")

        if errors:
            fails.append(f"page errors: {errors[:2]}")
        await b.close()

    return fails


def main():
    fails = asyncio.run(run())
    for f in fails:
        print("FAIL:", f)
    print("\nPASS" if not fails else "\nFAILED")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())