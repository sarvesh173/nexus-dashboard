/**
 * NAVIGATION VISIBILITY FLAGS
 * ----------------------------
 * Flip any value to `true` to bring that button back. Nothing else to edit:
 * both the top segmented nav and the hamburger drawer read these flags, so a
 * hidden tab keeps its route, its icon animation and its markup — it just
 * drops out of the flex row with `display:none`, leaving no invisible gap
 * behind, and returns the moment you flip the flag.
 *
 *   SHOW_PLAYGROUND_IN_TOP_NAV   -> the "Playground" pill in the header row
 *   SHOW_COST_IN_TOP_NAV        -> the "Cost" pill in the header row
 *   SHOW_SETTINGS_IN_TOP_NAV    -> the "Settings" pill in the header row
 *
 * Everything switched off here still lives in the three-line drawer below.
 */
export const SHOW_PLAYGROUND_IN_TOP_NAV = false;
export const SHOW_COST_IN_TOP_NAV = false;
export const SHOW_SETTINGS_IN_TOP_NAV = false;

/** Which destinations live inside the hamburger (three-line) drawer. */
export const DRAWER_ITEMS = [
  { label: 'Overview', path: '/', icon: 'Activity' },
  { label: 'Models', path: '/model', icon: 'Boxes' },
  { label: 'Agents', path: '/agents', icon: 'Brain' },
  { label: 'Playground', path: '/playground', icon: 'Play' },
  { label: 'Cost', path: '/cost', icon: 'Coins' },
  // `live` marks the one destination that has a live feed behind it, so the
  // badge below is not hardcoded to one label and cannot drift out of sync
  // with the item it annotates.
  { label: 'Logs', path: '/logs', icon: 'ScrollText', live: true },
];

/**
 * Settings is the one destination that does not scroll.
 *
 * It is a required option, not one destination among many, and a reader who
 * has to scroll back down to reach it is being asked to hunt for it. So it is
 * pulled out of the scrolling list above and pinned to the drawer's bottom,
 * where it stays put no matter how many rows are above it.
 *
 * Keeping it here rather than hardcoding the path in NavDrawer means the
 * label, icon and route all still come from the one list that owns them.
 */
export const PINNED_DRAWER_ITEM = {
  label: 'Settings',
  path: '/settings',
  icon: 'Sliders',
};