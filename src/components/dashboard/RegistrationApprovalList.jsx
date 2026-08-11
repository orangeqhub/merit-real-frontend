import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, X } from 'lucide-react';
import { registrationService } from '../../services/registrationService';
import { toast } from '../../store/toastStore';
import EmptyState from '../common/EmptyState';
import TablePagination from '../common/TablePagination';
import StatusBadge from './StatusBadge';
import { AGENT_GRADES } from '../../config/agentGrades';
import { useClientPagination } from '../../hooks/useClientPagination';

function DocLink({ href, label }) {
  if (!href) {
    return <span className="text-xs text-gray-400">{label}: —</span>;
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      download
      className="text-xs font-medium text-brand-700 underline hover:text-brand-900"
    >
      {label}
    </a>
  );
}

function maskAadhaar(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length !== 12) return value || '—';
  return `XXXX-XXXX-${digits.slice(-4)}`;
}

function maskPan(value) {
  const pan = String(value || '').toUpperCase();
  if (pan.length !== 10) return value || '—';
  return `${pan.slice(0, 5)}****${pan.slice(-1)}`;
}

function DetailRow({ label, value }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-800 break-words">{value || '—'}</dd>
    </div>
  );
}

export default function RegistrationApprovalList() {
  const { t } = useTranslation(['common', 'dashboard', 'forms']);
  const [rows, setRows] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [agentGrade, setAgentGrade] = useState('');
  const [gradeError, setGradeError] = useState('');
  const [busy, setBusy] = useState(false);

  function load() {
    registrationService.listPending().then((list) => {
      setRows(Array.isArray(list) ? list : []);
    }).catch((err) => {
      toast.error(err.message || 'Failed to load registrations');
      setRows([]);
    });
  }

  useEffect(load, []);

  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    total,
    totalPages,
    pageRows,
  } = useClientPagination(rows || [], 10);

  async function handleApprove(id) {
    if (viewing?.role === 'agent' && !agentGrade) {
      setGradeError(t('registration.gradeRequired', {
        ns: 'forms',
        defaultValue: 'Please select an agent grade before approving.',
      }));
      return;
    }

    setBusy(true);
    setGradeError('');
    try {
      const updated = await registrationService.approve(id, {
        grade: viewing?.role === 'agent' ? agentGrade : undefined,
      });
      toast.success(t('toast.registrationApproved', { ns: 'dashboard', memberId: updated.memberId }));
      setViewing(null);
      setRejecting(false);
      setReason('');
      setAgentGrade('');
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleReject() {
    if (!viewing || !reason.trim()) return;
    setBusy(true);
    try {
      await registrationService.reject(viewing.id, reason.trim());
      toast.success(t('toast.registrationRejected', { ns: 'dashboard' }));
      setViewing(null);
      setRejecting(false);
      setReason('');
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  function openView(row) {
    setViewing(row);
    setRejecting(false);
    setReason('');
    setAgentGrade('');
    setGradeError('');
  }

  function closeView() {
    if (busy) return;
    setViewing(null);
    setRejecting(false);
    setReason('');
    setAgentGrade('');
    setGradeError('');
  }

  if (rows === null) return null;
  if (rows.length === 0) return <EmptyState titleKey="empty.noData" />;

  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-warm-white">
        <table className="min-w-full divide-y divide-gray-100 text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">{t('table.name', { ns: 'dashboard' })}</th>
              <th className="px-4 py-3">{t('table.role', { ns: 'dashboard' })}</th>
              <th className="px-4 py-3">{t('table.mobile', { ns: 'dashboard' })}</th>
              <th className="px-4 py-3">{t('table.email', { ns: 'dashboard' })}</th>
              <th className="px-4 py-3">{t('table.location', { ns: 'dashboard' })}</th>
              <th className="px-4 py-3">{t('table.occupation', { ns: 'dashboard', defaultValue: 'Occupation' })}</th>
              <th className="px-4 py-3">{t('table.aadhaarNumber', { ns: 'dashboard' })}</th>
              <th className="px-4 py-3">{t('table.panNumber', { ns: 'dashboard' })}</th>
              <th className="px-4 py-3">{t('table.aadhaarProof', { ns: 'dashboard' })}</th>
              <th className="px-4 py-3">{t('table.panProof', { ns: 'dashboard' })}</th>
              <th className="px-4 py-3">{t('table.status', { ns: 'dashboard' })}</th>
              <th className="px-4 py-3">{t('table.when', { ns: 'dashboard' })}</th>
              <th className="px-4 py-3">{t('table.actions', { ns: 'dashboard' })}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pageRows.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50/80">
                <td className="px-4 py-3 font-medium text-gray-800">{u.name}</td>
                <td className="px-4 py-3 capitalize text-gray-700">{u.roleLabel || String(u.role || '').replace(/_/g, ' ')}</td>
                <td className="px-4 py-3 text-gray-700">{u.mobile}</td>
                <td className="px-4 py-3 text-gray-700">{u.email}</td>
                <td className="px-4 py-3 text-gray-700">
                  {[u.city, u.district].filter(Boolean).join(', ') || '—'}
                </td>
                <td className="px-4 py-3 text-gray-700">{u.occupation || '—'}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-700">{maskAadhaar(u.aadhaarNumber)}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-700">{maskPan(u.panNumber)}</td>
                <td className="px-4 py-3">
                  <DocLink
                    href={u.aadhaarProofPath || u.identityProof}
                    label={t('table.aadhaarProof', { ns: 'dashboard', defaultValue: 'View' })}
                  />
                </td>
                <td className="px-4 py-3">
                  <DocLink
                    href={u.panProofPath || u.addressProof}
                    label={t('table.panProof', { ns: 'dashboard', defaultValue: 'View' })}
                  />
                </td>
                <td className="px-4 py-3"><StatusBadge status={u.status} /></td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                  {u.createdAt ? new Date(u.createdAt).toLocaleString() : '—'}
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => openView(u)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-brand-300 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-800 hover:bg-brand-100"
                  >
                    <Eye size={14} />
                    {t('buttons.view', { defaultValue: 'View' })}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TablePagination
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />

      {viewing && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-warm-white shadow-xl">
            <div className="sticky top-0 flex items-start justify-between gap-3 border-b border-gray-100 bg-warm-white px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-brand-800">{viewing.name}</h2>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs capitalize text-gray-600">{viewing.roleLabel || String(viewing.role || '').replace(/_/g, ' ')}</span>
                  <StatusBadge status={viewing.status} />
                </div>
              </div>
              <button
                type="button"
                onClick={closeView}
                aria-label={t('buttons.close')}
                className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-5 px-5 py-5">
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <DetailRow label={t('table.mobile', { ns: 'dashboard' })} value={viewing.mobile} />
                <DetailRow label={t('table.email', { ns: 'dashboard' })} value={viewing.email} />
                <DetailRow
                  label={t('table.aadhaarNumber', { ns: 'dashboard' })}
                  value={maskAadhaar(viewing.aadhaarNumber)}
                />
                <DetailRow
                  label={t('table.panNumber', { ns: 'dashboard' })}
                  value={maskPan(viewing.panNumber)}
                />
                <DetailRow label={t('table.location', { ns: 'dashboard' })} value={[viewing.city, viewing.district].filter(Boolean).join(', ')} />
                <DetailRow
                  label={t('table.when', { ns: 'dashboard' })}
                  value={viewing.createdAt ? new Date(viewing.createdAt).toLocaleString() : null}
                />
                <div className="sm:col-span-2">
                  <DetailRow label={t('registration.address', { ns: 'forms', defaultValue: 'Address' })} value={viewing.address} />
                </div>
                <DetailRow
                  label={t('registration.occupation', { ns: 'forms', defaultValue: 'Occupation' })}
                  value={viewing.occupation}
                />
                {viewing.preferredPropertyType && (
                  <DetailRow
                    label={t('registration.preferredPropertyType', { ns: 'forms', defaultValue: 'Preferred Property Type' })}
                    value={viewing.preferredPropertyType}
                  />
                )}
                {viewing.agentCategory?.name && (
                  <DetailRow
                    label={t('registration.agentCategory', { ns: 'forms', defaultValue: 'Agent Category' })}
                    value={viewing.agentCategory.name}
                  />
                )}
                {(viewing.agentGradeLabel || viewing.agentGrade) && (
                  <DetailRow
                    label={t('registration.agentGrade', { ns: 'forms', defaultValue: 'Agent Grade' })}
                    value={viewing.agentGradeLabel || viewing.agentGrade}
                  />
                )}
                {viewing.memberId && (
                  <DetailRow label={t('table.memberId', { ns: 'dashboard' })} value={viewing.memberId} />
                )}
              </dl>

              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                  {t('documents.title', { ns: 'forms', defaultValue: 'Documents' })}
                </p>
                <div className="flex flex-wrap gap-4 rounded-lg border border-gray-100 bg-gray-50 px-3 py-3">
                  <DocLink href={viewing.profilePhoto} label={t('document.types.profilePhoto', { ns: 'dashboard' })} />
                  <DocLink
                    href={viewing.aadhaarProofPath || viewing.identityProof}
                    label={t('document.types.aadhaarProof', { ns: 'dashboard', defaultValue: 'Aadhaar Proof' })}
                  />
                  <DocLink
                    href={viewing.panProofPath || viewing.addressProof}
                    label={t('document.types.panProof', { ns: 'dashboard', defaultValue: 'PAN Proof' })}
                  />
                </div>
                {viewing.profilePhoto && (
                  <img
                    src={viewing.profilePhoto}
                    alt=""
                    className="mt-3 h-28 w-28 rounded-lg border border-gray-200 object-cover"
                  />
                )}
              </div>

              {viewing.status === 'pending' && (
                <div className="border-t border-gray-100 pt-4">
                  {!rejecting ? (
                    <div className="space-y-3">
                      {viewing.role === 'agent' && (
                        <div>
                          <label htmlFor="agent-grade" className="mb-1.5 block text-sm font-semibold text-brand-900">
                            {t('registration.assignGrade', {
                              ns: 'forms',
                              defaultValue: 'Assign Agent Grade',
                            })}{' '}
                            <span className="text-red-600">*</span>
                          </label>
                          <select
                            id="agent-grade"
                            value={agentGrade}
                            onChange={(e) => {
                              setAgentGrade(e.target.value);
                              setGradeError('');
                            }}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                          >
                            <option value="">
                              {t('registration.selectGrade', {
                                ns: 'forms',
                                defaultValue: '-- Select Grade --',
                              })}
                            </option>
                            {AGENT_GRADES.map((g) => (
                              <option key={g.code} value={g.code}>{g.label}</option>
                            ))}
                          </select>
                          {gradeError && <p className="mt-1 text-xs text-red-600">{gradeError}</p>}
                        </div>
                      )}
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setRejecting(true)}
                          className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 disabled:opacity-50"
                        >
                          {t('buttons.reject')}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleApprove(viewing.id)}
                          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-warm-white disabled:opacity-50"
                        >
                          {t('buttons.approve')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <h3 className="font-semibold text-brand-800">{t('modal.rejectionReason', { ns: 'dashboard' })}</h3>
                      <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        rows={3}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        placeholder={t('modal.rejectionReasonPlaceholder', { ns: 'dashboard' })}
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => { setRejecting(false); setReason(''); }}
                          className="rounded-lg border border-gray-300 px-4 py-2 text-sm"
                        >
                          {t('buttons.cancel')}
                        </button>
                        <button
                          type="button"
                          disabled={busy || !reason.trim()}
                          onClick={handleReject}
                          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-warm-white disabled:opacity-50"
                        >
                          {t('buttons.reject')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
