import { useEffect, useState } from 'react';
import { contactEnquiryService } from '../../services/cmsService';
import EmptyState from '../common/EmptyState';
import TablePagination from '../common/TablePagination';
import { useClientPagination } from '../../hooks/useClientPagination';
import { toast } from '../../store/toastStore';

const STATUS_OPTIONS = ['NEW', 'READ', 'CLOSED'];

export default function ContactMessagesPanel() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const data = await contactEnquiryService.list({
        pageSize: 100,
        status: statusFilter || undefined,
      });
      setRows(Array.isArray(data) ? data : (data?.items || []));
    } catch (err) {
      toast.error(err.message || 'Failed to load contact messages');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const {
    page, setPage, pageSize, setPageSize, total, totalPages, pageRows,
  } = useClientPagination(rows, 10);

  async function markStatus(id, status) {
    setUpdatingId(id);
    try {
      const updated = await contactEnquiryService.updateStatus(id, status);
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...updated } : r)));
      setSelected((prev) => (prev?.id === id ? { ...prev, ...updated } : prev));
      toast.success('Status updated');
    } catch (err) {
      toast.error(err.message || 'Unable to update status');
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-brand-800">Contact Messages</h1>
          <p className="mt-1 text-sm text-gray-500">
            Submissions from the Home and About Us contact forms.
          </p>
        </div>
        <label className="text-sm text-gray-600">
          Status{' '}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="ml-1 rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
          >
            <option value="">All</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>

      {loading ? null : rows.length === 0 ? (
        <div className="mt-6"><EmptyState titleKey="empty.noData" /></div>
      ) : (
        <div className="mt-6">
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-warm-white">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Mobile</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">When</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pageRows.map((row) => (
                  <tr key={row.id} className="align-top">
                    <td className="px-4 py-3 font-mono text-xs">#{row.id}</td>
                    <td className="px-4 py-3">{row.fullName || '—'}</td>
                    <td className="px-4 py-3">{row.mobile || '—'}</td>
                    <td className="px-4 py-3 capitalize">{row.source || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        row.status === 'NEW'
                          ? 'bg-amber-50 text-amber-800'
                          : row.status === 'READ'
                            ? 'bg-blue-50 text-blue-800'
                            : 'bg-gray-100 text-gray-700'
                      }`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                      {row.createdAt ? new Date(row.createdAt).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => {
                          setSelected(row);
                          if (row.status === 'NEW') markStatus(row.id, 'READ');
                        }}
                        className="text-sm font-medium text-brand-700 hover:underline"
                      >
                        View
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
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-brand-900">#{selected.id} · {selected.fullName}</h2>
                <p className="mt-0.5 text-xs text-gray-500 capitalize">
                  Source: {selected.source} · {selected.createdAt ? new Date(selected.createdAt).toLocaleString() : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-lg border border-gray-200 px-2 py-1 text-sm text-gray-600 hover:bg-gray-50"
              >
                Close
              </button>
            </div>

            <dl className="mt-4 space-y-2 text-sm">
              <div><dt className="text-xs text-gray-500">Mobile</dt><dd>{selected.mobile || '—'}</dd></div>
              <div><dt className="text-xs text-gray-500">Email</dt><dd>{selected.email || '—'}</dd></div>
              {selected.enquiryType && (
                <div><dt className="text-xs text-gray-500">Enquiry type</dt><dd>{selected.enquiryType}</dd></div>
              )}
              {selected.preferredLocation && (
                <div><dt className="text-xs text-gray-500">Preferred location</dt><dd>{selected.preferredLocation}</dd></div>
              )}
              {selected.propertyCategory && (
                <div><dt className="text-xs text-gray-500">Property category</dt><dd>{selected.propertyCategory}</dd></div>
              )}
              {selected.budgetRange && (
                <div><dt className="text-xs text-gray-500">Budget</dt><dd>{selected.budgetRange}</dd></div>
              )}
              {selected.contactMethod && (
                <div><dt className="text-xs text-gray-500">Preferred contact</dt><dd className="capitalize">{selected.contactMethod}</dd></div>
              )}
              <div>
                <dt className="text-xs text-gray-500">Message</dt>
                <dd className="mt-1 whitespace-pre-wrap rounded-lg border border-gray-100 bg-gray-50 p-3">{selected.message}</dd>
              </div>
            </dl>

            <div className="mt-4 flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((status) => (
                <button
                  key={status}
                  type="button"
                  disabled={updatingId === selected.id || selected.status === status}
                  onClick={() => markStatus(selected.id, status)}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Mark {status}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
