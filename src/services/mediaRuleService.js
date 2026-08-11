import { createDefaultMediaRules } from '../config/propertyMediaRules';
import { readJSON, writeJSON, STORAGE_KEYS } from '../utils/storage';

function clone(value) {
  return structuredClone(value);
}

function loadStore() {
  const stored = readJSON(STORAGE_KEYS.MEDIA_RULES, null);
  if (stored && typeof stored === 'object' && Object.keys(stored).length > 0) {
    return stored;
  }
  const defaults = createDefaultMediaRules();
  writeJSON(STORAGE_KEYS.MEDIA_RULES, defaults);
  return defaults;
}

function saveStore(rules) {
  writeJSON(STORAGE_KEYS.MEDIA_RULES, rules);
  return clone(rules);
}

function requireRule(rules, ruleKey) {
  if (!rules[ruleKey]) {
    throw new Error(`Unknown media rule key: ${ruleKey}`);
  }
  return rules[ruleKey];
}

function normalizeSlot(slot, order) {
  return {
    id: String(slot.id || '').trim(),
    labelKey: slot.labelKey || '',
    labelEn: slot.labelEn || '',
    labelTe: slot.labelTe || '',
    order: Number.isFinite(order) ? order : Number(slot.order) || 1,
    required: Boolean(slot.required),
    maxFileSizeMb: Number(slot.maxFileSizeMb) || 5,
    allowedExtensions: Array.isArray(slot.allowedExtensions)
      ? slot.allowedExtensions
      : String(slot.allowedExtensions || 'jpg,jpeg,png,webp')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
    captionRequired: Boolean(slot.captionRequired),
    primaryEligible: slot.primaryEligible !== false,
  };
}

export const mediaRuleService = {
  async getRules() {
    return clone(loadStore());
  },

  async getRule(ruleKey) {
    const rules = loadStore();
    return rules[ruleKey] ? clone(rules[ruleKey]) : null;
  },

  async saveRules(nextRules) {
    return saveStore(clone(nextRules));
  },

  async updateRule(ruleKey, patch) {
    const rules = loadStore();
    const current = requireRule(rules, ruleKey);
    rules[ruleKey] = {
      ...current,
      ...patch,
      commonSlots: patch.commonSlots
        ? patch.commonSlots.map((s, i) => normalizeSlot(s, s.order ?? i + 1))
        : current.commonSlots,
      countBasedSlots: patch.countBasedSlots ?? current.countBasedSlots,
      allowedExtraSpaces: patch.allowedExtraSpaces ?? current.allowedExtraSpaces,
    };
    return saveStore(rules);
  },

  async restoreDefaults(ruleKey) {
    const rules = loadStore();
    const defaults = createDefaultMediaRules();
    if (ruleKey) {
      requireRule(rules, ruleKey);
      rules[ruleKey] = defaults[ruleKey];
    } else {
      return saveStore(defaults);
    }
    return saveStore(rules);
  },

  async addCommonSlot(ruleKey, slot) {
    const rules = loadStore();
    const rule = requireRule(rules, ruleKey);
    const id = String(slot.id || '').trim();
    if (!id) throw new Error('Slot id is required');
    if (rule.commonSlots.some((s) => s.id === id)) {
      throw new Error(`Slot "${id}" already exists`);
    }
    const order = rule.commonSlots.length + 1;
    rule.commonSlots = [...rule.commonSlots, normalizeSlot({ ...slot, id }, order)];
    return saveStore(rules);
  },

  async removeCommonSlot(ruleKey, slotId) {
    const rules = loadStore();
    const rule = requireRule(rules, ruleKey);
    rule.commonSlots = rule.commonSlots
      .filter((s) => s.id !== slotId)
      .map((s, i) => ({ ...s, order: i + 1 }));
    return saveStore(rules);
  },

  async reorderCommonSlot(ruleKey, slotId, direction) {
    const rules = loadStore();
    const rule = requireRule(rules, ruleKey);
    const list = [...rule.commonSlots].sort((a, b) => a.order - b.order);
    const index = list.findIndex((s) => s.id === slotId);
    if (index < 0) return saveStore(rules);
    const swapWith = direction === 'up' ? index - 1 : index + 1;
    if (swapWith < 0 || swapWith >= list.length) return saveStore(rules);
    [list[index], list[swapWith]] = [list[swapWith], list[index]];
    rule.commonSlots = list.map((s, i) => ({ ...s, order: i + 1 }));
    return saveStore(rules);
  },

  async addExtraFeature(ruleKey, feature) {
    const rules = loadStore();
    const rule = requireRule(rules, ruleKey);
    const key = String(feature.key || '').trim();
    if (!key) throw new Error('Feature key is required');
    if (rule.allowedExtraSpaces.some((f) => f.key === key)) {
      throw new Error(`Feature "${key}" already exists`);
    }
    rule.allowedExtraSpaces = [
      ...rule.allowedExtraSpaces,
      {
        key,
        labelKey: feature.labelKey || '',
        labelEn: feature.labelEn || '',
        labelTe: feature.labelTe || '',
      },
    ];
    return saveStore(rules);
  },

  async removeExtraFeature(ruleKey, key) {
    const rules = loadStore();
    const rule = requireRule(rules, ruleKey);
    rule.allowedExtraSpaces = rule.allowedExtraSpaces.filter((f) => f.key !== key);
    return saveStore(rules);
  },

  async addSlot(ruleKey, slot) {
    return this.addCommonSlot(ruleKey, slot);
  },

  async updateSlot(ruleKey, slotId, patch) {
    const rules = loadStore();
    const rule = requireRule(rules, ruleKey);
    rule.commonSlots = rule.commonSlots.map((s) =>
      s.id === slotId ? normalizeSlot({ ...s, ...patch, id: slotId }, s.order) : s
    );
    return saveStore(rules);
  },

  async removeSlot(ruleKey, slotId) {
    return this.removeCommonSlot(ruleKey, slotId);
  },

  async addFeature(ruleKey, feature) {
    return this.addExtraFeature(ruleKey, feature);
  },

  async removeFeature(ruleKey, key) {
    return this.removeExtraFeature(ruleKey, key);
  },
};
