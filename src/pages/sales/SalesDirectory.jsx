import { useEffect, useState } from 'react';
import { Eye } from 'lucide-react';
import EmptyState from '../../components/common/EmptyState';
import TablePagination from '../../components/common/TablePagination';
import StatusBadge from '../../components/dashboard/StatusBadge';
import { toast } from '../../store/toastStore';

/**
 * Read-only directory for Sales Members (customers or agents).
 */
export default function SalesDirectory({ title, subtitle, service, idLabel = 'ID', extraColumn }) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState(null);

  async function load(nextPage = page) {
    setLoading(true);
    try {
      const data = await service.list({
        page: nextPage,
        pageSize,
        sortBy: 'createdAt',
        sortDir: 'DESC',
      });
      setRows(data.items);
      setTotal(data.total);
      setPage(data.page);
      setTotalPages(data.totalPages);
    } catch (err) {
      toast.error(err.message || 'Failed to load records');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageSize]);

  return (
    <div>
      <h1 className="text-xl font-bold text-brand-800">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}

      {loading ? null : rows.length === 0 ? (
        <div className="mt-6"><EmptyState titleKey="empty.noData" /></div>
      ) : (
        <div className="mt-6">
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-warm-white">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">{idLabel}</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Mobile</th>
                  <th className="px-4 py-3">Email</th>
                  {extraColumn && <th className="px-4 py-3">{extraColumn.header}</th>}
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Registered</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/80">
                    <td className="px-4 py-3 font-medium">{u.memberId || u.id}</td>
                    <td className="px-4 py-3">{u.name}</td>
                    <td className="px-4 py-3">{u.mobile}</td>
                    <td className="px-4 py-3">{u.email}</td>
                    {extraColumn && (
                      <td className="px-4 py-3">{extraColumn.value(u)}</td>
                    )}
                    <td className="px-4 py-3"><StatusBadge status={u.status} /></td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                      {u.createdAt ? new Date(u.createdAt).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setViewing(u)}
                        className="inline-flex items-center gap-1 rounded-lg border border-brand-300 bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-800"
                      >
                        <Eye size={14} /> View
                      </button>
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
            onPageChange={(p) => { setPage(p); load(p); }}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}

      {viewing && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 px-4 py-6">
          <div className="w-full max-w-lg rounded-xl bg-warm-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-brand-800">{viewing.name}</h2>
                <p className="text-sm text-gray-500">{viewing.memberId || viewing.id}</p>
              </div>
              <button type="button" onClick={() => setViewing(null)} className="text-sm text-gray-500">Close</button>
            </div>
            <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div><dt className="text-xs uppercase text-gray-500">Mobile</dt><dd className="text-sm">{viewing.mobile}</dd></div>
              <div><dt className="text-xs uppercase text-gray-500">Email</dt><dd className="text-sm">{viewing.email}</dd></div>
              <div><dt className="text-xs uppercase text-gray-500">Status</dt><dd className="text-sm"><StatusBadge status={viewing.status} /></dd></div>
              <div><dt className="text-xs uppercase text-gray-500">Location</dt><dd className="text-sm">{[viewing.city, viewing.district].filter(Boolean).join(', ') || '—'}</dd></div>
              <div className="sm:col-span-2">
                <dt className="text-xs uppercase text-gray-500">Occupation</dt>
                <dd className="text-sm">{viewing.occupation || '—'}</dd>
              </div>
              {extraColumn && (
                <div className="sm:col-span-2">
                  <dt className="text-xs uppercase text-gray-500">{extraColumn.header}</dt>
                  <dd className="text-sm">{extraColumn.value(viewing)}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}
