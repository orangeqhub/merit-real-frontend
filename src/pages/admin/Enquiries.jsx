import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Download, ExternalLink } from 'lucide-react';
import { enquiryService } from '../../services/enquiryService';
import { agentService } from '../../services/managedUserService';
import { useAuthStore } from '../../store/authStore';
import { toast } from '../../store/toastStore';
import { exportSingleSheetXlsx } from '../../utils/xlsxExport';
import EmptyState from '../../components/common/EmptyState';
import TablePagination from '../../components/common/TablePagination';
import { useClientPagination } from '../../hooks/useClientPagination';

const STATUS_LABELS = {
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  rejected: 'Rejected',
  assigned: 'Assigned',
  purchase_requested: 'Purchase Requested',
  booking_requested: 'Booking Requested',
  closed: 'Closed',
};

export default function Enquiries() {
  const { t } = useTranslation(['dashboard', 'common']);
  const { user } = useAuthStore();
  const [enquiries, setEnquiries] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [list, agentList] = await Promise.all([
        enquiryService.getAllEnquiries(user, 'admin'),
        agentService.list({ page: 1, pageSize: 200, status: 'ACTIVE' }).then((d) => d.items || []).catch(() => []),
      ]);
      setEnquiries(Array.isArray(list) ? list : []);
      setAgents(agentList);
    } catch (err) {
      setError(err.message || 'Failed to load enquiries');
      setEnquiries([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    total,
    totalPages,
    pageRows,
  } = useClientPagination(enquiries, 10);

  async function handleAssignAgent(id, agentId) {
    try {
      if (!agentId) {
        toast.info('Select an agent to assign.');
        return;
      }
      await enquiryService.assignRecord(id, {
        assignedAgentId: Number(agentId),
        assignedBy: user?.id,
      });
      toast.success(t('toast.assignmentUpdated', { ns: 'dashboard', defaultValue: 'Assignment updated.' }));
      load();
    } catch (err) {
      toast.error(err.message || 'Assignment failed');
    }
  }

  function handleExport() {
    if (enquiries.length === 0) {
      toast.info(t('toast.exportEmpty', { ns: 'dashboard', defaultValue: 'Nothing to export.' }));
      return;
    }
    exportSingleSheetXlsx(
      'enquiries-export.xlsx',
      t('export.enquiries', { ns: 'dashboard', defaultValue: 'Enquiries' }),
      enquiries,
      [
        { header: 'Buyer Name', value: (row) => row.buyerName || row.customer?.name || '' },
        { header: 'Buyer Phone', value: (row) => row.buyerPhone || row.customer?.mobile || '' },
        { header: 'Property', value: (row) => row.propertyName || row.propertyId || '' },
        { header: 'Message', value: (row) => row.message || row.remarks || '' },
        { header: 'Status', value: 'status' },
        { header: 'Assigned Agent', value: (row) => row.assignedAgent?.name || '' },
        { header: 'Created At', value: (row) => (row.createdAt ? new Date(row.createdAt).toLocaleString() : '') },
      ]
    );
    toast.success(t('toast.exportSuccess', { ns: 'dashboard', defaultValue: 'Exported.' }));
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-brand-800">Enquiries</h1>
          <p className="text-sm text-gray-500">
            Express interest requests. For full moderation, use{' '}
            <Link to="/admin/express-interests" className="font-medium text-brand-700 hover:underline">
              Express Interests
            </Link>
            .
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/admin/express-interests"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <ExternalLink size={16} /> Express Interests
          </Link>
          <button type="button" onClick={handleExport} className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-warm-white">
            <Download size={16} /> {t('export.exportToExcel', { ns: 'dashboard', defaultValue: 'Export' })}
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading enquiries…</p>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button type="button" onClick={load} className="ml-3 font-semibold underline">Retry</button>
        </div>
      ) : enquiries.length === 0 ? (
        <EmptyState titleKey="empty.noData" />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-warm-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">{t('table.buyer', { ns: 'dashboard', defaultValue: 'Buyer' })}</th>
                  <th className="px-4 py-3">{t('table.phone', { ns: 'dashboard', defaultValue: 'Phone' })}</th>
                  <th className="px-4 py-3">Property</th>
                  <th className="px-4 py-3">{t('table.message', { ns: 'dashboard', defaultValue: 'Message' })}</th>
                  <th className="px-4 py-3">{t('table.status', { ns: 'dashboard', defaultValue: 'Status' })}</th>
                  <th className="px-4 py-3">Assigned Agent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pageRows.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50/80">
                    <td className="px-4 py-3 font-medium">{e.buyerName || e.customer?.name || '—'}</td>
                    <td className="px-4 py-3">{e.buyerPhone || e.customer?.mobile || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="max-w-[160px] truncate">{e.propertyName || `Property #${e.propertyId}`}</div>
                      <div className="text-xs text-gray-400">#{e.propertyId}</div>
                    </td>
                    <td className="max-w-[220px] truncate px-4 py-3">{e.message || e.remarks || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold capitalize">
                        {STATUS_LABELS[e.status] || e.status || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        aria-label="Assign agent"
                        value={e.assignedAgentId || e.assignedMediatorId || ''}
                        onChange={(ev) => handleAssignAgent(e.id, ev.target.value)}
                        className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs"
                      >
                        <option value="">{t('assignment.unassigned', { ns: 'dashboard', defaultValue: 'Unassigned' })}</option>
                        {agents.map((m) => (
                          <option key={m.id} value={m.id}>{m.name}{m.memberId ? ` (${m.memberId})` : ''}</option>
                        ))}
                      </select>
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
        </>
      )}
    </div>
  );
}
