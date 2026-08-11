import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { siteSettingsService } from '../../services/settingsService';
import { toast } from '../../store/toastStore';

const EMPTY = { address: '', phone: '', email: '' };

export default function Settings() {
  const { t } = useTranslation('dashboard');
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    siteSettingsService
      .get()
      .then((data) => {
        if (!active) return;
        setForm({
          address: data?.address || '',
          phone: data?.phone || '',
          email: data?.email || '',
        });
      })
      .catch((err) => {
        toast.error(err.message || 'Failed to load contact details');
        if (active) setForm(EMPTY);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await siteSettingsService.update({
        address: form.address.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
      });
      setForm({
        address: updated?.address || '',
        phone: updated?.phone || '',
        email: updated?.email || '',
      });
      toast.success(t('toast.settingsUpdated', { defaultValue: 'Settings updated.' }));
    } catch (err) {
      toast.error(err.message || 'Unable to save contact details.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-gray-500">Loading…</p>;
  }

  return (
    <div className="max-w-lg space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-brand-900">
          {t('contactSettings.title', { defaultValue: 'Website Contact Details' })}
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          {t('contactSettings.hint', {
            defaultValue: 'These details appear on the Contact Us section and in the website footer.',
          })}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div>
          <label htmlFor="contact-address" className="mb-1.5 block text-sm font-medium text-gray-700">
            {t('cms.contactAddressEn', { defaultValue: 'Address' })}
          </label>
          <textarea
            id="contact-address"
            rows={3}
            value={form.address}
            onChange={(e) => setField('address', e.target.value)}
            placeholder="Office address"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <div>
          <label htmlFor="contact-phone" className="mb-1.5 block text-sm font-medium text-gray-700">
            {t('cms.contactPhone', { defaultValue: 'Phone Number' })}
          </label>
          <input
            id="contact-phone"
            type="text"
            value={form.phone}
            onChange={(e) => setField('phone', e.target.value)}
            placeholder="+91 90000 00000"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <div>
          <label htmlFor="contact-email" className="mb-1.5 block text-sm font-medium text-gray-700">
            {t('cms.contactEmail', { defaultValue: 'Email' })}
          </label>
          <input
            id="contact-email"
            type="email"
            value={form.email}
            onChange={(e) => setField('email', e.target.value)}
            placeholder="contact@example.com"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
        >
          {saving ? 'Saving…' : t('cms.saveContent', { defaultValue: 'Save' })}
        </button>
      </form>
    </div>
  );
}
