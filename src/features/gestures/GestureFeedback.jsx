import React from 'react';
import { SwipeLeftGestureIcon, SwipeRightGestureIcon } from './GestureIcons.jsx';

/**
 * Floating feedback HUD displayed when a swipe gesture is executed.
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
      <div className="gesture-badge-feedback flex items-center gap-2.5 px-4 py-2 rounded-full bg-[var(--md-sys-color-surface-container-highest)]/95 text-[var(--md-sys-color-on-surface)] border border-[var(--md-sys-color-outline-variant)]/80 shadow-[0_8px_30px_rgba(0,0,0,0.35)] backdrop-blur-md text-xs font-medium">
        {direction === 'left' ? (
          <>
            <span className="text-[var(--md-sys-color-primary)]">
              <SwipeLeftGestureIcon size={18} animate={true} />
            </span>
            <span>Switched to <strong className="text-[var(--md-sys-color-primary)] font-semibold">{targetTitle}</strong></span>
          </>
        ) : (
          <>
            <span>Switched to <strong className="text-[var(--md-sys-color-primary)] font-semibold">{targetTitle}</strong></span>
            <span className="text-[var(--md-sys-color-primary)]">
              <SwipeRightGestureIcon size={18} animate={true} />
            </span>
          </>
        )}
      </div>
    </div>
  );
}
