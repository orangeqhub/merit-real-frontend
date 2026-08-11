import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { propertyService } from '../../services/propertyService';
import { expressInterestService } from '../../services/expressInterestService';
import { useAuthStore } from '../../store/authStore';
import { toast } from '../../store/toastStore';
import { getLocalizedField } from '../../utils/localize';
import { useLanguageStore } from '../../store/languageStore';
import EmptyState from '../../components/common/EmptyState';
import { clearPendingExpressInterest, savePendingExpressInterest } from '../../utils/pendingExpressInterest';

/**
 * Express Interest for registered (approved) customers only.
 * - Joined under an agent → suggest that agent's code only.
 * - No joined agent → no agent suggestions; submit without agent.
 */
export default function ExpressInterestForm() {
  const { propertyId } = useParams();
  const { t } = useTranslation(['properties', 'common', 'forms']);
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const language = useLanguageStore((s) => s.language);

  const joinedAgentCode = String(user?.referralAgent?.memberId || '').trim();
  const hasJoinedAgent = Boolean(joinedAgentCode);

  const [property, setProperty] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [agentCode, setAgentCode] = useState('');
  const [agentError, setAgentError] = useState('');
  const [agentValid, setAgentValid] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [validating, setValidating] = useState(false);

  const referralSectionRef = useRef(null);

  useEffect(() => {
    const resumePath = `/express-interest/${propertyId}`;
    if (!user) {
      savePendingExpressInterest(resumePath);
      toast.info('Please login or register as a customer to express interest.');
      navigate('/login', {
        state: {
          from: resumePath,
          intent: 'express-interest',
          propertyId,
        },
        replace: true,
      });
      return;
    }
    if (!['customer', 'buyer'].includes(user.role)) {
      clearPendingExpressInterest();
      toast.info('Only registered customers can express interest.');
      navigate(`/properties/${propertyId}`);
      return;
    }
    if (user.status && user.status !== 'approved') {
      clearPendingExpressInterest();
      toast.info('Your registration is pending admin approval. You can express interest after approval.');
      navigate('/application-status', { state: { mobile: user.mobile } });
    }
  }, [user, propertyId, navigate]);

  useEffect(() => {
    let active = true;
    propertyService.getPropertyById(propertyId).then((p) => {
      if (!active) return;
      if (!p) setNotFound(true);
      else setProperty(p);
    });
    return () => { active = false; };
  }, [propertyId]);

  const validateAgent = useCallback(async (code) => {
    const trimmed = String(code || '').trim();
    setAgentError('');
    setAgentValid(null);
    if (!trimmed) return null;
    setValidating(true);
    try {
      const agent = await expressInterestService.validateAgent(trimmed);
      setAgentValid(agent);
      setAgentError('');
      return agent;
    } catch (err) {
      setAgentValid(null);
      setAgentError(err.message || 'Agent not found. Please check the Agent Code.');
      return null;
    } finally {
      setValidating(false);
    }
  }, []);

  // Suggest joined agent code only when the customer registered under an agent.
  useEffect(() => {
    if (!user || !['customer', 'buyer'].includes(user.role)) return;

    const code = String(user.referralAgent?.memberId || '').trim();
    if (code) {
      setAgentCode(code);
      setAgentValid({
        id: user.referralAgent?.id,
        name: user.referralAgent?.name,
        memberId: user.referralAgent?.memberId,
      });
      setAgentError('');
      validateAgent(code);
    } else {
      setAgentCode('');
      setAgentValid(null);
      setAgentError('');
    }

    const timer = window.setTimeout(() => {
      if (code) {
        referralSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 120);

    return () => window.clearTimeout(timer);
  }, [user, validateAgent]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!user || !property) return;

    // No joined agent → submit without any agent.
    if (!hasJoinedAgent) {
      setSubmitting(true);
      try {
        await expressInterestService.submit({ propertyId: property.id });
        clearPendingExpressInterest();
        toast.success('Your interest has been submitted and is pending approval.');
        navigate('/buyer/interests');
      } catch (err) {
        toast.error(err.message || 'Unable to submit interest.');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const referralCode = agentValid?.memberId || joinedAgentCode;
    if (!referralCode) {
      setAgentError('Your joined agent code could not be loaded.');
      return;
    }
    if (!agentValid) {
      const verified = await validateAgent(referralCode);
      if (!verified) return;
    }

    setSubmitting(true);
    try {
      await expressInterestService.submit({
        propertyId: property.id,
        referralAgentCode: referralCode,
        referralAgentName: agentValid?.name || user.referralAgent?.name || undefined,
      });
      clearPendingExpressInterest();
      toast.success('Your interest has been submitted and is pending approval.');
      navigate('/buyer/interests');
    } catch (err) {
      toast.error(err.message || 'Unable to submit interest.');
    } finally {
      setSubmitting(false);
    }
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState titleKey="empty.noResults" />
      </div>
    );
  }

  if (!property || !user) {
    return <div className="mx-auto max-w-3xl px-4 py-16 text-center text-gray-500">{t('loading', { ns: 'common' })}</div>;
  }

  const title = getLocalizedField(property, 'title', language);

  return (
    <div className="mx-auto max-w-lg px-4 py-8 sm:py-12">
      <div className="mb-6">
        <Link to={`/properties/${property.id}`} className="text-sm text-brand-700 hover:underline">
          ← Back to property
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-brand-900">{t('buttons.expressInterest', { ns: 'common' })}</h1>
        <p className="mt-1 text-sm text-gray-500">
          Your registered profile will be used automatically.
          {hasJoinedAgent
            ? ' Your joined agent is suggested below.'
            : ' You can submit interest without an agent.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="rounded-xl border border-brand-100 bg-brand-50/40 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Interested property</p>
          <p className="mt-1 font-semibold text-brand-900">{title}</p>
          <p className="mt-0.5 text-sm text-gray-600">Property ID: #{property.id}</p>
          {property.ventureName && <p className="text-sm text-gray-600">{property.ventureName}</p>}
          <p className="mt-2 text-xs text-gray-500">
            Submitted as <span className="font-medium text-gray-700">{user.name}</span>
            {user.memberId ? ` (${user.memberId})` : ''}
          </p>
        </div>

        {hasJoinedAgent ? (
          <section
            id="referral-agent"
            ref={referralSectionRef}
            className="scroll-mt-24 rounded-xl border border-dashed border-brand-300 bg-brand-50/30 p-4"
          >
            <h2 className="mb-1 text-sm font-semibold text-gray-800">Suggested Agent Code</h2>
            <p className="mb-3 text-xs text-gray-500">
              Based on the agent you joined under. Only this agent code is shown.
            </p>

            <div>
              <label htmlFor="agentCode" className="mb-1 block text-xs font-medium text-gray-600">
                Agent Code
              </label>
              <input
                id="agentCode"
                value={agentCode}
                readOnly
                autoComplete="off"
                className="w-full cursor-default rounded-lg border border-brand-200 bg-white px-3 py-2.5 text-sm font-semibold text-brand-900 focus:outline-none"
              />
              {validating && <p className="mt-1 text-xs text-gray-500">Validating agent…</p>}
              {agentError && <p className="mt-1 text-xs text-red-600">{agentError}</p>}
              {agentValid && !agentError && (
                <p className="mt-2 text-xs text-green-700">
                  Suggested agent code: <span className="font-semibold">{agentValid.memberId}</span>
                </p>
              )}
            </div>
          </section>
        ) : (
          <section className="rounded-xl border border-dashed border-gray-200 bg-gray-50/60 p-4">
            <h2 className="mb-1 text-sm font-semibold text-gray-800">Agent Referral</h2>
            <p className="text-xs text-gray-500">
              No agent is linked to your account, so no agent suggestion is shown. You can express interest without an agent.
            </p>
          </section>
        )}

        <div className="flex flex-wrap gap-3 pt-1">
          <button
            type="submit"
            disabled={submitting || validating || (hasJoinedAgent && !agentCode.trim())}
            className="rounded-lg bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
          >
            {submitting
              ? 'Submitting…'
              : hasJoinedAgent && agentValid?.memberId
                ? `Submit with ${agentValid.memberId}`
                : 'Submit Interest'}
          </button>
          <button
            type="button"
            onClick={() => {
              clearPendingExpressInterest();
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
