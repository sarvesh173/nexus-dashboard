import React from 'react';
import { M3GestureArrowLeft, M3GestureArrowRight, M3DrawerMenuGestureIcon } from './GestureIcons.jsx';

/**
 * Floating feedback HUD displayed when a swipe gesture is executed.
 * Follows Material 3 motion and state surface guidelines.
 */
export function GestureFeedback({ gestureState }) {
  if (!gestureState || !gestureState.visible) return null;

  const { direction, targetTitle } = gestureState;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-14 sm:bottom-10 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
    >
      <div className="gesture-badge-feedback flex items-center gap-2.5 px-4 py-2 rounded-full bg-[var(--md-sys-color-surface-container-high)]/95 text-[var(--md-sys-color-on-surface)] border border-[var(--md-sys-color-outline-variant)]/80 shadow-[0_12px_36px_rgba(0,0,0,0.35)] backdrop-blur-xl text-xs font-medium">
        {direction === 'drawer' ? (
          <>
            <span className="text-[var(--md-sys-color-primary)]">
              <M3DrawerMenuGestureIcon size={18} />
            </span>
            <span>Opened <strong className="text-[var(--md-sys-color-primary)] font-semibold">Navigation Menu</strong></span>
          </>
        ) : direction === 'left' ? (
          <>
            <span className="text-[var(--md-sys-color-primary)]">
              <M3GestureArrowLeft size={18} animate={true} />
            </span>
            <span>Switched to <strong className="text-[var(--md-sys-color-primary)] font-semibold">{targetTitle}</strong></span>
          </>
        ) : (
          <>
            <span>Switched to <strong className="text-[var(--md-sys-color-primary)] font-semibold">{targetTitle}</strong></span>
            <span className="text-[var(--md-sys-color-primary)]">
              <M3GestureArrowRight size={18} animate={true} />
            </span>
          </>
        )}
      </div>
    </div>
  );
}
