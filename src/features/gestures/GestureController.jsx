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

function resolveRouteIndex(pathname) {
  if (pathname === '/' || pathname === '/overview') return 0;
  if (
    pathname.startsWith('/model') ||
    pathname.startsWith('/models') ||
    pathname.startsWith('/modules')
  ) {
    return 1;
  }
  if (pathname.startsWith('/agent')) return 2;
  if (pathname.startsWith('/log')) return 3;
  if (pathname.startsWith('/cost') || pathname.startsWith('/settings')) return 0;
  return 1; // Resilient fallback: Models
}

/**
 * Universal System Gesture Controller (Apple HIG & Material 3 Fluid Motion).
 * Features:
 * - Auto-hiding gesture guide pill (auto-dismisses after 2.6s, re-awakens on touch)
 * - Fluid spatial page transitions with spring deceleration
 * - Apple Dynamic Island style gesture HUD toast
 */
export function GestureController() {
  const navigate = useNavigate();
  const location = useLocation();
  const [feedback, setFeedback] = useState({
    visible: false,
    direction: 'left',
    targetTitle: '',
    exiting: false,
  });
  const [barVisible, setBarVisible] = useState(true);

  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });
  const feedbackTimerRef = useRef(null);
  const feedbackExitTimerRef = useRef(null);
  const barTimerRef = useRef(null);

  const currentIndex = resolveRouteIndex(location.pathname);

  // Wakes the gesture guide bar and starts an auto-hide countdown
  const wakeBar = useCallback((duration = 2600) => {
    setBarVisible(true);
    if (barTimerRef.current) clearTimeout(barTimerRef.current);
    barTimerRef.current = setTimeout(() => {
      setBarVisible(false);
    }, duration);
  }, []);

  const showFeedback = useCallback((direction, targetTitle) => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    if (feedbackExitTimerRef.current) clearTimeout(feedbackExitTimerRef.current);

    setFeedback({ visible: true, direction, targetTitle, exiting: false });

    // Initiate fluid exit after 800ms
    feedbackExitTimerRef.current = setTimeout(() => {
      setFeedback((prev) => ({ ...prev, exiting: true }));
    }, 800);

    // Completely unmount HUD after exit animation finishes
    feedbackTimerRef.current = setTimeout(() => {
      setFeedback((prev) => ({ ...prev, visible: false, exiting: false }));
    }, 1080);
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
    wakeBar(2600);
  }, [showFeedback, wakeBar]);

  const handleSwipe = useCallback(
    (direction) => {
      wakeBar(2600);
      if (direction === 'left') {
        // Continuous circular loop navigation: Logs -> Overview
        const nextIdx = (currentIndex + 1) % SWIPE_ROUTES.length;
        const nextRoute = SWIPE_ROUTES[nextIdx];
        triggerPageTransition('left');
        navigate(nextRoute.path);
        showFeedback('left', nextRoute.title);
      } else if (direction === 'right') {
        // Continuous circular loop navigation: Overview -> Logs
        const prevIdx = (currentIndex - 1 + SWIPE_ROUTES.length) % SWIPE_ROUTES.length;
        const prevRoute = SWIPE_ROUTES[prevIdx];
        triggerPageTransition('right');
        navigate(prevRoute.path);
        showFeedback('right', prevRoute.title);
      }
    },
    [currentIndex, navigate, showFeedback, triggerPageTransition, wakeBar]
  );

  // Activity listeners to auto-dismiss gesture bar after inactivity
  useEffect(() => {
    // Initial auto-hide timer on mount
    barTimerRef.current = setTimeout(() => {
      setBarVisible(false);
    }, 2600);

    const onUserActivity = () => {
      wakeBar(2600);
    };

    window.addEventListener('touchstart', onUserActivity, { passive: true });
    window.addEventListener('scroll', onUserActivity, { passive: true });

    return () => {
      window.removeEventListener('touchstart', onUserActivity);
      window.removeEventListener('scroll', onUserActivity);
      if (barTimerRef.current) clearTimeout(barTimerRef.current);
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
      if (feedbackExitTimerRef.current) clearTimeout(feedbackExitTimerRef.current);
    };
  }, [wakeBar]);

  // Touch gesture detection
  useEffect(() => {
    const onStart = (clientX, clientY) => {
      touchStartRef.current = { x: clientX, y: clientY, time: Date.now() };
    };

    const onEnd = (clientX, clientY, target) => {
      const dx = clientX - touchStartRef.current.x;
      const dy = clientY - touchStartRef.current.y;
      const dt = Date.now() - touchStartRef.current.time;
      const startX = touchStartRef.current.x;

      // Relaxed travel thresholds: 35px is enough to register a deliberate flick
      if (dt > 900) return;
      if (Math.abs(dx) < 35) return;
      if (Math.abs(dx) < Math.abs(dy) * 1.1) return;

      // Only skip if user is actively typing in an input
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        if (document.activeElement === target) return;
      }

      // 1. If Drawer is open, swipe left anywhere closes it
      const isDrawerOpen = !!document.querySelector(
        '[data-testid="nav-drawer-panel"].translate-x-0'
      );
      if (isDrawerOpen) {
        if (dx < -30) {
          window.dispatchEvent(new CustomEvent('nexus:close-drawer'));
        }
        return;
      }

      // 2. Edge swipe from left / 3-lines menu swipe right -> Open Drawer
      if (startX < 75 && dx > 35) {
        openDrawer();
        return;
      }

      // 3. Main views swipe navigation
      if (dx < 0) {
        handleSwipe('left');
      } else {
        handleSwipe('right');
      }
    };

    const handleTouchStart = (e) => {
      if (!e.touches || e.touches.length !== 1) return;
      onStart(e.touches[0].clientX, e.touches[0].clientY);
    };

    const handleTouchEnd = (e) => {
      if (!e.changedTouches || e.changedTouches.length !== 1) return;
      onEnd(e.changedTouches[0].clientX, e.changedTouches[0].clientY, e.target);
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleSwipe, openDrawer]);

  return (
    <>
      <GestureFeedback gestureState={feedback} />

      {/* Auto-Hiding Tactile Gesture Guide Bar */}
      <aside
        aria-label="Gesture navigation bar"
        className={`fixed bottom-0 inset-x-0 z-40 flex justify-center pb-[max(env(safe-area-inset-bottom),8px)] pt-1 nexus-gesture-bar-container ${
          barVisible ? 'nexus-gesture-bar-visible' : 'nexus-gesture-bar-hidden'
        }`}
      >
        <div className="pointer-events-auto flex items-center gap-2 px-3.5 py-1.5 rounded-full nexus-gesture-pill-surface shadow-lg backdrop-blur-2xl">
          {/* Quick Drawer trigger */}
          <button
            type="button"
            onClick={openDrawer}
            title="Open Menu Drawer"
            aria-label="Open Menu Drawer"
            className="text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-primary)] active:scale-90 transition-all p-0.5 cursor-pointer"
          >
            <M3DrawerMenuGestureIcon size={16} />
          </button>

          <button
            type="button"
            onClick={() => handleSwipe('right')}
            title={`Swipe right to ${SWIPE_ROUTES[(currentIndex - 1 + SWIPE_ROUTES.length) % SWIPE_ROUTES.length]?.title}`}
            aria-label={`Swipe right to ${SWIPE_ROUTES[(currentIndex - 1 + SWIPE_ROUTES.length) % SWIPE_ROUTES.length]?.title}`}
            className="text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-primary)] active:scale-90 transition-all p-0.5 cursor-pointer"
          >
            <M3GestureArrowLeft size={16} animate={false} />
          </button>

          {/* Central tactile gesture home pill indicator */}
          <div
            className="w-9 h-1.5 rounded-full bg-[var(--md-sys-color-on-surface-variant)]/35 hover:bg-[var(--md-sys-color-primary)]/70 transition-colors"
            title="Swipe left or right to navigate"
          />

          <button
            type="button"
            onClick={() => handleSwipe('left')}
            title={`Swipe left to ${SWIPE_ROUTES[(currentIndex + 1) % SWIPE_ROUTES.length]?.title}`}
            aria-label={`Swipe left to ${SWIPE_ROUTES[(currentIndex + 1) % SWIPE_ROUTES.length]?.title}`}
            className="text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-primary)] active:scale-90 transition-all p-0.5 cursor-pointer"
          >
            <M3GestureArrowRight size={16} animate={false} />
          </button>
        </div>
      </aside>
    </>
  );
}
