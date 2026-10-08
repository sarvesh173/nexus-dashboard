"""Measures the Overview telemetry figures and the swap gauge.

Two things this locks in:
  - the '%' unit must render SMALLER than the digits, not equal to them
  - swap must have its own gauge whose fill tracks swap_percent

Run: python3 tests/test_overview_figure_metrics.py   -> exit 0 pass, 1 fail
"""
import asyncio
import json
import sys

from playwright.async_api import async_playwright

STATS = {
    "cpu_percent": 62.2,
    "cpu_cores": [75.8, 73.3],
    "ram_total_mb": 3725,
    "ram_used_mb": 2389,
    "ram_free_mb": 1336,
    "ram_percent": 64.1,
    "swap_total_mb": 6144,
    "swap_used_mb": 2122,
    "swap_free_mb": 4022,
    "swap_percent": 34.5,
    "disk_percent": 55.0,
    "nexus_mem_mb": 120,
}

PROBE = """
() => {
  const cards = Array.from(document.querySelectorAll('.overview-card'));
  const cpu = cards.find((c) => /cpu load/i.test(c.innerText));
  const mem = cards.find((c) => /memory/i.test(c.innerText));
  const fig = cpu?.querySelector('.overview-telemetry-figure');
  const unit = fig?.querySelector('.overview-unit');
  if (!fig || !unit) return { error: 'figure or unit missing' };

  // Digits = the first text node; unit = the span. Compare cap heights via
  // the rendered line boxes.
  const digits = document.createRange();
  digits.setStart(fig.firstChild, 0);
  digits.setEnd(fig.firstChild, fig.firstChild.length);
  const dBox = digits.getBoundingClientRect();
  const uBox = unit.getBoundingClientRect();

  const gauge = mem?.querySelector('.overview-swap-gauge');
  const gBox = gauge?.getBoundingClientRect();
  const fill = gauge?.querySelector('i');
  const gcs = gauge ? getComputedStyle(gauge) : null;
  const fcs = fill ? getComputedStyle(fill) : null;

  return {
    digitW: Math.round(dBox.width),
    digitH: Math.round(dBox.height),
    unitH: Math.round(uBox.height),
    unitW: Math.round(uBox.width),
    unitRatio: uBox.height / dBox.height,
    baselineGap: Math.round(uBox.bottom - dBox.bottom),
    gaugeH: gBox ? Math.round(gBox.height) : null,
    gaugeW: gBox ? Math.round(gBox.width) : null,
    gaugeFill: fill ? fill.style.width : null,
    gaugeRole: gauge?.getAttribute('role') ?? null,
    gaugeLabel: gauge?.getAttribute('aria-label') ?? null,
    gaugeValueNow: gauge?.getAttribute('aria-valuenow') ?? null,
    // Depth audit
    gaugeGroove: Boolean(gcs?.boxShadow && gcs.boxShadow !== 'none'),
    gaugeFillGradient: Boolean(fcs?.backgroundImage && fcs.backgroundImage.includes('gradient')),
    gaugeShine: gauge?.querySelector(':scope > *:not(i)')?.className ?? null,
    gaugeRadius: gcs?.borderTopLeftRadius ?? null,
    memText: mem ? mem.innerText.replace(/\\s+/g, ' ').trim() : '',
  };
}
"""


async def check():
    fails = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1440, "height": 900})

        async def handler(route, request):
            await route.fulfill(
                status=200,
                content_type="application/json",
                body=json.dumps(STATS),
            )

        await page.route("**/api/stats", handler)
        await page.goto("http://localhost:5173/", wait_until="load", timeout=15000)
        await page.wait_for_timeout(1800)

        got = await page.evaluate(PROBE)
        await browser.close()

    if got.get("error"):
        return [got["error"]]

    for k, v in got.items():
        print(f"  {k}: {v}")

    # The unit must be visibly smaller than the digits.
    if not (0.4 < got["unitRatio"] < 0.85):
        fails.append(f"unit not smaller than digits: ratio={got['unitRatio']:.3f}")

    # It must still sit on the baseline, not float or drop.
    if abs(got["baselineGap"]) > 2:
        fails.append(f"unit off baseline by {got['baselineGap']}px")

    # Swap needs its own gauge, filled to the real percentage.
    if got["gaugeRole"] != "progressbar":
        fails.append(f"swap gauge missing role=progressbar (got {got['gaugeRole']})")
    if got["gaugeLabel"] != "Swap memory used":
        fails.append(f"swap gauge aria-label is {got['gaugeLabel']!r}")
    want_fill = f"{STATS['swap_percent']}%"
    if got["gaugeFill"] != want_fill:
        fails.append(f"swap gauge fill {got['gaugeFill']!r} != {want_fill!r}")
    if got["gaugeValueNow"] != str(STATS["swap_percent"]):
        fails.append(f"aria-valuenow {got['gaugeValueNow']!r} != {STATS['swap_percent']}")
    if got["gaugeH"] is None or not (5 <= got["gaugeH"] <= 7):
        fails.append(f"swap gauge height {got['gaugeH']} not the 6px rule")

    # Depth comes from the milled groove + extruded fill, NOT a white shine.
    # The RAM gauge has a sweeping specular ::after; this one must not.
    if got["gaugeShine"] is not None:
        fails.append(f"swap gauge has a shine element ({got['gaugeShine']})")
    if not got["gaugeGroove"]:
        fails.append("swap gauge lost its inset groove (no depth)")
    if not got["gaugeFillGradient"]:
        fails.append("swap gauge fill is flat, expected a metal ramp")

    return fails


def main():
    fails = asyncio.run(check())
    for f in fails:
        print("FAIL:", f)
    print("\nPASS" if not fails else "\nFAILED")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())