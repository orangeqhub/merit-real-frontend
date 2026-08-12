import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, Check, X, MessageSquare, UserPlus, RefreshCw } from 'lucide-react';
import { expressInterestService } from '../../services/expressInterestService';
import { agentService } from '../../services/managedUserService';
import { toast } from '../../store/toastStore';
import { confirmDialog } from '../../store/confirmStore';
import { useDomainRealtime, useRealtimeEvent } from '../../hooks/useDomainRealtime';
import { useOpenRecordFromUrl } from '../../hooks/useOpenRecordFromUrl';
import EmptyState from '../../components/common/EmptyState';
import SearchBox from '../../components/common/SearchBox';
import TablePagination from '../../components/common/TablePagination';
import TableActionsMenu from '../../components/common/TableActionsMenu';
import { useTableState } from '../../hooks/useTableState';

const STATUS_LABELS = {
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  rejected: 'Rejected',
  assigned: 'Assigned',
  purchase_requested: 'Purchase Requested',
  booking_requested: 'Booking Requested',
  closed: 'Closed',
};

function statusClass(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'pending_approval') return 'bg-amber-50 text-amber-800';
  if (s === 'approved' || s === 'assigned') return 'bg-green-50 text-green-800';
  if (s === 'rejected') return 'bg-red-50 text-red-700';
  return 'bg-gray-100 text-gray-700';
}

