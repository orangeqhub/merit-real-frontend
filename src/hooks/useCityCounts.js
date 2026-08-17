import { useEffect, useState } from 'react';
import { propertyService } from '../services/propertyService';

export function useCityCounts() {
  const [locations, setLocations] = useState([]);

  useEffect(() => {
    propertyService
      .getCityCounts()
      .then((counts) => {
        const sorted = counts
          .filter((c) => c.count > 0)
          .sort((a, b) => b.count - a.count);
        setLocations(sorted);
      })
      .catch(() => setLocations([]));
  }, []);

  return locations;
}
