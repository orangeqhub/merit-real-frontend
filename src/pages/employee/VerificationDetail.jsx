import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, User } from 'lucide-react';
import { verificationService } from '../../services/verificationService';
import { useAuthStore } from '../../store/authStore';
import { hasPermission } from '../../utils/permissions';
import { toast } from '../../store/toastStore';
import DocumentPreview from '../../components/employee/DocumentPreview';
import InternalNotesPanel from '../../components/employee/InternalNotesPanel';

const CORRECTABLE_FIELDS = ['name', 'mobile', 'email', 'address', 'identityProof', 'profilePhoto'];

export default function VerificationDetail() {
  const { id } = useParams();
  const { t } = useTranslation('dashboard');
  const { user } = useAuthStore();
  const [record, setRecord] = useState(null);
  const [modal, setModal] = useState(null);
  const [reason, setReason] = useState('');
  const [selectedFields, setSelectedFields] = useState([]);

  function load() {
    verificationService.getById(user, id).then(setRecord);
  }

  useEffect(load, [id, user]);

  if (record === null) return null;
  if (!record) {
    return (
      <div className="text-center text-sm text-gray-500">
        {t('verification.noRecordsFound')}
      </div>
    );
  }

  const canRecommend = hasPermission(user, 'USER_VERIFICATION_RECOMMEND');
  const canRequestCorrection = hasPermission(user, 'USER_VERIFICATION_CORRECTION_REQUEST');

  async function handleStartReview() {
    try {
      await verificationService.startReview(user, id);
      toast.success(t('toast.propertyUpdated'));
      load();
    } catch (err) {
      toast.error(t(err.message));
    }
  }

  async function handleMarkComplete() {
    try {
      await verificationService.markComplete(user, id);
      toast.success(t('toast.propertyUpdated'));
      load();
    } catch (err) {
      toast.error(t(err.message));
    }
  }

  async function handleModalSubmit(e) {
    e.preventDefault();
    try {
      if (modal === 'correction') {
        await verificationService.addCorrectionRequest(user, id, { reason, fields: selectedFields });
      } else if (modal === 'recommend_approval') {
        await verificationService.recommendApproval(user, id, reason);
      } else if (modal === 'recommend_rejection') {
        await verificationService.recommendRejection(user, id, reason);
      }
      toast.success(t('toast.assignmentUpdated'));
      setModal(null);
      setReason('');
      setSelectedFields([]);
      load();
    } catch (err) {
      toast.error(t(err.message));
    }
  }

  function toggleField(field) {
    setSelectedFields((f) => (f.includes(field) ? f.filter((x) => x !== field) : [...f, field]));
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Link to="/employee/verifications" className="mb-4 flex items-center gap-1 text-sm text-brand-700 hover:underline">
        <ChevronLeft size={16} /> {t('verification.title')}
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                <User size={22} />
              </div>
              <div>
                <h1 className="font-semibold text-brand-800">{record.name}</h1>
                <p className="text-xs text-gray-400">{record.registrationId} &middot; {t('verification.requestedRole')}: {record.role}</p>
              </div>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div><dt className="text-xs uppercase text-gray-400">{t('table.mobile')}</dt><dd className="text-sm text-gray-800">{record.mobile}</dd></div>
              <div><dt className="text-xs uppercase text-gray-400">{t('table.email')}</dt><dd className="text-sm text-gray-800">{record.email}</dd></div>
              <div><dt className="text-xs uppercase text-gray-400">{t('table.location')}</dt><dd className="text-sm text-gray-800">{record.city}, {record.district}</dd></div>
              <div><dt className="text-xs uppercase text-gray-400">{t('verification.assignedDate')}</dt><dd className="text-sm text-gray-800">{record.assignedAt ? new Date(record.assignedAt).toLocaleDateString() : '-'}</dd></div>
              <div><dt className="text-xs uppercase text-gray-400">{t('verification.dueDate')}</dt><dd className="text-sm text-gray-800">{record.dueDate ? new Date(record.dueDate).toLocaleDateString() : '-'}</dd></div>
              <div><dt className="text-xs uppercase text-gray-400">{t('verification.priority')}</dt><dd className="text-sm capitalize text-gray-800">{record.priority ? t(`priority.${record.priority}`) : '-'}</dd></div>
            </dl>

            <p className="mt-4 text-sm text-brand-700">
              {t('verification.mobileVerification')}: <span className="font-medium">{t('document.status.verified')} (Demo OTP)</span>
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DocumentPreview title={t('document.types.profilePhoto')} fileName="profile-photo.jpg" uploadDate={record.createdAt} />
            <DocumentPreview title={t('document.types.identityProof')} fileName="identity-proof.pdf" uploadDate={record.createdAt} status="verified" onStatusChange={() => {}} />
          </div>

          {record.correctionHistory?.length > 0 && (
            <div className="rounded-xl border border-gray-200 p-4">
              <h2 className="text-sm font-semibold text-brand-800">{t('verification.correctionHistory')}</h2>
              <ul className="mt-2 space-y-2">
                {record.correctionHistory.map((c) => (
                  <li key={c.id} className="rounded-lg bg-gray-50 p-2.5 text-sm">
                    <p className="text-gray-700">{c.reason}</p>
                    <p className="mt-1 text-xs text-gray-400">
                      {c.fields?.join(', ')} &middot; {new Date(c.requestedAt).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-xl border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-brand-800">{t('verification.auditTimeline')}</h2>
            <ul className="mt-2 space-y-1 text-xs text-gray-500">
              <li>{t('assignment.registeredAt', { date: new Date(record.createdAt).toLocaleString() })}</li>
              {record.assignedAt && <li>{t('assignment.assignedAt', { date: new Date(record.assignedAt).toLocaleString() })}</li>}
              {record.updatedAt && <li>{t('verification.lastUpdated')}: {new Date(record.updatedAt).toLocaleString()}</li>}
            </ul>
          </div>

          <div className="rounded-xl border border-gray-200 p-4">
            <InternalNotesPanel recordType="userVerification" recordId={record.id} />
          </div>
        </div>

        <aside className="space-y-2">
          <span className="mb-2 block rounded-full bg-brand-50 px-3 py-1.5 text-center text-xs font-semibold text-brand-700">
            {t(`verificationStatus.${record.verificationStatus}`)}
          </span>
          <button type="button" onClick={handleStartReview} className="w-full rounded-lg border border-gray-300 py-2 text-sm font-medium hover:bg-gray-50">
            {t('verification.startReview')}
          </button>
          {canRequestCorrection && (
            <button type="button" onClick={() => setModal('correction')} className="w-full rounded-lg border border-blue-300 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50">
              {t('verification.requestCorrection')}
            </button>
          )}
          {canRecommend && (
            <>
              <button type="button" onClick={() => setModal('recommend_approval')} className="w-full rounded-lg bg-brand-600 py-2 text-sm font-semibold text-warm-white hover:bg-brand-700">
                {t('verification.recommendApproval')}
              </button>
              <button type="button" onClick={() => setModal('recommend_rejection')} className="w-full rounded-lg border border-red-300 py-2 text-sm font-medium text-red-700 hover:bg-red-50">
                {t('verification.recommendRejection')}
              </button>
            </>
          )}
          <button type="button" onClick={handleMarkComplete} className="w-full rounded-lg border border-green-300 py-2 text-sm font-medium text-green-700 hover:bg-green-50">
            {t('verification.markComplete')}
          </button>
        </aside>
      </div>

      {modal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 px-4">
          <form onSubmit={handleModalSubmit} className="w-full max-w-md rounded-xl bg-warm-white p-6 shadow-xl">
            <h2 className="font-semibold text-brand-800">
              {modal === 'correction' ? t('verification.requestCorrection') : modal === 'recommend_approval' ? t('verification.recommendApproval') : t('verification.recommendRejection')}
            </h2>
            <label htmlFor="verif-reason" className="mb-1 mt-3 block text-xs font-medium text-gray-600">
              {modal === 'recommend_approval' ? t('verification.recommendationNoteLabel') : t('verification.reasonLabel')}
            </label>
            <textarea
              id="verif-reason"
              required={modal !== 'recommend_approval'}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('verification.reasonPlaceholder')}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            {modal === 'correction' && (
              <div className="mt-3">
                <span className="mb-1 block text-xs font-medium text-gray-600">{t('verification.fieldsLabel')}</span>
                <div className="flex flex-wrap gap-2">
                  {CORRECTABLE_FIELDS.map((f) => (
                    <label key={f} className="flex items-center gap-1 rounded-full border border-gray-200 px-2 py-1 text-xs">
                      <input type="checkbox" checked={selectedFields.includes(f)} onChange={() => toggleField(f)} className="h-3.5 w-3.5" />
                      {f}
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-4 flex justify-end gap-3">
              <button type="button" onClick={() => setModal(null)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm">
                {t('category.cancel')}
              </button>
              <button type="submit" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-warm-white">
                {t('modal.submit')}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
