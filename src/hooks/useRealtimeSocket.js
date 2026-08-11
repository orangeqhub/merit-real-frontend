import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { getAccessToken, isLocalEmployeeToken } from '../api/session';
import { getApiOrigin } from '../api/client';
import { playWalletSound, unlockWalletAudio } from '../utils/walletSounds';

/**
 * Connects to merit-api Socket.IO and forwards wallet/notification events.
 */
export function useRealtimeSocket({ enabled, onWalletUpdate, onNotification } = {}) {
  const socketRef = useRef(null);
  const handlersRef = useRef({ onWalletUpdate, onNotification });
  handlersRef.current = { onWalletUpdate, onNotification };

  useEffect(() => {
    if (!enabled) return undefined;

    const unlock = () => unlockWalletAudio();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });

    const token = getAccessToken();
    // Local demo employee tokens are not valid for Socket.IO auth.
    if (!token || isLocalEmployeeToken(token)) {
      return () => {
        window.removeEventListener('pointerdown', unlock);
        window.removeEventListener('keydown', unlock);
      };
    }

    const socket = io(getApiOrigin(), {
      path: '/socket.io',
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
    });
    socketRef.current = socket;

    socket.on('wallet:updated', (payload) => {
      if (payload?.sound) playWalletSound(payload.sound);
      handlersRef.current.onWalletUpdate?.(payload);
    });

    socket.on('notification:new', (payload) => {
      handlersRef.current.onNotification?.(payload);
    });

    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [enabled]);

  return socketRef;
}
