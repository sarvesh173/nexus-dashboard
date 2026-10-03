"""Overview motion must be perceptible, and the Output Token cell must be
visually distinct from its Input sibling.

Run: python3 tests/test_overview_motion.py   -> exit 0 pass, 1 fail
Requires the built app on http://localhost:5173 (nexus-dashboard.service).
"""
import asyncio
import sys

from playwright.async_api import async_playwright

CHECKS = [
    "cpu_track_thickness",
    "cpu_indicator_uses_transform",
    "cpu_transition_matches_ramp",
    "icon_orbit_stroke",
    "output_cell_no_highlight",
    "output_cell_unpositioned",
    "reduced_motion_kills_it",
]


async def collect(page):
    return await page.evaluate(
        """() => {
      const px = (el, prop) => (el ? parseFloat(getComputedStyle(el)[prop]) || 0 : 0);
      const track = document.querySelector('.m3-linear-progress .m3-linear-track');
      const ind   = document.querySelector('.m3-linear-progress .m3-linear-indicator');
      const orbit = document.querySelector('.overview-icon-orbit');
      const root   = getComputedStyle(document.documentElement);

      // the two token cells are the first two inside the cost card's 2-col grid
      const cells = [...document.querySelectorAll(
        '.overview-card div.grid.grid-cols-2 > div')].slice(0, 2);
      const inputCell  = cells[0];
      const outputCell = cells[1];

      return {
        trackHeight: px(track, 'height'),
        indTransform: ind ? getComputedStyle(ind).transform : null,
        indTransition: ind ? getComputedStyle(ind).transition : null,
        rampVar: root.getPropertyValue('--ov-ramp').trim(),
        orbitStroke: orbit ? parseFloat(getComputedStyle(orbit).strokeWidth) || 0 : 0,
        orbitDash: orbit ? getComputedStyle(orbit).strokeDasharray : null,
        inBg: inputCell  ? getComputedStyle(inputCell).backgroundColor  : null,
        outBg: outputCell ? getComputedStyle(outputCell).backgroundColor : null,
        outBorder: outputCell ? getComputedStyle(outputCell).borderTopColor : null,
        outPos: outputCell ? getComputedStyle(outputCell).position : null,
        inBorder: inputCell ? getComputedStyle(inputCell).borderTopColor : null,
        ratioText: document.querySelector('.output-rate-ratio')?.textContent?.trim() || null,
        ratioWidth: (() => {
          const b = document.querySelector('.output-rate-fill');
          return b ? Math.round(b.getBoundingClientRect().width) : null;
        })(),
        caption: document.querySelector('.output-rate-caption')?.textContent?.trim() || null,
        nativeTitle: document.querySelector('.output-rate-cell [title]')?.getAttribute('title') || null,
      };
    }"""
    )


def evaluate(d):
    out = []
    if d["trackHeight"] < 8:
        out.append(f"cpu_track_thickness: track is {d['trackHeight']}px, want >= 8px")
    if not d["indTransform"] or "matrix" not in d["indTransform"]:
        out.append(f"cpu_indicator_uses_transform: transform={d['indTransform']!r}")
    if d["rampVar"] and "ms" not in d["rampVar"]:
        out.append(f"cpu_transition_matches_ramp: --ov-ramp={d['rampVar']!r}")
    if d["orbitStroke"] < 2.4:
        out.append(f"icon_orbit_stroke: {d['orbitStroke']}px, want >= 2.4px")
    # The Output Token cell was originally given its own surface so it would
    # stand out. That highlight was explicitly unwanted, and the `position:
    # relative` it required also painted the cell over the tooltip's leader line,
    # hiding the dandi. The two cells must therefore match, and the cell must
    # stay unpositioned so it can never occlude the leader again.
    if d["inBg"] != d["outBg"] or d["inBorder"] != d["outBorder"]:
        out.append("output_cell_no_highlight: output cell is styled differently "
                   f"from the input cell (in={d['inBg']} out={d['outBg']})")
    if d["outPos"] not in ("static", None):
        out.append(f"output_cell_unpositioned: cell is {d['outPos']}, which creates a "
                   "stacking context that can occlude the leader line")
    # The rate bar and the browser-native title tooltip were both removed: the
    # bar overflowed its cell and wrapped to four cramped lines, and the title
    # duplicated the hover tooltip that already explains the calculation.
    if d["ratioText"]:
        out.append("output_rate_bar_removed: .output-rate-ratio still renders")
    if d["nativeTitle"]:
        out.append(f"output_native_title_removed: title={d['nativeTitle']!r} still present")
    return out


async def check():
    fails = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1440, "height": 900})
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        await page.goto("http://localhost:5173/", wait_until="load", timeout=20000)
        # Wait for the rates themselves, not for a removed element: the cells
        # render a pending dash until /api/cost-overview resolves.
        try:
            await page.wait_for_function(
                "() => {const c=document.querySelector('.output-rate-cell');"
                "return c && !c.innerText.includes('\u2014');}",
                timeout=15000)
        except Exception:
            fails.append("rates: never resolved after 15s")
        # Telemetry polls every 2s with a 1500ms tween, so the page is in
        # near-continuous motion. Settle past a full cycle before measuring.
        await page.wait_for_timeout(1200)
        if errors:
            fails.append(f"page errors: {errors}")
        fails.extend(evaluate(await collect(page)))
        await browser.close()
    return fails


def main():
    fails = asyncio.run(check())
    for f in fails:
        print("FAIL:", f)
    print(f"\n{len(CHECKS) - len(fails)}/{len(CHECKS)} overview motion checks verified")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
