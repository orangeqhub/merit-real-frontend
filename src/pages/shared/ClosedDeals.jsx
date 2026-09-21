import { useEffect, useMemo, useState } from 'react';
import { expressInterestService } from '../../services/expressInterestService';
import { walletService } from '../../services/walletService';
import DataTable, { formatTableDate } from '../../components/common/DataTable';
import { useAuthStore } from '../../store/authStore';
import { toast } from '../../store/toastStore';
import { confirmDialog } from '../../store/confirmStore';
import TableActionsMenu from '../../components/common/TableActionsMenu';
import { formatInr } from '../../utils/formatIndianNumber';

export default function ClosedDeals({ scope = 'agent' }) {
  const { user } = useAuthStore();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [creditDeal, setCreditDeal] = useState(null);
  const [percent, setPercent] = useState('2');
  const [amount, setAmount] = useState('');
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualForm, setManualForm] = useState({ agentId: '', amount: '', incentiveType: 'PERFORMANCE_BONUS', remarks: '' });

  function load() {
    if (!user) return;
    setLoading(true);
    setError(null);
    const loader = (scope === 'admin' || scope === 'sales')
      ? expressInterestService.getClosedDealsAdmin({ pageSize: 100 })
      : expressInterestService.getClosedDealsMine({ pageSize: 100 });

    Promise.resolve(loader)
      .then((data) => {
        const items = Array.isArray(data) ? data : (data?.items || []);
        setRows(items);
      })
      .catch((err) => {
        setRows([]);
        setError(err.message || 'Failed to load closed deals');
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, [user, scope]);

  function openCredit(row) {
    const pct = row.commissionPercent != null ? Number(row.commissionPercent) : 2;
    const suggested = row.commissionAmount != null
      ? Number(row.commissionAmount)
      : (row.suggestedCommission != null
        ? Number(row.suggestedCommission)
        : Math.round((Number(row.saleAmount || 0) * pct) / 100 * 100) / 100);
    setCreditDeal(row);
    setPercent(String(pct));
    setAmount(String(suggested));
    setRemarks('');
  }

  function recalcAmount(nextPercent) {
    setPercent(nextPercent);
    const sale = Number(creditDeal?.saleAmount || 0);
    const pct = Number(nextPercent) || 0;
    setAmount(String(Math.round((sale * pct) / 100 * 100) / 100));
  }

  async function submitCredit() {
    if (!creditDeal) return;
    const ok = await confirmDialog({
      title: 'Credit Commission',
      message: `Credit ${formatInr(amount)} to agent wallet for deal ${creditDeal.dealId || creditDeal.dealCode}?`,
      confirmLabel: 'Credit Commission',
    });
    if (!ok) return;
    setSaving(true);
    try {
      await walletService.creditCommission(creditDeal.id, {
        commissionPercent: Number(percent),
        commissionAmount: Number(amount),
        remarks: remarks || undefined,
      });
      toast.success('Commission credited to agent wallet');
      setCreditDeal(null);
      load();
    } catch (err) {
      toast.error(err.message || 'Failed to credit commission');
    } finally {
      setSaving(false);
    }
  }

  async function submitManualCredit() {
    const ok = await confirmDialog({
      title: 'Manual Incentive Credit',
      message: `Credit ${formatInr(manualForm.amount)} incentive to agent #${manualForm.agentId}?`,
      confirmLabel: 'Credit',
    });
    if (!ok) return;
    setSaving(true);
    try {
      await walletService.manualCredit({
        agentId: Number(manualForm.agentId),
        amount: Number(manualForm.amount),
        incentiveType: manualForm.incentiveType,
        remarks: manualForm.remarks || undefined,
      });
      toast.success('Incentive credited');
      setManualOpen(false);
      setManualForm({ agentId: '', amount: '', incentiveType: 'PERFORMANCE_BONUS', remarks: '' });
    } catch (err) {
      toast.error(err.message || 'Manual credit failed');
    } finally {
      setSaving(false);
    }
  }

  const columns = useMemo(() => {
    const cols = [
      {
        key: 'dealId',
        header: 'Deal ID',
        render: (row) => <span className="font-mono text-xs">{row.dealId || row.dealCode}</span>,
      },
      {
        key: 'customerName',
        header: 'Customer',
        render: (row) => row.customerName || row.customer?.name || '—',
      },
      {
        key: 'property',
        header: 'Property',
        render: (row) => row.property || row.propertyDetails?.titleEn || `Property #${row.propertyId}`,
      },
      {
        key: 'saleAmount',
        header: 'Sale Amount',
        render: (row) => formatInr(row.saleAmount),
      },
      {
        key: 'commissionPercent',
        header: 'Commission %',
        render: (row) => `${row.commissionPercent != null ? row.commissionPercent : 2}%`,
      },
      {
        key: 'commissionAmount',
        header: 'Commission Amt',
        render: (row) => formatInr(
          row.commissionAmount
            ?? row.suggestedCommission
            ?? Math.round((Number(row.saleAmount || 0) * (row.commissionPercent != null ? Number(row.commissionPercent) : 2)) / 100)
        ),
      },
      {
        key: 'bookingDate',
        header: 'Booking Date',
        render: (row) => (row.bookingDate ? formatTableDate(row.bookingDate) : '—'),
      },
      {
        key: 'purchaseDate',
        header: 'Purchase Date',
        render: (row) => formatTableDate(row.purchaseDate),
      },
      {
        key: 'commissionStatus',
        header: 'Commission Status',
        render: (row) => (
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            row.commissionStatus === 'CREDITED'
              ? 'bg-emerald-50 text-emerald-800'
              : 'bg-amber-50 text-amber-800'
          }`}
          >
            {row.commissionStatus || 'PENDING'}
          </span>
        ),
      },
      {
        key: 'dealStatus',
        header: 'Deal Status',
        render: (row) => (
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800">
            {row.dealStatus || 'CLOSED'}
          </span>
        ),
      },
    ];

    if (scope === 'admin' || scope === 'sales') {
      cols.splice(2, 0, {
        key: 'agent',
        header: 'Assigned Agent',
        render: (row) => row.agent?.name || '—',
      });
      if (scope === 'admin') {
        cols.push({
          key: 'actions',
          header: 'Actions',
          sortable: false,
          render: (row) => {
            const items = [];
            if (row.agentId || row.agent?.id) {
              if (row.commissionStatus !== 'CREDITED') {
                items.push({
                  label: 'Credit Commission',
                  onClick: () => openCredit(row),
                });
              }
            }
            return items.length ? <TableActionsMenu items={items} /> : '—';
          },
        });
      }
    }

    return cols;
  }, [scope]);

  return (
    <>
      <DataTable
        title="Closed Deals"
        subtitle={
          scope === 'admin'
            ? 'Completed sales — credit commission to agent wallets.'
            : scope === 'sales'
              ? 'Completed sales across the pipeline (read-only).'
              : 'Your permanently associated closed deals.'
        }
        columns={columns}
        rows={rows}
        loading={loading}
        error={error}
        onRefresh={load}
        emptyTitleKey="empty.noData"
        toolbar={scope === 'admin' ? (
          <button
            type="button"
            onClick={() => setManualOpen(true)}
            className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-800"
          >
            Manual Incentive Credit
          </button>
        ) : null}
        getSearchText={(row) =>
          [row.dealId, row.dealCode, row.customerName, row.property, row.agent?.name, row.dealStatus, row.commissionStatus]
            .filter(Boolean)
            .join(' ')
        }
        initialSortKey="purchaseDate"
      />

      {creditDeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-warm-white p-5 shadow-xl">
            <h2 className="text-lg font-semibold">Credit Commission</h2>
            <p className="mt-1 text-sm text-gray-500">
              {creditDeal.dealId || creditDeal.dealCode} · {creditDeal.agent?.name || 'Agent'} · Sale {formatInr(creditDeal.saleAmount)}
            </p>
            <label className="mt-4 block text-sm font-medium">
              Commission %
              <input
                type="number"
                value={percent}
                onChange={(e) => recalcAmount(e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2"
              />
            </label>
            <label className="mt-3 block text-sm font-medium">
              Commission Amount
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2"
              />
            </label>
            <label className="mt-3 block text-sm font-medium">
              Remarks
              <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border px-3 py-2" />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setCreditDeal(null)} className="rounded-lg border px-3 py-2 text-sm">Cancel</button>
              <button type="button" disabled={saving} onClick={submitCredit} className="rounded-lg bg-brand-700 px-3 py-2 text-sm font-semibold text-warm-white disabled:opacity-50">
                {saving ? 'Crediting…' : 'Credit Commission'}
              </button>
            </div>
          </div>
        </div>
      )}

      {manualOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-warm-white p-5 shadow-xl">
            <h2 className="text-lg font-semibold">Manual Incentive Credit</h2>
            <label className="mt-4 block text-sm font-medium">
              Agent ID
              <input
                value={manualForm.agentId}
                onChange={(e) => setManualForm((f) => ({ ...f, agentId: e.target.value }))}
                className="mt-1 w-full rounded-lg border px-3 py-2"
              />
            </label>
            <label className="mt-3 block text-sm font-medium">
              Amount
              <input
                type="number"
                value={manualForm.amount}
                onChange={(e) => setManualForm((f) => ({ ...f, amount: e.target.value }))}
                className="mt-1 w-full rounded-lg border px-3 py-2"
              />
            </label>
            <label className="mt-3 block text-sm font-medium">
              Incentive Type
              <select
                value={manualForm.incentiveType}
                onChange={(e) => setManualForm((f) => ({ ...f, incentiveType: e.target.value }))}
                className="mt-1 w-full rounded-lg border px-3 py-2"
              >
                <option value="FESTIVAL_BONUS">Festival Bonus</option>
                <option value="PERFORMANCE_BONUS">Performance Bonus</option>
                <option value="REFERRAL_BONUS">Referral Bonus</option>
                <option value="SPECIAL_INCENTIVE">Special Incentive</option>
              </select>
            </label>
            <label className="mt-3 block text-sm font-medium">
              Remarks
              <textarea
                value={manualForm.remarks}
                onChange={(e) => setManualForm((f) => ({ ...f, remarks: e.target.value }))}
                rows={2}
                className="mt-1 w-full rounded-lg border px-3 py-2"
              />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setManualOpen(false)} className="rounded-lg border px-3 py-2 text-sm">Cancel</button>
              <button type="button" disabled={saving} onClick={submitManualCredit} className="rounded-lg bg-brand-700 px-3 py-2 text-sm font-semibold text-warm-white disabled:opacity-50">
                Credit
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
