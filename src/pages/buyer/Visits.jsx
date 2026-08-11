import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye } from 'lucide-react';
import { siteVisitService } from '../../services/siteVisitService';
import { useAuthStore } from '../../store/authStore';
import { toast } from '../../store/toastStore';
import DataTable, { StatusPill, formatTableDate } from '../../components/common/DataTable';
import TableActionsMenu from '../../components/common/TableActionsMenu';

const STATUS_LABELS = {
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  assigned: 'Assigned',
  rejected: 'Rejected',
  completed: 'Completed',
  purchase_interest: 'Purchase Interest Submitted',
  dropped: 'Dropped',
  closed: 'Closed',
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

  function load() {
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
  }

  useEffect(load, [user]);

  function openDetails(row) {
    setSelected(row);
    setFlowStep(null);
    setDropReason('');
    setOtherReason('');
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
      key: 'visitTime',
      header: 'Visit Time',
      render: (row) => row.visitTime || '—',
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
              onClick: () => openDetails(row),
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
              <div className="flex justify-between gap-3"><dt className="text-gray-500">Assigned agent</dt><dd>{selected.assignedAgent?.name || selected.referralAgentName || '—'}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-gray-500">Admin remarks</dt><dd>{selected.adminRemarks || '—'}</dd></div>
              {selected.dropReason && (
                <div className="flex justify-between gap-3"><dt className="text-gray-500">Drop reason</dt><dd>{selected.dropReason}</dd></div>
              )}
            </dl>

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
