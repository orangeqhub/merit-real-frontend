import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Landmark, Download } from 'lucide-react';
import WalletLogo from '../../components/common/WalletLogo';
import { walletService } from '../../services/walletService';
import DataTable, { formatTableDate } from '../../components/common/DataTable';
import { confirmDialog } from '../../store/confirmStore';
import { toast } from '../../store/toastStore';
import { useAuthStore } from '../../store/authStore';
import { useRealtimeSocket } from '../../hooks/useRealtimeSocket';
import { exportToXlsx } from '../../utils/xlsxExport';
import { formatInr } from '../../utils/formatIndianNumber';

function exportCsv(filename, rows) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(',')),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function printPdf(title, rows) {
  const win = window.open('', '_blank');
  if (!win) {
    toast.error('Pop-up blocked. Allow pop-ups to download PDF.');
    return;
  }
  const body = rows.map((r) => `<tr>${Object.values(r).map((v) => `<td style="padding:6px;border:1px solid #ddd">${v ?? ''}</td>`).join('')}</tr>`).join('');
  const heads = rows[0] ? Object.keys(rows[0]).map((h) => `<th style="padding:6px;border:1px solid #ddd;text-align:left">${h}</th>`).join('') : '';
  win.document.write(`<!DOCTYPE html><html><head><title>${title}</title><style>body{font-family:Arial,sans-serif;padding:16px}table{border-collapse:collapse;width:100%}@media print{button{display:none}}</style></head><body><h2>${title}</h2><table><thead><tr>${heads}</tr></thead><tbody>${body}</tbody></table></body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 250);
}

export default function MediatorWallet() {
  const { user } = useAuthStore();
  const [wallet, setWallet] = useState(null);
  const [config, setConfig] = useState({ minRedemptionAmount: 1000 });
  const [tx, setTx] = useState({ items: [], total: 0, page: 1, pageSize: 10, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawRemarks, setWithdrawRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [approvedNotice, setApprovedNotice] = useState(null);

  const load = useCallback(async (page = 1) => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [w, t, cfg, redemptions] = await Promise.all([
        walletService.getMine(),
        walletService.getTransactions({ page, pageSize: 10 }),
        walletService.getConfig().catch(() => ({ minRedemptionAmount: 1000 })),
        walletService.getMyRedemptions({ pageSize: 20 }).catch(() => ({ items: [] })),
      ]);
      setWallet(w);
      setTx(t);
      setConfig(cfg || { minRedemptionAmount: 1000 });
      const approved = (redemptions?.items || []).find((r) => String(r.status).toUpperCase() === 'APPROVED');
      setApprovedNotice(
        approved
          ? `Withdrawal of ${formatInr(approved.requestedAmount || approved.amount)} approved. Your payment will be received in 30 days.`
          : null
      );
    } catch (err) {
      setError(err.message || 'Failed to load wallet');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(1); }, [load]);

  useRealtimeSocket({
    enabled: Boolean(user),
    onWalletUpdate: (payload) => {
      if (payload?.eventType === 'redemption_approved') {
        toast.success('Your payment will be received in 30 days.');
      }
      load(tx.page || 1);
    },
  });

  async function handleWithdrawal() {
    const amount = Number(withdrawAmount);
    if (!(amount > 0)) {
      toast.error('Enter a valid withdrawal amount');
      return;
    }
    if (amount > Number(wallet?.availableBalance || 0)) {
      toast.error('Amount exceeds available balance');
      return;
    }
    if (amount < Number(config.minRedemptionAmount || 0)) {
      toast.error(`Minimum withdrawal is ${formatInr(config.minRedemptionAmount)}`);
      return;
    }
    const ok = await confirmDialog({
      title: 'Confirm Withdrawal',
      message: `Submit withdrawal request for ${formatInr(amount)}? Balance stays on hold until admin approval.`,
      confirmLabel: 'Submit Request',
    });
    if (!ok) return;
    setSubmitting(true);
    try {
      await walletService.redeem({ amount, remarks: withdrawRemarks || undefined });
      toast.success('Withdrawal request submitted');
      setWithdrawOpen(false);
      setWithdrawAmount('');
      setWithdrawRemarks('');
      load(1);
    } catch (err) {
      toast.error(err.message || 'Withdrawal failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function exportReports(format) {
    try {
      const data = await walletService.getAgentReports();
      const rows = (data.statement || []).map((r) => ({
        'Transaction ID': r.transactionId,
        Type: r.displayType || r.type,
        Amount: r.amount,
        Status: r.status,
        Property: r.property || '',
        Customer: r.customer || '',
        Date: r.date ? new Date(r.date).toLocaleString('en-IN') : '',
        Remarks: r.remarks || '',
      }));
      if (!rows.length) {
        toast.info('No wallet transactions to export.');
        return;
      }
      if (format === 'xlsx') exportToXlsx('wallet-statement.xlsx', [{ sheetName: 'Statement', rows }]);
      else if (format === 'csv') exportCsv('wallet-statement.csv', rows);
      else printPdf('Wallet Statement', rows);
    } catch (err) {
      toast.error(err.message || 'Export failed');
    }
  }

  const columns = [
    { key: 'transactionId', header: 'Transaction ID', render: (r) => <span className="font-mono text-xs">{r.transactionId}</span> },
    { key: 'displayType', header: 'Type', render: (r) => r.displayType || r.type },
    { key: 'closedDealReference', header: 'Closed Deal', render: (r) => r.closedDealReference || '—' },
    { key: 'property', header: 'Property', render: (r) => r.property || '—' },
    { key: 'customer', header: 'Customer', render: (r) => r.customer || '—' },
    { key: 'amount', header: 'Amount', render: (r) => <span className="font-semibold text-brand-800">{formatInr(r.amount)}</span> },
    {
      key: 'status',
      header: 'Status',
      render: (r) => (
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">{r.status}</span>
      ),
    },
    { key: 'date', header: 'Date', render: (r) => formatTableDate(r.date) },
  ];

  const totalAmount = Number(wallet?.totalEarned ?? wallet?.balance ?? 0);
  const balanceAmount = Number(wallet?.balance ?? wallet?.availableBalance ?? 0);

  const bottomStats = [
    { label: 'Total Amount', value: formatInr(totalAmount) },
    { label: 'Available Balance', value: formatInr(wallet?.availableBalance) },
    { label: 'Total Earned', value: formatInr(wallet?.totalEarned) },
    { label: 'Total Withdrawal', value: formatInr(wallet?.totalRedeemed) },
    { label: 'Last Credit', value: wallet?.lastCreditAt ? formatTableDate(wallet.lastCreditAt) : '—' },
    { label: 'Last Withdrawal', value: wallet?.lastRedemptionAt ? formatTableDate(wallet.lastRedemptionAt) : '—' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
            <WalletLogo size={36} />
            <div>
              <h1 className="text-xl font-semibold text-gray-900">My Wallet</h1>
              <p className="text-sm text-gray-500">Commission wallet for closed deals and withdrawals.</p>
            </div>
          </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/mediator/bank-details"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Landmark size={16} /> Bank Details
          </Link>
          <button
            type="button"
            onClick={() => setWithdrawOpen(true)}
            className="rounded-lg bg-brand-700 px-3 py-2 text-sm font-semibold text-warm-white hover:bg-brand-800"
          >
            Withdrawal
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            onClick={() => exportReports('xlsx')}
          >
            <Download size={16} /> Export
          </button>
          <button type="button" onClick={() => exportReports('csv')} className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">CSV</button>
          <button type="button" onClick={() => exportReports('pdf')} className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">PDF</button>
        </div>
      </div>

      <div className="max-w-md space-y-3">
        <div className="rounded-xl border border-brand-200 bg-brand-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Balance Amount</p>
          <p className="mt-1 text-2xl font-semibold text-brand-900">{formatInr(balanceAmount)}</p>
        </div>
        <button
          type="button"
          onClick={() => setWithdrawOpen(true)}
          className="rounded-lg bg-brand-700 px-3 py-2 text-sm font-semibold text-warm-white hover:bg-brand-800"
        >
          Withdrawal
        </button>
      </div>

      {approvedNotice && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {approvedNotice}
        </div>
      )}

      <DataTable
        title="Wallet Transactions"
        subtitle="Credits, withdrawals, and adjustments"
        columns={columns}
        rows={tx.items || []}
        loading={loading}
        error={error}
        onRefresh={() => load(tx.page || 1)}
        emptyTitleKey="empty.noData"
        getSearchText={(row) =>
          [row.transactionId, row.displayType, row.property, row.customer, row.status].filter(Boolean).join(' ')
        }
        initialSortKey="date"
      />

      {tx.totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            disabled={tx.page <= 1}
            onClick={() => load(tx.page - 1)}
            className="rounded border px-3 py-1 text-sm disabled:opacity-40"
          >
            Prev
          </button>
          <span className="text-sm text-gray-600">Page {tx.page} / {tx.totalPages}</span>
          <button
            type="button"
            disabled={tx.page >= tx.totalPages}
            onClick={() => load(tx.page + 1)}
            className="rounded border px-3 py-1 text-sm disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {bottomStats.map((s) => (
          <div key={s.label} className="rounded-xl border border-gray-100 bg-warm-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{s.label}</p>
            <p className="mt-1 text-lg font-semibold text-brand-900">{s.value}</p>
          </div>
        ))}
      </div>

      {withdrawOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-warm-white p-5 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900">Withdrawal</h2>
            <p className="mt-1 text-sm text-gray-500">Available: {formatInr(wallet?.availableBalance)}</p>
            <p className="text-xs text-gray-400">Min: {formatInr(config.minRedemptionAmount)}</p>
            <label className="mt-4 block text-sm font-medium text-gray-700">
              Withdrawal Amount
              <input
                type="number"
                min="0"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
              />
            </label>
            <label className="mt-3 block text-sm font-medium text-gray-700">
              Remarks (optional)
              <textarea
                value={withdrawRemarks}
                onChange={(e) => setWithdrawRemarks(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
              />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setWithdrawOpen(false)} className="rounded-lg border px-3 py-2 text-sm">Cancel</button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleWithdrawal}
                className="rounded-lg bg-brand-700 px-3 py-2 text-sm font-semibold text-warm-white disabled:opacity-50"
              >
                {submitting ? 'Submitting…' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
