import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Heart, MessageSquareHeart, CalendarCheck, Search } from 'lucide-react';
import { propertyService } from '../../services/propertyService';
import { enquiryService } from '../../services/enquiryService';
import { visitService } from '../../services/visitService';
import { useAuthStore } from '../../store/authStore';
import { CATEGORIES } from '../../config/categories';
import { useLanguageStore } from '../../store/languageStore';
import StatCard from '../../components/dashboard/StatCard';
import DashboardGreeting from '../../components/dashboard/DashboardGreeting';
import PromotionsCarousel from '../../components/promotions/PromotionsCarousel';

export default function BuyerDashboard() {
  const { t } = useTranslation(['dashboard', 'common']);
  const { user } = useAuthStore();
  const language = useLanguageStore((s) => s.language);
  const [counts, setCounts] = useState({ favourites: 0, interests: 0, visits: 0 });
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setError(null);

    Promise.all([
      propertyService.getFavourites(user.id).catch(() => []),
      enquiryService.getForBuyer(user.mobile).catch(() => []),
      visitService.getForBuyer(user.id).catch(() => []),
    ]).then(([favourites, interests, visits]) => {
      if (!active) return;
      setCounts({
        favourites: Array.isArray(favourites) ? favourites.length : 0,
        interests: Array.isArray(interests) ? interests.length : 0,
        visits: Array.isArray(visits) ? visits.length : 0,
      });
    }).catch((err) => {
      if (active) setError(err.message || 'Failed to load dashboard');
    });

    return () => { active = false; };
  }, [user]);

  return (
    <div>
      <DashboardGreeting name={user?.name} photo={user?.profilePhoto} />
      {error && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      <div className="mt-6">
        <PromotionsCarousel compact title="Active promotions" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard icon={Heart} label={t('buyer.savedProperties')} value={counts.favourites} />
        <StatCard icon={MessageSquareHeart} label={t('buyer.myInterests')} value={counts.interests} accent="amber" />
        <StatCard icon={CalendarCheck} label={t('buyer.visitRequests')} value={counts.visits} accent="blue" />
      </div>

      <Link to="/buyer/properties" className="mt-6 flex w-fit items-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-warm-white">
        <Search size={16} /> {t('buyer.searchProperties')}
      </Link>

      <div className="mt-8">
        <h2 className="mb-3 font-semibold text-brand-800">{t('nav.categories', { ns: 'common' })}</h2>
        <div className="flex gap-3 overflow-x-auto scrollbar-none">
          {CATEGORIES.map((c) => (
            <Link key={c.slug} to={`/properties/category/${c.slug}`} className="shrink-0 rounded-full border border-gray-200 px-4 py-2 text-sm hover:bg-brand-50">
              {language === 'te' ? c.nameTe : c.nameEn}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
