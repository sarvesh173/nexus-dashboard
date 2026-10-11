import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { GestureFeedback } from './GestureFeedback.jsx';
import { SwipeLeftGestureIcon, SwipeRightGestureIcon } from './GestureIcons.jsx';
import './gestures.css';

const SWIPE_ROUTES = [
  { path: '/', title: 'Overview' },
  { path: '/model', title: 'Models' },
  { path: '/agents', title: 'Agents' },
  { path: '/logs', title: 'Logs' },
];

/**
 * Mobile-native touch gesture controller for switching main views.
 * Supports smooth horizontal swipe navigation with animated feedback.
 */
export function GestureController() {
  const navigate = useNavigate();
  const location = useLocation();
  const [feedback, setFeedback] = useState({ visible: false, direction: 'left', targetTitle: '' });
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });
  const feedbackTimerRef = useRef(null);

  const currentIndex = SWIPE_ROUTES.findIndex((r) => r.path === location.pathname);

  const showFeedback = useCallback((direction, targetTitle) => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    setFeedback({ visible: true, direction, targetTitle });
    feedbackTimerRef.current = setTimeout(() => {
      setFeedback((prev) => ({ ...prev, visible: false }));
    }, 1300);
  }, []);

  const handleSwipe = useCallback((direction) => {
    if (currentIndex === -1) return;

    if (direction === 'left' && currentIndex < SWIPE_ROUTES.length - 1) {
      const nextRoute = SWIPE_ROUTES[currentIndex + 1];
      navigate(nextRoute.path);
      showFeedback('left', nextRoute.title);
    } else if (direction === 'right' && currentIndex > 0) {
      const prevRoute = SWIPE_ROUTES[currentIndex - 1];
      navigate(prevRoute.path);
      showFeedback('right', prevRoute.title);
    }
  }, [currentIndex, navigate, showFeedback]);

  useEffect(() => {
    const onTouchStart = (e) => {
      if (!e.touches || e.touches.length !== 1) return;
      const t = e.touches[0];
      touchStartRef.current = { x: t.clientX, y: t.clientY, time: Date.now() };
    };

    const onTouchEnd = (e) => {
      if (!e.changedTouches || e.changedTouches.length !== 1) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStartRef.current.x;
      const dy = t.clientY - touchStartRef.current.y;
      const dt = Date.now() - touchStartRef.current.time;

      // Ignore slow drags (>600ms) or short moves (<50px)
      if (dt > 600) return;
      if (Math.abs(dx) < 55) return;

      // Require clear horizontal intent over vertical scroll
      if (Math.abs(dx) < Math.abs(dy) * 1.4) return;

      // Don't trigger if swiping inside interactive elements
      const target = e.target;
      if (target && target.closest && target.closest('input, textarea, pre, code, [data-prevent-swipe]')) {
        return;
      }

      if (dx < 0) {
        handleSwipe('left');
      } else {
        handleSwipe('right');
      }
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    };
  }, [handleSwipe]);

  if (currentIndex === -1) return null;

  const canGoLeft = currentIndex > 0;
  const canGoRight = currentIndex < SWIPE_ROUTES.length - 1;

  return (
    <>
      <GestureFeedback gestureState={feedback} />

      {/* Bottom tactile gesture guide pill (visible on mobile / touch viewports) */}
      <aside
        aria-label="Gesture navigation bar"
        className="fixed bottom-0 inset-x-0 z-40 flex justify-center pointer-events-none pb-[max(env(safe-area-inset-bottom),8px)] pt-1"
      >
        <div className="pointer-events-auto flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--md-sys-color-surface-container)]/75 border border-[var(--md-sys-color-outline-variant)]/40 shadow-sm backdrop-blur-md opacity-75 hover:opacity-100 transition-opacity">
          {canGoLeft && (
            <button
              type="button"
              onClick={() => handleSwipe('right')}
              title={`Swipe right to ${SWIPE_ROUTES[currentIndex - 1]?.title}`}
              aria-label={`Swipe right to ${SWIPE_ROUTES[currentIndex - 1]?.title}`}
              className="text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-primary)] active:scale-95 transition-all p-0.5"
            >
              <SwipeLeftGestureIcon size={16} animate={false} />
            </button>
          )}

          {/* Central gesture touch indicator pill */}
          <div className="w-8 h-1 rounded-full bg-[var(--md-sys-color-on-surface-variant)]/40" />

          {canGoRight && (
            <button
              type="button"
              onClick={() => handleSwipe('left')}
              title={`Swipe left to ${SWIPE_ROUTES[currentIndex + 1]?.title}`}
              aria-label={`Swipe left to ${SWIPE_ROUTES[currentIndex + 1]?.title}`}
              className="text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-primary)] active:scale-95 transition-all p-0.5"
            >
              <SwipeRightGestureIcon size={16} animate={false} />
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
