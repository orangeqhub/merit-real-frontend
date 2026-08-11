import { useTranslation } from 'react-i18next';

export default function Step7ContactPreference({ data, onChange, errors }) {
  const { t } = useTranslation('forms');

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="wz-contact-name" className="mb-1.5 block text-sm font-medium text-gray-700">{t('wizard.contactName')}</label>
        <input id="wz-contact-name" value={data.contactName} onChange={(e) => onChange({ contactName: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
        {errors?.contactName && <p className="mt-1 text-xs text-red-600">{t('validation.required')}</p>}
      </div>

      <div>
        <label htmlFor="wz-contact-phone" className="mb-1.5 block text-sm font-medium text-gray-700">{t('wizard.contactPhone')}</label>
        <input id="wz-contact-phone" inputMode="numeric" value={data.contactPhone} onChange={(e) => onChange({ contactPhone: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
        {errors?.contactPhone && <p className="mt-1 text-xs text-red-600">{t('validation.invalidMobile')}</p>}
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" checked={data.preferWhatsapp} onChange={(e) => onChange({ preferWhatsapp: e.target.checked })} className="h-4 w-4 rounded border-gray-300 text-brand-600" />
        {t('wizard.preferWhatsapp')}
      </label>
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" checked={data.preferCall} onChange={(e) => onChange({ preferCall: e.target.checked })} className="h-4 w-4 rounded border-gray-300 text-brand-600" />
        {t('wizard.preferCall')}
      </label>
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" checked={data.hidePhone} onChange={(e) => onChange({ hidePhone: e.target.checked })} className="h-4 w-4 rounded border-gray-300 text-brand-600" />
        {t('wizard.hidePhone')}
      </label>
    </div>
  );
}
