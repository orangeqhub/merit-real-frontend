import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { propertyService } from '../../services/propertyService';
import { siteVisitService } from '../../services/siteVisitService';
import { useAuthStore } from '../../store/authStore';
import { toast } from '../../store/toastStore';
import { getLocalizedField } from '../../utils/localize';
import { useLanguageStore } from '../../store/languageStore';
import EmptyState from '../../components/common/EmptyState';
import AgentReferralSearch from '../../components/forms/AgentReferralSearch';
import { clearPendingSiteVisit, savePendingSiteVisit } from '../../utils/pendingSiteVisit';
import { expressInterestService } from '../../services/expressInterestService';

/**
 * Schedule Site Visit for registered (approved) customers only.
 * Guests are redirected to the public website Login page.
 */
export default function ScheduleSiteVisitForm() {
  const { propertyId } = useParams();
  const { t } = useTranslation(['properties', 'common', 'forms']);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading, initialised } = useAuthStore();
  const language = useLanguageStore((s) => s.language);
  const interestId = searchParams.get('interestId');

  const resumePath = `/schedule-visit/${propertyId}${interestId ? `?interestId=${encodeURIComponent(interestId)}` : ''}`;
  const loginState = useMemo(
    () => ({
      from: resumePath,
      intent: 'schedule-visit',
      propertyId,
    }),
    [resumePath, propertyId]
  );

  const [property, setProperty] = useState(null);
  const [interest, setInterest] = useState(null);
  const [interestError, setInterestError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [visitDate, setVisitDate] = useState('');
  const [visitTime, setVisitTime] = useState('');
  const [visitMode, setVisitMode] = useState('own_vehicle');
  const [pickupAddress, setPickupAddress] = useState('');
  const [pickupLocation, setPickupLocation] = useState('');
  const [preferredPickupTime, setPreferredPickupTime] = useState('');
  const [visitorCount, setVisitorCount] = useState(1);
  const [remarks, setRemarks] = useState('');
  const [selectedReferralAgent, setSelectedReferralAgent] = useState(null);
  const [submitting, setSubmitting] = useState(false);

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

  useEffect(() => {
    if (!interestId || !user) return undefined;
    let active = true;
    setInterest(null);
    setInterestError('');
    expressInterestService
      .getById(interestId)
      .then((record) => {
        if (!active) return;
        const status = String(record?.status || '').toLowerCase();
        if (!record || !['approved', 'assigned'].includes(status) || String(record.propertyId) !== String(propertyId)) {
          setInterestError('This express interest is not approved for the selected property.');
          return;
        }
        setInterest(record);
        setInterestError('');
      })
      .catch((err) => {
        if (active) setInterestError(err.message || 'Unable to verify the approved express interest.');
      });
    return () => {
      active = false;
    };
  }, [interestId, propertyId, user]);

  useEffect(() => {
    if (!user?.referralAgent) return;
    setSelectedReferralAgent({
      id: user.referralAgent.id,
      name: user.referralAgent.name,
      memberId: user.referralAgent.memberId,
    });
  }, [user?.id, user?.referralAgent?.id, user?.referralAgent?.memberId, user?.referralAgent?.name]);

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
    if (interestId && visitMode === 'company_vehicle' && (!pickupAddress.trim() || !pickupLocation.trim() || !preferredPickupTime)) {
      toast.error('Pickup address, pickup location, and preferred pickup time are required for a company vehicle.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        propertyId: property.id,
        visitDate,
        visitTime,
        visitMode: interestId ? visitMode : undefined,
        visitorCount: interestId ? Number(visitorCount) : undefined,
        pickupAddress: interestId && visitMode === 'company_vehicle' ? pickupAddress.trim() : undefined,
        pickupLocation: interestId && visitMode === 'company_vehicle' ? pickupLocation.trim() : undefined,
        preferredPickupTime: interestId && visitMode === 'company_vehicle' ? preferredPickupTime : undefined,
        remarks: remarks.trim() || undefined,
        referralAgentCode: selectedReferralAgent?.memberId || undefined,
        referralAgentId: selectedReferralAgent?.id || undefined,
      };
      if (interestId) {
        if (!interest) {
          toast.error(interestError || 'Please wait while the approved interest is verified.');
          return;
        }
        await siteVisitService.submitFromInterest(interestId, payload);
      } else {
        await siteVisitService.submit(payload);
      }
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
        <h1 className="mt-2 text-2xl font-bold text-brand-900">{t('siteVisits.schedule', { ns: 'common' })}</h1>
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
          {interest && (
            <p className="mt-1 text-xs font-medium text-green-700">
              Approved interest #{interest.id} linked to this visit
            </p>
          )}
        </div>

        {interestError && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {interestError}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="visitDate" className="mb-1 block text-xs font-medium text-gray-600">
              {t('siteVisits.preferredDate', { ns: 'common' })}
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
              {t('siteVisits.preferredTime', { ns: 'common' })}
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

        {interestId && (
          <>
            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-gray-800">Travel mode</legend>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[
                  ['own_vehicle', 'Own Vehicle', 'I will travel to the property myself.'],
                  ['company_vehicle', 'Company Vehicle', 'Request pickup arranged by Merit.'],
                ].map(([value, label, hint]) => (
                  <label key={value} className={`cursor-pointer rounded-xl border p-3 ${visitMode === value ? 'border-brand-600 bg-brand-50' : 'border-gray-200'}`}>
                    <span className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                      <input type="radio" name="visitMode" value={value} checked={visitMode === value} onChange={(event) => setVisitMode(event.target.value)} />
                      {label}
                    </span>
                    <span className="mt-1 block pl-6 text-xs text-gray-500">{hint}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div>
              <label htmlFor="visitorCount" className="mb-1 block text-xs font-medium text-gray-600">Number of visitors</label>
              <input
                id="visitorCount"
                type="number"
                min="1"
                max="20"
                value={visitorCount}
                onChange={(event) => setVisitorCount(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm sm:w-40"
                required
              />
            </div>

            {visitMode === 'company_vehicle' && (
              <section className="space-y-4 rounded-xl border border-brand-200 bg-brand-50/30 p-4">
                <h2 className="text-sm font-semibold text-brand-900">Company vehicle pickup</h2>
                <div>
                  <label htmlFor="pickupAddress" className="mb-1 block text-xs font-medium text-gray-600">Pickup address</label>
                  <textarea id="pickupAddress" rows={2} value={pickupAddress} onChange={(event) => setPickupAddress(event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" required />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="pickupLocation" className="mb-1 block text-xs font-medium text-gray-600">Pickup location / landmark</label>
                <input id="pickupLocation" value={pickupLocation} onChange={(event) => setPickupLocation(event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" required />
              </div>
              <div>
                <label htmlFor="preferredPickupTime" className="mb-1 block text-xs font-medium text-gray-600">Preferred pickup time</label>
                <input id="preferredPickupTime" type="time" value={preferredPickupTime} onChange={(event) => setPreferredPickupTime(event.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" required />
              </div>
                </div>
              </section>
            )}
          </>
        )}

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

        <AgentReferralSearch
          value={selectedReferralAgent}
          onChange={setSelectedReferralAgent}
          label="Referral Agent"
        />

        <div className="flex flex-wrap gap-3 pt-1">
          <button
            type="submit"
            disabled={submitting || Boolean(interestId && !interest)}
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
