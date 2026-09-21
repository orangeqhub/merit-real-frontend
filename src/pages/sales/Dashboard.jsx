import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Users,
  IdCard,
  Building2,
  ClipboardList,
  ShoppingBag,
  Handshake,
  PhoneCall,
  MessageSquareHeart,
} from 'lucide-react';
import { api } from '../../api/client';
import { getAccessToken } from '../../api/session';
import { useAuthStore } from '../../store/authStore';
import StatCard from '../../components/dashboard/StatCard';
import DashboardGreeting from '../../components/dashboard/DashboardGreeting';

export default function SalesDashboard() {
  const { t } = useTranslation(['dashboard', 'common']);
  const { user } = useAuthStore();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api('/sales/dashboard/stats', { token: getAccessToken() })
      .then(setStats)
      .catch(() => setStats(null));
  }, []);

  return (
    <div>
      <DashboardGreeting
        name={user?.name || 'Sales Member'}
        photo={user?.profilePhoto}
        subtitle="Monitor customers, agents, follow-ups, deals, and property availability."
      />

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard icon={Users} label="Registered Customers" value={stats?.customers?.total ?? '—'} accent="blue" />
        <StatCard icon={Users} label="Active Customers" value={stats?.customers?.active ?? '—'} accent="cyan" />
        <StatCard icon={IdCard} label="Registered Agents" value={stats?.agents?.total ?? '—'} accent="indigo" />
        <StatCard icon={IdCard} label="Active Agents" value={stats?.agents?.active ?? '—'} accent="purple" />
        <StatCard icon={MessageSquareHeart} label="Active Leads" value={stats?.deals?.activeLeads ?? '—'} accent="amber" />
        <StatCard icon={ClipboardList} label="Active Bookings" value={stats?.deals?.activeBookings ?? '—'} accent="orange" />
        <StatCard icon={ShoppingBag} label="Purchase Requests" value={stats?.deals?.purchaseRequests ?? '—'} accent="green" />
        <StatCard icon={Handshake} label="Closed Deals" value={stats?.deals?.closedDeals ?? '—'} accent="teal" />
        <StatCard icon={Building2} label="Open Properties" value={stats?.properties?.open ?? '—'} accent="green" />
        <StatCard icon={Building2} label="Reserved Properties" value={stats?.properties?.reserved ?? '—'} accent="amber" />
        <StatCard icon={Building2} label="Sold Properties" value={stats?.properties?.sold ?? '—'} accent="red" />
        <StatCard icon={PhoneCall} label="Upcoming Follow-ups" value={stats?.followUps?.upcoming ?? '—'} accent="blue" />
        <StatCard icon={PhoneCall} label="Missed Follow-ups" value={stats?.followUps?.missed ?? '—'} accent="orange" />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { to: '/sales/customers', label: 'Customers' },
          { to: '/sales/agents', label: 'Agents' },
          { to: '/sales/leads', label: 'Leads / Express Interests' },
          { to: '/sales/follow-ups', label: 'Follow-ups' },
          { to: '/sales/bookings', label: 'Bookings' },
          { to: '/sales/purchases', label: 'Purchase Requests' },
          { to: '/sales/closed-deals', label: 'Closed Deals' },
          { to: '/sales/properties', label: 'Properties' },
        ].map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="rounded-xl border border-gray-200 bg-warm-white px-4 py-3 text-sm font-semibold text-brand-800 hover:border-brand-300 hover:bg-brand-50"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
