import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, CheckCircle2, Play, Ban } from 'lucide-react';
import { siteVisitService } from '../../services/siteVisitService';
import { useAuthStore } from '../../store/authStore';
import { toast } from '../../store/toastStore';
import { confirmDialog } from '../../store/confirmStore';
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

const FOLLOW_UP_OPTIONS = ['CONTACTED', 'CONFIRMED', 'RESCHEDULED', 'FOLLOW_UP_REQUIRED', 'COMPLETED', 'NO_SHOW'];

export default function Visits() {
  const { t } = useTranslation('common');
  const { user } = useAuthStore();
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [followUpStatus, setFollowUpStatus] = useState('CONTACTED');
  const [followUpRemark, setFollowUpRemark] = useState('');
  const [visitRemark, setVisitRemark] = useState('');

  const load = useCallback(() => {
    if (!user) return;
    setLoading(true);
    setError(null);
    siteVisitService
      .getAgentList({ pageSize: 100 })
      .then(setVisits)
      .catch((err) => {
        setVisits([]);
        setError(err.message || 'Failed to load site visits');
      })
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(load, [load]);

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

  const showVisit = useCallback((visit) => {
    setSelected(visit);
    setFollowUpStatus(visit.followUpStatus || 'CONTACTED');
    setFollowUpRemark('');
    setVisitRemark('');
  }, []);

  useOpenRecordFromUrl({
    records: visits,
    fetchById: (id) => siteVisitService.getById(id),
    onOpen: showVisit,
    stateKey: 'openVisitId',
  });

  async function openVisit(id) {
    try {
      const detail = await siteVisitService.getById(id);
      showVisit(detail);
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleFollowUp(event) {
    event.preventDefault();
    if (!selected || !followUpRemark.trim()) {
      toast.error('Follow-up remarks are required.');
      return;
    }
    setSaving(true);
    try {
      const updated = await siteVisitService.addFollowUp(selected.id, {
        followUpStatus,
        remark: followUpRemark.trim(),
      });
      showVisit(updated);
      toast.success('Site visit follow-up saved.');
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to save follow-up.');
    } finally {
      setSaving(false);
    }
  }

  async function handleMarkCompleted() {
    if (!selected) return;
    const ok = await confirmDialog({
      title: 'Mark visit completed?',
      message: 'Confirm that this site visit has been completed successfully.',
      confirmLabel: 'Mark completed',
      cancelLabel: 'Cancel',
      variant: 'success',
    });
    if (!ok) return;
    setSaving(true);
    try {
      const updated = await siteVisitService.markCompleted(selected.id);
      setSelected(updated);
      toast.success('Site visit marked completed successfully.');
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to mark visit completed.');
    } finally {
      setSaving(false);
    }
  }

  async function handleLifecycle(method, successMessage, body = {}) {
    if (!selected) return;
    setSaving(true);
    try {
      const updated = await method(selected.id, body);
      showVisit(updated);
      toast.success(successMessage);
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to update site visit.');
    } finally {
      setSaving(false);
    }
  }

  function handleNoShow() {
    const reason = window.prompt('Enter the no-show reason or remarks:');
    if (reason === null) return;
    if (!reason.trim()) {
      toast.error('A no-show reason is required.');
      return;
    }
    handleLifecycle(siteVisitService.markNoShow, 'Visit marked no-show.', { reason: reason.trim() });
  }

  async function handleRemark(event) {
    event.preventDefault();
    if (!visitRemark.trim()) return;
    setSaving(true);
    try {
      const updated = await siteVisitService.addRemarks(selected.id, visitRemark.trim());
      showVisit(updated);
      toast.success('Visit remarks saved.');
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to save remarks.');
    } finally {
      setSaving(false);
    }
  }

  const columns = [
    {
      key: 'id',
      header: 'Visit ID',
      render: (row) => <span className="font-mono text-xs">#{row.id}</span>,
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (row) => (
        <div>
          <div className="font-medium text-gray-800">{row.customer?.name || row.buyerName}</div>
          <div className="text-xs text-gray-400">{row.customer?.memberId || row.customerId}</div>
        </div>
      ),
    },
    {
      key: 'mobile',
      header: 'Contact',
      sortable: false,
      render: (row) => (
        <div className="text-xs">
          <div>{row.customer?.mobile || row.buyerPhone || '—'}</div>
          <div className="text-gray-400 truncate max-w-[120px]">{row.customer?.email || ''}</div>
        </div>
      ),
    },
    {
      key: 'propertyName',
      header: 'Property',
      render: (row) => (
        <div>
          <div className="max-w-[140px] truncate font-medium">{row.propertyName || `Property #${row.propertyId}`}</div>
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
      header: 'Time',
      render: (row) => row.visitTime || '—',
    },
    {
      key: 'visitMode',
      header: 'Travel / Vehicle',
      sortable: false,
      render: (row) => (
        <div className="text-xs">
          <div className="font-medium">{row.visitMode === 'company_vehicle' ? 'Company Vehicle' : 'Own Vehicle'}</div>
          {row.visitMode === 'company_vehicle' && <div className="text-gray-400">{row.vehicleNumber || row.vehicleStatus || 'Pending'}</div>}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <div className="flex flex-col gap-1">
          <StatusPill status={row.status} labels={STATUS_LABELS} />
          {row.isActiveVisit && (
            <span className="text-[10px] font-semibold uppercase tracking-wide text-green-700">Active Visit</span>
          )}
        </div>
      ),
    },
    {
      key: 'updatedAt',
      header: 'Last Updated',
      render: (row) => formatTableDate(row.updatedAt || row.createdAt),
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
              label: 'View visit',
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
        title={t('nav.visits')}
        subtitle="Assigned and referred site visit requests for your customers."
        columns={columns}
        rows={visits}
        loading={loading}
        error={error}
        onRefresh={load}
        getSearchText={(row) =>
          [
            row.customer?.name,
            row.customer?.mobile,
            row.propertyName,
            row.status,
            row.visitDate,
            row.id,
          ]
            .filter(Boolean)
            .join(' ')
        }
        initialSortKey="createdAt"
      />

      {selected && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 px-4">
          <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
            <h2 className="font-semibold text-brand-800">Site Visit #{selected.id}</h2>
            <dl className="mt-3 space-y-1.5 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-gray-500">Customer</dt><dd>{selected.customer?.name}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-gray-500">Mobile</dt><dd>{selected.customer?.mobile}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-gray-500">Email</dt><dd>{selected.customer?.email || '—'}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-gray-500">Property</dt><dd>{selected.propertyName}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-gray-500">Scheduled</dt><dd>{selected.visitDate} {selected.visitTime}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-gray-500">Travel mode</dt><dd>{selected.visitMode === 'company_vehicle' ? 'Company Vehicle' : 'Own Vehicle'}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-gray-500">Visitors</dt><dd>{selected.visitorCount || 1}</dd></div>
              {selected.visitMode === 'company_vehicle' && (
                <>
                  <div><dt className="text-gray-500">Pickup</dt><dd className="mt-1 rounded bg-gray-50 p-2">{selected.pickupAddress || '—'} · {selected.pickupLocation || '—'} · {selected.pickupDate || selected.visitDate || '—'} {selected.pickupTime || selected.preferredPickupTime || '—'}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-gray-500">Vehicle status</dt><dd>{selected.vehicleStatus || '—'}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-gray-500">Vehicle</dt><dd>{[selected.vehicleType, selected.vehicleColor, selected.vehicleNumber].filter(Boolean).join(' · ') || '—'}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-gray-500">Driver</dt><dd>{[selected.driverName, selected.driverPhone, selected.driverLicenseNumber].filter(Boolean).join(' · ') || '—'}</dd></div>
                  {selected.vehicleRemarks && <div><dt className="text-gray-500">Vehicle remarks</dt><dd className="mt-1 rounded bg-gray-50 p-2">{selected.vehicleRemarks}</dd></div>}
                </>
              )}
              <div className="flex justify-between gap-3"><dt className="text-gray-500">Status</dt><dd>{STATUS_LABELS[selected.status] || selected.status}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-gray-500">Decision</dt><dd>{selected.customerDecision || '—'}</dd></div>
              <div><dt className="text-gray-500">Remarks</dt><dd className="mt-1 rounded bg-gray-50 p-2">{selected.remarks || '—'}</dd></div>
            </dl>
            <form onSubmit={handleRemark} className="mt-4 flex gap-2">
              <input value={visitRemark} onChange={(event) => setVisitRemark(event.target.value)} placeholder="Add visit remark" className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              <button type="submit" disabled={saving || !visitRemark.trim()} className="rounded-lg bg-brand-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">Add</button>
            </form>
            <form onSubmit={handleFollowUp} className="mt-4 space-y-3 rounded-xl border border-dashed border-brand-200 p-3">
              <h3 className="text-sm font-semibold text-brand-800">Add visit follow-up</h3>
              <select
                value={followUpStatus}
                onChange={(event) => setFollowUpStatus(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                {FOLLOW_UP_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option.replaceAll('_', ' ')}</option>
                ))}
              </select>
              <textarea
                value={followUpRemark}
                onChange={(event) => setFollowUpRemark(event.target.value)}
                rows={3}
                placeholder="Call outcome, customer response, or next step"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-lg border border-brand-600 px-3 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save Follow-up'}
              </button>
            </form>
            {selected.followUps?.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-gray-700">Follow-up history</h3>
                <ol className="mt-2 space-y-2 border-l-2 border-brand-100 pl-3 text-xs text-gray-600">
                  {selected.followUps.map((item) => (
                    <li key={item.id || item.createdAt}>
                      <div className="font-medium text-gray-800">{item.followUpStatus}</div>
                      <div>{item.remark}</div>
                      <div className="text-gray-400">{item.agentName || item.actorName || 'Agent'} · {formatTableDate(item.createdAt)}</div>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            {selected.history?.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-gray-700">Visit timeline</h3>
                <ol className="mt-2 space-y-2 border-l-2 border-gray-200 pl-3 text-xs text-gray-600">
                  {selected.history.map((item) => (
                    <li key={item.id || item.createdAt}>
                      <div className="font-medium text-gray-800">{STATUS_LABELS[item.toStatus] || item.toStatus}</div>
                      {item.note && <div>{item.note}</div>}
                      <div className="text-gray-400">{item.actorName || item.actorRole || 'System'} · {formatTableDate(item.createdAt)}</div>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {String(selected.status).toLowerCase() === 'confirmed' && (
                <button type="button" disabled={saving} onClick={() => handleLifecycle(siteVisitService.start, 'Site visit started.')} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-700 px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-60"><Play size={16} /> Start</button>
              )}
              {(selected.expressInterestId
                ? String(selected.status).toLowerCase() === 'started'
                : ['started', 'confirmed', 'approved', 'assigned'].includes(String(selected.status).toLowerCase())) && (
                <button type="button" disabled={saving} onClick={handleMarkCompleted} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-green-700 px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-60"><CheckCircle2 size={16} /> Complete</button>
              )}
              {['confirmed', 'assigned', 'vehicle_assigned', 'started'].includes(String(selected.status).toLowerCase()) && (
                <button type="button" disabled={saving} onClick={handleNoShow} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-300 px-3 py-2.5 text-sm font-semibold text-red-700 disabled:opacity-60"><Ban size={16} /> No-show</button>
              )}
            </div>
            <button type="button" onClick={() => setSelected(null)} className="mt-3 rounded-lg border border-gray-300 px-3 py-2 text-sm">
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
