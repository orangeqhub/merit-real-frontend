import { useEffect, useState } from 'react';
import { expressInterestService } from '../../services/expressInterestService';
import EmptyState from '../../components/common/EmptyState';
import TablePagination from '../../components/common/TablePagination';
import { useClientPagination } from '../../hooks/useClientPagination';
import { toast } from '../../store/toastStore';

export default function SalesLeads() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    expressInterestService.getAdminList({ pageSize: 100 })
      .then((data) => setRows(Array.isArray(data) ? data : (data?.items || [])))
      .catch((err) => {
        toast.error(err.message || 'Failed to load leads');
        setRows([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const {
    page, setPage, pageSize, setPageSize, total, totalPages, pageRows,
  } = useClientPagination(rows, 10);

  return (
    <div>
      <h1 className="text-xl font-bold text-brand-800">Leads</h1>
      <p className="mt-1 text-sm text-gray-500">Express interest requests across the sales pipeline.</p>

      {loading ? null : rows.length === 0 ? (
        <div className="mt-6"><EmptyState titleKey="empty.noData" /></div>
      ) : (
        <div className="mt-6">
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-warm-white">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Property</th>
                  <th className="px-4 py-3">Agent</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pageRows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3 font-mono text-xs">#{row.id}</td>
                    <td className="px-4 py-3">{row.customer?.name || row.customerName || '—'}</td>
                    <td className="px-4 py-3">{row.property?.titleEn || row.propertyName || '—'}</td>
                    <td className="px-4 py-3">{row.assignedAgent?.name || row.agent?.name || '—'}</td>
                    <td className="px-4 py-3 capitalize">{String(row.status || '').replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                      {row.createdAt ? new Date(row.createdAt).toLocaleString() : '—'}
                    </td>
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
