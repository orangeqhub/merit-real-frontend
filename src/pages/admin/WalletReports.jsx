import { useEffect, useState } from 'react';
import { Download, IndianRupee, Wallet, Hourglass, HandCoins, BadgeCheck } from 'lucide-react';
import { walletService } from '../../services/walletService';
import DataTable from '../../components/common/DataTable';
import StatCard from '../../components/dashboard/StatCard';
import { exportToXlsx } from '../../utils/xlsxExport';
import { toast } from '../../store/toastStore';
import { formatInr } from '../../utils/formatIndianNumber';

function exportCsv(filename, rows) {
  if (!rows.length) {
    toast.info('Nothing to export');
    return;
  }
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
  if (!win) return;
  const heads = rows[0] ? Object.keys(rows[0]).map((h) => `<th style="padding:6px;border:1px solid #ddd;text-align:left">${h}</th>`).join('') : '';
  const body = rows.map((r) => `<tr>${Object.values(r).map((v) => `<td style="padding:6px;border:1px solid #ddd">${v ?? ''}</td>`).join('')}</tr>`).join('');
  win.document.write(`<html><head><title>${title}</title></head><body><h2>${title}</h2><table style="border-collapse:collapse;width:100%"><thead><tr>${heads}</tr></thead><tbody>${body}</tbody></table></body></html>`);
  win.document.close();
  win.print();
}

export default function AdminWalletReports() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    walletService.getAdminReports()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const summary = data?.summary || {};
  const agentRows = (data?.agentWiseCommission || []).map((a) => ({
    Agent: a.agentName,
    Balance: a.balance,
    'Pending Redemption': a.pendingRedemption,
    'Total Earned': a.totalEarned,
    'Total Redeemed': a.totalRedeemed,
  }));

  function doExport(format) {
    if (!agentRows.length) {
      toast.info('Nothing to export');
      return;
    }
    if (format === 'xlsx') exportToXlsx('wallet-reports.xlsx', [
      { sheetName: 'Agent Commission', rows: agentRows },
      { sheetName: 'Monthly', rows: (data?.monthlyCommission || []).map((m) => ({ Month: m.month, Amount: m.amount })) },
    ]);
    else if (format === 'csv') exportCsv('wallet-agent-commission.csv', agentRows);
    else printPdf('Agent Commission Report', agentRows);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Wallet Reports</h1>
          <p className="text-sm text-gray-500">Commission, balances, redemptions, and settlements.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => doExport('xlsx')} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"><Download size={16} /> Excel</button>
          <button type="button" onClick={() => doExport('csv')} className="rounded-lg border px-3 py-2 text-sm">CSV</button>
          <button type="button" onClick={() => doExport('pdf')} className="rounded-lg border px-3 py-2 text-sm">PDF</button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading reports…</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <StatCard icon={HandCoins} label="Total Commission Paid" value={formatInr(summary.totalCommissionPaid)} />
            <StatCard icon={Hourglass} label="Pending Commission" value={formatInr(summary.pendingCommission)} accent="amber" />
            <StatCard icon={Wallet} label="Total Wallet Balance" value={formatInr(summary.totalWalletBalance)} accent="amber" />
            <StatCard icon={IndianRupee} label="Pending Redemption" value={formatInr(summary.pendingRedemption)} accent="orange" />
            <StatCard icon={BadgeCheck} label="Total Redeemed" value={formatInr(summary.totalRedeemed)} accent="green" />
          </div>

          <DataTable
            title="Agent-wise Commission"
            columns={[
              { key: 'agentName', header: 'Agent', render: (r) => r.agentName },
              { key: 'totalEarned', header: 'Earned', render: (r) => formatInr(r.totalEarned) },
              { key: 'balance', header: 'Balance', render: (r) => formatInr(r.balance) },
              { key: 'pendingRedemption', header: 'Pending', render: (r) => formatInr(r.pendingRedemption) },
              { key: 'totalRedeemed', header: 'Redeemed', render: (r) => formatInr(r.totalRedeemed) },
            ]}
            rows={data?.agentWiseCommission || []}
            emptyTitleKey="empty.noData"
          />

          <DataTable
            title="Monthly Commission"
            columns={[
              { key: 'month', header: 'Month' },
              { key: 'amount', header: 'Amount', render: (r) => formatInr(r.amount) },
            ]}
            rows={data?.monthlyCommission || []}
            emptyTitleKey="empty.noData"
          />

          <DataTable
            title="Pending Commission Deals"
            columns={[
              { key: 'dealCode', header: 'Deal' },
              { key: 'agent', header: 'Agent', render: (r) => r.agent?.name || '—' },
              { key: 'property', header: 'Property' },
              { key: 'saleAmount', header: 'Sale', render: (r) => formatInr(r.saleAmount) },
              { key: 'suggestedCommission', header: 'Suggested', render: (r) => formatInr(r.suggestedCommission) },
              { key: 'commissionStatus', header: 'Status' },
            ]}
            rows={data?.pendingCommissionDeals || []}
            emptyTitleKey="empty.noData"
          />
        </>
      )}
    </div>
  );
}
