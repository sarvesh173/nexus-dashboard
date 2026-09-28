import React, { useEffect } from 'react';

// Custom hook to turn vertical mouse wheel scrolling into instant horizontal scrolling on hover
export function useHorizontalScroll() {
  const elRef = React.useRef(null);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;

    const onWheel = (e) => {
      // If user scrolls mouse wheel vertically (deltaY != 0)
      if (Math.abs(e.deltaY) > 0) {
        e.preventDefault();
        // Instant left/right scroll without stuttering or smooth lag
        el.scrollLeft += e.deltaY * 1.5;
      }
    };

    // passive: false is mandatory to prevent default vertical scroll and glide horizontally
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  return elRef;
}
