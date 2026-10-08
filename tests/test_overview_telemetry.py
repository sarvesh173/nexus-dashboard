"""The Overview CPU/Memory cards must adapt to whatever the host reports.

Hardcoding "2 Cores" and two fixed Core boxes only ever looked right on the
machine it was written on. These tests mock GET /api/stats with the shapes a
real box can produce and assert the card reacts:

  - a 7-core host must surface the two BUSIEST cores, not cores 0 and 1
  - a 1-core host must render one box, not two and not a blank
  - a host with no swap area must not show a swap row at all

Run: python3 tests/test_overview_telemetry.py   -> exit 0 pass, 1 fail
"""
import asyncio
import json
import sys

from playwright.async_api import async_playwright

BASE_STATS = {
    "cpu_percent": 40.0,
    "cpu_cores": [40.0, 40.0],
    "ram_total_mb": 3725,
    "ram_used_mb": 2389,
    "ram_free_mb": 1336,
    "ram_percent": 64.1,
    "swap_total_mb": 2048,
    "swap_used_mb": 440,
    "swap_free_mb": 1608,
    "swap_percent": 21.5,
    "disk_percent": 55.0,
    "nexus_mem_mb": 120,
}

# (name, stats override, expected core labels, expected core values)
CASES = [
    # The busiest core is the 2nd (97) and the 7th (88): neither is index 0, so
    # a card that showed "Core 1 / Core 2" by index would fail this case.
    ("7-core host ranks the two busiest", {**BASE_STATS, "cpu_cores": [12.0, 97.0, 33.0, 8.0, 61.0, 4.0, 88.0]},
     ["Core 1", "Core 2"], ["97%", "88%"]),
    # Single core: exactly one box, and the grid must not keep two columns.
    ("1-core host renders one box", {**BASE_STATS, "cpu_cores": [42.0]},
     ["Core 1"], ["42%"]),
    # No swap area configured: the swap row must be absent entirely.
    ("swap disabled hides the swap row",
     {**BASE_STATS, "swap_total_mb": 0, "swap_used_mb": 0, "swap_free_mb": 0, "swap_percent": 0.0},
     ["Core 1", "Core 2"], ["40%", "40%"]),
]

CORE_LABEL_RE = r"span\.block\.whitespace-nowrap\.text-\[10px\]"


async def read_cards(page):
    """Returns the CPU card's core labels/values plus the memory card text."""
    return await page.evaluate(
        """([labelRe]) => {
            // Card text is rendered uppercase by CSS text-transform, so
            // innerText comes back as "CPU LOAD" / "MEMORY". Match on the
            // stylised text or the locator finds nothing.
            const cards = Array.from(document.querySelectorAll('.overview-card'));
            const cpu = cards.find((c) => /cpu load/i.test(c.innerText));
            const mem = cards.find((c) => /memory/i.test(c.innerText));
            const labels = cpu
              ? Array.from(cpu.querySelectorAll('span.block'))
                  .filter((s) => /^core \\d+$/i.test(s.textContent.trim()))
                  .map((s) => s.textContent.trim())
              : [];
            const values = cpu
              ? Array.from(cpu.querySelectorAll('span.font-bold.text-sm'))
                  .map((s) => s.textContent.trim())
              : [];
            const header = cpu
              ? (cpu.querySelector('span.uppercase')?.textContent ?? '').trim()
              : '';
            return {
              labels, values, header,
              mem: mem ? mem.innerText.replace(/\\n/g, ' | ') : '',
              gridCols: (() => {
                // The core box sits two levels up from its label: box > (label,
                // value). Guard every hop so a layout change cannot make this
                // throw instead of reporting.
                const label = cpu?.querySelector('span.block');
                const grid = label?.parentElement?.parentElement;
                return grid instanceof Element
                  ? getComputedStyle(grid).gridTemplateColumns
                  : '';
              })(),
            };
        }""",
        [CORE_LABEL_RE],
    )


async def check():
    fails = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1440, "height": 900})
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))

        for name, stats, want_labels, want_values in CASES:
            # A named handler, not a lambda: Playwright calls route handlers with
            # (route, request), and a default arg alone still binds `request` to
            # the payload in some versions.
            async def handler(route, request, payload=stats):
                await route.fulfill(
                    status=200,
                    content_type="application/json",
                    body=json.dumps(payload),
                )

            await page.route("**/api/stats", handler)
            await page.goto("http://localhost:5173/", wait_until="load", timeout=15000)
            # Wait for the mocked row to actually paint. A fixed sleep races the
            # render: on a loaded machine 1600ms was sometimes not enough, the
            # probe ran against an empty card, and the run reported a spurious
            # failure that had nothing to do with the code under test.
            await page.wait_for_function(
                """() => {
                    const cards = Array.from(document.querySelectorAll('.overview-card'));
                    const cpu = cards.find((c) => /cpu load/i.test(c.innerText));
                    return Boolean(
                        cpu && cpu.querySelector('span.block')
                        && /\\d/.test(cpu.innerText),
                    );
                }""",
                timeout=10000,
            )

            got = await read_cards(page)
            print(f"  {name}")
            print(f"    header={got['header']!r} labels={got['labels']} values={got['values']}")

            if got["labels"] != want_labels:
                fails.append(f"{name}: core labels {got['labels']} != {want_labels}")
            if got["values"] != want_values:
                fails.append(f"{name}: core values {got['values']} != {want_values}")

            # Swap row presence must follow the host's swap area.
            has_swap = "SWAP" in got["mem"].upper()
            if stats["swap_total_mb"] > 0 and not has_swap:
                fails.append(f"{name}: swap enabled but no swap row rendered ({got['mem']!r})")
            if stats["swap_total_mb"] == 0 and has_swap:
                fails.append(f"{name}: swap disabled but a swap row rendered ({got['mem']!r})")

            # A single-core host must not keep a two-column grid.
            if len(want_labels) == 1 and len(got["gridCols"].split()) != 1:
                fails.append(f"{name}: single core but grid has {len(got['gridCols'].split())} columns")

            await page.unroute("**/api/stats", handler)

        if errors:
            fails.append(f"page errors: {errors}")
        await browser.close()
    return fails


def main():
    fails = asyncio.run(check())
    for f in fails:
        print("FAIL:", f)
    print(f"\n{len(CASES) - len(fails) if not fails else 0}/{len(CASES)} telemetry cases verified")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())