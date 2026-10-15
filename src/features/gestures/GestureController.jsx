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

  // Serial navigation queue: one swipe navigates, waits for the route to
  // actually load, then the next queued direction goes. Without this, a
  // burst of rapid swipes fires every navigate() back-to-back and the page
  // machine-guns through routes (Logs -> Overview -> ...). Each navigation
  // also gets a small pre-delay so the transition reads as intentional.
  const navQueueRef = useRef([]);
  const navBusyRef = useRef(false);
  const pendingPathRef = useRef(null);
  const settleTimerRef = useRef(null);

  // Triple-swipe activation: gesture navigation stays OFF until the user
  // deliberately completes the sequence.
  //   swipe 1 → nothing (must be intentional)
  //   swipe 2 → feedback popup only, still no navigation
  //   swipe 3 → navigates
  // One minute after the first swipe the controller resets to OFF, so an
  // accidental swipe can never activate the feature on its own.
  // Ref (not state) so the touch handler always reads the live stage — a
  // state dep in the listener effect would go stale between rapid swipes.
  const armStageRef = useRef(0); // 0=off, 1=first seen, 2=second seen
  const armResetTimerRef = useRef(null);
  // On Logs the rows slide horizontally for provider inspection, so gestures
  // are disabled for a few seconds after landing there.
  const logsBlockUntilRef = useRef(0);

  const ARM_RESET_MS = 60000; // auto-disable one minute after the first swipe
  const LOGS_BLOCK_MS = 6000; // gestures suppressed this long after landing on Logs

  const resetArm = useCallback(() => {
    armStageRef.current = 0;
    if (armResetTimerRef.current) {
      clearTimeout(armResetTimerRef.current);
      armResetTimerRef.current = null;
    }
  }, []);

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

  const targetPathFor = useCallback(
    (direction) => {
      if (direction === 'left') {
        return SWIPE_ROUTES[(currentIndex + 1) % SWIPE_ROUTES.length].path;
      }
      return SWIPE_ROUTES[(currentIndex - 1 + SWIPE_ROUTES.length) % SWIPE_ROUTES.length].path;
    },
    [currentIndex]
  );

  // One navigation at a time: pre-delay for intentionality, wait for the
  // route to actually change (settle) before the next queued direction goes.
  // A burst of rapid swipes therefore reads as deliberate steps, not a
  // machine-gun through the routes.
  const NAV_PRE_DELAY = 320; // ms before the first queued navigation fires
  const NAV_SETTLE_GAP = 260; // ms pause between one route loading and the next
  const NAV_SETTLE_TIMEOUT = 1200; // ms safety: unblock even if the route never matches

  const settleNavigation = useCallback(() => {
    pendingPathRef.current = null;
    navBusyRef.current = false;
    if (settleTimerRef.current) {
      clearTimeout(settleTimerRef.current);
      settleTimerRef.current = null;
    }
    setTimeout(() => processQueue(), NAV_SETTLE_GAP);
  }, []);

  const processQueue = useCallback(() => {
    if (navBusyRef.current) return;
    const direction = navQueueRef.current.shift();
    if (!direction) return;
    navBusyRef.current = true;
    wakeBar(2600);
    const path = targetPathFor(direction);
    // Swiping towards the route we are already on: nothing to navigate,
    // settle immediately and hand over to the next queued direction.
    if (path === location.pathname) {
      settleNavigation();
      return;
    }
    pendingPathRef.current = path;
    settleTimerRef.current = setTimeout(settleNavigation, NAV_SETTLE_TIMEOUT);
    setTimeout(() => {
      triggerPageTransition(direction);
      navigate(path);
      // Landing on Logs: suppress gestures briefly so horizontal row
      // sliding (provider inspection) is never stolen by a navigation.
      if (path.startsWith('/log')) {
        logsBlockUntilRef.current = Date.now() + LOGS_BLOCK_MS;
      }
      const title =
        direction === 'left'
          ? SWIPE_ROUTES[(currentIndex + 1) % SWIPE_ROUTES.length]?.title
          : SWIPE_ROUTES[(currentIndex - 1 + SWIPE_ROUTES.length) % SWIPE_ROUTES.length]?.title;
      showFeedback(direction, title);
    }, NAV_PRE_DELAY);
  }, [currentIndex, location.pathname, navigate, showFeedback, triggerPageTransition, wakeBar, targetPathFor, settleNavigation]);

  // When the pending route actually loads, the queue may advance.
  useEffect(() => {
    if (pendingPathRef.current && location.pathname === pendingPathRef.current) {
      settleNavigation();
    }
  }, [location.pathname, settleNavigation]);

  const handleSwipe = useCallback(
    (direction) => {
      // Queue instead of navigating immediately. Consecutive duplicates are
      // dropped so a burst of identical swipes cannot pile up in the queue.
      const queued = navQueueRef.current;
      if (queued[queued.length - 1] !== direction) {
        queued.push(direction);
      }
      processQueue();
    },
    [processQueue]
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
      if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
      if (armResetTimerRef.current) clearTimeout(armResetTimerRef.current);
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

      // Route-sensitive strength: Logs rows are horizontally slideable (model /
      // provider inspection), so a normal-strength swipe there steals the
      // gesture mid-scroll and drops the user on the Models page. Logs runs
      // at 50% strength; every other route at 100%.
      const swipeStrength = currentIndex === 3 ? 0.5 : 1.0; // 3 = Logs
      const minTravel = 35 / swipeStrength;

      if (Math.abs(dx) < minTravel) return;
      if (Math.abs(dx) < Math.abs(dy) * (1.1 / swipeStrength)) return;

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

      // 2b. Logs just got here: suppress gestures for a few seconds so the
      // user can slide rows horizontally without stealing navigations.
      if (currentIndex === 3 && Date.now() < logsBlockUntilRef.current) return;

      // 3. Main views swipe navigation — triple-swipe activation.
      //    Swipe 1: nothing happens (must be deliberate). Swipe 2: the
      //    feedback popup animates in, still no navigation. Swipe 3: the
      //    navigation fires. One minute after the first swipe the whole
      //    sequence resets, so an accidental swipe can never arm it.
      if (armStageRef.current === 0) {
        // First swipe: completely silent — no bar wake, no popup, no
        // animation. Nothing indicates the feature exists until the user
        // deliberately swipes a second time.
        armStageRef.current = 1;
        if (armResetTimerRef.current) clearTimeout(armResetTimerRef.current);
        armResetTimerRef.current = setTimeout(() => { armStageRef.current = 0; }, ARM_RESET_MS);
        return;
      }
      if (armStageRef.current === 1) {
        // Second swipe: the hint popup appears — direction text with an
        // animated arrow ("Left and slide" / "Right and slide"). Still no
        // navigation: one more swipe is needed.
        armStageRef.current = 2;
        showFeedback(dx < 0 ? 'left' : 'right', null);
        armResetTimerRef.current = setTimeout(() => { armStageRef.current = 0; }, ARM_RESET_MS);
        return;
      }
      // armStageRef.current === 2 → third swipe navigates, then the controller resets.
      resetArm();
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
