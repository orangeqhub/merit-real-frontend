import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { expressInterestService } from '../../services/expressInterestService';
import { mapBookingService } from '../../services/mapBookingService';
import { useAuthStore } from '../../store/authStore';
import { toast } from '../../store/toastStore';
import EmptyState from '../../components/common/EmptyState';
import { clearPendingBookPlot, savePendingBookPlot } from '../../utils/pendingBookPlot';
import { formatIndianCurrency } from '../../utils/formatIndianNumber';

/**
 * Map plot booking — same referral → admin approval → 15-day booking pattern as property Express Interest.
 */
export default function BookMapPlot() {
  const { externalId } = useParams();
  const { t } = useTranslation(['common', 'forms']);
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const joinedAgentCode = String(user?.referralAgent?.memberId || '').trim();
  const hasJoinedAgent = Boolean(joinedAgentCode);

  const [plot, setPlot] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [agentCode, setAgentCode] = useState('');
  const [agentError, setAgentError] = useState('');
  const [agentValid, setAgentValid] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [validating, setValidating] = useState(false);

  const referralSectionRef = useRef(null);
  const resumePath = `/book-plot/${encodeURIComponent(externalId || '')}`;

  useEffect(() => {
    if (!externalId) return;
    if (!user) {
      savePendingBookPlot(resumePath);
      toast.info('Please login or register as a customer to book this plot.');
      navigate('/login', {
        state: {
          from: resumePath,
          intent: 'book-plot',
          mapPlotExternalId: externalId,
        },
        replace: true,
      });
      return;
    }
    if (!['customer', 'buyer'].includes(user.role)) {
      clearPendingBookPlot();
      toast.info('Only registered customers can book a plot.');
      navigate('/map-layout');
      return;
    }
    if (user.status && user.status !== 'approved') {
      clearPendingBookPlot();
      toast.info('Your registration is pending admin approval. You can book after approval.');
      navigate('/application-status', {
        state: {
          mobile: user.mobile,
          pendingBookPlot: resumePath,
          intent: 'book-plot',
        },
      });
    }
  }, [user, externalId, navigate, resumePath]);

  useEffect(() => {
    let active = true;
    if (!externalId) {
      setNotFound(true);
      return undefined;
    }
    mapBookingService
      .getPlot(externalId)
      .then((row) => {
        if (!active) return;
        if (!row) setNotFound(true);
        else setPlot(row);
      })
      .catch(() => {
        if (active) setNotFound(true);
      });
    return () => {
      active = false;
    };
  }, [externalId]);

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
    if (!user || !plot) return;

    const payload = {
      mapPlotExternalId: plot.externalId || externalId,
    };

    if (hasJoinedAgent) {
      const referralCode = agentValid?.memberId || joinedAgentCode;
      if (!referralCode) {
        setAgentError('Your joined agent code could not be loaded.');
        return;
      }
      if (!agentValid) {
        const verified = await validateAgent(referralCode);
        if (!verified) return;
      }
      payload.referralAgentCode = referralCode;
      payload.referralAgentName = agentValid?.name || user.referralAgent?.name || undefined;
    }

    setSubmitting(true);
    try {
      await expressInterestService.submit(payload);
      clearPendingBookPlot();
      toast.success('Your plot interest has been submitted and is pending admin approval.');
      navigate('/buyer/interests');
    } catch (err) {
      toast.error(err.message || 'Unable to submit plot interest.');
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

  if (!plot || !user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-gray-500">
        {t('loading', { ns: 'common' })}
      </div>
    );
  }

  const saleable = String(plot.plotType || 'residential').toLowerCase() === 'residential'
    && String(plot.status || '').toLowerCase() === 'available';

  return (
    <div className="mx-auto max-w-lg px-4 py-8 sm:py-12">
      <div className="mb-6">
        <Link to="/map-layout" className="text-sm text-brand-700 hover:underline">
          ← Back to map layout
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-brand-900">Book Plot</h1>
        <p className="mt-1 text-sm text-gray-500">
          Submit interest for admin approval. After approval you can create a booking (15-day reservation).
          {hasJoinedAgent
            ? ' Your joined agent is suggested below.'
            : ' You can submit without an agent.'}
        </p>
      </div>

      {!saleable && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          This plot is not currently available for booking.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="rounded-xl border border-brand-100 bg-brand-50/40 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Selected plot</p>
          <p className="mt-1 font-semibold text-brand-900">
            Plot {plot.plotNo}
            {plot.phase ? ` · Phase ${plot.phase}` : ''}
          </p>
          <p className="mt-0.5 text-sm text-gray-600">Sky line Infra Anne Enclave</p>
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-gray-600">
            {plot.plotArea != null && <p>Area: {plot.plotArea} sq.yds</p>}
            {plot.facing && <p>Facing: {plot.facing}</p>}
            {formatIndianCurrency(plot.ratePerSqYd, { fallback: null }) && <p>Rate: {formatIndianCurrency(plot.ratePerSqYd)} / sq.yd</p>}
            {formatIndianCurrency(plot.plotCost, { fallback: null }) && <p>Total: {formatIndianCurrency(plot.plotCost)}</p>}
          </div>
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
              No agent is linked to your account. You can book without an agent referral.
            </p>
          </section>
        )}

        <div className="flex flex-wrap gap-3 pt-1">
          <button
            type="submit"
            disabled={!saleable || submitting || validating || (hasJoinedAgent && !agentCode.trim())}
            className="rounded-lg bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
          >
            {submitting
              ? 'Submitting…'
              : hasJoinedAgent && agentValid?.memberId
                ? `Book with ${agentValid.memberId}`
                : 'Submit Plot Interest'}
          </button>
          <button
            type="button"
            onClick={() => {
              clearPendingBookPlot();
              navigate('/map-layout');
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
