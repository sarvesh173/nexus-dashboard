import React from 'react';

/**
 * System-grade Gesture SVG Icons (Material 3 & Apple HIG).
 * Features:
 * - Crisp optical curves with balanced stroke weight
 * - Rounded geometric terminal caps (stroke-linecap: round, stroke-linejoin: round)
 * - Cohesive proportions matching modern mobile operating systems
 */

export function M3GestureArrowLeft({ size = 20, className = '', animate = true }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${animate ? 'gesture-icon-slide-left' : ''} ${className}`}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" fill="currentColor" fillOpacity="0.12" />
      <path
        d="M14.5 16.5L10 12L14.5 7.5"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.5 12H17"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function M3GestureArrowRight({ size = 20, className = '', animate = true }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${animate ? 'gesture-icon-slide-right' : ''} ${className}`}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" fill="currentColor" fillOpacity="0.12" />
      <path
        d="M9.5 7.5L14 12L9.5 16.5"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.5 12H7"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function M3DrawerMenuGestureIcon({ size = 22, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform duration-250 ease-out group-hover:scale-110 group-active:scale-80 ${className}`}
      aria-hidden="true"
    >
      <rect x="3" y="6" width="12" height="2.2" rx="1.1" fill="currentColor" className="transition-all duration-200 group-hover:translate-x-0.5" />
      <rect x="3" y="11" width="16" height="2.2" rx="1.1" fill="currentColor" className="transition-all duration-200 group-hover:translate-x-1" />
      <rect x="3" y="16" width="10" height="2.2" rx="1.1" fill="currentColor" className="transition-all duration-200 group-hover:translate-x-0.5" />
      {/* Reveal arrow indicating swipe-to-open gesture */}
      <path
        d="M16 8.5L19.5 12L16 15.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="transition-transform duration-200 group-hover:translate-x-1 group-active:translate-x-1.5"
      />
    </svg>
  );
}

export function M3HomeIndicatorPill({ className = '' }) {
  return (
    <svg
      width="44"
      height="5"
      viewBox="0 0 44 5"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      <rect width="44" height="5" rx="2.5" fill="currentColor" fillOpacity="0.5" />
    </svg>
  );
}

// Aliases for compatibility
export {
  M3GestureArrowLeft as SwipeLeftGestureIcon,
  M3GestureArrowRight as SwipeRightGestureIcon,
};
