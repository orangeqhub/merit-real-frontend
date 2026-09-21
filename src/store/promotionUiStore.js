import { create } from 'zustand';

/**
 * Floating promotion popup UI state.
 * - open: full card (mockup)
 * - minimized: small pill tab
 * - closed: hidden until refresh / carousel reopen
 */
const SESSION_KEY = 'merit_promo_floating';

function readSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeSession(state) {
  try {
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        mode: state.mode,
        promotionId: state.promotionId,
      })
    );
  } catch {
    // ignore
  }
}

const saved = readSession();

export const usePromotionUiStore = create((set, get) => ({
  mode: saved?.mode === 'open' || saved?.mode === 'minimized' ? saved.mode : 'closed',
  promotionId: saved?.promotionId ?? null,
  /** Full promotion payload when opened from carousel close */
  promotion: null,

  openFloating(promotion) {
    if (!promotion) return;
    const next = { mode: 'open', promotionId: promotion.id, promotion };
    writeSession(next);
    set(next);
  },

  minimize() {
    const next = { ...get(), mode: 'minimized' };
    writeSession(next);
    set({ mode: 'minimized' });
  },

  expand() {
    const next = { ...get(), mode: 'open' };
    writeSession(next);
    set({ mode: 'open' });
  },

  closeFloating() {
    const next = { mode: 'closed', promotionId: null, promotion: null };
    writeSession(next);
    set(next);
  },

  setPromotion(promotion) {
    if (!promotion) return;
    set({ promotion, promotionId: promotion.id });
    writeSession({ mode: get().mode, promotionId: promotion.id });
  },
}));
