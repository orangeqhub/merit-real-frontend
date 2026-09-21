import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, X } from 'lucide-react';
import { mediaRuleService } from '../../../services/mediaRuleService';
import { useLanguageStore } from '../../../store/languageStore';
import { resolveSlotLabel } from '../../../utils/mediaLabel';

export default function ExtraSpaceControl({ ruleKey, extraSpaces, onChange }) {
  const { t } = useTranslation('forms');
  const language = useLanguageStore((s) => s.language);
  const [allowed, setAllowed] = useState([]);
  const [selectedKey, setSelectedKey] = useState('');
  const [qty, setQty] = useState(1);

  useEffect(() => {
    mediaRuleService.getRules().then((rules) => {
      setAllowed(rules[ruleKey]?.allowedExtraSpaces || []);
    });
  }, [ruleKey]);

  const available = allowed.filter((a) => !extraSpaces.some((e) => e.key === a.key));

  function handleAdd() {
    if (!selectedKey) return;
    onChange([...extraSpaces, { key: selectedKey, qty: Number(qty) || 1 }]);
    setSelectedKey('');
    setQty(1);
  }

  function handleRemove(key) {
    onChange(extraSpaces.filter((e) => e.key !== key));
  }

  function labelFor(key) {
    const item = allowed.find((a) => a.key === key);
    return item ? resolveSlotLabel(item, language, t) : key;
  }

  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium text-gray-700">{t('wizard.additionalSpaces')}</span>

      {extraSpaces.length > 0 && (
        <ul className="mb-3 flex flex-wrap gap-2">
          {extraSpaces.map((e) => (
            <li key={e.key} className="flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1.5 text-sm text-brand-800">
              {labelFor(e.key)} &times; {e.qty}
              <button type="button" onClick={() => handleRemove(e.key)} aria-label={`Remove ${e.key}`}>
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {available.length > 0 && (
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label htmlFor="extra-space-type" className="mb-1 block text-xs text-gray-500">{t('wizard.extraSpaceType')}</label>
            <select
              id="extra-space-type"
              value={selectedKey}
              onChange={(e) => setSelectedKey(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">-</option>
              {available.map((a) => (
                <option key={a.key} value={a.key}>{labelFor(a.key)}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="extra-space-qty" className="mb-1 block text-xs text-gray-500">{t('wizard.extraSpaceQty')}</label>
            <input
              id="extra-space-qty"
              type="number"
              min="1"
              max="9"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="w-20 rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!selectedKey}
            className="flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-warm-white disabled:opacity-50"
          >
            <Plus size={15} /> {t('wizard.addButton')}
          </button>
        </div>
      )}
    </div>
  );
}
