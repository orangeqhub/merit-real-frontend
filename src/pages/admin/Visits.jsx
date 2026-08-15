import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, Check, X, MessageSquare, UserPlus, RefreshCw, CheckCircle2, CalendarClock, Car, Play, Ban } from 'lucide-react';
import { siteVisitService } from '../../services/siteVisitService';
import { agentService } from '../../services/managedUserService';
import { toast } from '../../store/toastStore';
import { confirmDialog } from '../../store/confirmStore';
import EmptyState from '../../components/common/EmptyState';
import SearchBox from '../../components/common/SearchBox';
import TablePagination from '../../components/common/TablePagination';
import TableActionsMenu from '../../components/common/TableActionsMenu';
import { useTableState } from '../../hooks/useTableState';
import { useDomainRealtime, useRealtimeEvent } from '../../hooks/useDomainRealtime';
import { useOpenRecordFromUrl } from '../../hooks/useOpenRecordFromUrl';

const STATUS_LABELS = {
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  assigned: 'Assigned',
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  rejected: 'Rejected',
  completed: 'Completed',
  purchase_interest: 'Purchase Interest',
  dropped: 'Dropped',
  closed: 'Closed',
  confirmed: 'Confirmed',
  vehicle_pending_approval: 'Vehicle Pending Approval',
  vehicle_required: 'Vehicle Required – Pending Admin Action',
  vehicle_approved: 'Vehicle Approved',
  vehicle_assigned: 'Vehicle Assigned',
  vehicle_change_requested: 'Vehicle Change Requested',
  reschedule_requested: 'Reschedule Requested',
  started: 'Started',
  cancelled: 'Cancelled',
  no_show: 'No Show',
};

function statusClass(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'pending_approval') return 'bg-amber-50 text-amber-800';
  if (s === 'approved' || s === 'assigned' || s === 'completed') return 'bg-green-50 text-green-800';
  if (s === 'purchase_interest') return 'bg-blue-50 text-blue-800';
  if (s === 'rejected' || s === 'dropped') return 'bg-red-50 text-red-700';
  return 'bg-gray-100 text-gray-700';
}

