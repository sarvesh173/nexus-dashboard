/**
 * The app's own route glyphs for the top navigation.
 *
 * These replace the library icons the nav row used to render. Every shape here
 * is drawn for this app: 1.5px rails on a 16px box, rounded caps, and a
 * silhouette that reads at 14px — which is the size they actually render at.
 * A library icon designed for 24px and scaled down loses exactly the detail
 * that made it recognisable, so nothing here is scaled from a bigger box.
 *
 * Each is a named component with one `size` prop, matching how the old imports
 * were used, so the nav row reads the same as before.
 */

const RAIL = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

function glyph(size, children, extra = {}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill={RAIL.fill}
      stroke={RAIL.stroke}
      strokeWidth={RAIL.strokeWidth}
      strokeLinecap={RAIL.strokeLinecap}
      strokeLinejoin={RAIL.strokeLinejoin}
      aria-hidden="true"
      focusable="false"
      {...extra}
    >
      {children}
    </svg>
  );
}

/** Overview — a console read at a glance: one raised rail over a row of wells. */
export function OverviewGlyph({ size = 14, ...rest }) {
  return glyph(size, (
    <>
      <rect x="1.75" y="1.75" width="12.5" height="12.5" rx="2.5" />
      <path d="M4.75 5.25h6.5" />
      <path d="M4.75 8h1.75M8.25 8h3M4.75 10.75h1.75M8.25 10.75h3" />
    </>
  ), rest);
}

/** Models — a cube read from the corner, so it reads as volume not a box. */
export function ModelsGlyph({ size = 14, ...rest }) {
  return glyph(size, (
    <>
      <path d="M8 1.6 14 4.9v6.2L8 14.4 2 11.1V4.9Z" />
      <path d="M2 4.9 8 8.2l6-3.3M8 8.2v6.2" />
    </>
  ), rest);
}

/** Agents — a rounded head over a base, the seat an agent occupies. */
export function AgentsGlyph({ size = 14, ...rest }) {
  return glyph(size, (
    <>
      <rect x="3" y="4.25" width="10" height="7.5" rx="2.25" />
      <path d="M8 1.6v2.65M5.75 1.6h4.5" />
      <path d="M1.6 8.25v1.6M14.4 8.25v1.6" />
      <path d="M5.75 8h1M9.25 8h1" />
    </>
  ), rest);
}

/** Playground — a terminal: the prompt rail and the caret. */
export function PlaygroundGlyph({ size = 14, ...rest }) {
  return glyph(size, (
    <>
      <rect x="1.75" y="2.75" width="12.5" height="10.5" rx="2" />
      <path d="M4.5 6.5 6.5 8l-2 1.5" />
      <path d="M8.5 10h3" />
    </>
  ), rest);
}

/** Cost — the currency rail with a rising edge, not a lettered glyph. */
export function CostGlyph({ size = 14, ...rest }) {
  return glyph(size, (
    <>
      <path d="M8 1.75v12.5" />
      <path d="M10.9 4.4a3.1 3.1 0 0 0-2.9-1.5c-1.6 0-2.8.95-2.8 2.35 0 3.05 5.7 1.7 5.7 4.75 0 1.45-1.25 2.4-2.9 2.4a3.15 3.15 0 0 1-3-1.6" />
    </>
  ), rest);
}

/** Settings — three rails and three notches, the tuning metaphor. */
export function SettingsGlyph({ size = 14, ...rest }) {
  return glyph(size, (
    <>
      <path d="M2 4.5h3.2M8.4 4.5H14M2 11.5h3.2M8.4 11.5H14" />
      <circle cx="6.8" cy="4.5" r="1.55" />
      <circle cx="9.2" cy="11.5" r="1.55" />
    </>
  ), rest);
}

/**
 * The empty-route mark.
 *
 * Sized far larger than the route glyphs above — it renders at 38px as the
 * centre of a dead-end panel, not 14px in a nav row. Drawn on its own 24-unit
 * box for that reason rather than blown up from the 16-unit rail set, because
 * a 1.5px stroke scaled to 38px would read as a hairline.
 */
export function EmptyCompassGlyph({ size = 38 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.35"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="12" r="9.25" />
      <path d="M12 5.6v2.1M12 16.3v2.1M5.6 12h2.1M16.3 12h2.1" />
      <path d="M14.9 9.1 13.2 13.2 9.1 14.9l1.7-4.1Z" />
    </svg>
  );
}

/** The theme picker — a single loaded paint bead over its own trail. */
export function PaletteGlyph({ size = 15 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M8 1.75a6.25 6.25 0 1 0 0 12.5c.86 0 1.4-.62 1.4-1.32 0-.63-.45-1.03-.45-1.55 0-.6.5-1.08 1.17-1.08h1.06A3.32 3.32 0 0 0 14.5 7.05C14.5 4.06 11.63 1.75 8 1.75Z" />
      <path d="M5.4 5.4h.01M8.1 4.3h.01M10.6 6.3h.01" strokeWidth="1.75" />
    </svg>
  );
}

