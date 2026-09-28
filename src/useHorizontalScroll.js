import React, { useEffect } from 'react';

// Custom hook to turn vertical mouse wheel scrolling into horizontal scrolling on hover
export function useHorizontalScroll() {
  const elRef = React.useRef();
  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    const onWheel = (e) => {
      if (e.deltaY === 0) return;
      e.preventDefault();
      el.scrollTo({
        left: el.scrollLeft + e.deltaY * 2,
        behavior: 'smooth'
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);
  return elRef;
}
