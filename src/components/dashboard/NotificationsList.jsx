import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ExternalLink, Check } from 'lucide-react';
import { notificationService } from '../../services/notificationService';
import { useAuthStore } from '../../store/authStore';
import { toast } from '../../store/toastStore';
import { useLanguageStore } from '../../store/languageStore';
import { getLocalizedField } from '../../utils/localize';
import { resolveAssetUrl } from '../../api/client';
import { navigateFromNotification } from '../../utils/notificationNavigation';
import { useDomainRealtime, useRealtimeEvent } from '../../hooks/useDomainRealtime';
import DataTable, { StatusPill, formatTableDate } from '../common/DataTable';
import TableActionsMenu from '../common/TableActionsMenu';

export default function NotificationsList() {
  const { t } = useTranslation('dashboard');
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const language = useLanguageStore((s) => s.language);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');

  function load() {
    if (!user) return;
    setLoading(true);
    setError(null);
    notificationService
      .getForUser({ role: user.role, userId: user.id })
      .then(setNotifications)
      .catch((err) => {
        setNotifications([]);
        setError(err.message || 'Failed to load notifications');
      })
      .finally(() => setLoading(false));
  }

  useEffect(load, [user]);

  useDomainRealtime(Boolean(user));

  useRealtimeEvent('notification:new', (n) => {
    if (!n?.id) return;
    setNotifications((list) => {
      if (list.some((item) => item.id === n.id)) return list;
      return [n, ...list];
    });
  }, Boolean(user));

  useRealtimeEvent('notification:read', (n) => {
    if (!n?.id) return;
    setNotifications((list) => list.map((item) => (item.id === n.id ? { ...item, read: true, isRead: true } : item)));
  }, Boolean(user));

  async function handleOpen(n) {
    if (!n.read) {
      await notificationService.markRead(n.id);
      setNotifications((list) => list.map((item) => (item.id === n.id ? { ...item, read: true, isRead: true } : item)));
    }
    if (!navigateFromNotification(n, user?.role, navigate)) {
      toast.error('This notification refers to a record that is no longer available or you no longer have access to it.');
    }
  }

  async function handleMarkAllRead() {
    await notificationService.markAllRead();
    load();
  }

  const filtered = notifications.filter((n) => {
    if (filter === 'unread') return !n.read;
    if (filter === 'all') return true;
    return n.type === filter || n.notificationType === filter;
  });

  const types = [...new Set(notifications.map((n) => n.type || n.notificationType).filter(Boolean))];

  const columns = [
    {
      key: 'thumb',
      header: '',
      sortable: false,
      render: (row) =>
        row.imageUrl || row.thumbnail ? (
          <img
            src={resolveAssetUrl(row.imageUrl || row.thumbnail)}
            alt=""
            className="h-10 w-10 rounded object-cover bg-gray-100"
          />
        ) : (
          <span className="inline-block h-10 w-10 rounded bg-gray-100" />
        ),
    },
    {
      key: 'title',
      header: 'Title',
      sortKey: 'titleEn',
      render: (row) => (
        <div>
          <div className={row.read ? 'text-gray-600' : 'font-semibold text-gray-900'}>
            {getLocalizedField(row, 'title', language)}
          </div>
          <div className="mt-0.5 line-clamp-1 text-xs font-normal text-gray-500">
            {getLocalizedField(row, 'message', language) || row.messageEn}
          </div>
        </div>
      ),
    },
    {
      key: 'notificationType',
      header: 'Type',
      render: (row) => row.notificationType || row.type || '—',
    },
    {
      key: 'read',
      header: 'Status',
      render: (row) => (
        <StatusPill
          status={row.read ? 'read' : 'unread'}
          labels={{ read: 'Read', unread: 'Unread' }}
        />
      ),
    },
    {
      key: 'createdAt',
      header: 'Date & Time',
      render: (row) => formatTableDate(row.createdAt),
    },
    {
      key: 'actions',
      header: 'Actions',
      sortable: false,
      render: (row) => (
        <TableActionsMenu
          items={[
            {
              key: 'open',
              label: row.linkPath ? 'Open' : 'Mark read',
              icon: row.linkPath ? ExternalLink : Check,
              onClick: () => handleOpen(row),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <DataTable
      title={t('notifications.title', { defaultValue: 'Notifications' })}
      subtitle="All alerts for your account, newest first."
      columns={columns}
      rows={filtered}
      loading={loading}
      error={error}
      onRefresh={load}
      initialSortKey="createdAt"
      getSearchText={(row) =>
        [row.titleEn, row.messageEn, row.notificationType, row.type].filter(Boolean).join(' ')
      }
      toolbar={
        <button
          type="button"
          onClick={handleMarkAllRead}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50"
        >
          {t('notifications.markAllRead')}
        </button>
      }
      filters={
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`rounded-full border px-3 py-1.5 text-xs ${filter === 'all' ? 'border-brand-600 bg-brand-600 text-warm-white' : 'border-gray-300 text-gray-600'}`}
          >
            {t('filters.all')}
          </button>
          <button
            type="button"
            onClick={() => setFilter('unread')}
            className={`rounded-full border px-3 py-1.5 text-xs ${filter === 'unread' ? 'border-brand-600 bg-brand-600 text-warm-white' : 'border-gray-300 text-gray-600'}`}
          >
            {t('notifications.unread', { count: notifications.filter((n) => !n.read).length })}
          </button>
          {types.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setFilter(type)}
              className={`rounded-full border px-3 py-1.5 text-xs ${filter === type ? 'border-brand-600 bg-brand-600 text-warm-white' : 'border-gray-300 text-gray-600'}`}
            >
              {t(`notifications.types.${type}`, type)}
            </button>
          ))}
        </div>
      }
      onClearFilters={() => setFilter('all')}
    />
  );
}
