import { useTranslation } from 'react-i18next';

const AMENITIES = [
  'Lift', 'Power Backup', 'Security', 'Gym', 'Swimming Pool', 'Clubhouse',
  'Children Play Area', 'Landscaped Garden', 'Borewell', 'Compound Wall',
  'Street Lighting', 'Underground Drainage', 'Avenue Plantation', 'Water Supply',
];

export default function Step5Amenities({ data, onChange }) {
  const { t } = useTranslation('forms');

  function toggle(amenity) {
    const has = data.amenities.includes(amenity);
    onChange({ amenities: has ? data.amenities.filter((a) => a !== amenity) : [...data.amenities, amenity] });
  }

  return (
    <div>
      <span className="mb-3 block text-sm font-medium text-gray-700">{t('wizard.amenities')}</span>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {AMENITIES.map((a) => (
          <label key={a} className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={data.amenities.includes(a)}
              onChange={() => toggle(a)}
              className="h-4 w-4 rounded border-gray-300 text-brand-600"
            />
            {a}
          </label>
        ))}
      </div>
    </div>
  );
}
