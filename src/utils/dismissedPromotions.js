const STORAGE_KEY = 'merit_saved_promotions';

function readIds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(Number).filter((n) => Number.isFinite(n)) : [];
  } catch {
    return [];
  }
}

function writeIds(ids) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...new Set(ids)]));
}

/** Legacy one-time dismiss key — clear so old closes stop hiding banners forever. */
export function clearLegacyDismissals() {
  try {
    localStorage.removeItem('merit_dismissed_promotions');
  } catch {
    // ignore
  }
}

export function getSavedForLaterPromotionIds() {
  return readIds();
}

export function savePromotionForLaterLocally(promotionId) {
  const id = Number(promotionId);
  if (!Number.isFinite(id)) return;
  writeIds([...readIds(), id]);
}

export function restorePromotionLocally(promotionId) {
  const id = Number(promotionId);
  writeIds(readIds().filter((x) => x !== id));
}

/** @deprecated kept for My Promotions restore compatibility */
export function dismissPromotionLocally(promotionId) {
  savePromotionForLaterLocally(promotionId);
}

export function filterOutLocallyDismissed(promotions) {
  return promotions || [];
}
