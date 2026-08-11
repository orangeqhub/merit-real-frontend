import { useEffect, useState } from 'react';
import { Phone } from 'lucide-react';
import { enquiryService } from '../../services/enquiryService';
import { propertyService } from '../../services/propertyService';
import { useAuthStore } from '../../store/authStore';
import { toast } from '../../store/toastStore';
import DataTable, { StatusPill, formatTableDate } from '../../components/common/DataTable';
import TableActionsMenu from '../../components/common/TableActionsMenu';

export default function Enquiries() {
  const { user } = useAuthStore();
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  function load() {
    if (!user) return;
    setLoading(true);
    setError(null);
    enquiryService
      .getForSeller(user.id)
      .then(async (list) => {
        const enriched = await Promise.all(
          (list || []).map(async (e) => {
            const p = await propertyService.getPropertyById(e.propertyId).catch(() => null);
            return { ...e, propertyTitle: p?.titleEn || `Property #${e.propertyId}` };
          })
        );
        setEnquiries(enriched);
      })
      .catch((err) => {
        setEnquiries([]);
        setError(err.message || 'Failed to load enquiries');
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, [user]);

  async function handleMarkContacted(id) {
    try {
      await enquiryService.updateStatus(id, 'contacted');
      setEnquiries((list) => list.map((e) => (e.id === id ? { ...e, status: 'contacted' } : e)));
      toast.success('Marked as contacted');
    } catch (err) {
      toast.error(err.message || 'Unable to update status');
    }
  }

  const columns = [
    {
      key: 'propertyTitle',
      header: 'Property',
      render: (row) => <span className="font-medium text-gray-800">{row.propertyTitle}</span>,
    },
    {
      key: 'buyerName',
      header: 'Customer',
      render: (row) => (
        <div>
          <div className="font-medium">{row.buyerName || row.customer?.name || '—'}</div>
          <div className="text-xs text-gray-400">{row.buyerPhone || row.customer?.mobile || '—'}</div>
        </div>
      ),
    },
    {
      key: 'message',
      header: 'Message',
      sortable: false,
      className: 'max-w-[200px] truncate',
      render: (row) => row.message || row.remarks || '—',
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
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      render: (row) => (
        <TableActionsMenu
          items={[
            {
              key: 'contacted',
              label: 'Mark contacted',
              icon: Phone,
              tone: 'brand',
              hidden: row.status !== 'new',
              onClick: () => handleMarkContacted(row.id),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <DataTable
      title="Enquiries"
      subtitle="Buyer enquiries on your property listings."
      columns={columns}
      rows={enquiries}
      loading={loading}
      error={error}
      onRefresh={load}
      getSearchText={(row) =>
        [row.propertyTitle, row.buyerName, row.buyerPhone, row.message, row.status].filter(Boolean).join(' ')
      }
      initialSortKey="createdAt"
    />
  );
}
