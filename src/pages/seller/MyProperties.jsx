import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import { propertyService } from '../../services/propertyService';
import { useAuthStore } from '../../store/authStore';
import { useLanguageStore } from '../../store/languageStore';
import { getLocalizedField } from '../../utils/localize';
import StatusBadge from '../../components/dashboard/StatusBadge';
import DataTable, { formatTableDate } from '../../components/common/DataTable';
import TableActionsMenu from '../../components/common/TableActionsMenu';
import { toast } from '../../store/toastStore';
import { confirmDialog } from '../../store/confirmStore';
import { formatIndianCurrency } from '../../utils/formatIndianNumber';

export default function MyProperties({ basePath = '/seller/properties' }) {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const language = useLanguageStore((s) => s.language);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  function load() {
    if (!user) return;
    setLoading(true);
    setError(null);
    propertyService
      .getBySeller(user.id)
      .then(setProperties)
      .catch((err) => {
        setProperties([]);
        setError(err.message || 'Failed to load properties');
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, [user]);

  async function handleDelete(id) {
    const ok = await confirmDialog({
      title: 'Delete property?',
      message: 'This property will be removed. This action cannot be undone.',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await propertyService.deleteProperty(id);
      toast.success('Property removed successfully.');
      load();
    } catch (err) {
      toast.error(err.message || 'Unable to delete property');
    }
  }

  const columns = [
    {
      key: 'title',
      header: 'Title',
      sortKey: 'titleEn',
      render: (row) => <span className="font-medium text-gray-800">{getLocalizedField(row, 'title', language)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'price',
      header: 'Price',
      render: (row) => formatIndianCurrency(row.price || 0),
    },
    {
      key: 'views',
      header: 'Views',
      render: (row) => row.views || row.viewCount || 0,
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
      key: 'actions',
      header: 'Actions',
      sortable: false,
      render: (row) => (
        <TableActionsMenu
          items={[
            {
              key: 'view',
              label: 'View property',
              icon: Eye,
              onClick: () => navigate(`/properties/${row.id}`),
            },
            {
              key: 'edit',
              label: 'Edit',
              icon: Pencil,
              onClick: () => navigate(`${basePath}/${row.id}/edit`),
            },
            {
              key: 'delete',
              label: t('buttons.delete'),
              icon: Trash2,
              tone: 'danger',
              onClick: () => handleDelete(row.id),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <DataTable
      title={t('nav.myProperties')}
      subtitle="Manage your listed properties."
      columns={columns}
      rows={properties}
      loading={loading}
      error={error}
      onRefresh={load}
      getSearchText={(row) =>
        [getLocalizedField(row, 'title', language), row.status, row.id, row.price].filter(Boolean).join(' ')
      }
      initialSortKey="updatedAt"
    />
  );
}
