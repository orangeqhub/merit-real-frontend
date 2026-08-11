import { useCallback } from 'react';
import HeroCarousel from '../../components/home/HeroCarousel';
import CategoryStrip from '../../components/home/CategoryStrip';
import MapLayoutSection from '../../components/home/MapLayoutSection';
import TrustStrip from '../../components/home/TrustStrip';
import PromotionsCarousel from '../../components/promotions/PromotionsCarousel';
import PropertySectionGrid from '../../components/home/PropertySectionGrid';
import PopularLocations from '../../components/home/PopularLocations';
import VenturesSection from '../../components/home/VenturesSection';
import AboutSection from '../../components/home/AboutSection';
import WhyChooseUs from '../../components/home/WhyChooseUs';
import HowItWorks from '../../components/home/HowItWorks';
import ContactSection from '../../components/home/ContactSection';
import { propertyService } from '../../services/propertyService';
import { useLocationStore } from '../../store/locationStore';

export default function Home() {
  const selectedLocation = useLocationStore((s) => s.selectedLocation);
  const fetchFeatured = useCallback(() => propertyService.getFeatured(8, selectedLocation || undefined), [selectedLocation]);
  const fetchLatest = useCallback(() => propertyService.getLatest(8, selectedLocation || undefined), [selectedLocation]);
  const fetchTrending = useCallback(() => propertyService.getTrending(8, selectedLocation || undefined), [selectedLocation]);

  return (
    <>
      <HeroCarousel />
      <CategoryStrip />
      <MapLayoutSection />
      <TrustStrip />
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <PromotionsCarousel
          title="Featured Offers & Promotions"
          subtitle="Hand-picked deals and featured listings from Merit Real Solutions."
          showExplore
        />
      </div>
      <PropertySectionGrid titleKey="sections.featured" fetcher={fetchFeatured} viewAllTo="/properties?sort=featured" />
      <PropertySectionGrid titleKey="sections.latest" fetcher={fetchLatest} viewAllTo="/properties" />
      <PropertySectionGrid titleKey="sections.trending" fetcher={fetchTrending} viewAllTo="/properties?section=trending" />
      <PopularLocations />
      <VenturesSection />
      <AboutSection />
      <WhyChooseUs />
      <HowItWorks />
      <ContactSection />
    </>
  );
}
