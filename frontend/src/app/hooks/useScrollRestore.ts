import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router';

/**
 * Custom hook to reliably record and restore scroll positions across navigation
 * (e.g. browsing a task list -> viewing task detail -> going back without losing scroll position).
 */
export function useScrollRestore(pageKey?: string, isReady = true) {
  const location = useLocation();
  const key = pageKey || location.pathname;
  const storageKey = `snap_scroll_${key}`;
  const restoredRef = useRef(false);

  // Restore scroll position once data/DOM is ready
  useLayoutEffect(() => {
    if (!isReady || restoredRef.current) return;

    const saved = sessionStorage.getItem(storageKey);
    if (saved !== null) {
      const targetY = parseInt(saved, 10);
      if (!isNaN(targetY) && targetY > 0) {
        // Try restoring immediately
        window.scrollTo({ top: targetY, behavior: 'instant' });

        // Also retry in next frame to handle layout settling
        const frameId = requestAnimationFrame(() => {
          window.scrollTo({ top: targetY, behavior: 'instant' });
        });

        const timer = setTimeout(() => {
          window.scrollTo({ top: targetY, behavior: 'instant' });
        }, 80);

        restoredRef.current = true;
        return () => {
          cancelAnimationFrame(frameId);
          clearTimeout(timer);
        };
      }
    }
    restoredRef.current = true;
  }, [isReady, storageKey]);

  // Continuously record scroll position on scroll and before unmount
  useEffect(() => {
    let timeoutId: any;
    const handleScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (window.scrollY > 0) {
          sessionStorage.setItem(storageKey, String(window.scrollY));
        }
      }, 100);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('scroll', handleScroll);
      if (window.scrollY > 0) {
        sessionStorage.setItem(storageKey, String(window.scrollY));
      }
    };
  }, [storageKey]);
}

/**
 * Explicitly save current scroll position before programmatic navigation
 */
export function saveCurrentScrollPosition(path?: string) {
  const targetKey = path ? `snap_scroll_${path}` : `snap_scroll_${window.location.pathname}`;
  sessionStorage.setItem(targetKey, String(window.scrollY));
}
