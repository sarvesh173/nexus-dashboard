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
    "output_ratio_rendered",
    "output_ratio_no_fake_usage",
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
    if not d["ratioText"]:
        out.append("output_rate_ratio: no .output-rate-ratio element rendered")
    body = (d["caption"] or "").lower()
    if d["caption"] and ("usage" in body and "not usage" not in body and "rate" not in body):
        out.append("output_rate_no_fake_usage: caption implies a usage figure")
    if not d["ratioWidth"]:
        out.append("output_rate_ratio: fill has zero width")
    return out


async def check():
    fails = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1440, "height": 900})
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        await page.goto("http://localhost:5173/", wait_until="load", timeout=20000)
        # The rate bar cannot render until /api/cost-overview resolves - the
        # initial state carries '—' for both prices, so there is deliberately
        # nothing to show before then. Wait for the element rather than a fixed
        # delay, otherwise the test races the fetch and flakes right after a
        # server restart.
        try:
            await page.wait_for_selector(".output-rate-ratio", timeout=15000)
        except Exception:
            fails.append("output_rate_ratio: never appeared after 15s")
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
