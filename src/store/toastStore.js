import { create } from 'zustand';
import i18n from '../i18n';

let idCounter = 0;

const NAMESPACES = ['common', 'properties', 'dashboard', 'forms', 'auth'];
// Looks like a translation key / error code ("auth.error.mobileAlreadyRegistered",
// "validation.required", "INVALID_CREDENTIALS") rather than a human sentence.
const KEY_PATTERN = /^[A-Za-z0-9_]+(\.[A-Za-z0-9_]+)*$/;

function humanize(key) {
  const last = key.split('.').pop();
  const words = last
    .replace(/_/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .trim()
    .toLowerCase();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) + '.' : key;
}

// Toasts often receive raw i18n keys (e.g. from thrown Errors). Show the
// translated text instead, falling back to a readable version of the key.
function resolveMessage(message) {
  if (typeof message !== 'string') return message;
  const text = message.trim();
  if (!KEY_PATTERN.test(text) || (!text.includes('.') && !text.includes('_'))) return message;

  const [first, ...rest] = text.split('.');
  const candidates = [];
  if (NAMESPACES.includes(first) && rest.length) candidates.push({ ns: first, key: rest.join('.') });
  NAMESPACES.forEach((ns) => candidates.push({ ns, key: text }));

  for (const { ns, key } of candidates) {
    if (i18n.exists(key, { ns })) return i18n.t(key, { ns });
  }
  return humanize(text);
}

export const useToastStore = create((set) => ({
  toasts: [],
  push: (toast) =>
    set((state) => {
      const id = ++idCounter;
      setTimeout(() => {
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
      }, toast.duration || 4000);
      return { toasts: [...state.toasts, { id, type: 'info', ...toast, message: resolveMessage(toast.message) }] };
    }),
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  success: (message) => useToastStore.getState().push({ type: 'success', message, duration: 4000 }),
  error: (message) => useToastStore.getState().push({ type: 'error', message, duration: 5000 }),
  info: (message) => useToastStore.getState().push({ type: 'info', message, duration: 4000 }),
};
