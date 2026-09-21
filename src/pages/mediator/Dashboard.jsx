import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Building2, PhoneCall, Handshake, IndianRupee } from 'lucide-react';
import { expressInterestService } from '../../services/expressInterestService';
import { useAuthStore } from '../../store/authStore';
import StatCard from '../../components/dashboard/StatCard';
import DashboardGreeting from '../../components/dashboard/DashboardGreeting';
import { formatInr } from '../../utils/formatIndianNumber';

export default function MediatorDashboard() {
  const { user } = useAuthStore();
  const [counts, setCounts] = useState({
    totalLeads: 0,
    activeLeads: 0,
    reservedProperties: 0,
    closedDeals: 0,
    totalSalesValue: 0,
  });

  useEffect(() => {
    if (!user) return;
    expressInterestService
      .getAgentDealStats()
      .then((data) => {
        setCounts({
          totalLeads: data.totalLeads || 0,
          activeLeads: data.activeLeads || 0,
          reservedProperties: data.reservedProperties || 0,
          closedDeals: data.closedDeals || 0,
          totalSalesValue: data.totalSalesValue || 0,
        });
      })
      .catch(() => {});
  }, [user]);

  return (
    <div>
      <DashboardGreeting
        name={user?.name}
        photo={user?.profilePhoto}
        subtitle={user?.memberId ? `Agent Code: ${user.memberId}` : undefined}
      />
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard icon={PhoneCall} label="Total Leads" value={counts.totalLeads} accent="amber" />
        <StatCard icon={Users} label="Active Leads" value={counts.activeLeads} accent="blue" />
        <StatCard icon={Building2} label="Reserved Properties" value={counts.reservedProperties} />
        <StatCard icon={Handshake} label="Closed Deals" value={counts.closedDeals} accent="green" />
        <StatCard icon={IndianRupee} label="Total Sales Value" value={formatInr(counts.totalSalesValue)} accent="indigo" />
      </div>
      <p className="mt-4 text-sm text-gray-500">
        Closed deals remain permanently associated with your agent profile.
      </p>
    </div>
  );
}
