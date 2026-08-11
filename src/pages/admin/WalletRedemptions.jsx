import { useEffect, useState } from 'react';
import { walletService } from '../../services/walletService';
import DataTable, { formatTableDate } from '../../components/common/DataTable';
import TableActionsMenu from '../../components/common/TableActionsMenu';
import { toast } from '../../store/toastStore';
import { confirmDialog } from '../../store/confirmStore';
import { useRealtimeSocket } from '../../hooks/useRealtimeSocket';
import { useAuthStore } from '../../store/authStore';

function money(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`;
}

export default function AdminWalletRedemptions() {
  const { user } = useAuthStore();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bankView, setBankView] = useState(null);
  const [actionRow, setActionRow] = useState(null);
  const [actionType, setActionType] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    setError(null);
    walletService.listRedemptions({ pageSize: 100 })
      .then((data) => setRows(data?.items || []))
      .catch((err) => {
        setRows([]);
        setError(err.message || 'Failed to load redemptions');
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, []);
  useRealtimeSocket({
    enabled: Boolean(user),
    onWalletUpdate: () => load(),
  });

  async function runAction() {
    if (!actionRow || !actionType) return;
    setSaving(true);
    try {
      if (actionType === 'approve') {
        await walletService.approveRedemption(actionRow.id, { remarks });
        toast.success('Withdrawal approved. Agent will be notified: payment will be received in 30 days.');
      } else if (actionType === 'reject') {
        await walletService.rejectRedemption(actionRow.id, { remarks });
        toast.success('Redemption rejected');
      } else if (actionType === 'settle') {
        const ok = await confirmDialog({
          title: 'Settlement Completed',
          message: `Confirm bank transfer of ${money(actionRow.requestedAmount)} is done outside the system?`,
          confirmLabel: 'Mark Settled',
        });
        if (!ok) {
          setSaving(false);
          return;
        }
        await walletService.settleRedemption(actionRow.id, { remarks });
        toast.success('Settlement completed');
      }
      setActionRow(null);
      setActionType(null);
      setRemarks('');
      load();
    } catch (err) {
      toast.error(err.message || 'Action failed');
    } finally {
      setSaving(false);
    }
  }

  const columns = [
    { key: 'requestId', header: 'Request ID', render: (r) => <span className="font-mono text-xs">{r.requestId}</span> },
    { key: 'agent', header: 'Agent', render: (r) => r.agent?.name || `Agent #${r.agentId}` },
    { key: 'walletBalance', header: 'Wallet Balance', render: (r) => money(r.walletBalance) },
    { key: 'requestedAmount', header: 'Requested', render: (r) => <span className="font-semibold">{money(r.requestedAmount)}</span> },
    { key: 'bankName', header: 'Bank', render: (r) => r.bankName || '—' },
    { key: 'accountNumber', header: 'Account', render: (r) => r.accountNumber || '—' },
    { key: 'requestDate', header: 'Request Date', render: (r) => formatTableDate(r.requestDate) },
    {
      key: 'status',
      header: 'Status',
      render: (r) => (
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium">{r.status}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      render: (r) => {
        const items = [
          {
            label: 'View Bank Details',
            onClick: () => setBankView(r),
          },
        ];
        if (r.status === 'PENDING') {
          items.push(
            { label: 'Approve', onClick: () => { setActionRow(r); setActionType('approve'); setRemarks(''); } },
            { label: 'Reject', onClick: () => { setActionRow(r); setActionType('reject'); setRemarks(''); }, tone: 'danger' },
          );
        }
        if (r.status === 'APPROVED') {
          items.push({
            label: 'Settlement Completed',
            onClick: () => { setActionRow(r); setActionType('settle'); setRemarks(''); },
            tone: 'success',
          });
          items.push({
            label: 'Reject',
            onClick: () => { setActionRow(r); setActionType('reject'); setRemarks(''); },
            tone: 'danger',
          });
        }
        return <TableActionsMenu items={items} />;
      },
    },
  ];

  return (
    <>
      <DataTable
        title="Wallet Redemptions"
        subtitle="Review, approve, and settle agent commission redemptions."
        columns={columns}
        rows={rows}
        loading={loading}
        error={error}
        onRefresh={load}
        emptyTitleKey="empty.noData"
        getSearchText={(r) => [r.requestId, r.agent?.name, r.bankName, r.status].filter(Boolean).join(' ')}
        initialSortKey="requestDate"
      />

      {bankView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-warm-white p-5 shadow-xl">
            <h2 className="text-lg font-semibold">Bank Details</h2>
            <p className="mt-1 text-sm text-gray-500">{bankView.agent?.name}</p>
            <dl className="mt-4 space-y-2 text-sm">
              <div><dt className="text-gray-500">Holder</dt><dd className="font-medium">{bankView.accountHolderName || bankView.bankDetails?.accountHolderName || '—'}</dd></div>
              <div><dt className="text-gray-500">Bank</dt><dd className="font-medium">{bankView.bankName || '—'}</dd></div>
              <div><dt className="text-gray-500">Account</dt><dd className="font-medium">{bankView.bankDetails?.accountNumber || bankView.accountNumber || '—'}</dd></div>
              <div><dt className="text-gray-500">IFSC</dt><dd className="font-medium">{bankView.ifscCode || bankView.bankDetails?.ifscCode || '—'}</dd></div>
            </dl>
            <div className="mt-5 flex justify-end">
              <button type="button" onClick={() => setBankView(null)} className="rounded-lg border px-3 py-2 text-sm">Close</button>
            </div>
          </div>
        </div>
      )}

      {actionRow && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-warm-white p-5 shadow-xl">
            <h2 className="text-lg font-semibold capitalize">{actionType} Redemption</h2>
            <p className="mt-1 text-sm text-gray-500">
              {actionRow.requestId} · {money(actionRow.requestedAmount)} · {actionRow.agent?.name}
            </p>
            <label className="mt-4 block text-sm font-medium">
              Admin Remarks
              <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={3} className="mt-1 w-full rounded-lg border px-3 py-2" />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => { setActionRow(null); setActionType(null); }} className="rounded-lg border px-3 py-2 text-sm">Cancel</button>
              <button type="button" disabled={saving} onClick={runAction} className="rounded-lg bg-brand-700 px-3 py-2 text-sm font-semibold text-warm-white disabled:opacity-50">
                {saving ? 'Saving…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
