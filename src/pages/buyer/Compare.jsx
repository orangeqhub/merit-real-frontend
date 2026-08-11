import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { X, BadgeCheck, Star, AlertTriangle } from 'lucide-react';
import { propertyService } from '../../services/propertyService';
import { useCompareStore, COMPARE_LIMITS } from '../../store/compareStore';
import { useLanguageStore } from '../../store/languageStore';
import { getLocalizedField } from '../../utils/localize';
import EmptyState from '../../components/common/EmptyState';
import { resolveAssetUrl } from '../../api/client';

function naOr(value, na) {
  return value === undefined || value === null || value === '' ? na : value;
}

export default function Compare() {
  const { t } = useTranslation(['dashboard', 'properties']);
  const language = useLanguageStore((s) => s.language);
  const ids = useCompareStore((s) => s.ids);
  const remove = useCompareStore((s) => s.remove);
  const clear = useCompareStore((s) => s.clear);
  const [properties, setProperties] = useState(null);

  useEffect(() => {
    Promise.all(ids.map((id) => propertyService.getPropertyById(id))).then((list) => {
      setProperties(list.filter(Boolean));
    });
  }, [ids]);

  if (properties === null) return null;

  if (ids.length === 0) {
    return <EmptyState titleKey="compare.empty" hintKey="compare.emptyHint" />;
  }

  const na = t('compare.notAvailable');

  const rows = [
    { label: t('table.price'), value: (p) => `₹${Number(p.price || 0).toLocaleString('en-IN')}` },
    { label: t('table.category'), value: (p) => p.categorySlug },
    { label: t('table.location'), value: (p) => naOr(getLocalizedField(p, 'location', language), na) },
    { label: t('wizard.area', { ns: 'forms' }), value: (p) => `${naOr(p.area, na)} ${p.areaUnit || ''}` },
    { label: t('wizard.bedrooms', { ns: 'forms' }), value: (p) => naOr(p.structure?.bedrooms, na) },
    { label: t('wizard.bathrooms', { ns: 'forms' }), value: (p) => naOr(p.structure?.bathrooms, na) },
    { label: t('wizard.facing', { ns: 'forms' }), value: (p) => naOr(p.structure?.facing || p.plotDetails?.facing, na) },
    { label: t('wizard.furnishing', { ns: 'forms' }), value: (p) => naOr(p.structure?.furnishing, na) },
    { label: t('table.views'), value: (p) => naOr(p.views, na) },
  ];

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-brand-800">{t('compare.title')}</h1>
        <button type="button" onClick={clear} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50">
          {t('compare.clearAll')}
        </button>
      </div>

      {ids.length < COMPARE_LIMITS.MIN_COMPARE && (
        <p className="mb-4 text-sm text-amber-700">{t('compare.minRequired')}</p>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr>
              <th className="w-40 border-b border-gray-100 bg-gray-50 p-3 text-left text-xs font-semibold uppercase text-gray-500">
                {t('compare.attribute')}
              </th>
              {properties.map((p) => {
                const title = getLocalizedField(p, 'title', language);
                const primaryImage = p.images?.find((img) => img.isPrimary) || p.images?.[0];
                return (
                  <th key={p.id} className="min-w-[200px] border-b border-gray-100 bg-gray-50 p-3 text-left align-top">
                    <div className="flex items-start justify-between gap-2">
                      <Link to={`/properties/${p.id}`} className="font-semibold text-brand-800 hover:underline">
                        {title}
                      </Link>
                      <button type="button" onClick={() => remove(p.id)} aria-label={`Remove ${title}`} className="text-gray-400 hover:text-red-500">
                        <X size={16} />
                      </button>
                    </div>
                    {primaryImage && (
                      <img src={resolveAssetUrl(primaryImage.url)} alt={title} className="mt-2 h-28 w-full rounded-lg object-cover" />
                    )}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {p.verified && (
                        <span className="flex items-center gap-1 rounded-full bg-brand-700 px-2 py-0.5 text-[10px] font-semibold text-warm-white">
                          <BadgeCheck size={11} /> {t('card.verified', { ns: 'properties' })}
                        </span>
                      )}
                      {p.featured && (
                        <span className="flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-semibold text-warm-white">
                          <Star size={11} /> {t('card.featured', { ns: 'properties' })}
                        </span>
                      )}
                    </div>
                    {p.status !== 'active' && (
                      <p className="mt-2 flex items-start gap-1 text-[11px] text-amber-700">
                        <AlertTriangle size={12} className="mt-0.5 shrink-0" /> {t('compare.inactiveNotice')}
                      </p>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="odd:bg-white even:bg-gray-50">
                <td className="border-b border-gray-100 p-3 font-medium text-gray-600">{row.label}</td>
                {properties.map((p) => (
                  <td key={p.id} className="border-b border-gray-100 p-3 text-gray-800">{row.value(p)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
