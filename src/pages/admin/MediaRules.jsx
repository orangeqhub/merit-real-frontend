import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, ArrowUp, ArrowDown, RotateCcw } from 'lucide-react';
import { mediaRuleService } from '../../services/mediaRuleService';
import { resolveSlotLabel } from '../../utils/mediaLabel';
import { useLanguageStore } from '../../store/languageStore';
import { toast } from '../../store/toastStore';

const RULE_KEYS = ['apartment', 'independentHouse', 'gatedCommunity', 'residentialPlot', 'openPlot', 'commercialPlot', 'venture', 'agriculturalLand'];

function emptySlotForm() {
  return { id: '', labelEn: '', labelTe: '', required: false, maxFileSizeMb: 5, allowedExtensions: 'jpg,jpeg,png,webp', captionRequired: false, primaryEligible: true };
}

function emptyFeatureForm() {
  return { key: '', labelEn: '', labelTe: '' };
}

export default function MediaRules() {
  const { t } = useTranslation(['dashboard', 'common']);
  const language = useLanguageStore((s) => s.language);
  const [activeRuleKey, setActiveRuleKey] = useState(RULE_KEYS[0]);
  const [rules, setRules] = useState(null);
  const [slotForm, setSlotForm] = useState(null);
  const [featureForm, setFeatureForm] = useState(null);
  const [restoreTarget, setRestoreTarget] = useState(false);

  function load() {
    mediaRuleService.getRules().then(setRules);
  }

  useEffect(load, []);

  if (!rules) return null;
  const rule = rules[activeRuleKey];
  if (!rule) {
    return (
      <div>
        <h1 className="mb-4 font-semibold text-brand-800">{t('mediaRule.title')}</h1>
        <p className="text-sm text-gray-500">{t('empty.noData', { ns: 'common' })}</p>
      </div>
    );
  }
  const sortedSlots = [...(rule.commonSlots || [])].sort((a, b) => a.order - b.order);

  async function toggleField(slotId, field) {
    const commonSlots = (rule.commonSlots || []).map((s) => (s.id === slotId ? { ...s, [field]: !s[field] } : s));
    await mediaRuleService.updateRule(activeRuleKey, { commonSlots });
    toast.success(t('toast.mediaRuleUpdated'));
    load();
  }

  async function commitSlotField(slotId, field, value) {
    const commonSlots = (rule.commonSlots || []).map((s) => (s.id === slotId ? { ...s, [field]: value } : s));
    await mediaRuleService.updateRule(activeRuleKey, { commonSlots });
    load();
  }

  async function handleAddSlot(e) {
    e.preventDefault();
    if (!slotForm.id) return;
    await mediaRuleService.addCommonSlot(activeRuleKey, {
      ...slotForm,
      allowedExtensions: slotForm.allowedExtensions.split(',').map((s) => s.trim()).filter(Boolean),
    });
    toast.success(t('toast.mediaRuleUpdated'));
    setSlotForm(null);
    load();
  }

  async function handleRemoveSlot(slotId) {
    await mediaRuleService.removeCommonSlot(activeRuleKey, slotId);
    toast.success(t('toast.mediaRuleUpdated'));
    load();
  }

  async function handleReorder(slotId, direction) {
    await mediaRuleService.reorderCommonSlot(activeRuleKey, slotId, direction);
    load();
  }

  async function handleAddFeature(e) {
    e.preventDefault();
    if (!featureForm.key) return;
    await mediaRuleService.addExtraFeature(activeRuleKey, featureForm);
    toast.success(t('toast.mediaRuleUpdated'));
    setFeatureForm(null);
    load();
  }

  async function handleRemoveFeature(key) {
    await mediaRuleService.removeExtraFeature(activeRuleKey, key);
    toast.success(t('toast.mediaRuleUpdated'));
    load();
  }

  async function handleRestore() {
    await mediaRuleService.restoreDefaults(activeRuleKey);
    toast.success(t('toast.mediaRuleRestored'));
    setRestoreTarget(false);
    load();
  }

  return (
    <div>
      <h1 className="mb-4 font-semibold text-brand-800">{t('mediaRule.title')}</h1>

      <div className="mb-4 flex flex-wrap gap-2">
        {RULE_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveRuleKey(key)}
            className={`rounded-full border px-3 py-1.5 text-xs capitalize ${
              activeRuleKey === key ? 'border-brand-600 bg-brand-600 text-warm-white' : 'border-gray-300 text-gray-600'
            }`}
          >
            {key.replace(/([A-Z])/g, ' $1')}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">{t('mediaRule.samplePreview')}: {sortedSlots[0] ? resolveSlotLabel(sortedSlots[0], language, t) : '-'}</p>
        <button type="button" onClick={() => setRestoreTarget(true)} className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium hover:bg-gray-50">
          <RotateCcw size={14} /> {t('mediaRule.restoreDefaults')}
        </button>
      </div>

      <section className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-brand-800">{t('mediaRule.commonSlots')}</h2>
          <button type="button" onClick={() => setSlotForm(emptySlotForm())} className="flex items-center gap-1 rounded-lg bg-brand-600 px-2.5 py-1.5 text-xs font-semibold text-warm-white">
            <Plus size={13} /> {t('mediaRule.addSlot')}
          </button>
        </div>
        <div className="space-y-2">
          {sortedSlots.map((s, i) => (
            <div key={s.id} className="rounded-xl border border-gray-200 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => handleReorder(s.id, 'up')} disabled={i === 0} aria-label={t('mediaRule.moveUp')} className="rounded border border-gray-200 p-1 disabled:opacity-30">
                    <ArrowUp size={13} />
                  </button>
                  <button type="button" onClick={() => handleReorder(s.id, 'down')} disabled={i === sortedSlots.length - 1} aria-label={t('mediaRule.moveDown')} className="rounded border border-gray-200 p-1 disabled:opacity-30">
                    <ArrowDown size={13} />
                  </button>
                  <span className="font-mono text-xs text-gray-500">{s.id}</span>
                  <span className="text-sm font-medium text-gray-800">{resolveSlotLabel(s, language, t)}</span>
                </div>
                <button type="button" onClick={() => handleRemoveSlot(s.id)} aria-label={t('mediaRule.removeSlot')} className="rounded-lg border border-red-200 p-1.5 text-red-600 hover:bg-red-50">
                  <Trash2 size={13} />
                </button>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <input
                  key={`${s.id}-labelEn-${s.labelEn}`}
                  defaultValue={s.labelEn}
                  onBlur={(e) => e.target.value !== s.labelEn && commitSlotField(s.id, 'labelEn', e.target.value)}
                  placeholder={t('mediaRule.labelEn')}
                  className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs"
                />
                <input
                  key={`${s.id}-labelTe-${s.labelTe}`}
                  defaultValue={s.labelTe}
                  onBlur={(e) => e.target.value !== s.labelTe && commitSlotField(s.id, 'labelTe', e.target.value)}
                  placeholder={t('mediaRule.labelTe')}
                  className="lang-te rounded-lg border border-gray-300 px-2 py-1.5 text-xs"
                />
                <input
                  key={`${s.id}-size-${s.maxFileSizeMb}`}
                  type="number"
                  min="1"
                  defaultValue={s.maxFileSizeMb}
                  onBlur={(e) => Number(e.target.value) !== s.maxFileSizeMb && commitSlotField(s.id, 'maxFileSizeMb', Number(e.target.value))}
                  placeholder={t('mediaRule.maxFileSizeMb')}
                  className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs"
                />
                <input
                  key={`${s.id}-ext-${(s.allowedExtensions || []).join(',')}`}
                  defaultValue={(s.allowedExtensions || []).join(',')}
                  onBlur={(e) => commitSlotField(s.id, 'allowedExtensions', e.target.value.split(',').map((v) => v.trim()).filter(Boolean))}
                  placeholder={t('mediaRule.allowedExtensions')}
                  className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs"
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-3">
                <label className="flex items-center gap-1.5 text-xs text-gray-600">
                  <input type="checkbox" checked={s.required} onChange={() => toggleField(s.id, 'required')} className="h-3.5 w-3.5 rounded border-gray-300 text-brand-600" />
                  {t('mediaRule.required')}
                </label>
                <label className="flex items-center gap-1.5 text-xs text-gray-600">
                  <input type="checkbox" checked={s.captionRequired} onChange={() => toggleField(s.id, 'captionRequired')} className="h-3.5 w-3.5 rounded border-gray-300 text-brand-600" />
                  {t('mediaRule.captionRequired')}
                </label>
                <label className="flex items-center gap-1.5 text-xs text-gray-600">
                  <input type="checkbox" checked={s.primaryEligible} onChange={() => toggleField(s.id, 'primaryEligible')} className="h-3.5 w-3.5 rounded border-gray-300 text-brand-600" />
                  {t('mediaRule.primaryEligible')}
                </label>
              </div>
            </div>
          ))}
        </div>

        {slotForm && (
          <form onSubmit={handleAddSlot} className="mt-3 grid grid-cols-1 gap-2 rounded-xl border border-dashed border-brand-300 p-3 sm:grid-cols-3">
            <input required placeholder={t('mediaRule.slotId')} value={slotForm.id} onChange={(e) => setSlotForm((f) => ({ ...f, id: e.target.value }))} className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs" />
            <input placeholder={t('mediaRule.labelEn')} value={slotForm.labelEn} onChange={(e) => setSlotForm((f) => ({ ...f, labelEn: e.target.value }))} className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs" />
            <input placeholder={t('mediaRule.labelTe')} value={slotForm.labelTe} onChange={(e) => setSlotForm((f) => ({ ...f, labelTe: e.target.value }))} className="lang-te rounded-lg border border-gray-300 px-2 py-1.5 text-xs" />
            <label className="flex items-center gap-1.5 text-xs text-gray-600">
              <input type="checkbox" checked={slotForm.required} onChange={(e) => setSlotForm((f) => ({ ...f, required: e.target.checked }))} className="h-3.5 w-3.5 rounded border-gray-300 text-brand-600" />
              {t('mediaRule.required')}
            </label>
            <div className="flex gap-2 sm:col-span-3">
              <button type="submit" className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-warm-white">{t('mediaRule.addSlot')}</button>
              <button type="button" onClick={() => setSlotForm(null)} className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs">{t('category.cancel')}</button>
            </div>
          </form>
        )}
      </section>

      {Object.keys(rule.countBasedSlots || {}).length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-sm font-semibold text-brand-800">{t('mediaRule.countBasedSlots')}</h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(rule.countBasedSlots || {}).map(([field, cfg]) => (
              <span key={field} className={`rounded-full border px-3 py-1 text-xs ${cfg.required ? 'border-red-200 bg-red-50 text-red-700' : 'border-gray-300 text-gray-600'}`}>
                {field} &middot; {cfg.required ? t('mediaRule.required') : t('mediaRule.optional')}
              </span>
            ))}
          </div>
        </section>
      )}

      <section className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-brand-800">{t('mediaRule.extraFeatures')}</h2>
          <button type="button" onClick={() => setFeatureForm(emptyFeatureForm())} className="flex items-center gap-1 rounded-lg bg-brand-600 px-2.5 py-1.5 text-xs font-semibold text-warm-white">
            <Plus size={13} /> {t('mediaRule.addExtraFeature')}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {(rule.allowedExtraSpaces || []).map((f) => (
            <span key={f.key} className="flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-xs text-brand-800">
              {resolveSlotLabel(f, language, t)}
              <button type="button" onClick={() => handleRemoveFeature(f.key)} aria-label={`Remove ${f.key}`}>
                <Trash2 size={12} />
              </button>
            </span>
          ))}
        </div>
        {featureForm && (
          <form onSubmit={handleAddFeature} className="mt-3 grid grid-cols-1 gap-2 rounded-xl border border-dashed border-brand-300 p-3 sm:grid-cols-3">
            <input required placeholder={t('mediaRule.slotId')} value={featureForm.key} onChange={(e) => setFeatureForm((f) => ({ ...f, key: e.target.value }))} className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs" />
            <input placeholder={t('mediaRule.labelEn')} value={featureForm.labelEn} onChange={(e) => setFeatureForm((f) => ({ ...f, labelEn: e.target.value }))} className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs" />
            <input placeholder={t('mediaRule.labelTe')} value={featureForm.labelTe} onChange={(e) => setFeatureForm((f) => ({ ...f, labelTe: e.target.value }))} className="lang-te rounded-lg border border-gray-300 px-2 py-1.5 text-xs" />
            <div className="flex gap-2 sm:col-span-3">
              <button type="submit" className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-warm-white">{t('mediaRule.addExtraFeature')}</button>
              <button type="button" onClick={() => setFeatureForm(null)} className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs">{t('category.cancel')}</button>
            </div>
          </form>
        )}
      </section>

      {restoreTarget && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-xl bg-warm-white p-6 shadow-xl">
            <h2 className="font-semibold text-brand-800">{t('mediaRule.confirmRestoreTitle')}</h2>
            <p className="mt-2 text-sm text-gray-600">{t('mediaRule.confirmRestoreBody')}</p>
            <div className="mt-4 flex justify-end gap-3">
              <button type="button" onClick={() => setRestoreTarget(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm">{t('category.cancel')}</button>
              <button type="button" onClick={handleRestore} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-warm-white">{t('mediaRule.restoreDefaults')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
