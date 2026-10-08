/**
 * Logs feature visibility + behavior flags.
 *
 * Every switch here is one boolean you can flip and get the old behaviour
 * back, with no code deletion. The pattern is deliberately dumb: a flag file
 * per feature, read at the top of the feature's entry component.
 *
 * To remove a surface entirely later, set its flag to false — the route, the
 * component and its handlers stay on disk, just unmounted.
 */

/** Master switch for the whole Logs surface. */
export const SHOW_LOGS_FEATURE = true;

/**
 * V3 = the rebuilt, chunked, virtualized Logs surface.
 * false = the original 871-line implementation (still on disk, still works).
 */
export const LOGS_USE_V3 = true;

/**
 * Row interaction model.
 *
 * V2 (old, current): every log row is its own <button>. With ~90 rows on
 * screen that is ~90 tab stops, ~90 focus rings, and no way to read the list
 * with a keyboard. This is what made the page feel unusable.
 *
 * V3 (OmniRoute pattern): the list is NOT interactive. Rows are plain
 * elements in a virtualized scroller; a single roving-tabindex container owns
 * selection, and the detail panel reads from that one piece of state.
 *
 * Rows become focusable only when this is on.
 */
export const LOGS_ROWS_ARE_BUTTONS = false;

/** Show the detail inspector panel on the right when a row is selected. */
export const SHOW_LOG_DETAIL_PANEL = true;

/** Live tail: append new entries as they arrive, and follow the tail. */
export const LOGS_LIVE_TAIL = true;

/** Auto-follow only sticks while the user is already at the bottom. */
export const LOGS_SMART_AUTOSCROLL = true;

/** Row height used by the virtualizer. Fixed height is a prerequisite for it. */
export const LOGS_ROW_HEIGHT = 34;

/** How many rows to keep mounted in the DOM regardless of scroll position. */
export const LOGS_PAGE_SIZE = 80;

/** Fetch more when the user scrolls within this many px of the bottom. */
export const LOGS_FETCH_AHEAD_PX = 600;

/** Controls that live behind a single "Filters" disclosure. */
export const LOGS_FILTERS_COLLAPSED_BY_DEFAULT = true;

/** Filters available at all. Flip false to drop the level/source facet. */
export const LOGS_LEVEL_FILTER = true;
export const LOGS_SOURCE_FILTER = true;
export const LOGS_PROFILE_FILTER = true;
export const LOGS_TIME_RANGE_FILTER = true;
export const LOGS_SEARCH_FILTER = true;

/** Per-column visibility, so a noisy column can be dropped without code edits. */
export const LOGS_COLUMNS = {
  time: true,
  level: true,
  source: true,
  message: true,
  correlationId: false,
  durationMs: false,
};

/** Export affordance. Uses the server's own redaction rules, not client-side. */
export const LOGS_EXPORT_ENABLED = true;

/** Rows per export chunk when the user picks "Export visible". */
export const LOGS_EXPORT_LIMIT = 500;