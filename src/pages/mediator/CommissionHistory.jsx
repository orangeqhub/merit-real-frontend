import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { walletService } from '../../services/walletService';
import { useAuthStore } from '../../store/authStore';
import { AGENT_GRADES } from '../../config/agentGrades';
import DataTable, { formatTableDate } from '../../components/common/DataTable';
import { formatIndianCurrency } from '../../utils/formatIndianNumber';

function gradeLabel(code) {
  return AGENT_GRADES.find((g) => g.code === code)?.label || code || '—';
}

export default function CommissionHistory() {
  const { t } = useTranslation('dashboard');
  const { user } = useAuthStore();
  const [wallet, setWallet] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  function load() {
    if (!user) return;
    setLoading(true);
    setError(null);
    Promise.all([
      walletService.getMine(),
      walletService.getTransactions({ type: 'COMMISSION_CREDIT', pageSize: 100 }),
    ])
      .then(([walletRes, txRes]) => {
        setWallet(walletRes || null);
        setRows(txRes?.items || []);
      })
      .catch((err) => {
        setWallet(null);
        setRows([]);
        setError(err.message || 'Failed to load commission history');
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, [user]);

  const commissionPercent = wallet?.commissionPercent;

  const columns = [
    {
      key: 'property',
      header: t('commission.property'),
      render: (row) => row.property || row.closedDealReference || '—',
    },
    {
      key: 'customer',
      header: t('commission.customer', { defaultValue: 'Customer' }),
      render: (row) => row.customer || '—',
    },
    {
      key: 'amount',
      header: t('commission.amount'),
      render: (row) => (
        <span className="font-semibold text-brand-700">{formatIndianCurrency(row.amount)}</span>
      ),
    },
    {
      key: 'date',
      header: t('commission.soldOn'),
      render: (row) => formatTableDate(row.date || row.createdAt),
    },
  ];

  return (
    <div>
      {wallet && (
        <div className="mb-3 flex flex-wrap gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
          <div>
            <span className="text-gray-500">{t('commission.grade', { defaultValue: 'Agent Grade' })}: </span>
            <span className="font-semibold text-gray-900">{gradeLabel(wallet.agentGrade)}</span>
          </div>
          <div>
            <span className="text-gray-500">{t('commission.rate', { defaultValue: 'Commission %' })}: </span>
            <span className="font-semibold text-brand-700">
              {commissionPercent != null ? `${commissionPercent}%` : '—'}
            </span>
          </div>
          <div>
            <span className="text-gray-500">{t('commission.totalEarned', { defaultValue: 'Total Earned' })}: </span>
            <span className="font-semibold text-brand-700">{formatIndianCurrency(wallet.totalEarned || 0)}</span>
          </div>
        </div>
      )}
      <DataTable
        title={t('commission.title')}
        subtitle={t('commission.serverNote', {
          defaultValue: 'Your commission percentage is set by admin based on your agent grade.',
        })}
        columns={columns}
        rows={rows}
        loading={loading}
        error={error}
        onRefresh={load}
        emptyTitleKey="commission.empty"
        getSearchText={(row) => [row.property, row.customer, row.amount].filter(Boolean).join(' ')}
        initialSortKey="date"
      />
    </div>
  );
}
