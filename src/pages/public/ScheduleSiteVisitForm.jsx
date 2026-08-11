import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { propertyService } from '../../services/propertyService';
import { siteVisitService } from '../../services/siteVisitService';
import { useAuthStore } from '../../store/authStore';
import { toast } from '../../store/toastStore';
import { getLocalizedField } from '../../utils/localize';
import { useLanguageStore } from '../../store/languageStore';
import EmptyState from '../../components/common/EmptyState';
import { clearPendingSiteVisit, savePendingSiteVisit } from '../../utils/pendingSiteVisit';

/**
 * Schedule Site Visit for registered (approved) customers only.
 * Guests are redirected to the public website Login page.
 */
export default function ScheduleSiteVisitForm() {
  const { propertyId } = useParams();
  const { t } = useTranslation(['properties', 'common', 'forms']);
  const navigate = useNavigate();
  const { user, loading, initialised } = useAuthStore();
  const language = useLanguageStore((s) => s.language);

  const resumePath = `/schedule-visit/${propertyId}`;
  const loginState = useMemo(
    () => ({
      from: resumePath,
      intent: 'schedule-visit',
      propertyId,
    }),
    [resumePath, propertyId]
  );

  const [property, setProperty] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [visitDate, setVisitDate] = useState('');
  const [visitTime, setVisitTime] = useState('');
  const [remarks, setRemarks] = useState('');
  const [agentCode, setAgentCode] = useState('');
  const [agentName, setAgentName] = useState('');
  const [agentError, setAgentError] = useState('');
  const [agentValid, setAgentValid] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    savePendingSiteVisit(resumePath);
  }, [resumePath]);

  useEffect(() => {
    if (!user) return;
    if (!['customer', 'buyer'].includes(user.role)) {
      clearPendingSiteVisit();
      toast.info('Please login with a customer account to schedule a site visit.');
      navigate('/login', { state: loginState, replace: true });
      return;
    }
    if (user.status && user.status !== 'approved') {
      clearPendingSiteVisit();
      toast.info('Your registration is pending admin approval. You can schedule a visit after approval.');
      navigate('/application-status', {
        state: { mobile: user.mobile, intent: 'schedule-visit' },
        replace: true,
      });
    }
  }, [user, navigate, loginState]);

  useEffect(() => {
    let active = true;
    propertyService.getPropertyById(propertyId).then((p) => {
      if (!active) return;
      if (!p) setNotFound(true);
      else setProperty(p);
    });
    return () => {
      active = false;
    };
  }, [propertyId]);

  const validateAgent = useCallback(async (code) => {
    const trimmed = String(code || '').trim();
    setAgentError('');
    setAgentValid(null);
    if (!trimmed) {
      setAgentName('');
      return;
    }
    setValidating(true);
    try {
      const agent = await siteVisitService.validateAgent(trimmed);
      setAgentValid(agent);
      setAgentName(agent.name || '');
      setAgentError('');
    } catch (err) {
      setAgentValid(null);
      setAgentName('');
      setAgentError(err.message || 'Invalid Agent ID. No active agent found with this ID.');
    } finally {
      setValidating(false);
    }
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!user || !property) return;
    if (!visitDate) {
      toast.error('Preferred visit date is required.');
      return;
    }
    if (!visitTime) {
      toast.error('Preferred visit time is required.');
      return;
    }
    if (agentCode.trim() && !agentValid) {
      setAgentError('Please enter a valid Agent ID or clear the field.');
      return;
    }

    setSubmitting(true);
    try {
      await siteVisitService.submit({
        propertyId: property.id,
        visitDate,
        visitTime,
        remarks: remarks.trim() || undefined,
        referralAgentCode: agentCode.trim() || undefined,
      });
      clearPendingSiteVisit();
      toast.success('Your site visit request has been submitted and is pending approval.');
      navigate('/buyer/visits');
    } catch (err) {
      toast.error(err.message || 'Unable to submit site visit request.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!initialised || loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-gray-500">
        {t('loading', { ns: 'common' })}
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={loginState} />;
  }

  if (!['customer', 'buyer'].includes(user.role) || (user.status && user.status !== 'approved')) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-gray-500">
        {t('loading', { ns: 'common' })}
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState titleKey="empty.noResults" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-gray-500">
        {t('loading', { ns: 'common' })}
      </div>
    );
  }

  const title = getLocalizedField(property, 'title', language);
  const minDate = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-lg px-4 py-8 sm:py-12">
      <div className="mb-6">
        <Link to={`/properties/${property.id}`} className="text-sm text-brand-700 hover:underline">
          ← Back to property
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-brand-900">{t('buttons.scheduleVisit', { ns: 'common' })}</h1>
        <p className="mt-1 text-sm text-gray-500">
          Your registered profile will be used automatically. Referral agent is optional.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="rounded-xl border border-brand-100 bg-brand-50/40 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Selected property</p>
          <p className="mt-1 font-semibold text-brand-900">{title}</p>
          <p className="mt-0.5 text-sm text-gray-600">Property ID: #{property.id}</p>
          {property.ventureName && <p className="text-sm text-gray-600">{property.ventureName}</p>}
          <p className="mt-2 text-xs text-gray-500">
            Submitted as <span className="font-medium text-gray-700">{user.name}</span>
            {user.memberId ? ` (${user.memberId})` : ''}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="visitDate" className="mb-1 block text-xs font-medium text-gray-600">
              Preferred Visit Date
            </label>
            <input
              id="visitDate"
              type="date"
              min={minDate}
              value={visitDate}
              onChange={(e) => setVisitDate(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <div>
            <label htmlFor="visitTime" className="mb-1 block text-xs font-medium text-gray-600">
              Preferred Visit Time
            </label>
            <input
              id="visitTime"
              type="time"
              value={visitTime}
              onChange={(e) => setVisitTime(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        </div>

        <div>
          <label htmlFor="remarks" className="mb-1 block text-xs font-medium text-gray-600">
            Remarks <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <textarea
            id="remarks"
            rows={3}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Any preferred notes for the visit…"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <section className="rounded-xl border border-dashed border-gray-300 p-4">
          <h2 className="mb-1 text-sm font-semibold text-gray-800">
            Referral Agent ID <span className="font-normal text-gray-400">(optional)</span>
          </h2>
          <p className="mb-3 text-xs text-gray-500">
            If an agent referred you, enter their Agent ID. Leave blank if you do not have one.
          </p>
          <div className="space-y-3">
            <div>
              <label htmlFor="agentCode" className="mb-1 block text-xs font-medium text-gray-600">
                Agent ID / Referral Code
              </label>
              <input
                id="agentCode"
                value={agentCode}
                onChange={(e) => {
                  setAgentCode(e.target.value);
                  setAgentValid(null);
                  setAgentName('');
                  setAgentError('');
                }}
                onBlur={() => validateAgent(agentCode)}
                placeholder="e.g. AGT-2026-000001"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              {validating && <p className="mt-1 text-xs text-gray-500">Validating agent…</p>}
              {agentError && <p className="mt-1 text-xs text-red-600">{agentError}</p>}
              {agentValid && !agentError && (
                <p className="mt-1 text-xs text-green-700">Valid agent found</p>
              )}
            </div>
            {(agentName || agentValid) && (
              <div>
                <label htmlFor="agentName" className="mb-1 block text-xs font-medium text-gray-600">
                  Agent Name
                </label>
                <input
                  id="agentName"
                  value={agentName}
                  readOnly
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800"
                />
              </div>
            )}
          </div>
        </section>

        <div className="flex flex-wrap gap-3 pt-1">
          <button
            type="submit"
            disabled={submitting || Boolean(agentCode.trim() && !agentValid)}
            className="rounded-lg bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
          >
            {submitting ? 'Submitting…' : 'Submit Visit Request'}
          </button>
          <button
            type="button"
            onClick={() => {
              clearPendingSiteVisit();
              navigate(`/properties/${property.id}`);
            }}
            className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
