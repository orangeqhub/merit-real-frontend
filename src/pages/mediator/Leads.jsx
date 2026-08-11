import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye } from 'lucide-react';
import { expressInterestService } from '../../services/expressInterestService';
import { useAuthStore } from '../../store/authStore';
import { toast } from '../../store/toastStore';
import DataTable, { StatusPill, formatTableDate } from '../../components/common/DataTable';
import TableActionsMenu from '../../components/common/TableActionsMenu';

const STATUS_LABELS = {
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  rejected: 'Rejected',
  assigned: 'Assigned',
  purchase_requested: 'Purchase Requested',
  booking_requested: 'Booking Requested',
  closed: 'Closed',
};

const FOLLOW_UP_OPTIONS = ['NEW', 'CONTACTED', 'IN_PROGRESS', 'SITE_VISIT', 'NEGOTIATION', 'WON', 'LOST'];

export default function Leads() {
  const { t } = useTranslation('common');
  const { user } = useAuthStore();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [remark, setRemark] = useState('');
  const [followUpStatus, setFollowUpStatus] = useState('IN_PROGRESS');
  const [saving, setSaving] = useState(false);

  function load() {
    if (!user) return;
    setLoading(true);
    setError(null);
    expressInterestService
      .getAgentLeads({ pageSize: 100 })
      .then(setLeads)
      .catch((err) => {
        setLeads([]);
        setError(err.message || 'Failed to load leads');
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, [user]);

  async function openLead(id) {
    try {
      const detail = await expressInterestService.getById(id);
      setSelected(detail);
      setFollowUpStatus(detail.followUpStatus || 'IN_PROGRESS');
      setRemark('');
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleFollowUp(e) {
    e.preventDefault();
    if (!remark.trim()) {
      toast.error('Follow-up remark is required');
      return;
    }
    setSaving(true);
    try {
      const updated = await expressInterestService.addFollowUp(selected.id, {
        remark,
        followUpStatus,
      });
      setSelected(updated);
      setRemark('');
      toast.success('Follow-up saved');
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
      header: 'Lead ID',
      render: (row) => <span className="font-mono text-xs">#{row.id}</span>,
    },
    {
      key: 'customer',
      header: 'Customer',
      sortKey: 'customer.name',
      render: (row) => (
        <div>
          <div className="font-medium text-gray-800">{row.customer?.name || row.buyerName}</div>
          <div className="text-xs text-gray-400">{row.customer?.memberId || row.customerId}</div>
        </div>
      ),
    },
    {
      key: 'mobile',
      header: 'Mobile',
      sortable: false,
      render: (row) => row.customer?.mobile || row.buyerPhone || '—',
    },
    {
      key: 'email',
      header: 'Email',
      sortable: false,
      className: 'max-w-[140px] truncate',
      render: (row) => row.customer?.email || row.buyerEmail || '—',
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
      key: 'createdAt',
      header: 'Created Date',
      render: (row) => formatTableDate(row.createdAt),
    },
    {
      key: 'updatedAt',
      header: 'Last Updated',
      render: (row) => formatTableDate(row.updatedAt || row.createdAt),
    },
    {
      key: 'followUpStatus',
      header: 'Follow-up',
      render: (row) => (
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
          {row.followUpStatus || 'NEW'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <div className="flex flex-col gap-1">
          <StatusPill status={row.status} labels={STATUS_LABELS} />
          {row.isActiveLead && (
            <span className="text-[10px] font-semibold uppercase tracking-wide text-green-700">Active Lead</span>
          )}
        </div>
      ),
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
              label: 'View lead',
              icon: Eye,
              onClick: () => openLead(row.id),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <>
      <DataTable
        title={t('nav.leads')}
        subtitle="View assigned customer leads, contact details, and follow-up activity."
        columns={columns}
        rows={leads}
        loading={loading}
        error={error}
        onRefresh={load}
        getSearchText={(row) =>
          [
            row.customer?.name,
            row.buyerName,
            row.customer?.mobile,
            row.customer?.email,
            row.propertyName,
            row.status,
            row.followUpStatus,
            row.id,
          ]
            .filter(Boolean)
            .join(' ')
        }
        initialSortKey="createdAt"
      />

      {selected && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 px-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
            <h2 className="text-lg font-semibold text-brand-800">Lead #{selected.id}</h2>
            <dl className="mt-3 space-y-1.5 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-gray-500">Customer</dt><dd>{selected.customer?.name}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-gray-500">Mobile</dt><dd>{selected.customer?.mobile}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-gray-500">Email</dt><dd>{selected.customer?.email}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-gray-500">Property</dt><dd>{selected.propertyName}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-gray-500">Status</dt><dd>{STATUS_LABELS[selected.status] || selected.status}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-gray-500">Date</dt><dd>{formatTableDate(selected.createdAt)}</dd></div>
            </dl>

            <form onSubmit={handleFollowUp} className="mt-4 space-y-3 rounded-xl border border-dashed border-brand-200 p-3">
              <h3 className="text-sm font-semibold text-brand-800">Add follow-up</h3>
              <select
                value={followUpStatus}
                onChange={(e) => setFollowUpStatus(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                {FOLLOW_UP_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              <textarea
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                rows={3}
                placeholder="Follow-up remarks"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-brand-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save follow-up'}
              </button>
            </form>

            {selected.followUps?.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-gray-700">Follow-up history</h3>
                <ul className="mt-2 space-y-2 text-xs text-gray-600">
                  {selected.followUps.map((f) => (
                    <li key={f.id} className="rounded-lg border border-gray-100 px-3 py-2">
                      <div className="font-medium">{f.followUpStatus}</div>
                      <div>{f.remark}</div>
                      <div className="text-gray-400">{f.agentName} · {formatTableDate(f.createdAt)}</div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {selected.history?.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-gray-700">Timeline</h3>
                <ul className="mt-2 space-y-2 text-xs text-gray-600">
                  {selected.history.map((h) => (
                    <li key={h.id} className="rounded-lg border border-gray-100 px-3 py-2">
                      <span className="font-medium">{h.toStatus}</span>
                      {h.note ? ` — ${h.note}` : ''}
                      <div className="text-gray-400">{h.actorName || 'System'} · {formatTableDate(h.createdAt)}</div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button type="button" onClick={() => setSelected(null)} className="mt-4 rounded-lg border border-gray-300 px-3 py-2 text-sm">
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
