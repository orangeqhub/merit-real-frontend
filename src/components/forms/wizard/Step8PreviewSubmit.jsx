import { useTranslation } from 'react-i18next';
import { getCategoryBySlug } from '../../../config/categories';
import { useLanguageStore } from '../../../store/languageStore';

export default function Step8PreviewSubmit({ data }) {
  const { t } = useTranslation('properties');
  const language = useLanguageStore((s) => s.language);
  const category = getCategoryBySlug(data.categorySlug);
  const primaryImage = data.images.find((i) => i.isPrimary) || data.images[0];

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200">
      <div className="h-56 bg-gray-100">
        {primaryImage && <img src={primaryImage.url} alt={data.titleEn} className="h-full w-full object-cover" />}
      </div>
      <div className="space-y-3 p-5">
        <h2 className="text-xl font-bold text-brand-800">{data.titleEn}</h2>
        <p className="text-sm text-gray-500">
          {category ? (language === 'te' ? category.nameTe : category.nameEn) : ''}
        </p>
        <p className="text-lg font-bold text-brand-700">
          ₹{Number(data.price || 0).toLocaleString('en-IN')}
        </p>
        <p className="text-sm text-gray-600">{data.address}</p>
        <p className="text-sm text-gray-600">{data.locality}, {data.cityVillage}, {data.district}</p>
        <p className="text-sm text-gray-600">{data.area} {data.areaUnit}</p>
        <p className="whitespace-pre-line text-sm text-gray-700">{data.descriptionEn}</p>
        {data.amenities.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {data.amenities.map((a) => (
              <span key={a} className="rounded-full bg-brand-50 px-3 py-1 text-xs text-brand-800">{a}</span>
            ))}
          </div>
        )}
        <p className="text-sm text-gray-600">
          {data.images.length} {t('detail.images')}
        </p>
        <p className="text-sm text-gray-600">
          {data.documents?.identityProof && data.documents?.ownershipProof
            ? t('detail.documentsAttached')
            : t('detail.documentsMissing')}
        </p>
        <p className="text-sm text-gray-600">{data.contactName} &middot; {data.contactPhone}</p>
      </div>
    </div>
  );
}
