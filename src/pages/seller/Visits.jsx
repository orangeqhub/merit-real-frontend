import { useEffect, useState } from 'react';
import { visitService } from '../../services/visitService';
import { propertyService } from '../../services/propertyService';
import { useAuthStore } from '../../store/authStore';
import DataTable, { StatusPill, formatTableDate } from '../../components/common/DataTable';

export default function Visits() {
  const { user } = useAuthStore();
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  function load() {
    if (!user) return;
    setLoading(true);
    setError(null);
    visitService
      .getForSeller(user.id)
      .then(async (list) => {
        const enriched = await Promise.all(
          (list || []).map(async (v) => {
            const p = await propertyService.getPropertyById(v.propertyId).catch(() => null);
            return { ...v, propertyTitle: p?.titleEn || `Property #${v.propertyId}` };
          })
        );
        setVisits(enriched);
      })
      .catch((err) => {
        setVisits([]);
        setError(err.message || 'Failed to load visits');
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, [user]);

  const columns = [
    {
      key: 'propertyTitle',
      header: 'Property',
      render: (row) => <span className="font-medium text-gray-800">{row.propertyTitle}</span>,
    },
    {
      key: 'scheduledFor',
      header: 'Scheduled For',
      render: (row) => formatTableDate(row.scheduledFor),
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
      key: 'status',
      header: 'Status',
      render: (row) => <StatusPill status={row.status} />,
    },
  ];

  return (
    <DataTable
      title="Visit Requests"
      subtitle="Visit requests for your properties."
      columns={columns}
      rows={visits}
      loading={loading}
      error={error}
      onRefresh={load}
      getSearchText={(row) => [row.propertyTitle, row.status, row.propertyId].filter(Boolean).join(' ')}
      initialSortKey="scheduledFor"
    />
  );
}
