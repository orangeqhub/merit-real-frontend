/**
 * Stable plot identity per layout, read from each native map's verified
 * geometry: backend MapPlots.externalId = prefix + geometry id -- exactly the
 * id each native map sends when a plot is clicked or booked (see the
 * externalIdPrefix values in components/home/MapLayoutSection.jsx).
 *
 * The admin Excel import sends this id with each row so the backend can
 * create a layout's missing MapPlots rows (and heal drifted plot numbers)
 * without ever inventing geometry.
 *
 * Only plot numbers drawn by exactly ONE polygon get an id. Anne Enclave is
 * not listed: its geometry holds twin Phase 1 / Phase 2 copies of the same
 * printed numbers, so a plot number alone can't identify a polygon there
 * (its rows already exist and are matched by phase + plot number).
 */
const GEOMETRY_SOURCES = {
  'manjunadha-enclave': {
    prefix: '',
    load: () => import('./manjunadha-enclave/layouts/manjunadha/plotNumberMapping.json'),
  },
  vinfra: {
    prefix: '',
    load: () => import('./vinfra/layouts/vinfra/plotNumberMapping.json'),
  },
  'mandira-developers': {
    prefix: 'mnd-',
    load: () => import('./mandira-developers/layouts/mandira/plotNumberMapping.json'),
  },
  dokiparru: {
    prefix: 'dk-',
    load: () => import('./dokiparru/layouts/dokiparru/plotNumberMapping.json'),
  },
  'sri-lakshmi': {
    prefix: 'sl-',
    load: () => import('./sri-lakshmi/layouts/sri-lakshmi/plotNumberMapping.json'),
  },
};

/** Same normalization the backend applies to a plot number ("024" -> "24"). */
export function plotIdentityKey(plotNo) {
  const text = String(plotNo ?? '').trim();
  return /^\d+$/.test(text) ? String(Number(text)) : text;
}

/**
 * @returns {Promise<{ externalIdFor: (plotNo) => string | null, isOnMap: (plotNo) => boolean } | null>}
 *   null when the layout has no single-polygon-per-number geometry index.
 */
export async function loadPlotIdentityIndex(layoutKey) {
  const source = GEOMETRY_SOURCES[layoutKey];
  if (!source) return null;
  const mod = await source.load();
  const entries = Array.isArray(mod.default) ? mod.default : [];

  const idsByNo = new Map();
  for (const entry of entries) {
    const key = plotIdentityKey(entry.plotNumber);
    if (!key || !entry.id) continue;
    const ids = idsByNo.get(key) || [];
    ids.push(String(entry.id));
    idsByNo.set(key, ids);
  }

  return {
    externalIdFor(plotNo) {
      const ids = idsByNo.get(plotIdentityKey(plotNo));
      return ids && ids.length === 1 ? `${source.prefix}${ids[0]}` : null;
    },
    isOnMap(plotNo) {
      return idsByNo.has(plotIdentityKey(plotNo));
    },
  };
}
