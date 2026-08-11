import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Building2, TrendingUp, Eye, Inbox, CalendarCheck } from 'lucide-react';
import { propertyService } from '../../services/propertyService';
import { enquiryService } from '../../services/enquiryService';
import { visitService } from '../../services/visitService';
import { useAuthStore } from '../../store/authStore';
import StatCard from '../../components/dashboard/StatCard';

export default function Analytics() {
  const { t } = useTranslation('dashboard');
  const { user } = useAuthStore();
  const [properties, setProperties] = useState([]);
  const [enquiryCount, setEnquiryCount] = useState(0);
  const [visitCount, setVisitCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    propertyService.getBySeller(user.id).then(setProperties);
    enquiryService.getForSeller(user.id).then((list) => setEnquiryCount(list.length));
    visitService.getForSeller(user.id).then((list) => setVisitCount(list.length));
  }, [user]);

  const counts = useMemo(
    () => ({
      total: properties.length,
      active: properties.filter((p) => p.status === 'active').length,
      totalViews: properties.reduce((sum, p) => sum + (p.views || 0), 0),
    }),
    [properties]
  );

  const chartData = useMemo(
    () =>
      [...properties]
        .sort((a, b) => (b.views || 0) - (a.views || 0))
        .slice(0, 5)
        .map((p) => ({ name: p.titleEn?.length > 18 ? `${p.titleEn.slice(0, 18)}…` : p.titleEn, views: p.views || 0 })),
    [properties]
  );

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold text-brand-800">{t('analytics.title')}</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={Building2} label={t('analytics.properties')} value={counts.total} accent="brand" />
        <StatCard icon={TrendingUp} label={t('analytics.active')} value={counts.active} accent="green" />
        <StatCard icon={Eye} label={t('analytics.totalViews')} value={counts.totalViews} accent="blue" />
        <StatCard icon={Inbox} label={t('analytics.enquiries')} value={enquiryCount} accent="amber" />
        <StatCard icon={CalendarCheck} label={t('analytics.visits')} value={visitCount} accent="cyan" />
      </div>

      <div className="mt-8 rounded-xl border border-gray-200/70 bg-warm-white/80 p-4 shadow-sm backdrop-blur">
        <h2 className="mb-4 font-semibold text-brand-800">{t('analytics.viewsByProperty')}</h2>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ left: -20 }}>
              <defs>
                <linearGradient id="sellerAnalyticsBarGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#90a955" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#556936" stopOpacity={0.85} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-25} textAnchor="end" height={70} />
              <YAxis allowDecimals={false} />
              <Tooltip cursor={{ fill: 'rgba(144,169,85,0.08)' }} />
              <Bar dataKey="views" fill="url(#sellerAnalyticsBarGradient)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
