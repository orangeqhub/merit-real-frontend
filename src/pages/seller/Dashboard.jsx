import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Building2, FileEdit, Clock, RefreshCcw, XCircle, Archive, Eye, Inbox, Plus } from 'lucide-react';
import { propertyService } from '../../services/propertyService';
import { enquiryService } from '../../services/enquiryService';
import { useAuthStore } from '../../store/authStore';
import StatCard from '../../components/dashboard/StatCard';
import DashboardGreeting from '../../components/dashboard/DashboardGreeting';
import PropertyCard from '../../components/properties/PropertyCard';
import EmptyState from '../../components/common/EmptyState';

export default function SellerDashboard() {
  const { t } = useTranslation(['dashboard', 'common']);
  const { user } = useAuthStore();
  const [properties, setProperties] = useState([]);
  const [enquiryCount, setEnquiryCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    propertyService.getBySeller(user.id).then(setProperties);
    enquiryService.getForSeller(user.id).then((list) => setEnquiryCount(list.length));
  }, [user]);

  const counts = useMemo(
    () => ({
      active: properties.filter((p) => p.status === 'active').length,
      draft: properties.filter((p) => p.status === 'draft').length,
      pending: properties.filter((p) => p.status === 'pending').length,
      changesRequested: properties.filter((p) => p.status === 'changes_requested').length,
      rejected: properties.filter((p) => p.status === 'rejected').length,
      soldInactive: properties.filter((p) => ['sold', 'inactive'].includes(p.status)).length,
      totalViews: properties.reduce((sum, p) => sum + (p.views || 0), 0),
    }),
    [properties]
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <DashboardGreeting name={user?.name} photo={user?.profilePhoto} />
        <Link to="/seller/properties/new" className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-warm-white">
          <Plus size={16} /> {t('nav.addProperty', { ns: 'common' })}
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={Building2} label={t('seller.activeProperties')} value={counts.active} />
        <StatCard icon={FileEdit} label={t('seller.draftProperties')} value={counts.draft} accent="blue" />
        <StatCard icon={Clock} label={t('seller.pendingReview')} value={counts.pending} accent="amber" />
        <StatCard icon={RefreshCcw} label={t('seller.changesRequested')} value={counts.changesRequested} accent="blue" />
        <StatCard icon={XCircle} label={t('seller.rejectedProperties')} value={counts.rejected} accent="red" />
        <StatCard icon={Archive} label={t('seller.soldInactive')} value={counts.soldInactive} />
        <StatCard icon={Eye} label={t('seller.totalViews')} value={counts.totalViews} accent="blue" />
        <StatCard icon={Inbox} label={t('seller.enquiries')} value={enquiryCount} accent="amber" />
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-brand-800">{t('nav.myProperties', { ns: 'common' })}</h2>
          <Link to="/seller/properties" className="text-sm text-brand-700 hover:underline">{t('common.viewAll')}</Link>
        </div>
        {properties.length === 0 ? (
          <div className="mt-4"><EmptyState titleKey="empty.noData" /></div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {properties.slice(0, 3).map((p) => <PropertyCard key={p.id} property={p} />)}
          </div>
        )}
      </div>
    </div>
  );
}
