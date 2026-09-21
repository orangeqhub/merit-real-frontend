import { useEffect } from 'react';
import { loaderService } from '../../store/loaderStore';

/**
 * Suspense fallback for lazy routes — drives the global branded loader
 * instead of a second spinner UI.
 */
export default function RouteLoadingFallback() {
  useEffect(() => {
    loaderService.show();
    return () => loaderService.hide();
  }, []);

  return null;
}
