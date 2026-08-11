import { Suspense, useEffect, useState } from 'react';
import { NavLink, Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import * as Icons from 'lucide-react';
import { Menu, X, LogOut, ChevronDown } from 'lucide-react';
import LanguageToggle from '../common/LanguageToggle';
import NotificationBell from '../dashboard/NotificationBell';
import ProfileDropdown from './ProfileDropdown';
import RouteLoadingFallback from '../common/RouteLoadingFallback';
import PromotionFloatingWidget from '../promotions/PromotionFloatingWidget';
import { useAuthStore } from '../../store/authStore';
import { DASHBOARD_NAV } from '../../config/navigation';
import { hasPermission } from '../../utils/permissions';
import { getLogoutRedirectPath } from '../../utils/logoutRedirect';
import { getInitials } from '../../utils/avatar';

function NavIcon({ name, ...props }) {
  // Small nav slots use Lucide Wallet (colored via currentColor) — custom PNG is too dense at 16–18px.
  const Icon = Icons[name] || Icons.Circle;
  if (name === 'Wallet') {
    return <Icon {...props} className={`text-amber-500 ${props.className || ''}`.trim()} strokeWidth={2.25} />;
  }
  return <Icon {...props} />;
}

function pathMatches(pathname, path, end = false) {
  if (end) return pathname === path;
  return pathname === path || pathname.startsWith(`${path}/`);
}

function NavGroup({ item, t, onNavigate }) {
  const location = useLocation();
  const childActive = (item.children || []).some((child) =>
    pathMatches(location.pathname, child.path, child.end)
  );
  const parentActive = pathMatches(location.pathname, item.path);
  const [open, setOpen] = useState(childActive || parentActive);

  useEffect(() => {
    if (childActive || parentActive) setOpen(true);
  }, [childActive, parentActive]);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
          parentActive || childActive ? 'bg-brand-100 text-brand-800' : 'text-gray-600 hover:bg-gray-50'
        }`}
      >
        <NavIcon name={item.icon} size={18} />
        <span className="flex-1 text-left">{t(item.labelKey)}</span>
        <ChevronDown size={16} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="ml-3 mt-1 space-y-0.5 border-l border-gray-200 pl-2">
          {item.children.map((child) => (
            <NavLink
              key={child.key}
              to={child.path}
              end={Boolean(child.end)}
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? 'bg-brand-50 text-brand-800' : 'text-gray-600 hover:bg-gray-50'
                }`
              }
            >
              <NavIcon name={child.icon} size={16} />
              {t(child.labelKey)}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DashboardLayout({ role }) {
  const { t } = useTranslation(['common', 'dashboard']);
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const items = (DASHBOARD_NAV[role] || []).filter((item) => !item.permission || hasPermission(user, item.permission));

  const sidebarLinkClass = ({ isActive }) =>
    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
      isActive ? 'bg-brand-100 text-brand-800' : 'text-gray-600 hover:bg-gray-50'
    }`;

  const closeDrawer = () => setDrawerOpen(false);

  const SidebarContent = (
    <nav className="flex flex-col gap-1 px-3 py-4" aria-label="Dashboard navigation">
      {items.map((item) =>
        item.children?.length ? (
          <NavGroup key={item.key} item={item} t={t} onNavigate={closeDrawer} />
        ) : (
          <NavLink key={item.key} to={item.path} className={sidebarLinkClass} onClick={closeDrawer}>
            <NavIcon name={item.icon} size={18} />
            {t(item.labelKey)}
          </NavLink>
        )
      )}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="hidden w-64 shrink-0 border-r border-gray-100 bg-warm-white lg:block">
        <Link to="/" className="flex items-center gap-2 border-b border-gray-100 px-4 py-3.5">
          <img src="/logo.svg" alt={t('brand.logoAlt', { ns: 'common' })} className="h-10 w-auto max-w-[190px] object-contain rounded" />
        </Link>
        {SidebarContent}
      </aside>

      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-64 bg-warm-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-4">
              <span className="text-sm font-bold text-brand-800">{t('brand.name', { ns: 'common' })}</span>
              <button type="button" onClick={() => setDrawerOpen(false)} aria-label="Close menu">
                <X size={20} />
              </button>
            </div>
            {SidebarContent}
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-gray-100 bg-warm-white px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
              className="rounded-lg p-2 text-gray-700 hover:bg-gray-100 lg:hidden"
            >
              <Menu size={20} />
            </button>
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-brand-800">
                {t('common.breadcrumbHome', { ns: 'dashboard' })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageToggle />
            <NotificationBell />
            <div className="hidden max-w-[14rem] items-center gap-2 sm:flex">
              {user?.profilePhoto ? (
                <img
                  src={user.profilePhoto}
                  alt={user.name || 'Profile'}
                  className="h-8 w-8 rounded-full object-cover ring-2 ring-brand-200"
                />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-700 text-xs font-bold text-white">
                  {getInitials(user?.name)}
                </span>
              )}
              <span className="truncate text-sm font-medium text-gray-700">
                {(role === 'buyer' || role === 'customer') && user?.name
                  ? t('greetingShort', { ns: 'dashboard', name: user.name })
                  : user?.name}
              </span>
            </div>
            <div className="sm:hidden">
              <ProfileDropdown />
            </div>
            <button
              type="button"
              onClick={async () => {
                const redirectTo = getLogoutRedirectPath(user?.role);
                await logout();
                navigate(redirectTo);
              }}
              aria-label={t('nav.logout', { ns: 'common' })}
              className="rounded-full p-2 text-gray-600 hover:bg-gray-100"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6">
          <Suspense fallback={<RouteLoadingFallback />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
      <PromotionFloatingWidget />
    </div>
  );
}
