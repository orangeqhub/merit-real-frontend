import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronDown, LogOut } from 'lucide-react';
import * as Icons from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { PROFILE_MENU, PROFILE_ROUTE } from '../../config/profileMenu';
import { getInitials } from '../../utils/avatar';
import { getLogoutRedirectPath } from '../../utils/logoutRedirect';
import { hasPermission } from '../../utils/permissions';

const ROLE_RING = {
  buyer: 'ring-brand-500 bg-brand-600',
  customer: 'ring-brand-500 bg-brand-600',
  seller: 'ring-blue-500 bg-blue-600',
  mediator: 'ring-amber-500 bg-amber-600',
  agent: 'ring-amber-500 bg-amber-600',
  admin: 'ring-purple-500 bg-purple-600',
  employee: 'ring-cyan-500 bg-cyan-600',
  sales_member: 'ring-teal-500 bg-teal-600',
};

const ROLE_BADGE = {
  buyer: 'bg-brand-50 text-brand-700',
  customer: 'bg-brand-50 text-brand-700',
  seller: 'bg-blue-50 text-blue-700',
  mediator: 'bg-amber-50 text-amber-700',
  agent: 'bg-amber-50 text-amber-700',
  admin: 'bg-purple-50 text-purple-700',
  employee: 'bg-cyan-50 text-cyan-700',
  sales_member: 'bg-teal-50 text-teal-700',
};

function MenuIcon({ name, ...props }) {
  if (name === 'Wallet') {
    return <IconWalletColored {...props} />;
  }
  const Icon = Icons[name] || Icons.Circle;
  return <Icon {...props} />;
}

function IconWalletColored(props) {
  const Icon = Icons.Wallet;
  return <Icon {...props} className={`text-amber-500 ${props.className || ''}`.trim()} strokeWidth={2.25} />;
}

export default function ProfileDropdown() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (open) {
      setMounted(true);
    } else {
      const timeout = setTimeout(() => setMounted(false), 180);
      return () => clearTimeout(timeout);
    }
  }, [open]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    function handleEscape(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  if (!user) return null;

  const role = user.role;
  const menuItems = (PROFILE_MENU[role] || []).filter(
    (item) => !item.permission || hasPermission(user, item.permission)
  );
  const profileRoute = PROFILE_ROUTE[role] || '/';
  const ringClass = ROLE_RING[role] || ROLE_RING.buyer;
  const badgeClass = ROLE_BADGE[role] || ROLE_BADGE.buyer;
  const showPhoto = Boolean(user.profilePhoto) && ['customer', 'buyer', 'agent', 'mediator', 'employee', 'sales_member'].includes(role);

  function Avatar({ sizeClass, textClass }) {
    if (showPhoto) {
      return (
        <img
          src={user.profilePhoto}
          alt={user.name || 'Profile'}
          className={`${sizeClass} shrink-0 rounded-full object-cover ring-2 ring-offset-1 ${ringClass.split(' ')[0]}`}
        />
      );
    }
    return (
      <span className={`flex ${sizeClass} shrink-0 items-center justify-center rounded-full ${textClass} font-bold text-warm-white ring-2 ring-offset-1 ${ringClass}`}>
        {getInitials(user.name)}
      </span>
    );
  }

  async function handleLogout() {
    setOpen(false);
    const redirectTo = getLogoutRedirectPath(role);
    await logout();
    navigate(redirectTo);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={t('profileMenu.myProfile')}
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-full py-0.5 pl-0.5 pr-2 transition-colors hover:bg-brand-50"
      >
        <Avatar sizeClass="h-9 w-9" textClass="text-sm" />
        <ChevronDown size={16} className={`hidden text-gray-500 transition-transform sm:block ${open ? 'rotate-180' : ''}`} />
      </button>

      {mounted && (
        <div
          className={`absolute right-0 z-50 mt-2 w-72 origin-top-right rounded-2xl border border-gray-100 bg-warm-white/95 shadow-xl backdrop-blur-md transition-all duration-200 ease-out ${
            open ? 'translate-y-0 scale-100 opacity-100' : '-translate-y-1 scale-95 opacity-0'
          }`}
        >
          <div className="border-b border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <Avatar sizeClass="h-12 w-12" textClass="text-base" />
              <div className="min-w-0">
                <p className="truncate font-semibold text-gray-800">{user.name}</p>
                <p className="text-xs text-gray-500">{user.mobile}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClass}`}>
                {t(
                  role === 'sales_member'
                    ? 'profileMenu.roleSalesMember'
                    : `profileMenu.role${role[0].toUpperCase()}${role.slice(1)}`,
                  { defaultValue: role === 'sales_member' ? 'Sales Member' : role }
                )}
              </span>
              <Link
                to={profileRoute}
                onClick={() => setOpen(false)}
                className="rounded-full border border-brand-300 px-3 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-50"
              >
                {t('profileMenu.editProfile')}
              </Link>
            </div>
          </div>

          <nav className="max-h-80 overflow-y-auto py-2">
            {menuItems.map((item) => (
              <NavLink
                key={item.key}
                to={item.path}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                    isActive ? 'bg-brand-50 text-brand-800' : 'text-gray-700 hover:bg-gray-50'
                  }`
                }
              >
                <MenuIcon name={item.icon} size={17} />
                {t(item.labelKey)}
              </NavLink>
            ))}
          </nav>

          <div className="border-t border-gray-100 p-2">
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
            >
              <LogOut size={17} />
              {t('profileMenu.logout')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
