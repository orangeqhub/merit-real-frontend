import { create } from 'zustand';

const SHOW_DELAY_MS = 250;
const MIN_VISIBLE_MS = 280;

/**
 * Global loader service — reference-counted so concurrent API/route work
 * keeps one overlay until everything settles. Fast ops (< SHOW_DELAY_MS)
 * never flash the UI.
 */
export const useLoaderStore = create((set, get) => ({
  pendingCount: 0,
  visible: false,
  _showTimer: null,
  _hideTimer: null,
  _shownAt: 0,

  /** Begin a tracked loading operation (API call, route, init, …). */
  show: () => {
    const state = get();
    const next = state.pendingCount + 1;
    if (state._hideTimer) {
      clearTimeout(state._hideTimer);
    }
    set({ pendingCount: next, _hideTimer: null });

    if (next === 1 && !get().visible && !get()._showTimer) {
      const timer = setTimeout(() => {
        set({ visible: true, _showTimer: null, _shownAt: Date.now() });
      }, SHOW_DELAY_MS);
      set({ _showTimer: timer });
    }
  },

  /** End one tracked loading operation. */
  hide: () => {
    const state = get();
    const next = Math.max(0, state.pendingCount - 1);
    set({ pendingCount: next });

    if (next > 0) return;

    if (state._showTimer) {
      clearTimeout(state._showTimer);
      set({ _showTimer: null, visible: false, _shownAt: 0 });
      return;
    }

    if (!state.visible) return;

    const elapsed = Date.now() - (state._shownAt || 0);
    const wait = Math.max(0, MIN_VISIBLE_MS - elapsed);
    const timer = setTimeout(() => {
      if (get().pendingCount === 0) {
        set({ visible: false, _hideTimer: null, _shownAt: 0 });
      } else {
        set({ _hideTimer: null });
      }
    }, wait);
    set({ _hideTimer: timer });
  },

  /** Force-reset (tests / emergency). */
  reset: () => {
    const { _showTimer, _hideTimer } = get();
    if (_showTimer) clearTimeout(_showTimer);
    if (_hideTimer) clearTimeout(_hideTimer);
    set({ pendingCount: 0, visible: false, _showTimer: null, _hideTimer: null, _shownAt: 0 });
  },
}));

/** Imperative helpers for non-React modules (API client, etc.). */
export const loaderService = {
  show: () => useLoaderStore.getState().show(),
  hide: () => useLoaderStore.getState().hide(),
  reset: () => useLoaderStore.getState().reset(),
  /**
   * Wrap an async task with show/hide. Always hides in finally.
   * @template T
   * @param {() => Promise<T>} fn
   * @returns {Promise<T>}
   */
  async track(fn) {
    loaderService.show();
    try {
      return await fn();
    } finally {
      loaderService.hide();
    }
  },
};
