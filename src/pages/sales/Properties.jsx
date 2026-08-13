import { useEffect, useState } from 'react';
import { propertyService } from '../../services/propertyService';
import EmptyState from '../../components/common/EmptyState';
import TablePagination from '../../components/common/TablePagination';
import StatusBadge from '../../components/dashboard/StatusBadge';
import { useClientPagination } from '../../hooks/useClientPagination';
import { toast } from '../../store/toastStore';
import { formatIndianCurrency } from '../../utils/formatIndianNumber';

export default function SalesProperties() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    propertyService.getProperties({ includeAllStatuses: true, admin: true, pageSize: 100 })
      .then((r) => setRows(r?.items || []))
      .catch((err) => {
        toast.error(err.message || 'Failed to load properties');
        setRows([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const {
    page, setPage, pageSize, setPageSize, total, totalPages, pageRows,
  } = useClientPagination(rows, 10);

  return (
    <div>
      <h1 className="text-xl font-bold text-brand-800">Properties</h1>
      <p className="mt-1 text-sm text-gray-500">Open, reserved, and sold property availability.</p>

      {loading ? null : rows.length === 0 ? (
        <div className="mt-6"><EmptyState titleKey="empty.noData" /></div>
      ) : (
        <div className="mt-6">
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-warm-white">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Property</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pageRows.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 font-medium">{p.titleEn || p.title || p.id}</td>
                    <td className="px-4 py-3">{[p.locality, p.city, p.district].filter(Boolean).join(', ') || '—'}</td>
                    <td className="px-4 py-3">
                      {p.price != null ? formatIndianCurrency(p.price) : '—'}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={String(p.status || '').toLowerCase()} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <TablePagination
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}
    </div>
  );
}
