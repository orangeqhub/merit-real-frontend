import { useCallback } from 'react';
import PropertySectionGrid from './PropertySectionGrid';
import { propertyService } from '../../services/propertyService';

export default function VenturesSection() {
  const fetcher = useCallback(
    () => propertyService.getProperties({ categorySlug: 'ventures', pageSize: 4 }).then((r) => r.items),
    []
  );
  return <PropertySectionGrid titleKey="sections.ventures" fetcher={fetcher} viewAllTo="/ventures" />;
}
