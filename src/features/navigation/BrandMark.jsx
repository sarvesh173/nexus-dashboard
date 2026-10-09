/**
 * Shared SVG marks for the Nexus shell.
 *
 * These are the app's own icons, not a library's. The three-line mark started
 * life inline in NavDrawer and every other surface that needed it grew its own
 * copy, which is how a mark drifts out of sync across the app. One definition,
 * imported wherever a mark is needed, keeps them identical by construction.
 */

/**
 * The three-line hamburger mark.
 *
 * The lines are full-width rails rather than three centred dashes of differing
 * lengths: a real hamburger reads as a stack of rails, and equal lengths keep
 * the fan symmetric when the group rotates on hover. Each rail is a thin
 * vertical gradient so it picks up a top light edge, matching the milled
 * hardware elsewhere in the app.
 *
 * Gradient ids are instance-scoped because SVG ids are document-global —
 * two marks on one page with the same id would silently share the first one.
 */
export function ThreeLineMark({
  size = 20,
  className = '',
  lineClassName = 'ham-line',
  decorative = true,
}) {
  const uid = `tlm-${Math.random().toString(36).slice(2, 9)}`;
  const topId = `${uid}-top`;
  const midId = `${uid}-mid`;
  const botId = `${uid}-bot`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden={decorative ? 'true' : undefined}
      role={decorative ? undefined : 'img'}
      focusable="false"
      className={className}
    >
      <defs>
        <linearGradient id={topId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" className="ham-metal-top" />
          <stop offset="100%" className="ham-metal-top" stopOpacity="0.72" />
        </linearGradient>
        <linearGradient id={midId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" className="ham-metal-mid" />
          <stop offset="100%" className="ham-metal-mid" stopOpacity="0.72" />
        </linearGradient>
        <linearGradient id={botId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" className="ham-metal-bot" />
          <stop offset="100%" className="ham-metal-bot" stopOpacity="0.72" />
        </linearGradient>
      </defs>
      <rect className={`${lineClassName} ham-line-top`} x="2.4" y="5.6" width="15.2" height="1.9" rx="0.35" fill={`url(#${topId})`} />
      <rect className={`${lineClassName} ham-line-mid`} x="3.8" y="9.05" width="12.4" height="1.9" rx="0.35" fill={`url(#${midId})`} />
      <rect className={`${lineClassName} ham-line-bot`} x="2.4" y="12.5" width="15.2" height="1.9" rx="0.35" fill={`url(#${botId})`} />
    </svg>
  );
}