/**
 * Default media slot rules per property ruleKey.
 * Admin edits are persisted via mediaRuleService (local until a backend API exists).
 */

const IMG_EXTS = ['jpg', 'jpeg', 'png', 'webp'];

function slot(id, labelKey, order, opts = {}) {
  return {
    id,
    labelKey: `images.slot.${labelKey}`,
    labelEn: '',
    labelTe: '',
    order,
    required: opts.required ?? false,
    maxFileSizeMb: opts.maxFileSizeMb ?? 5,
    allowedExtensions: opts.allowedExtensions || [...IMG_EXTS],
    captionRequired: opts.captionRequired ?? false,
    primaryEligible: opts.primaryEligible ?? true,
  };
}

function countSlot(labelKey, opts = {}) {
  return {
    groupLabelKey: `images.slot.${labelKey}`,
    groupLabelEn: '',
    groupLabelTe: '',
    required: opts.required ?? false,
    maxFileSizeMb: opts.maxFileSizeMb ?? 5,
    allowedExtensions: opts.allowedExtensions || [...IMG_EXTS],
    captionRequired: opts.captionRequired ?? false,
    primaryEligible: opts.primaryEligible ?? true,
  };
}

function extra(key, labelKey) {
  return {
    key,
    labelKey: `images.extra.${labelKey}`,
    labelEn: '',
    labelTe: '',
  };
}

const BUILDING_EXTRAS = [
  extra('poojaRoom', 'poojaRoom'),
  extra('utilityRoom', 'utilityRoom'),
  extra('storeRoom', 'storeRoom'),
  extra('officeRoom', 'officeRoom'),
  extra('servantRoom', 'servantRoom'),
  extra('terrace', 'terrace'),
];

const BUILDING_COUNTS = {
  bedrooms: countSlot('bedroom', { required: true }),
  bathrooms: countSlot('bathroom', { required: true }),
  halls: countSlot('hall'),
  kitchens: countSlot('kitchen'),
  balconies: countSlot('balcony'),
};

const BUILDING_COMMON = [
  slot('buildingExterior', 'buildingExterior', 1, { required: true }),
  slot('floorPlan', 'floorPlan', 2),
  slot('amenities', 'amenities', 3),
  slot('locationExterior', 'locationExterior', 4),
];

function buildingRule() {
  return {
    commonSlots: BUILDING_COMMON.map((s) => ({ ...s, allowedExtensions: [...s.allowedExtensions] })),
    countBasedSlots: structuredClone(BUILDING_COUNTS),
    allowedExtraSpaces: BUILDING_EXTRAS.map((e) => ({ ...e })),
  };
}

function plotRule() {
  return {
    commonSlots: [
      slot('frontView', 'frontView', 1, { required: true }),
      slot('fullLandView', 'fullLandView', 2, { required: true }),
      slot('roadAccess', 'roadAccess', 3),
      slot('boundaryView', 'boundaryView', 4),
      slot('layoutPlan', 'layoutPlan', 5),
      slot('locationMap', 'locationMap', 6),
    ],
    countBasedSlots: {},
    allowedExtraSpaces: [
      extra('borewell', 'borewell'),
      extra('fencing', 'fencing'),
      extra('shed', 'shed'),
    ],
  };
}

function ventureRule() {
  return {
    commonSlots: [
      slot('layoutPlan', 'layoutPlan', 1, { required: true }),
      slot('locationMap', 'locationMap', 2, { required: true }),
      slot('nearbyLandmark', 'nearbyLandmark', 3),
      slot('amenities', 'amenities', 4),
      slot('approvalDocument', 'approvalDocument', 5),
      slot('frontView', 'frontView', 6),
    ],
    countBasedSlots: {},
    allowedExtraSpaces: [
      extra('fencing', 'fencing'),
      extra('borewell', 'borewell'),
    ],
  };
}

function agriRule() {
  return {
    commonSlots: [
      slot('fullLandView', 'fullLandView', 1, { required: true }),
      slot('roadAccess', 'roadAccess', 2, { required: true }),
      slot('boundaryView', 'boundaryView', 3),
      slot('waterSource', 'waterSource', 4),
      slot('electricityAccess', 'electricityAccess', 5),
      slot('locationMap', 'locationMap', 6),
    ],
    countBasedSlots: {},
    allowedExtraSpaces: [
      extra('shed', 'shed'),
      extra('farmhouse', 'farmhouse'),
      extra('irrigationArea', 'irrigationArea'),
      extra('cropArea', 'cropArea'),
      extra('borewell', 'borewell'),
      extra('fencing', 'fencing'),
    ],
  };
}

/** Deep-cloned defaults for each rule key used by admin Media Rules + seller wizard. */
export function createDefaultMediaRules() {
  return {
    apartment: buildingRule(),
    independentHouse: buildingRule(),
    gatedCommunity: buildingRule(),
    residentialPlot: plotRule(),
    openPlot: plotRule(),
    commercialPlot: plotRule(),
    venture: ventureRule(),
    agriculturalLand: agriRule(),
  };
}

export const PROPERTY_MEDIA_RULES = createDefaultMediaRules();

export const MEDIA_RULE_KEYS = Object.keys(PROPERTY_MEDIA_RULES);
