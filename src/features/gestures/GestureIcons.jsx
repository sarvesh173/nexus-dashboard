import React from 'react';

/**
 * Custom bespoke SVG gesture icons with inline animation support.
 */

export function SwipeLeftGestureIcon({ size = 24, className = '', animate = true }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${animate ? 'gesture-icon-animate-left' : ''} ${className}`}
      aria-hidden="true"
    >
      {/* Dynamic speed motion trail particles */}
      <path
        d="M26 9H21M28 16H22M25 23H20"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeOpacity="0.4"
      />
      {/* Stylized Touch Hand / Directional Indicator */}
      <path
        d="M16 8L8 16L16 24"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="16" r="2.5" fill="currentColor" />
    </svg>
  );
}

export function SwipeRightGestureIcon({ size = 24, className = '', animate = true }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${animate ? 'gesture-icon-animate-right' : ''} ${className}`}
      aria-hidden="true"
    >
      {/* Speed trails */}
      <path
        d="M6 9H11M4 16H10M7 23H12"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeOpacity="0.4"
      />
      {/* Directional Chevron Pointer */}
      <path
        d="M16 8L24 16L16 24"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="24" cy="16" r="2.5" fill="currentColor" />
    </svg>
  );
}

export function GestureTwoWayIcon({ size = 20, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      <path d="M7 16l-4-4 4-4" />
      <path d="M17 8l4 4-4 4" />
      <path d="M3 12h18" strokeDasharray="3 3" />
    </svg>
  );
}

export function GestureTouchPillIcon({ size = 28, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      <rect x="6" y="16" width="24" height="4" rx="2" fill="currentColor" fillOpacity="0.85" />
      <circle cx="18" cy="18" r="8" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" strokeOpacity="0.5" />
    </svg>
  );
}
