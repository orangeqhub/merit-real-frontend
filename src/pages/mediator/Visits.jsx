import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, CheckCircle2 } from 'lucide-react';
import { siteVisitService } from '../../services/siteVisitService';
import { useAuthStore } from '../../store/authStore';
import { toast } from '../../store/toastStore';
import { confirmDialog } from '../../store/confirmStore';
import DataTable, { StatusPill, formatTableDate } from '../../components/common/DataTable';
import TableActionsMenu from '../../components/common/TableActionsMenu';

const STATUS_LABELS = {
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  assigned: 'Assigned',
  rejected: 'Rejected',
  completed: 'Completed',
  purchase_interest: 'Purchase Interest',
  dropped: 'Dropped',
  closed: 'Closed',
};

export default function Visits() {
  const { t } = useTranslation('common');
  const { user } = useAuthStore();
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);

  function load() {
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
  }

  useEffect(load, [user]);

  async function openVisit(id) {
    try {
      const detail = await siteVisitService.getById(id);
      setSelected(detail);
    } catch (err) {
      toast.error(err.message);
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
      key: 'visitTime',
      header: 'Time',
      render: (row) => row.visitTime || '—',
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
      key: 'createdAt',
      header: 'Created',
      render: (row) => formatTableDate(row.createdAt),
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
              <div className="flex justify-between gap-3"><dt className="text-gray-500">Status</dt><dd>{STATUS_LABELS[selected.status] || selected.status}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-gray-500">Decision</dt><dd>{selected.customerDecision || '—'}</dd></div>
              <div><dt className="text-gray-500">Remarks</dt><dd className="mt-1 rounded bg-gray-50 p-2">{selected.remarks || '—'}</dd></div>
            </dl>
            {['approved', 'assigned'].includes(selected.status) && (
              <button
                type="button"
                disabled={saving}
                onClick={handleMarkCompleted}
                className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand-700 px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                <CheckCircle2 size={16} /> Mark Visit Completed
              </button>
            )}
            <button type="button" onClick={() => setSelected(null)} className="mt-3 rounded-lg border border-gray-300 px-3 py-2 text-sm">
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