/*
 * Drawer glyphs.
 *
 * Drawn on the same 16-unit rail set as the route glyphs above, because a
 * drawer row and a nav pill sit beside each other at the same 16px and the
 * two sets have to share one weight or the drawer reads as a different app.
 */

/** Drawer Overview — the same console read as the nav glyph, with a live beat. */
export function DrawerOverviewGlyph({ size = 16, ...rest }) {
  return glyph(size, (
    <>
      <rect x="1.75" y="1.75" width="12.5" height="12.5" rx="2.5" />
      <path d="M4.75 5.25h6.5" />
      <path d="M4.75 8h1.75M8.25 8h3M4.75 10.75h1.75M8.25 10.75h3" />
    </>
  ), rest);
}

/** Drawer Models — the corner-read cube, matching the nav cube. */
export function DrawerModelsGlyph({ size = 16, ...rest }) {
  return glyph(size, (
    <>
      <path d="M8 1.6 14 4.9v6.2L8 14.4 2 11.1V4.9Z" />
      <path d="M2 4.9 8 8.2l6-3.3M8 8.2v6.2" />
    </>
  ), rest);
}

/** Drawer Agents — the fleet at rest and in flight.

   Two reads, not one. The lower rail is a solid node sitting on a baseline -
   a thing that is parked. The upper rail is the same node lifted off that
   baseline with a motion arc over it - a thing that is running. That is what
   this page actually shows: a set of agents, some idle, some working. An
   earlier attempt drew a single symmetric brain half on a stem and read as a
   medical symbol at 16px, which is worse than no symbol at all.

   Deliberately not a robot head and not a chat bubble: both are so heavily
   used as "AI agent" iconography that they carry no information here. */
export function DrawerAgentsGlyph({ size = 16, ...rest }) {
  return glyph(size, (
    <>
      {/* the running node, lifted clear of its rail, with a travel arc over it */}
      <path d="M3.6 7.4 5.8 4.3a1.6 1.6 0 0 1 2.4 0l2.2 3.1" />
      <circle cx="8" cy="10.4" r="1.75" />
      {/* the idle node, parked on its own rail */}
      <path d="M2.6 13.4h2.6M10.8 13.4h2.6" />
    </>
  ), rest);
}

/** Drawer Playground — the terminal box with its caret and output rail. */
export function DrawerPlaygroundGlyph({ size = 16, ...rest }) {
  return glyph(size, (
    <>
      <rect x="1.75" y="2.75" width="12.5" height="10.5" rx="2" />
      <path d="M4.5 6.5 6.5 8l-2 1.5" />
      <path d="M8.5 10h3" />
    </>
  ), rest);
}

/** Drawer Cost — a metered bar, not a coin.

   This is spend, and spend has a shape: a rising bar chart under one
   threshold line. The earlier version was a coin with a trend squiggle
   across it, which is a stock ticker at 16px - it says "market", not
   "what this cost me". Bars read faster at small sizes than a currency
   glyph does, because three bars of different heights is a shape you
   recognise before you finish reading it.

   The bars are unequal and clipped to the frame on purpose: equal bars
   would be a menu icon, and an unclipped set would overflow the rail
   weight. One bar crosses the threshold line, because the point of the
   page is where the spend went past. */
export function DrawerCostGlyph({ size = 16, ...rest }) {
  return glyph(size, (
    <>
      {/* the meter floor */}
      <path d="M2 13.1h12" />
      {/* three bars, unequal, all rising off the floor */}
      <path d="M4.2 13.1V9.4M8 13.1V6.2M11.8 13.1v-4.6" />
      {/* the budget line the middle bar has already crossed */}
      <path d="M2 8.1h4.9" />
    </>
  ), rest);
}

/** Drawer Logs — a scroll of ruled lines, the earliest of the two feeds. */
export function DrawerLogsGlyph({ size = 16, ...rest }) {
  return glyph(size, (
    <>
      <path d="M4.4 2.6h7.2a1.9 1.9 0 0 1 1.9 1.9v9.1H6.3a1.9 1.9 0 0 1-1.9-1.9Z" />
      <path d="M4.4 11.7a1.9 1.9 0 0 1 1.9-1.9h7.2v3.6H6.3a1.9 1.9 0 0 1-1.9-1.9Z" />
      <path d="M6.6 5.6h4.4M6.6 7.8h3" />
    </>
  ), rest);
}

/** Drawer Settings — the tuning rails, matching the nav gear's cousin. */
export function DrawerSettingsGlyph({ size = 16, ...rest }) {
  return glyph(size, (
    <>
      <path d="M2 4.5h3.2M8.4 4.5H14M2 11.5h3.2M8.4 11.5H14" />
      <circle cx="6.8" cy="4.5" r="1.55" />
      <circle cx="9.2" cy="11.5" r="1.55" />
    </>
  ), rest);
}

/** Drawer close — the app's own X, on the rail set rather than the library's. */
export function CloseGlyph({ size = 18, ...rest }) {
  return glyph(size, (
    <>
      <path d="M4.2 4.2 11.8 11.8M11.8 4.2 4.2 11.8" />
    </>
  ), rest);
}