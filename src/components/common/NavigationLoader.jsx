import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { loaderService } from '../../store/loaderStore';

/**
 * Brief loader pulse on pathname changes (covers non-lazy navigations).
 * Complements Suspense fallback used for code-split routes.
 */
export default function NavigationLoader() {
  const location = useLocation();
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return undefined;
    }

    let cancelled = false;
    loaderService.show();
    const t = setTimeout(() => {
      if (!cancelled) loaderService.hide();
    }, 320);

    return () => {
      cancelled = true;
      clearTimeout(t);
      loaderService.hide();
    };
  }, [location.pathname]);

  return null;
}