export default function Visits() {
  const { t } = useTranslation(['dashboard', 'common']);
  const [rows, setRows] = useState([]);
  const [agents, setAgents] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [viewing, setViewing] = useState(null);
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectMode, setRejectMode] = useState('visit');
  const [assignId, setAssignId] = useState(null);
  const [assignAgentId, setAssignAgentId] = useState('');
  const [remarkId, setRemarkId] = useState(null);
  const [internalRemark, setInternalRemark] = useState('');
  const [rescheduleId, setRescheduleId] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [vehicleVisit, setVehicleVisit] = useState(null);
  const [vehicleForm, setVehicleForm] = useState({
    vehicleType: '', vehicleModel: '', vehicleCapacity: '', vehicleReference: '',
    vehicleNumber: '', vehicleColor: '', driverName: '', driverPhone: '',
    driverReference: '', driverLicenseNumber: '', pickupDate: '', pickupTime: '',
    pickupAddress: '', pickupLocation: '', dropLocation: '', driverRemarks: '', vehicleRemarks: '',
  });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await siteVisitService.getAdminList({
        pageSize: 100,
        status: statusFilter || undefined,
      });
      setRows(data?.items || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load site visits');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    load();
    agentService.list({ status: 'ACTIVE', pageSize: 100 })
      .then((data) => setAgents(data?.items || []))
      .catch(() => setAgents([]));
  }, [load]);

  useDomainRealtime(true);

  const mergeVisitUpdate = useCallback((payload) => {
    const visit = payload?.visit;
    if (!visit?.id) return;
    setRows((prev) => {
      const index = prev.findIndex((row) => String(row.id) === String(visit.id));
      if (index < 0) return payload.action === 'created' ? [visit, ...prev] : prev;
      const next = [...prev];
      next[index] = { ...next[index], ...visit };
      return next;
    });
    setViewing((prev) => (prev?.id === visit.id ? { ...prev, ...visit } : prev));
  }, []);

  useRealtimeEvent('site-visit:updated', mergeVisitUpdate, true);
  useRealtimeEvent('site-visit:created', mergeVisitUpdate, true);
  useRealtimeEvent('socket:reconnected', load, true);

  useOpenRecordFromUrl({
    records: rows,
    fetchById: (id) => siteVisitService.getById(id),
    onOpen: setViewing,
    stateKey: 'openVisitId',
  });

  async function openVisit(id) {
    try {
      setViewing(await siteVisitService.getById(id));
    } catch (err) {
      toast.error(err.message || 'Failed to load site visit details.');
    }
  }

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
        row.customer?.mobile,
        row.propertyName,
        row.visitDate,
        row.visitTime,
        row.referralAgent?.name,
        row.assignedAgent?.name,
        row.status,
      ]
        .filter(Boolean)
        .join(' '),
  });

  async function handleApprove(id) {
    const ok = await confirmDialog({
      title: 'Approve site visit?',
      message: 'The customer and assigned team will be notified once this visit request is approved.',
      confirmLabel: 'Approve',
      cancelLabel: 'Cancel',
      variant: 'success',
    });
    if (!ok) return;
    try {
      await siteVisitService.approve(id);
      toast.success('Site visit approved successfully.');
      load();
      setViewing(null);
    } catch (err) {
      toast.error(err.message || 'Failed to approve site visit.');
    }
  }

  async function handleReject() {
    if (!rejectReason.trim()) {
      toast.error('Rejection reason is required');
      return;
    }
    try {
      const action = rejectMode === 'vehicle' ? siteVisitService.rejectVehicle : siteVisitService.reject;
      await action(rejectId, { reason: rejectReason });
      toast.success(rejectMode === 'vehicle' ? 'Company vehicle request rejected.' : 'Site visit rejected');
      setRejectId(null);
      setRejectReason('');
      load();
      setViewing(null);
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleLifecycle(method, id, successMessage, body = {}) {
    try {
      await method(id, body);
      toast.success(successMessage);
      load();
      setViewing(null);
    } catch (err) {
      toast.error(err.message || 'Failed to update site visit.');
    }
  }

  async function handleReasonedLifecycle(method, id, successMessage, promptText) {
    const reason = window.prompt(promptText);
    if (reason === null) return;
    if (!reason.trim()) {
      toast.error('A reason is required.');
      return;
    }
    await handleLifecycle(method, id, successMessage, { reason: reason.trim() });
  }

  function openVehicleAssignment(row) {
    setVehicleVisit(row);
    setVehicleForm({
      vehicleType: row.vehicleType || '',
      vehicleModel: row.vehicleModel || '',
      vehicleCapacity: row.vehicleCapacity || '',
      vehicleReference: row.vehicleReference || '',
      vehicleNumber: row.vehicleNumber || '',
      vehicleColor: row.vehicleColor || '',
      driverName: row.driverName || '',
      driverPhone: row.driverPhone || '',
      driverReference: row.driverReference || '',
      driverLicenseNumber: row.driverLicenseNumber || '',
      pickupDate: row.pickupDate || row.visitDate || '',
      pickupTime: row.pickupTime || row.preferredPickupTime || '',
      pickupAddress: row.pickupAddress || '',
      pickupLocation: row.pickupLocation || '',
      dropLocation: row.dropLocation || row.propertyAddress || row.propertyName || '',
      driverRemarks: row.driverRemarks || '',
      vehicleRemarks: row.vehicleRemarks || '',
    });
  }

  async function handleVehicleAssignment(event) {
    event.preventDefault();
    try {
      await siteVisitService.assignVehicle(vehicleVisit.id, vehicleForm);
      toast.success('Company vehicle assigned.');
      setVehicleVisit(null);
      load();
      setViewing(null);
    } catch (err) {
      toast.error(err.message || 'Failed to assign company vehicle.');
    }
  }

  async function handleAssign() {
    if (!assignAgentId) {
      toast.error('Select an agent');
      return;
    }
    try {
      await siteVisitService.assignAgent(assignId, assignAgentId);
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
      await siteVisitService.addInternalRemarks(remarkId, internalRemark);
      toast.success('Internal remarks saved');
      setRemarkId(null);
      setInternalRemark('');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleMarkCompleted(id) {
    const ok = await confirmDialog({
      title: 'Mark visit completed?',
      message: 'This will mark the site visit as completed and may enable next steps for the customer.',
      confirmLabel: 'Mark completed',
      cancelLabel: 'Cancel',
      variant: 'success',
    });
    if (!ok) return;
    try {
      await siteVisitService.markCompleted(id);
      toast.success('Site visit marked completed successfully.');
      load();
      setViewing(null);
    } catch (err) {
      toast.error(err.message || 'Failed to mark visit completed.');
    }
  }

  async function handleReschedule(event) {
    event.preventDefault();
    if (!rescheduleDate || !rescheduleTime) {
      toast.error('Visit date and time are required.');
      return;
    }
    try {
      await siteVisitService.reschedule(rescheduleId, {
        visitDate: rescheduleDate,
        visitTime: rescheduleTime,
        reason: rescheduleReason,
      });
      toast.success('Site visit rescheduled successfully.');
      setRescheduleId(null);
      setRescheduleDate('');
      setRescheduleTime('');
      setRescheduleReason('');
      load();
      setViewing(null);
    } catch (err) {
      toast.error(err.message || 'Failed to reschedule site visit.');
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-brand-800">
            {t('nav.siteVisitManagement', { ns: 'common', defaultValue: 'Site Visit Management' })}
          </h1>
          <p className="text-sm text-gray-500">Review, approve, and assign customer site visit requests.</p>
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
            <option value="SCHEDULED">Scheduled</option>
            <option value="VEHICLE_REQUIRED">Vehicle Required</option>
            <option value="VEHICLE_APPROVED">Vehicle Approved</option>
            <option value="VEHICLE_ASSIGNED">Vehicle Assigned</option>
            <option value="VEHICLE_CHANGE_REQUESTED">Vehicle Change Requested</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="STARTED">Started</option>
            <option value="RESCHEDULE_REQUESTED">Reschedule Requested</option>
            <option value="COMPLETED">Completed</option>
            <option value="PURCHASE_INTEREST">Purchase Interest</option>
            <option value="DROPPED">Dropped</option>
            <option value="REJECTED">Rejected</option>
            <option value="CLOSED">Closed</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="NO_SHOW">No Show</option>
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
      ) : rows.length === 0 || total === 0 ? (
        <EmptyState titleKey="empty.noData" />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="sticky top-0 z-10 bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-3 py-2.5">Visit ID</th>
                  <th className="px-3 py-2.5">Customer Name</th>
                  <th className="px-3 py-2.5">Mobile Number</th>
                  <th className="px-3 py-2.5">Property</th>
                  <th className="px-3 py-2.5">Property Type</th>
                  <th className="px-3 py-2.5">Visit Date</th>
                  <th className="px-3 py-2.5">Visit Time</th>
                  <th className="px-3 py-2.5">Referral Agent</th>
                  <th className="px-3 py-2.5">Assigned Agent</th>
                  <th className="px-3 py-2.5">Travel / Vehicle</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">Created Date</th>
                  <th className="px-3 py-2.5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pageRows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50/80">
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
                    <td className="px-3 py-2.5">{row.property?.categoryName || row.property?.categorySlug || '—'}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{row.visitDate || '—'}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{row.visitTime || '—'}</td>
                    <td className="px-3 py-2.5">{row.referralAgent?.name || row.referralAgentName || '—'}</td>
                    <td className="px-3 py-2.5">{row.assignedAgent?.name || '—'}</td>
                    <td className="px-3 py-2.5 text-xs">
                      <div className="font-medium">{row.visitMode === 'company_vehicle' ? 'Company Vehicle' : 'Own Vehicle'}</div>
                      {row.visitMode === 'company_vehicle' && <div className="text-gray-400">{row.vehicleNumber || row.vehicleStatus || 'Awaiting assignment'}</div>}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(row.status)}`}>
                        {STATUS_LABELS[row.status] || row.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-xs">{new Date(row.createdAt).toLocaleString()}</td>
                    <td className="px-3 py-2.5">
                      <TableActionsMenu
                        items={[
                          {
                            key: 'view',
                            label: 'View details',
                            icon: Eye,
                            onClick: () => openVisit(row.id),
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
                            onClick: () => { setRejectMode('visit'); setRejectId(row.id); setRejectReason(''); },
                          },
                          {
                            key: 'approve-vehicle',
                            label: 'Approve company vehicle',
                            icon: Check,
                            tone: 'success',
                            hidden: row.visitMode !== 'company_vehicle' || (
                              !['pending_approval', 'vehicle_required', 'vehicle_change_requested'].includes(row.status)
                              && !['pending', 'pending_approval', 'requested', 'change_requested'].includes(String(row.vehicleStatus || '').toLowerCase())
                            ),
                            onClick: () => handleLifecycle(siteVisitService.approveVehicle, row.id, 'Company vehicle request approved.'),
                          },
                          {
                            key: 'reject-vehicle',
                            label: 'Reject company vehicle',
                            icon: X,
                            tone: 'danger',
                            hidden: row.visitMode !== 'company_vehicle' || (
                              !['vehicle_approved', 'vehicle_change_requested'].includes(row.status)
                              && !['approved', 'change_requested', 'rejected'].includes(String(row.vehicleStatus || '').toLowerCase())
                            ),
                            onClick: () => { setRejectMode('vehicle'); setRejectId(row.id); setRejectReason(''); },
                          },
                          {
                            key: 'assign-vehicle',
                            label: 'Assign company vehicle',
                            icon: Car,
                            tone: 'brand',
                            hidden: row.visitMode !== 'company_vehicle' || ['confirmed', 'started', 'completed', 'cancelled', 'no_show'].includes(row.status),
                            onClick: () => openVehicleAssignment(row),
                          },
                          {
                            key: 'confirm',
                            label: 'Confirm visit',
                            icon: Check,
                            tone: 'success',
                            hidden: row.visitMode === 'company_vehicle' || !['approved', 'assigned', 'scheduled'].includes(row.status),
                            onClick: () => handleLifecycle(siteVisitService.confirm, row.id, 'Site visit confirmed.'),
                          },
                          {
                            key: 'start',
                            label: 'Start visit',
                            icon: Play,
                            tone: 'brand',
                            hidden: row.status !== 'confirmed',
                            onClick: () => handleLifecycle(siteVisitService.start, row.id, 'Site visit started.'),
                          },
                          {
                            key: 'complete',
                            label: 'Mark completed',
                            icon: CheckCircle2,
                            tone: 'brand',
                            hidden: row.expressInterestId
                              ? row.status !== 'started'
                              : !['approved', 'assigned', 'confirmed', 'started'].includes(row.status),
                            onClick: () => handleMarkCompleted(row.id),
                          },
                          {
                            key: 'no-show',
                            label: 'Mark no-show',
                            icon: Ban,
                            tone: 'danger',
                            hidden: !['confirmed', 'assigned', 'vehicle_assigned', 'started'].includes(row.status),
                            onClick: () => handleReasonedLifecycle(
                              siteVisitService.markNoShow,
                              row.id,
                              'Visit marked as no-show.',
                              'Enter the no-show reason or remarks:'
                            ),
                          },
                          {
                            key: 'cancel',
                            label: 'Cancel visit',
                            icon: X,
                            tone: 'danger',
                            hidden: ['rejected', 'completed', 'cancelled', 'no_show', 'closed', 'dropped'].includes(row.status),
                            onClick: () => handleReasonedLifecycle(
                              siteVisitService.cancel,
                              row.id,
                              'Site visit cancelled.',
                              'Enter the cancellation reason:'
                            ),
                          },
                          {
                            key: 'reschedule',
                            label: 'Reschedule',
                            icon: CalendarClock,
                            hidden: ['rejected', 'completed', 'purchase_interest', 'dropped', 'closed'].includes(row.status),
                            onClick: () => {
                              setRescheduleId(row.id);
                              setRescheduleDate(row.visitDate || '');
                              setRescheduleTime(String(row.visitTime || '').slice(0, 5));
                              setRescheduleReason(row.rescheduleRequest?.reason || '');
                            },
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
            <h2 className="text-lg font-semibold text-brand-800">Site Visit #{viewing.id}</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-gray-500">Customer</dt><dd>{viewing.customer?.name} ({viewing.customer?.memberId || viewing.customerId})</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-gray-500">Email</dt><dd>{viewing.customer?.email || '—'}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-gray-500">Mobile</dt><dd>{viewing.customer?.mobile || '—'}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-gray-500">District / City</dt><dd>{[viewing.customer?.district, viewing.customer?.city].filter(Boolean).join(', ') || '—'}</dd></div>
              <div><dt className="text-gray-500">Registered address</dt><dd className="mt-1 rounded-lg bg-gray-50 p-2">{viewing.customer?.address || '—'}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-gray-500">Property</dt><dd>{viewing.propertyName} #{viewing.propertyId}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-gray-500">Visit date / time</dt><dd>{viewing.visitDate} {viewing.visitTime}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-gray-500">Travel mode</dt><dd>{viewing.visitMode === 'company_vehicle' ? 'Company Vehicle' : 'Own Vehicle'}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-gray-500">Visitor count</dt><dd>{viewing.visitorCount || 1}</dd></div>
              {viewing.visitMode === 'company_vehicle' && (
                <>
                  <div><dt className="text-gray-500">Pickup address</dt><dd className="mt-1 rounded-lg bg-gray-50 p-2">{viewing.pickupAddress || '—'}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-gray-500">Pickup location / time</dt><dd>{viewing.pickupLocation || '—'} · {viewing.pickupTime || viewing.preferredPickupTime || '—'}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-gray-500">Vehicle status</dt><dd>{viewing.vehicleStatus || '—'}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-gray-500">Vehicle</dt><dd>{[viewing.vehicleType, viewing.vehicleColor, viewing.vehicleNumber].filter(Boolean).join(' · ') || '—'}</dd></div>
                  <div className="flex justify-between gap-4"><dt className="text-gray-500">Driver</dt><dd>{[viewing.driverName, viewing.driverPhone, viewing.driverLicenseNumber].filter(Boolean).join(' · ') || '—'}</dd></div>
                  <div><dt className="text-gray-500">Vehicle remarks</dt><dd className="mt-1 rounded-lg bg-gray-50 p-2">{viewing.vehicleRemarks || '—'}</dd></div>
                </>
              )}
              <div className="flex justify-between gap-4"><dt className="text-gray-500">Referral Agent</dt><dd>{viewing.referralAgent?.name || viewing.referralAgentName || '—'}{viewing.referralAgentCode ? ` (${viewing.referralAgentCode})` : ''}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-gray-500">Assigned Agent</dt><dd>{viewing.assignedAgent?.name || '—'}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-gray-500">Status</dt><dd>{STATUS_LABELS[viewing.status] || viewing.status}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-gray-500">Customer decision</dt><dd>{viewing.customerDecision || '—'}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-gray-500">Drop reason</dt><dd>{viewing.dropReason || '—'}</dd></div>
              <div><dt className="text-gray-500">Customer remarks</dt><dd className="mt-1 rounded-lg bg-gray-50 p-2">{viewing.remarks || '—'}</dd></div>
              <div><dt className="text-gray-500">Admin remarks</dt><dd className="mt-1 rounded-lg bg-gray-50 p-2">{viewing.adminRemarks || viewing.rejectionReason || '—'}</dd></div>
              <div><dt className="text-gray-500">Internal remarks</dt><dd className="mt-1 rounded-lg bg-gray-50 p-2">{viewing.internalRemarks || '—'}</dd></div>
            </dl>
            {viewing.history?.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-gray-700">Timeline</h3>
                <ul className="mt-2 space-y-2 text-xs text-gray-600">
                  {viewing.history.map((h) => (
                    <li key={h.id || `${h.toStatus}-${h.createdAt}`} className="rounded border border-gray-100 px-2 py-1.5">
                      <span className="font-medium">{STATUS_LABELS[h.toStatus] || h.toStatus}</span>{h.note ? ` — ${h.note}` : ''}
                      <div className="text-gray-400">{h.actorName || h.actorRole || 'System'} · {new Date(h.createdAt).toLocaleString()}</div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <button type="button" onClick={() => setViewing(null)} className="mt-4 rounded-lg border border-gray-300 px-3 py-2 text-sm">
              Close
            </button>
          </div>
        </div>
      )}

      {rejectId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
            <h3 className="font-semibold text-brand-800">{rejectMode === 'vehicle' ? 'Reject Company Vehicle Request' : 'Reject Site Visit'}</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              placeholder="Rejection reason"
              className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" onClick={() => setRejectId(null)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">Cancel</button>
              <button type="button" onClick={handleReject} className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white">Reject</button>
            </div>
          </div>
        </div>
      )}

      {assignId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
            <h3 className="font-semibold text-brand-800">Assign / Reassign Agent</h3>
            <select
              value={assignAgentId}
              onChange={(e) => setAssignAgentId(e.target.value)}
              className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Select agent</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>{a.name} ({a.memberId || a.id})</option>
              ))}
            </select>
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" onClick={() => setAssignId(null)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">Cancel</button>
              <button type="button" onClick={handleAssign} className="rounded-lg bg-brand-700 px-3 py-2 text-sm font-semibold text-white">Assign</button>
            </div>
          </div>
        </div>
      )}

      {vehicleVisit && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto bg-black/50 px-4 py-6">
          <form onSubmit={handleVehicleAssignment} className="max-h-[92vh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
            <h3 className="font-semibold text-brand-800">Assign Company Vehicle · Visit #{vehicleVisit.id}</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                ['vehicleType', 'Vehicle type'],
                ['vehicleModel', 'Vehicle model'],
                ['vehicleCapacity', 'Vehicle capacity'],
                ['vehicleReference', 'Vehicle ID / reference'],
                ['vehicleNumber', 'Vehicle number'],
                ['vehicleColor', 'Vehicle color'],
                ['driverName', 'Driver name'],
                ['driverPhone', 'Driver phone'],
                ['driverReference', 'Driver ID / reference'],
                ['driverLicenseNumber', 'Driver licence number'],
                ['pickupAddress', 'Pickup address'],
                ['pickupLocation', 'Pickup location / landmark'],
                ['dropLocation', 'Drop location'],
              ].map(([key, label]) => (
                <label key={key} className={['pickupAddress', 'dropLocation'].includes(key) ? 'sm:col-span-2' : ''}>
                  <span className="mb-1 block text-xs font-medium text-gray-600">{label}</span>
                  <input
                    type={key === 'vehicleCapacity' ? 'number' : 'text'}
                    min={key === 'vehicleCapacity' ? '1' : undefined}
                    value={vehicleForm[key]}
                    onChange={(event) => setVehicleForm((form) => ({ ...form, [key]: event.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    required={['vehicleType', 'vehicleNumber', 'driverName', 'driverPhone', 'driverLicenseNumber', 'pickupAddress', 'pickupLocation', 'dropLocation'].includes(key)}
                  />
                </label>
              ))}
              <label>
                <span className="mb-1 block text-xs font-medium text-gray-600">Pickup date</span>
                <input type="date" value={vehicleForm.pickupDate} onChange={(event) => setVehicleForm((form) => ({ ...form, pickupDate: event.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" required />
              </label>
              <label>
                <span className="mb-1 block text-xs font-medium text-gray-600">Pickup time</span>
                <input type="time" value={vehicleForm.pickupTime} onChange={(event) => setVehicleForm((form) => ({ ...form, pickupTime: event.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" required />
              </label>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label>
                <span className="mb-1 block text-xs font-medium text-gray-600">Driver remarks</span>
                <textarea rows={3} value={vehicleForm.driverRemarks} onChange={(event) => setVehicleForm((form) => ({ ...form, driverRemarks: event.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </label>
              <label>
                <span className="mb-1 block text-xs font-medium text-gray-600">Vehicle remarks</span>
                <textarea rows={3} value={vehicleForm.vehicleRemarks} onChange={(event) => setVehicleForm((form) => ({ ...form, vehicleRemarks: event.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setVehicleVisit(null)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">Cancel</button>
              <button type="submit" className="rounded-lg bg-brand-700 px-3 py-2 text-sm font-semibold text-white">Assign Vehicle</button>
            </div>
          </form>
        </div>
      )}

      {remarkId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
            <h3 className="font-semibold text-brand-800">Internal Remarks</h3>
            <textarea
              value={internalRemark}
              onChange={(e) => setInternalRemark(e.target.value)}
              rows={3}
              className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" onClick={() => setRemarkId(null)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">Cancel</button>
              <button type="button" onClick={handleInternalRemark} className="rounded-lg bg-brand-700 px-3 py-2 text-sm font-semibold text-white">Save</button>
            </div>
          </div>
        </div>
      )}

      {rescheduleId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 px-4">
          <form onSubmit={handleReschedule} className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
            <h3 className="font-semibold text-brand-800">Reschedule Site Visit</h3>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input
                type="date"
                min={new Date().toISOString().slice(0, 10)}
                value={rescheduleDate}
                onChange={(event) => setRescheduleDate(event.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                required
              />
              <input
                type="time"
                value={rescheduleTime}
                onChange={(event) => setRescheduleTime(event.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                required
              />
            </div>
            <textarea
              value={rescheduleReason}
              onChange={(event) => setRescheduleReason(event.target.value)}
              rows={3}
              placeholder="Reschedule reason"
              className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              required
            />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setRescheduleId(null)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">Cancel</button>
              <button type="submit" className="rounded-lg bg-brand-700 px-3 py-2 text-sm font-semibold text-white">Reschedule</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
