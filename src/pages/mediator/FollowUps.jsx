import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Eye } from 'lucide-react';
import { expressInterestService } from '../../services/expressInterestService';
import { useAuthStore } from '../../store/authStore';
import DataTable, { StatusPill, formatTableDate } from '../../components/common/DataTable';
import TableActionsMenu from '../../components/common/TableActionsMenu';

const STATUS_LABELS = {
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  rejected: 'Rejected',
  assigned: 'Assigned',
  closed: 'Closed',
};

export default function FollowUps() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [followUps, setFollowUps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  function load() {
    if (!user) return;
    setLoading(true);
    setError(null);
    expressInterestService
      .getAgentLeads({ pageSize: 100 })
      .then((list) => setFollowUps((list || []).filter((e) => !['closed', 'rejected'].includes(String(e.status || '').toLowerCase()))))
      .catch((err) => {
        setFollowUps([]);
        setError(err.message || 'Failed to load follow-ups');
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, [user]);

  const columns = [
    {
      key: 'id',
      header: 'Lead ID',
      render: (row) => <span className="font-mono text-xs">#{row.id}</span>,
    },
    {
      key: 'customer',
      header: 'Customer',
      sortKey: 'customer.name',
      render: (row) => (
        <div>
          <div className="font-medium">{row.customer?.name || row.buyerName}</div>
          <div className="text-xs text-gray-400">{row.customer?.mobile || row.buyerPhone}</div>
        </div>
      ),
    },
    {
      key: 'propertyName',
      header: 'Property',
      render: (row) => row.propertyName || `Property #${row.propertyId}`,
    },
    {
      key: 'followUpStatus',
      header: 'Follow-up',
      render: (row) => row.followUpStatus || 'NEW',
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
      render: (row) => <StatusPill status={row.status} labels={STATUS_LABELS} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      render: () => (
        <TableActionsMenu
          items={[
            {
              key: 'open',
              label: 'Open from Leads',
              icon: Eye,
              onClick: () => navigate('/mediator/leads'),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <DataTable
      title={t('nav.followUps')}
      subtitle="Open leads that need follow-up attention."
      columns={columns}
      rows={followUps}
      loading={loading}
      error={error}
      onRefresh={load}
      getSearchText={(row) =>
        [row.customer?.name, row.buyerName, row.customer?.mobile, row.propertyName, row.status, row.followUpStatus]
          .filter(Boolean)
          .join(' ')
      }
      initialSortKey="updatedAt"
    />
  );
}
