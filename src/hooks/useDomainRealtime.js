import { useEffect } from 'react';
import { connectRealtime, disconnectRealtime, subscribeRealtime } from '../lib/realtimeSocket';

/**
 * Shared Socket.IO connection for dashboard pages.
 * Subscribes to domain events without opening duplicate sockets.
 */
export function useDomainRealtime(enabled = true) {
  useEffect(() => {
    if (!enabled) return undefined;
    connectRealtime();
    return () => disconnectRealtime();
  }, [enabled]);
}

export function useRealtimeEvent(event, handler, enabled = true) {
  useEffect(() => {
    if (!enabled || !handler) return undefined;
    connectRealtime();
    return subscribeRealtime(event, handler);
  }, [event, enabled, handler]);
}
