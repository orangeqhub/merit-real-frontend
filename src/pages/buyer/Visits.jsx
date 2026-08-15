import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye } from 'lucide-react';
import { siteVisitService } from '../../services/siteVisitService';
import { useAuthStore } from '../../store/authStore';
import { toast } from '../../store/toastStore';
import DataTable, { StatusPill, formatTableDate } from '../../components/common/DataTable';
import TableActionsMenu from '../../components/common/TableActionsMenu';
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
  purchase_interest: 'Purchase Interest Submitted',
  dropped: 'Dropped',
  closed: 'Closed',
  confirmed: 'Confirmed',
  vehicle_pending_approval: 'Vehicle Pending Approval',
  vehicle_required: 'Vehicle Required – Pending Admin Action',
  vehicle_approved: 'Vehicle Approved',
  vehicle_assigned: 'Vehicle Assigned',
  vehicle_change_requested: 'Vehicle Change Requested',
  reschedule_requested: 'Reschedule Requested',
  started: 'Visit Started',
  cancelled: 'Cancelled',
  no_show: 'No Show',
};

const DROP_REASONS = [
  'Budget Issue',
  'Location Not Suitable',
  'Found Another Property',
  'Loan Issue',
  'Family Decision',
  'Other',
];

export default function Visits() {
  const { user } = useAuthStore();
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [flowStep, setFlowStep] = useState(null); // confirm | decision | drop
  const [dropReason, setDropReason] = useState('');
  const [otherReason, setOtherReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [actionForm, setActionForm] = useState(null);

  const load = useCallback(() => {
    if (!user) return;
    setLoading(true);
    setError(null);
    siteVisitService
      .getMine({ pageSize: 100 })
      .then(setVisits)
      .catch((err) => {
        setVisits([]);
        setError(err.message || 'Failed to load visits');
      })
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(load, [load]);

  const openDetails = useCallback((row) => {
    setSelected(row);
    setFlowStep(null);
    setDropReason('');
    setOtherReason('');
    setActionForm(null);
  }, []);

  useDomainRealtime(Boolean(user));

  const mergeVisitUpdate = useCallback((payload) => {
    const visit = payload?.visit;
    if (!visit?.id) return;
    setVisits((prev) => {
      const index = prev.findIndex((row) => String(row.id) === String(visit.id));
      if (index < 0) return payload.action === 'created' ? [visit, ...prev] : prev;
      const next = [...prev];
      next[index] = { ...next[index], ...visit };
      return next;
    });
    setSelected((prev) => (prev?.id === visit.id ? { ...prev, ...visit } : prev));
  }, []);

  useRealtimeEvent('site-visit:updated', mergeVisitUpdate, Boolean(user));
  useRealtimeEvent('site-visit:created', mergeVisitUpdate, Boolean(user));
  useRealtimeEvent('socket:reconnected', load, Boolean(user));

  useOpenRecordFromUrl({
    records: visits,
    fetchById: (id) => siteVisitService.getById(id),
    onOpen: openDetails,
    stateKey: 'openVisitId',
  });

  async function openVisit(id) {
    try {
      openDetails(await siteVisitService.getById(id));
    } catch (err) {
      toast.error(err.message || 'Failed to load site visit details.');
    }
  }

  function startCompletion() {
    setFlowStep('confirm');
  }

  async function handlePurchase() {
    if (!selected) return;
    setSaving(true);
    try {
      const updated = await siteVisitService.submitPurchaseInterest(selected.id);
      setSelected(updated);
      setFlowStep(null);
      toast.success('Purchase interest submitted to admin.');
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDropSubmit(e) {
    e.preventDefault();
    if (!dropReason) {
      toast.error('Please select a reason');
      return;
    }
    if (dropReason === 'Other' && !otherReason.trim()) {
      toast.error('Please provide details for Other');
      return;
    }
    setSaving(true);
    try {
      const updated = await siteVisitService.submitDrop(selected.id, {
        dropReason,
        otherReason: otherReason.trim() || undefined,
      });
      setSelected(updated);
      setFlowStep(null);
      toast.success('Your drop decision was recorded.');
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function runCustomerAction(action, successMessage, body = {}) {
    if (!selected) return;
    setSaving(true);
    try {
      const updated = await action(selected.id, body);
      setSelected(updated);
      setActionForm(null);
      toast.success(successMessage);
      load();
    } catch (err) {
      toast.error(err.message || 'Unable to update this site visit.');
    } finally {
      setSaving(false);
    }
  }

  async function submitActionForm(event) {
    event.preventDefault();
    if (actionForm.type === 'vehicle-change') {
      return runCustomerAction(siteVisitService.requestVehicleChange, 'Vehicle change requested.', {
        reason: actionForm.reason.trim(),
      });
    }
    if (actionForm.type === 'reschedule') {
      return runCustomerAction(siteVisitService.requestReschedule, 'Reschedule request submitted.', {
        visitDate: actionForm.visitDate,
        visitTime: actionForm.visitTime,
        reason: actionForm.reason.trim() || undefined,
      });
    }
    return runCustomerAction(siteVisitService.cancel, 'Site visit cancelled.', {
      reason: actionForm.reason.trim(),
    });
  }

  const columns = [
    {
      key: 'id',
      header: 'Visit ID',
      render: (row) => <span className="font-mono text-xs">#{row.id}</span>,
    },
    {
      key: 'propertyName',
      header: 'Property',
      render: (row) => (
        <div>
          <Link to={`/properties/${row.propertyId}`} className="font-medium text-brand-800 hover:underline">
            {row.propertyName || row.propertyTitle || `Property #${row.propertyId}`}
          </Link>
          <div className="text-xs text-gray-400">#{row.propertyId}</div>
        </div>
      ),
    },
    {
      key: 'visitDate',
      header: 'Visit Date',
      render: (row) => row.visitDate || '—',
    },
    {
      key: 'propertyType',
      header: 'Property Type',
      sortable: false,
      render: (row) => row.property?.categoryName || row.property?.categorySlug || '—',
    },
    {
      key: 'visitTime',
      header: 'Visit Time',
      render: (row) => row.visitTime || '—',
    },
    {
      key: 'visitMode',
      header: 'Travel / Vehicle',
      sortable: false,
      render: (row) => (
        <div className="text-xs">
          <div className="font-medium">{row.visitMode === 'company_vehicle' ? 'Company Vehicle' : 'Own Vehicle'}</div>
          {row.visitMode === 'company_vehicle' && <div className="text-gray-400">{row.vehicleNumber || row.vehicleStatus || 'Awaiting assignment'}</div>}
        </div>
      ),
    },
    {
      key: 'assignedAgent',
      header: 'Assigned Agent',
      sortable: false,
      render: (row) => row.assignedAgent?.name || row.referralAgentName || '—',
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusPill status={row.status} labels={STATUS_LABELS} />,
    },
    {
      key: 'adminRemarks',
      header: 'Admin Remarks',
      sortable: false,
      className: 'max-w-[160px] truncate',
      render: (row) => row.adminRemarks || row.rejectionReason || '—',
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      render: (row) => (
        <TableActionsMenu
          items={[
            {
              key: 'view',
              label: 'View details',
              icon: Eye,
              onClick: () => openVisit(row.id),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <>
      <DataTable
        title="My Scheduled Visits"
        subtitle="Track site visit requests, assigned agents, and post-visit decisions."
        columns={columns}
        rows={visits}
        loading={loading}
        error={error}
        onRefresh={load}
        getSearchText={(row) =>
          [row.propertyName, row.status, row.visitDate, row.assignedAgent?.name, row.adminRemarks, row.id]
            .filter(Boolean)
            .join(' ')
        }
        initialSortKey="createdAt"
      />

      {selected && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 px-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
            <h2 className="font-semibold text-brand-800">
              {selected.propertyName || `Property #${selected.propertyId}`}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Status: {STATUS_LABELS[selected.status] || selected.status}
            </p>
            <dl className="mt-3 space-y-1.5 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-gray-500">Visit date</dt><dd>{selected.visitDate} {selected.visitTime}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-gray-500">Travel mode</dt><dd>{selected.visitMode === 'company_vehicle' ? 'Company Vehicle' : 'Own Vehicle'}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-gray-500">Visitors</dt><dd>{selected.visitorCount || 1}</dd></div>
              {selected.visitMode === 'company_vehicle' && (
                <>
                  <div><dt className="text-gray-500">Pickup address</dt><dd className="mt-1 rounded bg-gray-50 p-2">{selected.pickupAddress || '—'}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-gray-500">Pickup location</dt><dd>{selected.pickupLocation || '—'}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-gray-500">Pickup date / time</dt><dd>{selected.pickupDate || selected.visitDate || '—'} · {selected.pickupTime || selected.preferredPickupTime || '—'}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-gray-500">Vehicle status</dt><dd>{selected.vehicleStatus || 'Pending'}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-gray-500">Vehicle</dt><dd>{[selected.vehicleType, selected.vehicleColor, selected.vehicleNumber].filter(Boolean).join(' · ') || '—'}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-gray-500">Driver</dt><dd>{[selected.driverName, selected.driverPhone, selected.driverLicenseNumber].filter(Boolean).join(' · ') || '—'}</dd></div>
                  {selected.vehicleRemarks && <div><dt className="text-gray-500">Vehicle remarks</dt><dd className="mt-1 rounded bg-gray-50 p-2">{selected.vehicleRemarks}</dd></div>}
                </>
              )}
              <div className="flex justify-between gap-3"><dt className="text-gray-500">Assigned agent</dt><dd>{selected.assignedAgent?.name || selected.referralAgentName || '—'}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-gray-500">Admin remarks</dt><dd>{selected.adminRemarks || '—'}</dd></div>
              {selected.dropReason && (
                <div className="flex justify-between gap-3"><dt className="text-gray-500">Drop reason</dt><dd>{selected.dropReason}</dd></div>
              )}
            </dl>

            {!['rejected', 'completed', 'cancelled', 'no_show', 'closed', 'dropped'].includes(String(selected.status).toLowerCase()) && (
              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {selected.visitMode === 'company_vehicle' && (
                  ['vehicle_assigned', 'pending_customer_acceptance'].includes(String(selected.status).toLowerCase())
                  || ['assigned', 'pending_customer_acceptance'].includes(String(selected.vehicleStatus || '').toLowerCase())
                ) && (
                  <button type="button" disabled={saving} onClick={() => runCustomerAction(siteVisitService.acceptVehicle, 'Vehicle accepted.')} className="rounded-lg bg-green-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">Accept Vehicle</button>
                )}
                {selected.visitMode === 'company_vehicle' && selected.vehicleNumber && (
                  <button type="button" onClick={() => setActionForm({ type: 'vehicle-change', reason: '' })} className="rounded-lg border border-amber-300 px-3 py-2 text-sm font-semibold text-amber-800">Request Vehicle Change</button>
                )}
                <button type="button" onClick={() => setActionForm({ type: 'reschedule', visitDate: selected.visitDate || '', visitTime: String(selected.visitTime || '').slice(0, 5), reason: '' })} className="rounded-lg border border-brand-300 px-3 py-2 text-sm font-semibold text-brand-800">Request Reschedule</button>
                <button type="button" onClick={() => setActionForm({ type: 'cancel', reason: '' })} className="rounded-lg border border-red-300 px-3 py-2 text-sm font-semibold text-red-700">Cancel Visit</button>
              </div>
            )}

            {actionForm && (
              <form onSubmit={submitActionForm} className="mt-4 space-y-3 rounded-xl border border-gray-200 p-3">
                <h3 className="text-sm font-semibold text-brand-800">
                  {actionForm.type === 'reschedule' ? 'Request Reschedule' : actionForm.type === 'vehicle-change' ? 'Request Vehicle Change' : 'Cancel Site Visit'}
                </h3>
                {actionForm.type === 'reschedule' && (
                  <div className="grid grid-cols-2 gap-2">
                    <input type="date" min={new Date().toISOString().slice(0, 10)} value={actionForm.visitDate} onChange={(event) => setActionForm((form) => ({ ...form, visitDate: event.target.value }))} className="rounded-lg border border-gray-300 px-2 py-2 text-sm" required />
                    <input type="time" value={actionForm.visitTime} onChange={(event) => setActionForm((form) => ({ ...form, visitTime: event.target.value }))} className="rounded-lg border border-gray-300 px-2 py-2 text-sm" required />
                  </div>
                )}
                <textarea value={actionForm.reason} onChange={(event) => setActionForm((form) => ({ ...form, reason: event.target.value }))} rows={2} placeholder="Reason / notes" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" required />
                <div className="flex gap-2">
                  <button type="submit" disabled={saving} className="rounded-lg bg-brand-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">Submit</button>
                  <button type="button" onClick={() => setActionForm(null)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">Back</button>
                </div>
              </form>
            )}

            {selected.history?.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-gray-700">Visit timeline</h3>
                <ol className="mt-2 space-y-2 border-l-2 border-brand-100 pl-3 text-xs text-gray-600">
                  {selected.history.map((item) => (
                    <li key={item.id || `${item.toStatus}-${item.createdAt}`}>
                      <div className="font-medium text-gray-800">{STATUS_LABELS[item.toStatus] || item.toStatus}</div>
                      {item.note && <div>{item.note}</div>}
                      <div className="text-gray-400">{formatTableDate(item.createdAt)}</div>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {!flowStep && selected.canConfirmCompletion && (
              <button
                type="button"
                onClick={startCompletion}
                className="mt-4 w-full rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
              >
                Site Visit Completed
              </button>
            )}

            {flowStep === 'confirm' && (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-sm font-medium text-amber-900">Have you completed your site visit?</p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFlowStep('decision')}
                    className="rounded-lg bg-brand-700 px-3 py-2 text-sm font-semibold text-white"
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setFlowStep(null)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  >
                    No
                  </button>
                </div>
              </div>
            )}

            {flowStep === 'decision' && (
              <div className="mt-4 rounded-lg border border-brand-200 bg-brand-50/50 p-3">
                <p className="text-sm font-medium text-brand-900">Are you interested in purchasing this property?</p>
                <div className="mt-3 flex flex-col gap-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={handlePurchase}
                    className="rounded-lg bg-green-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    Interested to Purchase
                  </button>
                  <button
                    type="button"
                    onClick={() => setFlowStep('drop')}
                    className="rounded-lg border border-red-300 px-3 py-2 text-sm font-semibold text-red-700"
                  >
                    Drop / Not Interested
                  </button>
                </div>
              </div>
            )}

            {flowStep === 'drop' && (
              <form onSubmit={handleDropSubmit} className="mt-4 space-y-3 rounded-lg border border-red-200 bg-red-50/40 p-3">
                <p className="text-sm font-medium text-red-900">Reason (required)</p>
                <select
                  value={dropReason}
                  onChange={(e) => setDropReason(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  required
                >
                  <option value="">Select reason</option>
                  {DROP_REASONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                {dropReason === 'Other' && (
                  <textarea
                    value={otherReason}
                    onChange={(e) => setOtherReason(e.target.value)}
                    rows={2}
                    placeholder="Please specify…"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    required
                  />
                )}
                {dropReason && dropReason !== 'Other' && (
                  <textarea
                    value={otherReason}
                    onChange={(e) => setOtherReason(e.target.value)}
                    rows={2}
                    placeholder="Additional remarks (optional)"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                )}
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full rounded-lg bg-red-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  Submit Drop Decision
                </button>
              </form>
            )}

            <button
              type="button"
              onClick={() => { setSelected(null); setFlowStep(null); }}
              className="mt-4 rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