export default function ExpressInterests() {
  const { t } = useTranslation(['dashboard', 'common']);
  const [rows, setRows] = useState([]);
  const [agents, setAgents] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [viewing, setViewing] = useState(null);
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [assignId, setAssignId] = useState(null);
  const [assignAgentId, setAssignAgentId] = useState('');
  const [remarkId, setRemarkId] = useState(null);
  const [internalRemark, setInternalRemark] = useState('');

  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const data = await expressInterestService.getAdminList({
        pageSize: 100,
        status: statusFilter || undefined,
      });
      setRows(data?.items || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load interests');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    agentService.list({ status: 'ACTIVE', pageSize: 100 })
      .then((data) => setAgents(data?.items || []))
      .catch(() => setAgents([]));
  }, [statusFilter]);

  useDomainRealtime(true);

  const mergeInterestUpdate = useCallback((payload) => {
    const interest = payload?.interest;
    if (!interest?.id) return;
    setRows((prev) => {
      const idx = prev.findIndex((row) => row.id === interest.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...interest };
        return next;
      }
      if (payload.action === 'created') return [interest, ...prev];
      return prev;
    });
    setViewing((prev) => (prev?.id === interest.id ? { ...prev, ...interest } : prev));
  }, []);

  useRealtimeEvent('express-interest:updated', mergeInterestUpdate, true);
  useRealtimeEvent('express-interest:created', mergeInterestUpdate, true);

  useOpenRecordFromUrl({
    records: rows,
    fetchById: (id) => expressInterestService.getById(id),
    onOpen: setViewing,
    stateKey: 'openInterestId',
  });

  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    total,
    totalPages,
    pageRows,
    search,
    setSearch,
    clearFilters,
  } = useTableState(rows, {
    initialPageSize: 10,
    getSearchText: (row) =>
      [
        row.id,
        row.customer?.name,
        row.buyerName,
        row.customer?.mobile,
        row.customer?.memberId,
        row.propertyName,
        row.project,
        row.referralAgent?.name,
        row.assignedAgent?.name,
        row.status,
      ]
        .filter(Boolean)
        .join(' '),
  });

  async function handleApprove(id) {
    const ok = await confirmDialog({
      title: 'Approve express interest?',
      message: 'The customer will be notified and can proceed with purchase or booking after approval.',
      confirmLabel: 'Approve',
      cancelLabel: 'Cancel',
      variant: 'success',
    });
    if (!ok) return;
    try {
      await expressInterestService.approve(id);
      toast.success('Interest approved successfully.');
      load();
      setViewing(null);
    } catch (err) {
      toast.error(err.message || 'Failed to approve interest.');
    }
  }

  async function handleReject() {
    if (!rejectReason.trim()) {
      toast.error('Rejection reason is required');
      return;
    }
    try {
      await expressInterestService.reject(rejectId, { reason: rejectReason });
      toast.success('Interest rejected');
      setRejectId(null);
      setRejectReason('');
      load();
      setViewing(null);
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleAssign() {
    if (!assignAgentId) {
      toast.error('Select an agent');
      return;
    }
    try {
      await expressInterestService.assignAgent(assignId, assignAgentId);
      toast.success('Agent assigned');
      setAssignId(null);
      setAssignAgentId('');
      load();
      setViewing(null);
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleInternalRemark() {
    if (!internalRemark.trim()) {
      toast.error('Remarks are required');
      return;
    }
    try {
      await expressInterestService.addInternalRemarks(remarkId, internalRemark);
      toast.success('Internal remarks saved');
      setRemarkId(null);
      setInternalRemark('');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-brand-800">{t('nav.expressInterests', { ns: 'common', defaultValue: 'Express Interest Management' })}</h1>
          <p className="text-sm text-gray-500">Review, approve, and assign customer interest requests.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-52">
            <SearchBox value={search} onChange={setSearch} />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">All statuses</option>
            <option value="PENDING_APPROVAL">Pending Approval</option>
            <option value="APPROVED">Approved</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="PURCHASE_REQUESTED">Purchase Requested</option>
            <option value="BOOKING_REQUESTED">Booking Requested</option>
            <option value="REJECTED">Rejected</option>
            <option value="CLOSED">Closed</option>
          </select>
          {(search || statusFilter) && (
            <button
              type="button"
              onClick={() => { clearFilters(); setStatusFilter(''); }}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : rows.length === 0 ? (
        <EmptyState titleKey="empty.noData" />
      ) : total === 0 ? (
        <EmptyState titleKey="empty.noData" />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="sticky top-0 z-10 bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2.5">S.No.</th>
                  <th className="px-3 py-2.5">Interest ID</th>
                  <th className="px-3 py-2.5">Customer</th>
                  <th className="px-3 py-2.5">Mobile</th>
                  <th className="px-3 py-2.5">Property</th>
                  <th className="px-3 py-2.5">Project</th>
                  <th className="px-3 py-2.5">Referral</th>
                  <th className="px-3 py-2.5">Assigned</th>
                  <th className="px-3 py-2.5">Grade</th>
                  <th className="px-3 py-2.5">Submitted</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pageRows.map((row, index) => (
                  <tr key={row.id} className="hover:bg-gray-50/80">
                    <td className="px-3 py-2.5 text-xs text-gray-500">{(page - 1) * pageSize + index + 1}</td>
                    <td className="px-3 py-2.5 font-mono text-xs">#{row.id}</td>
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-gray-800">{row.customer?.name || row.buyerName}</div>
                      <div className="text-xs text-gray-400">{row.customer?.memberId || row.customerId}</div>
                    </td>
                    <td className="px-3 py-2.5">{row.customer?.mobile || row.buyerPhone}</td>
                    <td className="px-3 py-2.5">
                      <div className="max-w-[140px] truncate font-medium">{row.propertyName}</div>
                      <div className="text-xs text-gray-400">#{row.propertyId}</div>
                    </td>
                    <td className="px-3 py-2.5">{row.project || '—'}</td>
                    <td className="px-3 py-2.5">{row.referralAgent?.name || row.referralAgentName || '—'}</td>
                    <td className="px-3 py-2.5">{row.assignedAgent?.name || '—'}</td>
                    <td className="px-3 py-2.5">{row.agentGrade || row.assignedAgent?.agentGrade || '—'}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-xs">{new Date(row.createdAt).toLocaleString()}</td>
                    <td className="px-3 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(row.status)}`}>
                        {STATUS_LABELS[row.status] || row.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <TableActionsMenu
                        items={[
                          {
                            key: 'view',
                            label: 'View details',
                            icon: Eye,
                            onClick: () => setViewing(row),
                          },
                          {
                            key: 'approve',
                            label: 'Approve',
                            icon: Check,
                            tone: 'success',
                            hidden: row.status !== 'pending_approval',
                            onClick: () => handleApprove(row.id),
                          },
                          {
                            key: 'reject',
                            label: 'Reject',
                            icon: X,
                            tone: 'danger',
                            hidden: row.status !== 'pending_approval',
                            onClick: () => { setRejectId(row.id); setRejectReason(''); },
                          },
                          {
                            key: 'assign',
                            label: 'Assign agent',
                            icon: UserPlus,
                            tone: 'brand',
                            onClick: () => { setAssignId(row.id); setAssignAgentId(String(row.assignedAgentId || '')); },
                          },
                          {
                            key: 'remarks',
                            label: 'Internal remarks',
                            icon: MessageSquare,
                            onClick: () => { setRemarkId(row.id); setInternalRemark(row.internalRemarks || ''); },
                          },
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <TablePagination
            page={page}
            pageSize={pageSize}
            total={total}
            totalPages={totalPages}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </>
      )}

      {viewing && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 px-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-brand-800">Interest #{viewing.id}</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-gray-500">Customer</dt><dd>{viewing.customer?.name} ({viewing.customer?.memberId || viewing.customerId})</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-gray-500">Email</dt><dd>{viewing.customer?.email || '—'}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-gray-500">Mobile</dt><dd>{viewing.customer?.mobile || '—'}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-gray-500">District / City</dt><dd>{[viewing.customer?.district, viewing.customer?.city].filter(Boolean).join(', ') || '—'}</dd></div>
              <div><dt className="text-gray-500">Registered address</dt><dd className="mt-1 rounded-lg bg-gray-50 p-2">{viewing.customer?.address || '—'}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-gray-500">Preferred property type</dt><dd>{viewing.customer?.preferredPropertyType || '—'}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-gray-500">Property</dt><dd>{viewing.propertyName} #{viewing.propertyId}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-gray-500">Project</dt><dd>{viewing.project || '—'}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-gray-500">Referral Agent</dt><dd>{viewing.referralAgent?.name || viewing.referralAgentName || '—'}{viewing.referralAgentCode ? ` (${viewing.referralAgentCode})` : ''}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-gray-500">Assigned Agent</dt><dd>{viewing.assignedAgent?.name || '—'}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-gray-500">Submitted</dt><dd>{viewing.createdAt ? new Date(viewing.createdAt).toLocaleString() : '—'}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-gray-500">Status</dt><dd>{STATUS_LABELS[viewing.status] || viewing.status}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-gray-500">Follow-up</dt><dd>{viewing.followUpStatus || '—'}</dd></div>
              <div><dt className="text-gray-500">Customer remarks</dt><dd className="mt-1 rounded-lg bg-gray-50 p-2">{viewing.remarks || '—'}</dd></div>
              <div><dt className="text-gray-500">Admin remarks</dt><dd className="mt-1 rounded-lg bg-gray-50 p-2">{viewing.adminRemarks || viewing.rejectionReason || '—'}</dd></div>
              <div><dt className="text-gray-500">Internal remarks</dt><dd className="mt-1 rounded-lg bg-gray-50 p-2">{viewing.internalRemarks || '—'}</dd></div>
            </dl>
            {viewing.history?.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-gray-700">Timeline</h3>
                <ul className="mt-2 space-y-2 text-xs text-gray-600">
                  {viewing.history.map((h) => (
                    <li key={h.id} className="rounded-lg border border-gray-100 px-3 py-2">
                      <span className="font-medium">{h.toStatus}</span>
                      {h.note ? ` — ${h.note}` : ''}
                      <div className="text-gray-400">{h.actorName || 'System'} · {new Date(h.createdAt).toLocaleString()}</div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              {viewing.status === 'pending_approval' && (
                <>
                  <button type="button" onClick={() => handleApprove(viewing.id)} className="rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white">Approve</button>
                  <button type="button" onClick={() => { setRejectId(viewing.id); setRejectReason(''); }} className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white">Reject</button>
                </>
              )}
              <button type="button" onClick={() => setViewing(null)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">Close</button>
            </div>
          </div>
        </div>
      )}

      {rejectId && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
            <h2 className="font-semibold text-brand-800">Reject Interest</h2>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              placeholder="Rejection reason"
              className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setRejectId(null)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">Cancel</button>
              <button type="button" onClick={handleReject} className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white">Reject</button>
            </div>
          </div>
        </div>
      )}

      {assignId && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
            <h2 className="font-semibold text-brand-800">Assign / Reassign Agent</h2>
            <select
              value={assignAgentId}
              onChange={(e) => setAssignAgentId(e.target.value)}
              className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Select agent</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.memberId || a.id}){a.agentGrade ? ` · ${a.agentGrade}` : ''}
                </option>
              ))}
            </select>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setAssignId(null)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">Cancel</button>
              <button type="button" onClick={handleAssign} className="rounded-lg bg-brand-700 px-3 py-2 text-sm font-medium text-white">Assign</button>
            </div>
          </div>
        </div>
      )}

      {remarkId && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
            <h2 className="font-semibold text-brand-800">Internal Remarks</h2>
            <textarea
              value={internalRemark}
              onChange={(e) => setInternalRemark(e.target.value)}
              rows={3}
              className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setRemarkId(null)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">Cancel</button>
              <button type="button" onClick={handleInternalRemark} className="rounded-lg bg-brand-700 px-3 py-2 text-sm font-medium text-white">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
