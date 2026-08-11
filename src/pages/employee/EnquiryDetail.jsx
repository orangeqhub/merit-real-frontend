import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft } from 'lucide-react';
import { enquiryService } from '../../services/enquiryService';
import { propertyService } from '../../services/propertyService';
import { visitService } from '../../services/visitService';
import { useAuthStore } from '../../store/authStore';
import { hasPermission } from '../../utils/permissions';
import { toast } from '../../store/toastStore';
import CallNoteTimeline from '../../components/employee/CallNoteTimeline';
import InternalNotesPanel from '../../components/employee/InternalNotesPanel';

const STATUSES = ['new', 'contacted', 'followup_required', 'visit_requested', 'converted', 'closed', 'not_interested'];

function toLocalInputValue(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function EnquiryDetail() {
  const { id } = useParams();
  const { t } = useTranslation(['dashboard', 'common']);
  const { user } = useAuthStore();
  const [enquiry, setEnquiry] = useState(null);
  const [property, setProperty] = useState(null);
  const [nextFollowUp, setNextFollowUp] = useState('');
  const [saving, setSaving] = useState(false);

  function load() {
    if (!user || !id) return;
    enquiryService.getById(user, id)
      .then(async (e) => {
        setEnquiry(e || null);
        if (e?.propertyId) {
          try {
            setProperty(await propertyService.getPropertyById(e.propertyId));
          } catch {
            setProperty(null);
          }
        } else {
          setProperty(null);
        }
        setNextFollowUp(toLocalInputValue(e?.nextFollowUpAt));
      })
      .catch(() => setEnquiry(null));
  }

  useEffect(load, [id, user]);

  if (enquiry === null) {
    return <p className="text-sm text-gray-500">Loading…</p>;
  }
  if (!enquiry) {
    return <div className="text-center text-sm text-gray-500">{t('empty.noData', { ns: 'common' })}</div>;
  }

  const canUpdate = hasPermission(user, 'ENQUIRY_UPDATE');
  const canCallNotes = hasPermission(user, 'CALL_NOTES_MANAGE') || canUpdate;
  const canInternalNotes = hasPermission(user, 'INTERNAL_NOTES_MANAGE') || hasPermission(user, 'INTERNAL_NOTES_VIEW') || canUpdate;

  async function runAction(fn, successMessage) {
    setSaving(true);
    try {
      await fn();
      toast.success(successMessage || t('toast.assignmentUpdated'));
      load();
    } catch (err) {
      toast.error(t(err.message, { defaultValue: err.message }));
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(status) {
    await runAction(() => enquiryService.updateContactStatus(user, id, status));
  }

  async function handlePriorityChange(priority) {
    await runAction(() => enquiryService.setPriority(user, id, priority));
  }

  async function handleSaveFollowUp() {
    if (!nextFollowUp) {
      toast.error('Please select a follow-up date and time.');
      return;
    }
    await runAction(
      () => enquiryService.setNextFollowUp(user, id, new Date(nextFollowUp).toISOString()),
      t('enquiryDetail.saveFollowUp')
    );
  }

  async function handleScheduleVisit() {
    if (!nextFollowUp) {
      toast.error('Set a follow-up date/time before scheduling a visit.');
      return;
    }
    await runAction(async () => {
      await visitService.schedule({
        propertyId: enquiry.propertyId,
        buyerId: null,
        buyerName: enquiry.buyerName,
        sellerId: property?.sellerId,
        scheduledFor: new Date(nextFollowUp).toISOString(),
        assignedEmployeeId: user.id,
        assignedBy: user.id,
      });
      await enquiryService.updateContactStatus(user, id, 'visit_requested');
    });
  }

  async function handleMarkComplete() {
    await runAction(() => enquiryService.markComplete(user, id));
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Link to="/employee/enquiries" className="mb-4 flex items-center gap-1 text-sm text-brand-700 hover:underline">
        <ChevronLeft size={16} /> {t('nav.enquiries', { ns: 'common' })}
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 p-5">
            <h1 className="font-semibold text-brand-800">{enquiry.buyerName}</h1>
            <p className="text-sm text-gray-500">{enquiry.buyerPhone}</p>
            {(property || enquiry.propertyTitle) && (
              <p className="mt-2 text-sm text-gray-700">
                {property?.titleEn || enquiry.propertyTitle}
                {property?.locationEn ? ` · ${property.locationEn}` : ''}
              </p>
            )}
            <p className="mt-2 text-sm text-gray-600">{enquiry.message}</p>
            <p className="mt-2 text-xs text-gray-400">{t('table.action')}: {enquiry.channel || 'interest'}</p>
          </div>

          {canCallNotes && (
            <div className="rounded-xl border border-gray-200 p-4">
              <CallNoteTimeline enquiryId={enquiry.id} />
            </div>
          )}

          {canInternalNotes && (
            <div className="rounded-xl border border-gray-200 p-4">
              <InternalNotesPanel recordType="enquiry" recordId={enquiry.id} />
            </div>
          )}
        </div>

        <aside className="space-y-3">
          <span className="mb-1 block rounded-full bg-brand-50 px-3 py-1.5 text-center text-xs font-semibold text-brand-700">
            {t(`enquiryStatus.${enquiry.status}`, { defaultValue: enquiry.status })}
          </span>

          {canUpdate && (
            <>
              <div>
                <label htmlFor="enq-status" className="mb-1 block text-xs font-medium text-gray-600">{t('table.status')}</label>
                <select
                  id="enq-status"
                  value={enquiry.status || 'new'}
                  disabled={saving}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{t(`enquiryStatus.${s}`)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="enq-priority" className="mb-1 block text-xs font-medium text-gray-600">{t('verification.priority')}</label>
                <select
                  id="enq-priority"
                  value={enquiry.priority || 'medium'}
                  disabled={saving}
                  onChange={(e) => handlePriorityChange(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                >
                  <option value="low">{t('priority.low')}</option>
                  <option value="medium">{t('priority.medium')}</option>
                  <option value="high">{t('priority.high')}</option>
                </select>
              </div>

              <div>
                <label htmlFor="enq-followup" className="mb-1 block text-xs font-medium text-gray-600">
                  {t('enquiryDetail.nextFollowUp')}
                </label>
                <input
                  id="enq-followup"
                  type="datetime-local"
                  value={nextFollowUp}
                  disabled={saving}
                  onChange={(e) => setNextFollowUp(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                />
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSaveFollowUp}
                  className="mt-2 w-full rounded-lg bg-brand-600 py-1.5 text-xs font-semibold text-warm-white disabled:opacity-50"
                >
                  {t('enquiryDetail.saveFollowUp')}
                </button>
              </div>

              <button
                type="button"
                disabled={saving}
                onClick={handleScheduleVisit}
                className="w-full rounded-lg border border-gray-300 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
              >
                {t('enquiryDetail.scheduleVisit')}
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={handleMarkComplete}
                className="w-full rounded-lg border border-green-300 py-2 text-sm font-medium text-green-700 hover:bg-green-50 disabled:opacity-50"
              >
                {t('enquiryDetail.markComplete')}
              </button>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
