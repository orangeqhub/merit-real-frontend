import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';
import { userService } from '../../services/userService';
import { toast } from '../../store/toastStore';
import { getInitials } from '../../utils/avatar';
import AgentReferralSearch from '../forms/AgentReferralSearch';

export default function ProfileForm() {
  const { t } = useTranslation(['dashboard', 'forms', 'common']);
  const { user, setUser } = useAuthStore();
  const isCustomer = user?.role === 'customer' || user?.role === 'buyer';
  const isAgent = user?.role === 'agent' || user?.role === 'mediator';

  const initialReferralAgent = useMemo(
    () => (user?.referralAgent
      ? {
          id: user.referralAgent.id,
          name: user.referralAgent.name,
          memberId: user.referralAgent.memberId,
        }
      : null),
    [user?.referralAgent]
  );

  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    altMobile: user?.altMobile || '',
    address: user?.address || '',
    occupation: user?.occupation || '',
  });
  const [selectedReferralAgent, setSelectedReferralAgent] = useState(initialReferralAgent);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      name: user?.name || '',
      email: user?.email || '',
      altMobile: user?.altMobile || '',
      address: user?.address || '',
      occupation: user?.occupation || '',
    });
    setSelectedReferralAgent(initialReferralAgent);
  }, [user, initialReferralAgent]);

  function validate() {
    const next = {};
    if (!String(form.name || '').trim()) next.name = 'validation.required';
    if (!String(form.email || '').trim()) next.email = 'validation.required';
    if (!String(form.occupation || '').trim()) next.occupation = 'validation.required';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const payload = {
        name: String(form.name).trim(),
        email: String(form.email).trim(),
        address: String(form.address || '').trim(),
        occupation: String(form.occupation).trim(),
        altMobile: form.altMobile,
      };
      if (isCustomer) {
        const initialId = initialReferralAgent?.id || null;
        const nextId = selectedReferralAgent?.id || null;
        if (nextId !== initialId) {
          if (!nextId) {
            payload.clearReferralAgent = true;
          } else {
            payload.referralAgentId = nextId;
          }
        }
      }
      const updated = await userService.updateUser(user.id, payload);
      setUser(updated);
      toast.success(t('toast.profileUpdated'));
    } catch (err) {
      toast.error(err.message || t('toast.profileUpdateFailed', { defaultValue: 'Failed to update profile.' }));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
      <div className="flex items-center gap-4 rounded-lg bg-brand-50 p-4 text-sm text-brand-800">
        {user?.profilePhoto ? (
          <img
            src={user.profilePhoto}
            alt={user.name || 'Profile'}
            className="h-16 w-16 rounded-full object-cover ring-2 ring-brand-200"
          />
        ) : (
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-700 text-lg font-bold text-white">
            {getInitials(user?.name)}
          </span>
        )}
        <div>
          <p><strong>{isAgent ? 'Agent Code' : t('memberId')}:</strong> {user?.memberId || '-'}</p>
          <p><strong>{t('table.mobile')}:</strong> {user?.mobile}</p>
        </div>
      </div>

      <div>
        <label htmlFor="profile-name" className="mb-1.5 block text-sm font-medium text-gray-700">
          {isAgent ? 'Agent Name' : t('registration.fullName', { ns: 'forms' })}
        </label>
        <input
          id="profile-name"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
        />
        {errors.name && <p className="mt-1 text-xs text-red-600">{t(errors.name, { ns: 'forms' })}</p>}
      </div>
      <div>
        <label htmlFor="profile-email" className="mb-1.5 block text-sm font-medium text-gray-700">{t('registration.email', { ns: 'forms' })}</label>
        <input id="profile-email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
        {errors.email && <p className="mt-1 text-xs text-red-600">{t(errors.email, { ns: 'forms' })}</p>}
      </div>
      <div>
        <label htmlFor="profile-alt" className="mb-1.5 block text-sm font-medium text-gray-700">{t('registration.altMobile', { ns: 'forms' })}</label>
        <input id="profile-alt" value={form.altMobile} onChange={(e) => setForm((f) => ({ ...f, altMobile: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
      </div>
      <div>
        <label htmlFor="profile-occupation" className="mb-1.5 block text-sm font-medium text-gray-700">
          {t('registration.occupation', { ns: 'forms', defaultValue: 'Occupation' })}
          <span className="text-red-500"> *</span>
        </label>
        <input
          id="profile-occupation"
          value={form.occupation}
          onChange={(e) => setForm((f) => ({ ...f, occupation: e.target.value }))}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
          placeholder={t('registration.occupationPlaceholder', {
            ns: 'forms',
            defaultValue: 'e.g. Software Engineer, Business Owner, Teacher',
          })}
        />
        {errors.occupation && <p className="mt-1 text-xs text-red-600">{t(errors.occupation, { ns: 'forms' })}</p>}
      </div>
      <div>
        <label htmlFor="profile-address" className="mb-1.5 block text-sm font-medium text-gray-700">{t('registration.address', { ns: 'forms' })}</label>
        <textarea id="profile-address" rows={3} value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
      </div>

      {isCustomer && (
        <AgentReferralSearch
          value={selectedReferralAgent}
          onChange={setSelectedReferralAgent}
          label="Referral Agent"
        />
      )}

      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {saving ? t('buttons.saving', { ns: 'common', defaultValue: 'Saving…' }) : t('buttons.save', { ns: 'common', defaultValue: 'Save' })}
      </button>
    </form>
  );
}
