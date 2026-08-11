import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cmsService } from '../../services/cmsService';
import { toast } from '../../store/toastStore';

const FIELDS = [
  { key: 'aboutEn', labelKey: 'cms.aboutEn', textarea: true },
  { key: 'aboutTe', labelKey: 'cms.aboutTe', textarea: true },
  { key: 'disclaimerEn', labelKey: 'cms.disclaimerEn', textarea: true },
  { key: 'disclaimerTe', labelKey: 'cms.disclaimerTe', textarea: true },
  { key: 'contactPhone', labelKey: 'cms.contactPhone' },
  { key: 'contactEmail', labelKey: 'cms.contactEmail' },
  { key: 'contactAddressEn', labelKey: 'cms.contactAddressEn', textarea: true },
  { key: 'contactAddressTe', labelKey: 'cms.contactAddressTe', textarea: true },
  { key: 'contactWhatsapp', labelKey: 'cms.contactWhatsapp' },
  { key: 'contactLandmarkEn', labelKey: 'cms.contactLandmarkEn' },
  { key: 'contactLandmarkTe', labelKey: 'cms.contactLandmarkTe' },
  { key: 'contactMapUrl', labelKey: 'cms.contactMapUrl' },
  { key: 'businessHoursWeekdayEn', labelKey: 'cms.businessHoursWeekdayEn' },
  { key: 'businessHoursWeekdayTe', labelKey: 'cms.businessHoursWeekdayTe' },
  { key: 'businessHoursSundayEn', labelKey: 'cms.businessHoursSundayEn' },
  { key: 'businessHoursSundayTe', labelKey: 'cms.businessHoursSundayTe' },
];

export default function Cms() {
  const { t } = useTranslation('dashboard');
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    cmsService.getCms().then(setForm);
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    await cmsService.updateCms(form);
    setSaving(false);
    toast.success(t('toast.cmsUpdated'));
  }

  if (!form) return null;

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-4">
      {FIELDS.map((f) => (
        <div key={f.key}>
          <label htmlFor={f.key} className="mb-1.5 block text-sm font-medium text-gray-700">{t(f.labelKey)}</label>
          {f.textarea ? (
            <textarea
              id={f.key}
              rows={3}
              value={form[f.key] || ''}
              onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          ) : (
            <input
              id={f.key}
              value={form[f.key] || ''}
              onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          )}
        </div>
      ))}
      <button type="submit" disabled={saving} className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-warm-white disabled:opacity-60">
        {t('cms.saveContent')}
      </button>
    </form>
  );
}
