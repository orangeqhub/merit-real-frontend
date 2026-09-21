import { useTranslation } from 'react-i18next';

export default function Step3PriceSize({ data, onChange, errors }) {
  const { t } = useTranslation('forms');

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="wz-price" className="mb-1.5 block text-sm font-medium text-gray-700">{t('wizard.price')}</label>
          <input
            id="wz-price"
            type="number"
            min="0"
            value={data.price}
            onChange={(e) => onChange({ price: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
          />
          {errors?.price && <p className="mt-1 text-xs text-red-600">{t('validation.required')}</p>}
        </div>
        <label className="mt-6 flex items-center gap-2 text-sm text-gray-700 sm:mt-8">
          <input type="checkbox" checked={data.priceNegotiable} onChange={(e) => onChange({ priceNegotiable: e.target.checked })} className="h-4 w-4 rounded border-gray-300 text-brand-600" />
          {t('wizard.negotiable')}
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="wz-area" className="mb-1.5 block text-sm font-medium text-gray-700">{t('wizard.area')}</label>
          <input
            id="wz-area"
            type="number"
            min="0"
            value={data.area}
            onChange={(e) => onChange({ area: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
          />
          {errors?.area && <p className="mt-1 text-xs text-red-600">{t('validation.required')}</p>}
        </div>
        <div>
          <label htmlFor="wz-unit" className="mb-1.5 block text-sm font-medium text-gray-700">{t('wizard.unit')}</label>
          <select id="wz-unit" value={data.areaUnit} onChange={(e) => onChange({ areaUnit: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm">
            <option value="sqft">Sq. Ft</option>
            <option value="sqyd">Sq. Yd</option>
            <option value="acre">Acre</option>
            <option value="cent">Cent</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="wz-dimensions" className="mb-1.5 block text-sm font-medium text-gray-700">{t('wizard.dimensions')}</label>
          <input id="wz-dimensions" value={data.dimensions} onChange={(e) => onChange({ dimensions: e.target.value })} placeholder="e.g. 30x40" className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
        </div>
        <div>
          <label htmlFor="wz-priceperunit" className="mb-1.5 block text-sm font-medium text-gray-700">{t('wizard.pricePerUnit')}</label>
          <input id="wz-priceperunit" type="number" min="0" value={data.pricePerUnit} onChange={(e) => onChange({ pricePerUnit: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
        </div>
      </div>
    </div>
  );
}
