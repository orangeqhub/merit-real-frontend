import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';
import { userService } from '../../services/userService';
import { expressInterestService } from '../../services/expressInterestService';
import { toast } from '../../store/toastStore';
import { getInitials } from '../../utils/avatar';

export default function ProfileForm() {
  const { t } = useTranslation(['dashboard', 'forms', 'common']);
  const { user, setUser } = useAuthStore();
  const isCustomer = user?.role === 'customer' || user?.role === 'buyer';
  const isAgent = user?.role === 'agent' || user?.role === 'mediator';

  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    altMobile: user?.altMobile || '',
    address: user?.address || '',
    occupation: user?.occupation || '',
    referralAgentCode: user?.referralAgent?.memberId || '',
    agentName: user?.referralAgent?.name || '',
  });
  const [agentPreview, setAgentPreview] = useState(user?.referralAgent || null);
  const [agentError, setAgentError] = useState('');
  const [agentSuggestions, setAgentSuggestions] = useState([]);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      name: user?.name || '',
      email: user?.email || '',
      altMobile: user?.altMobile || '',
      address: user?.address || '',
      occupation: user?.occupation || '',
      referralAgentCode: user?.referralAgent?.memberId || '',
      agentName: user?.referralAgent?.name || '',
    });
    setAgentPreview(user?.referralAgent || null);
  }, [user]);

  function validate() {
    const next = {};
    if (!String(form.name || '').trim()) next.name = 'validation.required';
    if (!String(form.email || '').trim()) next.email = 'validation.required';
    if (!String(form.occupation || '').trim()) next.occupation = 'validation.required';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function selectAgent(agent) {
    if (!agent) return;
    setAgentPreview(agent);
    setAgentError('');
    setAgentSuggestions([]);
    setForm((f) => ({
      ...f,
      referralAgentCode: agent.memberId || '',
      agentName: agent.name || '',
    }));
  }

  async function validateReferral(code) {
    const trimmed = String(code || '').trim();
    if (!trimmed) {
      setAgentPreview(null);
      setAgentError('');
      setForm((f) => ({ ...f, agentName: '', referralAgentCode: '' }));
      return null;
    }
    try {
      const agent = await expressInterestService.validateAgent(trimmed);
      selectAgent(agent);
      return agent;
    } catch (err) {
      setAgentPreview(null);
      setAgentError(err.message || 'Invalid agent code');
      return null;
    }
  }

  async function searchAgentByName(query) {
    const q = String(query || '').trim();
    setForm((f) => ({ ...f, agentName: query, referralAgentCode: '' }));
    setAgentPreview(null);
    setAgentError('');
    if (q.length < 2) {
      setAgentSuggestions([]);
      return;
    }
    try {
      const rows = await expressInterestService.searchAgentsByName(q, { limit: 8 });
      setAgentSuggestions(rows);
    } catch {
      setAgentSuggestions([]);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    let preview = agentPreview;
    if (isCustomer && form.referralAgentCode.trim()) {
      if (!preview || preview.memberId !== form.referralAgentCode.trim()) {
        preview = await validateReferral(form.referralAgentCode);
      }
      if (!preview) {
        toast.error(agentError || 'Select a valid agent before saving.');
        return;
      }
    }
    if (isCustomer && form.agentName.trim() && !form.referralAgentCode.trim()) {
      toast.error('Select an agent from the list, or enter a valid Agent Code.');
      return;
    }

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
        if (!form.referralAgentCode.trim()) {
          payload.clearReferralAgent = true;
        } else {
          payload.referralAgentCode = form.referralAgentCode.trim();
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
        <div className="space-y-3 rounded-lg border border-dashed border-gray-300 p-4">
          <div className="relative">
            <label htmlFor="profile-agent-name" className="mb-1.5 block text-sm font-medium text-gray-700">
              Agent Name <span className="font-normal text-gray-400">(editable)</span>
            </label>
            <input
              id="profile-agent-name"
              value={form.agentName}
              onChange={(e) => searchAgentByName(e.target.value)}
              placeholder="Type agent name to search"
              autoComplete="off"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
            />
            {agentSuggestions.length > 0 && (
              <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                {agentSuggestions.map((agent) => (
                  <li key={agent.id || agent.memberId}>
                    <button
                      type="button"
                      onClick={() => selectAgent(agent)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-brand-50"
                    >
                      <span className="font-medium text-gray-800">{agent.name}</span>
                      <span className="font-mono text-xs text-gray-500">{agent.memberId}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <label htmlFor="profile-agent-code" className="mb-1.5 block text-sm font-medium text-gray-700">
              Agent Referral Code
            </label>
            <input
              id="profile-agent-code"
              value={form.referralAgentCode}
              onChange={(e) => {
                setForm((f) => ({ ...f, referralAgentCode: e.target.value }));
                setAgentPreview(null);
                setAgentError('');
                setAgentSuggestions([]);
              }}
              onBlur={() => validateReferral(form.referralAgentCode)}
              placeholder="Or enter Agent Code (e.g. Venkat26001)"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
            />
            {agentError && <p className="mt-1 text-xs text-red-600">{agentError}</p>}
            {agentPreview && (
              <p className="mt-2 text-xs text-green-700">
                Selected: <strong>{agentPreview.name}</strong>
                {agentPreview.memberId ? ` (${agentPreview.memberId})` : ''}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500">Search by name or enter code. Leave blank for no agent.</p>
          </div>
        </div>
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
