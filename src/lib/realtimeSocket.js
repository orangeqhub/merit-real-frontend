import { io } from 'socket.io-client';
import { getAccessToken, isLocalEmployeeToken } from '../api/session';
import { getApiOrigin } from '../api/client';
import { playWalletSound, unlockWalletAudio } from '../utils/walletSounds';

let socket = null;
let refCount = 0;
const listeners = new Map();
const seenEventIds = new Set();
const SEEN_LIMIT = 500;

function dispatch(event, payload) {
  listeners.get(event)?.forEach((cb) => {
    try {
      cb(payload);
    } catch {
      // ignore subscriber errors
    }
  });
  listeners.get('*')?.forEach((cb) => {
    try {
      cb(event, payload);
    } catch {
      // ignore subscriber errors
    }
  });
}

function rememberEventId(payload) {
  const id = payload?.eventId || payload?.id;
  if (!id) return true;
  if (seenEventIds.has(id)) return false;
  seenEventIds.add(id);
  if (seenEventIds.size > SEEN_LIMIT) {
    const first = seenEventIds.values().next().value;
    seenEventIds.delete(first);
  }
  return true;
}

function attachSocketHandlers(activeSocket) {
  activeSocket.on('wallet:updated', (payload) => {
    if (payload?.sound) playWalletSound(payload.sound);
    dispatch('wallet:updated', payload);
  });

  activeSocket.on('notification:new', (payload) => {
    if (!rememberEventId(payload)) return;
    dispatch('notification:new', payload);
  });

  activeSocket.on('notification:read', (payload) => {
    dispatch('notification:read', payload);
  });

  activeSocket.on('notification:count-updated', (payload) => {
    dispatch('notification:count-updated', payload);
  });

  activeSocket.on('express-interest:updated', (payload) => {
    if (!rememberEventId(payload)) return;
    dispatch('express-interest:updated', payload);
  });

  activeSocket.on('express-interest:approved', (payload) => {
    if (!rememberEventId(payload)) return;
    dispatch('express-interest:approved', payload);
    dispatch('express-interest:updated', payload);
  });

  activeSocket.on('express-interest:created', (payload) => {
    if (!rememberEventId(payload)) return;
    dispatch('express-interest:created', payload);
    dispatch('express-interest:updated', payload);
  });

  activeSocket.on('booking:updated', (payload) => {
    if (!rememberEventId(payload)) return;
    dispatch('booking:updated', payload);
  });

  activeSocket.on('site-visit:updated', (payload) => {
    if (!rememberEventId(payload)) return;
    dispatch('site-visit:updated', payload);
  });

  activeSocket.on('site-visit:created', (payload) => {
    if (!rememberEventId(payload)) return;
    dispatch('site-visit:created', payload);
    dispatch('site-visit:updated', payload);
  });

  activeSocket.on('property:updated', (payload) => {
    if (!rememberEventId(payload)) return;
    dispatch('property:updated', payload);
  });

  activeSocket.on('property:created', (payload) => {
    if (!rememberEventId(payload)) return;
    dispatch('property:created', payload);
    dispatch('property:updated', payload);
  });
}

export function subscribeRealtime(event, callback) {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event).add(callback);
  return () => listeners.get(event)?.delete(callback);
}

export function connectRealtime() {
  refCount += 1;
  if (socket?.connected) return socket;

  const token = getAccessToken();
  if (!token || isLocalEmployeeToken(token)) return null;

  if (!socket) {
    const unlock = () => unlockWalletAudio();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });

    socket = io(getApiOrigin(), {
      path: '/socket.io',
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
    });
    attachSocketHandlers(socket);

    socket.io.on('reconnect', () => {
      dispatch('socket:reconnected', {});
    });
  } else if (!socket.connected) {
    socket.connect();
  }

  return socket;
}

export function disconnectRealtime() {
  refCount = Math.max(0, refCount - 1);
  if (refCount === 0 && socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getRealtimeSocket() {
  return socket;
}
