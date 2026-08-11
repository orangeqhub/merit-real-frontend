import { useTranslation } from 'react-i18next';
import { STATES, DISTRICTS, CITIES } from '../../../data/locations';

export default function Step2Location({ data, onChange, errors }) {
  const { t } = useTranslation('forms');
  const districtOptions = data.state ? DISTRICTS[data.state] || [] : Object.values(DISTRICTS).flat();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="wz-state" className="mb-1.5 block text-sm font-medium text-gray-700">{t('wizard.state')}</label>
          <select id="wz-state" value={data.state} onChange={(e) => onChange({ state: e.target.value, district: '' })} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm">
            <option value="">-</option>
            {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="wz-district" className="mb-1.5 block text-sm font-medium text-gray-700">{t('wizard.district')}</label>
          <select id="wz-district" value={data.district} onChange={(e) => onChange({ district: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm">
            <option value="">-</option>
            {districtOptions.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          {errors?.district && <p className="mt-1 text-xs text-red-600">{t('validation.required')}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="wz-mandal" className="mb-1.5 block text-sm font-medium text-gray-700">{t('wizard.mandal')}</label>
          <input id="wz-mandal" value={data.mandal} onChange={(e) => onChange({ mandal: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
        </div>
        <div>
          <label htmlFor="wz-city" className="mb-1.5 block text-sm font-medium text-gray-700">{t('wizard.cityVillage')}</label>
          <select id="wz-city" value={data.cityVillage} onChange={(e) => onChange({ cityVillage: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm">
            <option value="">-</option>
            {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          {errors?.cityVillage && <p className="mt-1 text-xs text-red-600">{t('validation.required')}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="wz-locality" className="mb-1.5 block text-sm font-medium text-gray-700">{t('wizard.locality')}</label>
        <input id="wz-locality" value={data.locality} onChange={(e) => onChange({ locality: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="wz-landmark" className="mb-1.5 block text-sm font-medium text-gray-700">{t('wizard.landmark')}</label>
          <input id="wz-landmark" value={data.landmark} onChange={(e) => onChange({ landmark: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
        </div>
        <div>
          <label htmlFor="wz-pincode" className="mb-1.5 block text-sm font-medium text-gray-700">{t('wizard.pincode')}</label>
          <input id="wz-pincode" value={data.pincode} onChange={(e) => onChange({ pincode: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
          {errors?.pincode && <p className="mt-1 text-xs text-red-600">{t('validation.invalidPincode')}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="wz-address" className="mb-1.5 block text-sm font-medium text-gray-700">{t('wizard.address')}</label>
        <textarea
          id="wz-address"
          rows={2}
          value={data.address}
          onChange={(e) => onChange({ address: e.target.value })}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
        />
        {errors?.address && <p className="mt-1 text-xs text-red-600">{t('validation.required')}</p>}
      </div>

      <div>
        <label htmlFor="wz-map-location" className="mb-1.5 block text-sm font-medium text-gray-700">{t('wizard.mapLocation')}</label>
        <input
          id="wz-map-location"
          value={data.mapLocation}
          onChange={(e) => onChange({ mapLocation: e.target.value })}
          placeholder={t('wizard.mapLocationPlaceholder')}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
        />
        {errors?.mapLocation && <p className="mt-1 text-xs text-red-600">{t('validation.required')}</p>}
      </div>
    </div>
  );
}
