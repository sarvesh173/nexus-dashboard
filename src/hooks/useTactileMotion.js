import { useEffect } from 'react';

const INTERACTIVE_SELECTOR = 'button:not([data-tactile-ignore]), [role="button"], [data-modality-pill]';
const ACTIVE_MS = 2600;

function closestInteractive(target) {
  if (!(target instanceof Element)) return null;
  const control = target.closest(INTERACTIVE_SELECTOR);
  if (!control || control.matches('.nav-tab')) return null;
  if (control.matches(':disabled') || control.getAttribute('aria-disabled') === 'true') return null;
  return control;
}

/**
 * Adds one delegated, pointer/keyboard-parity motion session to every control.
 *
 * The DOM attribute is intentional: interaction state is transient visual state,
 * not application state. Keeping it out of React prevents a whole dashboard
 * render for a 2.6 second icon cycle and means controls added by a feature are
 * covered automatically. CSS owns the four-stage SVG choreography and returns
 * the control to its pristine state when the attribute expires.
 */
export function useTactileMotion() {
  useEffect(() => {
    const timers = new Set();
    const timeoutByElement = new WeakMap();

    const activate = (control) => {
      if (!control) return;
      const previous = timeoutByElement.get(control);
      if (previous) {
        window.clearTimeout(previous);
        timers.delete(previous);
      }

      control.dataset.tactileActive = 'true';
      control.dataset.tactilePulse = String(Number(control.dataset.tactilePulse || 0) + 1);
      if (!control.dataset.motionCycle) control.dataset.motionCycle = 'control';

      const timer = window.setTimeout(() => {
        delete control.dataset.tactileActive;
        timeoutByElement.delete(control);
        timers.delete(timer);
      }, ACTIVE_MS);
      timeoutByElement.set(control, timer);
      timers.add(timer);
    };

    const onPointerOver = (event) => {
      const control = closestInteractive(event.target);
      if (!control || (event.relatedTarget instanceof Node && control.contains(event.relatedTarget))) return;
      activate(control);
    };

    const onFocusIn = (event) => activate(closestInteractive(event.target));
    const onClick = (event) => activate(closestInteractive(event.target));
    const onKeyDown = (event) => {
      if (event.key === 'Enter' || event.key === ' ') activate(closestInteractive(event.target));
    };

    document.addEventListener('pointerover', onPointerOver, true);
    document.addEventListener('focusin', onFocusIn, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKeyDown, true);

    return () => {
      document.removeEventListener('pointerover', onPointerOver, true);
      document.removeEventListener('focusin', onFocusIn, true);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('keydown', onKeyDown, true);
      timers.forEach((timer) => window.clearTimeout(timer));
      timers.clear();
    };
  }, []);
}

export default useTactileMotion;
