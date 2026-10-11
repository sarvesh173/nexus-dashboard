import React from 'react';
import { M3GestureArrowLeft, M3GestureArrowRight, M3DrawerMenuGestureIcon } from './GestureIcons.jsx';

/**
 * Elevated Gesture Feedback HUD (Apple Dynamic Island / M3 Floating Capsule).
 * Provides responsive, fluid visual feedback when a gesture occurs.
 */
export function GestureFeedback({ gestureState }) {
  if (!gestureState || !gestureState.visible) return null;

  const { direction, targetTitle, exiting } = gestureState;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-14 sm:bottom-12 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
    >
      <div
        className={`${
          exiting ? 'gesture-badge-feedback-exit' : 'gesture-badge-feedback'
        } flex items-center gap-2.5 px-4 py-2 rounded-full nexus-gesture-pill-surface text-[var(--md-sys-color-on-surface)] text-xs font-medium tracking-tight`}
      >
        {direction === 'drawer' ? (
          <>
            <span className="text-[var(--md-sys-color-primary)]">
              <M3DrawerMenuGestureIcon size={18} />
            </span>
            <span>
              Opened{' '}
              <strong className="text-[var(--md-sys-color-primary)] font-semibold">
                Navigation Menu
              </strong>
            </span>
          </>
        ) : direction === 'left' ? (
          <>
            <span className="text-[var(--md-sys-color-primary)]">
              <M3GestureArrowLeft size={18} animate={true} />
            </span>
            <span>
              Switched to{' '}
              <strong className="text-[var(--md-sys-color-primary)] font-semibold">
                {targetTitle}
              </strong>
            </span>
          </>
        ) : (
          <>
            <span>
              Switched to{' '}
              <strong className="text-[var(--md-sys-color-primary)] font-semibold">
                {targetTitle}
              </strong>
            </span>
            <span className="text-[var(--md-sys-color-primary)]">
              <M3GestureArrowRight size={18} animate={true} />
            </span>
          </>
        )}
      </div>
    </div>
  );
}
