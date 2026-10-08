/**
 * Universal CPU-core ranking for the Overview telemetry cards.
 *
 * Nothing here is hardcoded to a 2-core box: the backend reports whatever the
 * host actually has (`psutil.cpu_percent(percpu=True)`), and these helpers just
 * sort + slice it. A 7-core laptop therefore shows the two busiest cores, and a
 * 32-thread workstation shows the two hottest — the card never pretends to know
 * the core count in advance and never renders a bogus "Core 5" on a 2-core box.
 */

/** Clamps any value into a usable 0..100 percentage, or null when unusable. */
export const asPercent = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.min(100, Math.max(0, n));
};

/**
 * Ranks raw per-core percentages and returns the N busiest cores.
 *
 * Sorting descending is what makes the card useful on any machine: the two
 * boxes always surface the cores actually carrying load, not "core 0 and core 1"
 * by index. `min(2, available)` means a single-core host still renders one box
 * rather than a blank or an error.
 *
 * @param {unknown} perCore  array of per-core percentages from the backend
 * @param {number} limit      how many cores to surface (default 2)
 * @returns {{ label: string, value: number, index: number }[]}
 */
export const topCores = (perCore, limit = 2) => {
  const values = Array.isArray(perCore) ? perCore : [];
  const ranked = values
    .map((value, index) => ({ value: asPercent(value), index }))
    .filter((core) => core.value !== null)
    .sort((a, b) => b.value - a.value || a.index - b.index);

  return ranked.slice(0, Math.max(1, limit)).map((core, position) => ({
    // 1-based so the card reads "Core 1" on a 2-core box and still reads
    // naturally when the busiest core is the machine's 5th thread.
    label: `Core ${position + 1}`,
    value: core.value,
    index: core.index,
  }));
};

/** Total physical cores the host actually reports. */
export const coreCount = (perCore) => (Array.isArray(perCore) ? perCore.length : 0);

/** True when the host has a real swap area that is switched on. */
export const swapEnabled = (telemetry) => {
  const total = Number(telemetry?.swap_total_mb);
  return Number.isFinite(total) && total > 0;
};

/** Formats megabyte counts, falling back to an em dash when unknown. */
export const formatMb = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return `${Math.round(n)}M`;
};

/** Builds the RAM and Swap readout for the memory card. */
export const swapReadout = (telemetry) => {
  if (!swapEnabled(telemetry)) return null;

  const percent = asPercent(telemetry?.swap_percent);
  return {
    percent,
    used: formatMb(telemetry?.swap_used_mb),
    total: formatMb(telemetry?.swap_total_mb),
    free: formatMb(telemetry?.swap_free_mb),
  };
};