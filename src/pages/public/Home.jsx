import { useCallback, useMemo } from 'react';
import HeroCarousel from '../../components/home/HeroCarousel';
import CategoryStrip from '../../components/home/CategoryStrip';
import MapLayoutSection from '../../components/home/MapLayoutSection';
import ProjectImageScroller from '../../components/home/ProjectImageScroller';
import TrustStrip from '../../components/home/TrustStrip';
import PromotionsCarousel from '../../components/promotions/PromotionsCarousel';
import PropertySectionGrid from '../../components/home/PropertySectionGrid';
import PopularLocations from '../../components/home/PopularLocations';
import AboutSection from '../../components/home/AboutSection';
import WhyChooseUs from '../../components/home/WhyChooseUs';
import HowItWorks from '../../components/home/HowItWorks';
import ContactSection from '../../components/home/ContactSection';
import { propertyService } from '../../services/propertyService';
import { useLocationStore } from '../../store/locationStore';
import { useUserLocationStore } from '../../store/userLocationStore';
import { NEARBY_RADIUS_KM } from '../../config/location';
import { enrichAndSortNearbyProperties } from '../../utils/nearbyProperties';

export default function Home() {
  const selectedLocation = useLocationStore((s) => s.selectedLocation);
  const userCoords = useUserLocationStore((s) => s.coords);

  const geoQuery = useMemo(
    () => (userCoords
      ? { latitude: userCoords.lat, longitude: userCoords.lng, radiusKm: NEARBY_RADIUS_KM }
      : {}),
    [userCoords]
  );

  const wrapNearby = useCallback(
    async (loader) => {
      const list = await loader();
      if (!userCoords || !Array.isArray(list)) return list;
      return enrichAndSortNearbyProperties(list, userCoords, selectedLocation, NEARBY_RADIUS_KM);
    },
    [userCoords, selectedLocation]
  );

  const fetchFeatured = useCallback(
    () => wrapNearby(() => propertyService.getFeatured(8, selectedLocation || undefined, geoQuery)),
    [selectedLocation, geoQuery, wrapNearby]
  );
  const fetchLatest = useCallback(
    () => wrapNearby(() => propertyService.getLatest(8, selectedLocation || undefined, geoQuery)),
    [selectedLocation, geoQuery, wrapNearby]
  );
  return (
    <>
      <HeroCarousel />
      <CategoryStrip />
      <MapLayoutSection />
      <ProjectImageScroller />
      <TrustStrip />
      <div className="mx-auto max-w-7xl px-3 sm:px-4 md:px-6 lg:px-6">
        <PromotionsCarousel
          title="Featured Offers & Promotions"
          subtitle="Hand-picked deals and featured listings from Merit Real Solutions."
          showExplore
        />
      </div>
      <PropertySectionGrid titleKey="sections.featured" fetcher={fetchFeatured} viewAllTo="/properties?sort=featured" />
      <PropertySectionGrid titleKey="sections.latest" fetcher={fetchLatest} viewAllTo="/properties" />
      <PopularLocations />
      <AboutSection />
      <WhyChooseUs />
      <HowItWorks />
      <ContactSection />
    </>
  );
}
