import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { propertyService } from '../../services/propertyService';
import { useAuthStore } from '../../store/authStore';
import DataTable, { formatTableDate } from '../../components/common/DataTable';

const COMMISSION_RATE = 2;

export default function CommissionHistory() {
  const { t } = useTranslation('dashboard');
  const { user } = useAuthStore();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  function load() {
    if (!user) return;
    setLoading(true);
    setError(null);
    propertyService
      .getProperties({ pageSize: 100, status: 'sold' })
      .then((r) => setProperties(r.items || []))
      .catch((err) => {
        setProperties([]);
        setError(err.message || 'Failed to load commission history');
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, [user]);

  const rows = useMemo(
    () => properties.map((p) => ({ ...p, commission: Math.round((p.price || 0) * (COMMISSION_RATE / 100)) })),
    [properties]
  );

  const totalCommission = rows.reduce((sum, r) => sum + r.commission, 0);

  const columns = [
    {
      key: 'titleEn',
      header: t('commission.property'),
      render: (row) => row.titleEn || '—',
    },
    {
      key: 'price',
      header: t('commission.salePrice'),
      render: (row) => `₹${Number(row.price || 0).toLocaleString('en-IN')}`,
    },
    {
      key: 'rate',
      header: t('commission.rate'),
      sortable: false,
      render: () => `${COMMISSION_RATE}%`,
    },
    {
      key: 'commission',
      header: t('commission.amount'),
      render: (row) => (
        <span className="font-semibold text-brand-700">₹{row.commission.toLocaleString('en-IN')}</span>
      ),
    },
    {
      key: 'updatedAt',
      header: t('commission.soldOn'),
      render: (row) => formatTableDate(row.updatedAt || row.updatedDate || row.postedDate || row.createdAt),
    },
  ];

  return (
    <div>
      <DataTable
        title={t('commission.title')}
        subtitle={t('commission.note', { rate: COMMISSION_RATE })}
        columns={columns}
        rows={rows}
        loading={loading}
        error={error}
        onRefresh={load}
        emptyTitleKey="commission.empty"
        getSearchText={(row) => [row.titleEn, row.price, row.commission].filter(Boolean).join(' ')}
        initialSortKey="updatedAt"
      />
      {!loading && rows.length > 0 && (
        <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-brand-800">
          {t('commission.amount')}: ₹{totalCommission.toLocaleString('en-IN')}
        </div>
      )}
    </div>
  );
}
