import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bell } from 'lucide-react';
import { notificationService } from '../../services/notificationService';
import { useAuthStore } from '../../store/authStore';
import { useLanguageStore } from '../../store/languageStore';
import { getLocalizedField } from '../../utils/localize';
import { ROLE_HOME } from '../../config/navigation';
import { resolveAssetUrl } from '../../api/client';
import { useRealtimeSocket } from '../../hooks/useRealtimeSocket';
import { isLocalEmployeeToken } from '../../api/session';
import { navigateFromNotification } from '../../utils/notificationNavigation';

export default function NotificationBell() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const language = useLanguageStore((s) => s.language);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useRef(null);

  async function load() {
    if (!user) return;
    try {
      const [list, count] = await Promise.all([
        notificationService.getForUser({ role: user.role, userId: user.id }),
        notificationService.getUnreadCount(),
      ]);
      setNotifications(list);
      setUnreadCount(count);
    } catch {
      // ignore poll errors
    }
  }

  useEffect(() => {
    load();
    if (!user) return undefined;
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, [user]);

  useRealtimeSocket({
    enabled: Boolean(user) && !isLocalEmployeeToken(),
    onNotification: (n) => {
      if (!n) return;
      setNotifications((list) => {
        if (list.some((item) => item.id === n.id)) return list;
        return [n, ...list].slice(0, 50);
      });
      setUnreadCount((c) => c + 1);
    },
    onNotificationRead: (n) => {
      if (!n?.id) return;
      setNotifications((list) => list.map((item) => (item.id === n.id ? { ...item, read: true, isRead: true } : item)));
    },
    onNotificationCount: (payload) => {
      if (typeof payload?.unreadCount === 'number') setUnreadCount(payload.unreadCount);
    },
    onReconnect: load,
  });

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleOpen() {
    setOpen((o) => !o);
    if (!open) load();
  }

  async function handleClickNotification(n) {
    if (!n.read) {
      await notificationService.markRead(n.id);
      setNotifications((list) => list.map((item) => (item.id === n.id ? { ...item, read: true } : item)));
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    setOpen(false);
    if (!navigateFromNotification(n, user?.role, navigate)) {
      const home = ROLE_HOME[user?.role] || '/';
      navigate(`${home.replace(/\/dashboard$/, '')}/notifications`.replace('//', '/'));
    }
  }

  async function handleMarkAll() {
    await notificationService.markAllRead();
    setNotifications((list) => list.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }

  const notificationsPath = (() => {
    if (!user) return '/';
    if (user.role === 'admin') return '/admin/notifications';
    if (user.role === 'agent' || user.role === 'mediator') return '/mediator/notifications';
    if (user.role === 'seller') return '/seller/notifications';
    if (user.role === 'employee') return '/employee/notifications';
    if (user.role === 'sales_member') return '/sales/notifications';
    return '/buyer/notifications';
  })();

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={handleOpen}
        aria-label="Notifications"
        className="relative rounded-full p-2 text-gray-600 hover:bg-gray-100"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-0.5 text-[10px] font-bold text-warm-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 max-h-96 w-80 overflow-hidden rounded-lg border border-gray-100 bg-warm-white shadow-lg sm:w-96">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
            <span className="text-sm font-semibold text-brand-800">{t('nav.notifications')}</span>
            {unreadCount > 0 && (
              <button type="button" onClick={handleMarkAll} className="text-xs font-medium text-brand-700 hover:underline">
                Mark all read
              </button>
            )}
          </div>
          {notifications.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-gray-500">{t('empty.noNotifications')}</p>
          ) : (
            <ul className="max-h-72 overflow-auto">
              {notifications.slice(0, 20).map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => handleClickNotification(n)}
                    className={`flex w-full gap-3 border-b border-gray-50 px-4 py-3 text-left text-sm last:border-0 ${
                      n.read ? 'text-gray-500' : 'bg-brand-50/50 font-medium text-gray-800'
                    }`}
                  >
                    {(n.imageUrl || n.thumbnail) && (
                      <img
                        src={resolveAssetUrl(n.imageUrl || n.thumbnail)}
                        alt=""
                        className="h-12 w-12 shrink-0 rounded-md object-cover bg-gray-100"
                      />
                    )}
                    <span className="min-w-0 flex-1">
                    <span className="block">{getLocalizedField(n, 'title', language)}</span>
                    <span className="mt-0.5 block text-xs font-normal text-gray-500 line-clamp-2">
                      {getLocalizedField(n, 'message', language) || n.messageEn}
                    </span>
                    <span className="mt-1 block text-xs font-normal text-gray-400">
                      {n.notificationType || n.type} · {new Date(n.createdAt).toLocaleString()}
                    </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="border-t border-gray-100 px-4 py-2">
            <Link
              to={notificationsPath}
              onClick={() => setOpen(false)}
              className="block text-center text-xs font-semibold text-brand-700 hover:underline"
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
