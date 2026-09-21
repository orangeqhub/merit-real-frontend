import { useEffect, useRef } from 'react';
import { connectRealtime, disconnectRealtime, subscribeRealtime } from '../lib/realtimeSocket';

/**
 * Connects to merit-api Socket.IO and forwards wallet/notification events.
 * Uses a shared singleton socket to avoid duplicate connections.
 */
export function useRealtimeSocket({ enabled, onWalletUpdate, onNotification } = {}) {
  const handlersRef = useRef({ onWalletUpdate, onNotification });
  handlersRef.current = { onWalletUpdate, onNotification };

  useEffect(() => {
    if (!enabled) return undefined;

    connectRealtime();

    const unsubWallet = subscribeRealtime('wallet:updated', (payload) => {
      handlersRef.current.onWalletUpdate?.(payload);
    });

    const unsubNotification = subscribeRealtime('notification:new', (payload) => {
      handlersRef.current.onNotification?.(payload);
    });

    const unsubRead = subscribeRealtime('notification:read', (payload) => {
      handlersRef.current.onNotificationRead?.(payload);
    });

    const unsubCount = subscribeRealtime('notification:count-updated', (payload) => {
      handlersRef.current.onNotificationCount?.(payload);
    });

    const unsubReconnect = subscribeRealtime('socket:reconnected', () => {
      handlersRef.current.onReconnect?.();
    });

    return () => {
      unsubWallet();
      unsubNotification();
      unsubRead();
      unsubCount();
      unsubReconnect();
      disconnectRealtime();
    };
  }, [enabled]);

  return null;
}
