import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { UserPlus, Building2, Users, LayoutList, IndianRupee, FileBarChart, CalendarCheck, Bell, Inbox, ClipboardList } from 'lucide-react';
import { registrationService } from '../../services/registrationService';
import { propertyService } from '../../services/propertyService';
import { userService } from '../../services/userService';
import { visitService } from '../../services/visitService';
import { enquiryService } from '../../services/enquiryService';
import { notificationService } from '../../services/notificationService';
import { expressInterestService } from '../../services/expressInterestService';
import { useAuthStore } from '../../store/authStore';
import { CATEGORIES } from '../../config/categories';
import StatCard from '../../components/dashboard/StatCard';
import DashboardGreeting from '../../components/dashboard/DashboardGreeting';
import { formatIndianCurrencyCompact } from '../../utils/formatIndianNumber';

export default function Dashboard() {
  const { t } = useTranslation(['dashboard', 'common']);
  const { user } = useAuthStore();
  const [counts, setCounts] = useState({
    pendingRegistrations: 0,
    pendingProperties: 0,
    totalUsers: 0,
    totalProperties: 0,
    totalRevenue: 0,
    totalVisits: 0,
    totalEnquiries: 0,
    totalNotifications: 0,
    reportCategories: CATEGORIES.length,
    bookingsNeedingDecision: 0,
  });
  const [chartData, setChartData] = useState(
    CATEGORIES.map((cat) => ({ name: cat.nameEn, count: 0 }))
  );
  const [decisionBookings, setDecisionBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [
          pendingRegs,
          pendingProps,
          users,
          allProps,
          visits,
          enquiries,
          notifications,
          decisionData,
        ] = await Promise.all([
          registrationService.listPending().catch(() => []),
          propertyService.getProperties({ status: 'draft', includeAllStatuses: true, admin: true, pageSize: 1 }).catch(() => ({ total: 0, items: [] })),
          userService.getUsers().catch(() => []),
          propertyService.getProperties({ includeAllStatuses: true, admin: true, pageSize: 100 }).catch(() => ({ total: 0, items: [] })),
          visitService.getAllVisits().catch(() => []),
          enquiryService.getAllEnquiries().catch(() => []),
          user
            ? notificationService.getForUser({ role: user.role, userId: user.id }).catch(() => [])
            : Promise.resolve([]),
          expressInterestService.getBookingsRequiringDecision({ pageSize: 10 }).catch(() => ({ items: [], total: 0 })),
        ]);

        if (!active) return;

        const items = allProps?.items || [];
        const totalRevenue = items
          .filter((p) => String(p.status || '').toLowerCase() === 'active')
          .reduce((sum, p) => sum + (Number(p.price) || 0), 0);
        const tally = {};
        for (const p of items) {
          const key = p.categorySlug || 'other';
          tally[key] = (tally[key] || 0) + 1;
        }

        setCounts({
          pendingRegistrations: Array.isArray(pendingRegs) ? pendingRegs.length : 0,
          pendingProperties: pendingProps?.total || 0,
          totalUsers: Array.isArray(users) ? users.length : 0,
          totalProperties: allProps?.total || items.length,
          totalRevenue,
          totalVisits: Array.isArray(visits) ? visits.length : 0,
          totalEnquiries: Array.isArray(enquiries) ? enquiries.length : 0,
          totalNotifications: Array.isArray(notifications) ? notifications.length : 0,
          reportCategories: CATEGORIES.length,
          bookingsNeedingDecision: decisionData?.total || decisionData?.items?.length || 0,
        });
        setChartData(CATEGORIES.map((cat) => ({ name: cat.nameEn, count: tally[cat.slug] || 0 })));
        setDecisionBookings(decisionData?.items || []);
      } catch (err) {
        if (active) setError(err.message || 'Failed to load dashboard');
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => { active = false; };
  }, [user]);

  return (
    <div>
      <DashboardGreeting name={user?.name} photo={user?.profilePhoto} />
      {loading && <p className="mt-2 text-sm text-gray-500">Loading dashboard…</p>}
      {error && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard icon={UserPlus} label={t('admin.pendingRegistrations')} value={counts.pendingRegistrations} accent="amber" />
        <StatCard icon={LayoutList} label={t('admin.pendingProperties')} value={counts.pendingProperties} accent="amber" />
        <StatCard icon={ClipboardList} label="Bookings Needing Decision" value={counts.bookingsNeedingDecision} accent="orange" />
        <StatCard icon={Users} label={t('admin.totalUsers')} value={counts.totalUsers} accent="blue" />
        <StatCard icon={Building2} label={t('admin.totalProperties')} value={counts.totalProperties} accent="green" />
        <StatCard icon={IndianRupee} label={t('admin.totalRevenue')} value={formatIndianCurrencyCompact(counts.totalRevenue)} accent="orange" />
        <StatCard icon={FileBarChart} label={t('admin.reportCategories')} value={counts.reportCategories} accent="purple" />
        <StatCard icon={CalendarCheck} label={t('admin.totalVisits')} value={counts.totalVisits} accent="cyan" />
        <StatCard icon={Inbox} label={t('admin.totalEnquiries')} value={counts.totalEnquiries} accent="indigo" />
        <StatCard icon={Bell} label={t('admin.totalNotifications')} value={counts.totalNotifications} accent="red" />
      </div>

      {decisionBookings.length > 0 && (
        <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="font-semibold text-amber-950">Bookings Requiring Decision</h2>
            <Link to="/admin/bookings" className="text-xs font-semibold text-brand-700 hover:underline">Open bookings</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase text-amber-900/70">
                <tr>
                  <th className="px-2 py-1.5">Booking</th>
                  <th className="px-2 py-1.5">Customer</th>
                  <th className="px-2 py-1.5">Property</th>
                  <th className="px-2 py-1.5">Expiry</th>
                  <th className="px-2 py-1.5">Overdue</th>
                  <th className="px-2 py-1.5">Payment</th>
                  <th className="px-2 py-1.5">Agent</th>
                </tr>
              </thead>
              <tbody>
                {decisionBookings.map((b) => (
                  <tr key={b.id} className="border-t border-amber-100 bg-warm-white/80">
                    <td className="px-2 py-2 font-mono text-xs">#{b.id}</td>
                    <td className="px-2 py-2">{b.customer?.name || '—'}</td>
                    <td className="px-2 py-2">{b.propertyName || '—'}</td>
                    <td className="px-2 py-2 text-xs">{b.expiryDate ? new Date(b.expiryDate).toLocaleDateString('en-IN') : '—'}</td>
                    <td className="px-2 py-2 font-semibold text-amber-900">{b.daysOverdue || 0}d</td>
                    <td className="px-2 py-2 text-xs">{b.paymentStatus || '—'}</td>
                    <td className="px-2 py-2">{b.assignedAgent?.name || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-8 rounded-xl border border-gray-200/70 bg-warm-white/80 p-4 shadow-sm backdrop-blur">
        <h2 className="mb-4 font-semibold text-brand-800">{t('admin.propertiesByCategory')}</h2>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ left: -20 }}>
              <defs>
                <linearGradient id="adminDashboardBarGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#90A955" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#556936" stopOpacity={0.85} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-25} textAnchor="end" height={70} />
              <YAxis allowDecimals={false} />
              <Tooltip cursor={{ fill: 'rgba(144,169,85,0.08)' }} />
              <Bar dataKey="count" fill="url(#adminDashboardBarGradient)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
