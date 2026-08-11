import { useEffect, useState } from 'react';
import { propertyService } from '../../services/propertyService';
import PropertyCard from '../../components/properties/PropertyCard';
import EmptyState from '../../components/common/EmptyState';

export default function Properties() {
  const [properties, setProperties] = useState(null);

  useEffect(() => {
    propertyService
      .getProperties({ pageSize: 24, sort: 'newest' })
      .then((r) => setProperties(r.items))
      .catch(() => setProperties([]));
  }, []);

  if (properties === null) return null;
  if (properties.length === 0) return <EmptyState titleKey="empty.noData" />;

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold text-brand-800">Properties</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {properties.map((p) => <PropertyCard key={p.id} property={p} />)}
      </div>
    </div>
  );
}
