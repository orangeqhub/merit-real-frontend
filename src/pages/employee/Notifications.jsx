import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { notificationService } from '../../services/notificationService';
import { useAuthStore } from '../../store/authStore';
import { useLanguageStore } from '../../store/languageStore';
import { getLocalizedField } from '../../utils/localize';
import { navigateFromNotification } from '../../utils/notificationNavigation';
import EmptyState from '../../components/common/EmptyState';

const RELATED_ROUTE = {
  userVerification: (id) => `/employee/verifications/${id}`,
  property: (id) => `/employee/properties/${id}`,
  enquiry: (id) => `/employee/enquiries/${id}`,
  visit: () => '/employee/visits',
  followUp: () => '/employee/follow-ups',
};

export default function Notifications() {
  const { t } = useTranslation('dashboard');
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const language = useLanguageStore((s) => s.language);
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all');

  function load() {
    if (user) notificationService.getForUser({ role: user.role, userId: user.id }).then(setNotifications);
  }

  useEffect(load, [user]);

  async function handleOpen(n) {
    if (!n.read) await notificationService.markRead(n.id);
    if (!navigateFromNotification(n, user?.role, navigate)) {
      if (n.relatedType && RELATED_ROUTE[n.relatedType]) {
        navigate(RELATED_ROUTE[n.relatedType](n.relatedId));
      }
    }
    load();
  }

  async function handleMarkAllRead() {
    await Promise.all(notifications.filter((n) => !n.read).map((n) => notificationService.markRead(n.id)));
    load();
  }

  const filtered = notifications.filter((n) => {
    if (filter === 'unread') return !n.read;
    if (filter === 'all') return true;
    return n.type === filter;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;
  const types = [...new Set(notifications.map((n) => n.type).filter(Boolean))];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setFilter('all')} className={`rounded-full border px-3 py-1.5 text-xs ${filter === 'all' ? 'border-brand-600 bg-brand-600 text-warm-white' : 'border-gray-300 text-gray-600'}`}>
            {t('filters.all')}
          </button>
          <button type="button" onClick={() => setFilter('unread')} className={`rounded-full border px-3 py-1.5 text-xs ${filter === 'unread' ? 'border-brand-600 bg-brand-600 text-warm-white' : 'border-gray-300 text-gray-600'}`}>
            {t('notifications.unread', { count: unreadCount })}
          </button>
          {types.map((type) => (
            <button key={type} type="button" onClick={() => setFilter(type)} className={`rounded-full border px-3 py-1.5 text-xs ${filter === type ? 'border-brand-600 bg-brand-600 text-warm-white' : 'border-gray-300 text-gray-600'}`}>
              {t(`notifications.types.${type}`, type)}
            </button>
          ))}
        </div>
        <button type="button" onClick={handleMarkAllRead} className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium hover:bg-gray-50">
          {t('notifications.markAllRead')}
        </button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState titleKey="empty.noNotifications" />
      ) : (
        <ul className="space-y-2">
          {filtered.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => handleOpen(n)}
                className={`block w-full rounded-xl border px-4 py-3 text-left text-sm ${n.read ? 'border-gray-200 text-gray-500' : 'border-brand-200 bg-brand-50 font-medium text-gray-800'}`}
              >
                {getLocalizedField(n, 'title', language)}
                <span className="mt-1 block text-xs text-gray-400">{new Date(n.createdAt).toLocaleString()}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
