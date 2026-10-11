import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { GestureFeedback } from './GestureFeedback.jsx';
import {
  M3GestureArrowLeft,
  M3GestureArrowRight,
  M3DrawerMenuGestureIcon,
} from './GestureIcons.jsx';
import './gestures.css';

const SWIPE_ROUTES = [
  { path: '/', title: 'Overview' },
  { path: '/model', title: 'Models' },
  { path: '/agents', title: 'Agents' },
  { path: '/logs', title: 'Logs' },
];

/**
 * System Gesture Controller (Material 3 Motion).
 * Supports:
 * - Edge swipe / 3-lines swipe to open Navigation Drawer
 * - Horizontal swipe between main destinations with fluid page transition animation
 * - Mobile tactile bottom indicator bar
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

  const triggerPageTransition = useCallback((direction) => {
    const mainEl = document.querySelector('main');
    if (mainEl) {
      mainEl.classList.remove('page-swipe-transition-left', 'page-swipe-transition-right');
      void mainEl.offsetWidth; // Force reflow
      mainEl.classList.add(
        direction === 'left' ? 'page-swipe-transition-left' : 'page-swipe-transition-right'
      );
    }
  }, []);

  const openDrawer = useCallback(() => {
    window.dispatchEvent(new CustomEvent('nexus:open-drawer'));
    showFeedback('drawer', 'Navigation Menu');
  }, [showFeedback]);

  const handleSwipe = useCallback((direction) => {
    if (currentIndex === -1) return;

    if (direction === 'left' && currentIndex < SWIPE_ROUTES.length - 1) {
      const nextRoute = SWIPE_ROUTES[currentIndex + 1];
      triggerPageTransition('left');
      navigate(nextRoute.path);
      showFeedback('left', nextRoute.title);
    } else if (direction === 'right' && currentIndex > 0) {
      const prevRoute = SWIPE_ROUTES[currentIndex - 1];
      triggerPageTransition('right');
      navigate(prevRoute.path);
      showFeedback('right', prevRoute.title);
    }
  }, [currentIndex, navigate, showFeedback, triggerPageTransition]);

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
      const startX = touchStartRef.current.x;

      // Relaxed duration & distance thresholds
      if (dt > 800) return;
      if (Math.abs(dx) < 40) return;
      if (Math.abs(dx) < Math.abs(dy) * 1.15) return;

      // Avoid hijacking active inputs
      const target = e.target;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      // If Navigation Drawer is open, swipe left anywhere closes it
      const isDrawerOpen = !!document.querySelector('[data-testid="nav-drawer-panel"].translate-x-0');
      if (isDrawerOpen) {
        if (dx < -35) {
          window.dispatchEvent(new CustomEvent('nexus:close-drawer'));
        }
        return;
      }

      // 1. Edge swipe from left / 3-lines menu swipe right -> Open Drawer
      if (startX < 75 && dx > 40) {
        openDrawer();
        return;
      }

      // 2. Normal view swipe navigation
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
  }, [handleSwipe, openDrawer]);

  if (currentIndex === -1) return null;

  const canGoLeft = currentIndex > 0;
  const canGoRight = currentIndex < SWIPE_ROUTES.length - 1;

  return (
    <>
      <GestureFeedback gestureState={feedback} />

      {/* Bottom tactile gesture guide pill (Material 3 elevated surface) */}
      <aside
        aria-label="Gesture navigation bar"
        className="fixed bottom-0 inset-x-0 z-40 flex justify-center pointer-events-none pb-[max(env(safe-area-inset-bottom),8px)] pt-1"
      >
        <div className="pointer-events-auto flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--md-sys-color-surface-container)]/85 border border-[var(--md-sys-color-outline-variant)]/60 shadow-md backdrop-blur-xl opacity-80 hover:opacity-100 transition-opacity">
          {/* Quick Drawer trigger */}
          <button
            type="button"
            onClick={openDrawer}
            title="Open Menu Drawer"
            aria-label="Open Menu Drawer"
            className="text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-primary)] active:scale-90 transition-all p-0.5"
          >
            <M3DrawerMenuGestureIcon size={16} />
          </button>

          {canGoLeft && (
            <button
              type="button"
              onClick={() => handleSwipe('right')}
              title={`Swipe right to ${SWIPE_ROUTES[currentIndex - 1]?.title}`}
              aria-label={`Swipe right to ${SWIPE_ROUTES[currentIndex - 1]?.title}`}
              className="text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-primary)] active:scale-90 transition-all p-0.5"
            >
              <M3GestureArrowLeft size={16} animate={false} />
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
              className="text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-primary)] active:scale-90 transition-all p-0.5"
            >
              <M3GestureArrowRight size={16} animate={false} />
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
