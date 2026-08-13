import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft } from 'lucide-react';
import { propertyModerationService } from '../../services/propertyModerationService';
import { mediaRuleService } from '../../services/mediaRuleService';
import { generateImageSlots } from '../../utils/mediaSlotGenerator';
import { resolveSlotLabel } from '../../utils/mediaLabel';
import { isBuildingType } from '../../utils/wizardDefaults';
import { useAuthStore } from '../../store/authStore';
import { useLanguageStore } from '../../store/languageStore';
import { getLocalizedField } from '../../utils/localize';
import { hasPermission } from '../../utils/permissions';
import { toast } from '../../store/toastStore';
import DocumentPreview from '../../components/employee/DocumentPreview';
import InternalNotesPanel from '../../components/employee/InternalNotesPanel';
import { resolveAssetUrl } from '../../api/client';
import { formatIndianCurrency } from '../../utils/formatIndianNumber';

const FIELD_OPTIONS = ['titleEn', 'descriptionEn', 'price', 'area', 'locationEn', 'amenities', 'approvals'];

export default function PropertyModerationDetail() {
  const { id } = useParams();
  const { t } = useTranslation(['dashboard', 'properties']);
  const { user } = useAuthStore();
  const language = useLanguageStore((s) => s.language);
  const [property, setProperty] = useState(null);
  const [rule, setRule] = useState(null);
  const [modal, setModal] = useState(null);
  const [reason, setReason] = useState('');
  const [selectedFields, setSelectedFields] = useState([]);
  const [selectedSlots, setSelectedSlots] = useState([]);

  function load() {
    propertyModerationService.getById(user, id).then(setProperty);
  }

  useEffect(load, [id, user]);

  useEffect(() => {
    if (!property?.ruleKey) return;
    mediaRuleService.getRules().then((rules) => setRule(rules[property.ruleKey] || null));
  }, [property?.ruleKey]);

  const slotAnalysis = useMemo(() => {
    if (!property || !rule) return { slots: [], missing: [], duplicates: [] };
    const building = isBuildingType(property.ruleKey);
    const structureCounts = building
      ? {
          bedrooms: property.structure?.bedrooms,
          bathrooms: property.structure?.bathrooms,
          halls: property.structure?.halls,
          balconies: property.structure?.balconies,
          kitchens: property.structure?.kitchens,
        }
      : {};
    const extraSpaces = property.structure?.extraSpaces || [];
    const slots = generateImageSlots(rule, structureCounts, extraSpaces);
    const imagesBySlot = {};
    for (const img of property.images || []) imagesBySlot[img.slotId] = img;
    const missing = slots.filter((s) => s.required && !imagesBySlot[s.id]);

    const seenUrls = new Map();
    const duplicates = [];
    for (const img of property.images || []) {
      if (seenUrls.has(img.url)) duplicates.push(img.slotId);
      seenUrls.set(img.url, img.slotId);
    }

    return { slots, imagesBySlot, missing, duplicates };
  }, [property, rule]);

  if (property === null) return null;
  if (!property) return <div className="text-center text-sm text-gray-500">{t('moderation.noRecordsFound')}</div>;

  const canRecommend = hasPermission(user, 'PROPERTY_MODERATION_RECOMMEND');
  const canRequestChanges = hasPermission(user, 'PROPERTY_MODERATION_CORRECTION_REQUEST');
  const title = getLocalizedField(property, 'title', language);

  async function run(action, ...args) {
    try {
      await action(user, id, ...args);
      toast.success(t('toast.propertyUpdated'));
      load();
    } catch (err) {
      toast.error(t(err.message));
    }
  }

  async function handleModalSubmit(e) {
    e.preventDefault();
    try {
      if (modal === 'changes') {
        await propertyModerationService.requestChanges(user, id, { reason, fields: selectedFields, slots: selectedSlots });
      } else if (modal === 'recommend_approval') {
        await propertyModerationService.recommendApproval(user, id, reason);
      } else if (modal === 'recommend_rejection') {
        await propertyModerationService.recommendRejection(user, id, reason);
      }
      toast.success(t('toast.assignmentUpdated'));
      setModal(null);
      setReason('');
      setSelectedFields([]);
      setSelectedSlots([]);
      load();
    } catch (err) {
      toast.error(t(err.message));
    }
  }

  function toggleField(f) {
    setSelectedFields((list) => (list.includes(f) ? list.filter((x) => x !== f) : [...list, f]));
  }
  function toggleSlot(id_) {
    setSelectedSlots((list) => (list.includes(id_) ? list.filter((x) => x !== id_) : [...list, id_]));
  }

  return (
    <div className="mx-auto max-w-5xl">
      <Link to="/employee/properties" className="mb-4 flex items-center gap-1 text-sm text-brand-700 hover:underline">
        <ChevronLeft size={16} /> {t('moderation.title')}
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 p-5">
            <h1 className="font-semibold text-brand-800">{title}</h1>
            <p className="text-xs text-gray-400">{property.propertyCode}</p>
            <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div><dt className="text-xs uppercase text-gray-400">{t('table.category')}</dt><dd className="text-sm text-gray-800">{property.categorySlug}</dd></div>
              <div><dt className="text-xs uppercase text-gray-400">{t('table.price')}</dt><dd className="text-sm text-gray-800">{formatIndianCurrency(property.price || 0)}</dd></div>
              <div><dt className="text-xs uppercase text-gray-400">{t('wizard.area', { ns: 'forms' })}</dt><dd className="text-sm text-gray-800">{property.area} {property.areaUnit}</dd></div>
              <div><dt className="text-xs uppercase text-gray-400">{t('table.location')}</dt><dd className="text-sm text-gray-800 lang-te">{getLocalizedField(property, 'location', language)}</dd></div>
              <div><dt className="text-xs uppercase text-gray-400">{t('verification.assignedDate')}</dt><dd className="text-sm text-gray-800">{property.assignedAt ? new Date(property.assignedAt).toLocaleDateString() : '-'}</dd></div>
              <div><dt className="text-xs uppercase text-gray-400">{t('verification.dueDate')}</dt><dd className="text-sm text-gray-800">{property.dueDate ? new Date(property.dueDate).toLocaleDateString() : '-'}</dd></div>
            </dl>
            <p className="mt-3 whitespace-pre-line text-sm text-gray-700 lang-te">{getLocalizedField(property, 'description', language)}</p>
          </div>

          <div className="rounded-xl border border-gray-200 p-4">
            <h2 className="text-sm font-semibold text-brand-800">{t('moderation.sellerDetails')}</h2>
            <p className="mt-2 text-sm text-gray-700">{property.contactName} &middot; {property.contactPhone}</p>
          </div>

          {property.amenities?.length > 0 && (
            <div className="rounded-xl border border-gray-200 p-4">
              <h2 className="text-sm font-semibold text-brand-800">{t('detail.amenities', { ns: 'properties' })}</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {property.amenities.map((a) => <span key={a} className="rounded-full bg-brand-50 px-3 py-1 text-xs text-brand-800">{a}</span>)}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-gray-200 p-4">
            <h2 className="mb-2 text-sm font-semibold text-brand-800">{t('media.progressTitle', { ns: 'forms' })}</h2>
            {slotAnalysis.missing.length > 0 && (
              <p className="mb-2 text-xs font-medium text-red-600">
                {t('moderation.missingSlots')}: {slotAnalysis.missing.map((s) => resolveSlotLabel(s, language, t)).join(', ')}
              </p>
            )}
            {slotAnalysis.duplicates.length > 0 && (
              <p className="mb-2 text-xs font-medium text-amber-600">{t('moderation.duplicateImages')}: {slotAnalysis.duplicates.join(', ')}</p>
            )}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {slotAnalysis.slots.map((slot) => {
                const img = slotAnalysis.imagesBySlot?.[slot.id];
                return (
                  <div key={slot.id} className="rounded-lg border border-gray-200 p-2">
                    <div className="h-20 w-full overflow-hidden rounded bg-gray-50">
                      {img ? <img src={resolveAssetUrl(img.url)} alt={img.caption || slot.id} className="h-full w-full object-cover" /> : null}
                    </div>
                    <p className="mt-1 truncate text-xs text-gray-600">{resolveSlotLabel(slot, language, t)}</p>
                    {img?.isPrimary && <span className="text-[10px] font-semibold text-amber-600">{t('media.primaryImage', { ns: 'forms' })}</span>}
                    {img?.caption && <p className="truncate text-[10px] text-gray-400">{img.caption}</p>}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DocumentPreview title={t('document.types.ownershipDocument')} fileName="ownership-doc.pdf" uploadDate={property.postedDate} />
            <DocumentPreview title={t('document.types.approvalDocument')} fileName="approval-doc.pdf" uploadDate={property.postedDate} />
          </div>

          {property.moderationHistory?.length > 0 && (
            <div className="rounded-xl border border-gray-200 p-4">
              <h2 className="text-sm font-semibold text-brand-800">{t('moderation.moderationHistory')}</h2>
              <ul className="mt-2 space-y-2">
                {property.moderationHistory.map((h) => (
                  <li key={h.id} className="rounded-lg bg-gray-50 p-2.5 text-sm">
                    <p className="font-medium text-gray-700">{h.action.replace(/_/g, ' ')}</p>
                    {h.note && <p className="text-gray-600">{h.note}</p>}
                    <p className="mt-1 text-xs text-gray-400">{new Date(h.createdAt).toLocaleString()}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-xl border border-gray-200 p-4">
            <InternalNotesPanel recordType="property" recordId={property.id} />
          </div>
        </div>

        <aside className="space-y-2">
          <span className="mb-2 block rounded-full bg-brand-50 px-3 py-1.5 text-center text-xs font-semibold text-brand-700">
            {t(`moderationStatus.${property.moderationStatus}`)}
          </span>
          <button type="button" onClick={() => run(propertyModerationService.startReview)} className="w-full rounded-lg border border-gray-300 py-2 text-sm font-medium hover:bg-gray-50">
            {t('moderation.startReview')}
          </button>
          {canRequestChanges && (
            <button type="button" onClick={() => setModal('changes')} className="w-full rounded-lg border border-blue-300 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50">
              {t('moderation.requestChanges')}
            </button>
          )}
          {canRecommend && (
            <>
              <button type="button" onClick={() => setModal('recommend_approval')} className="w-full rounded-lg bg-brand-600 py-2 text-sm font-semibold text-warm-white hover:bg-brand-700">
                {t('moderation.recommendApproval')}
              </button>
              <button type="button" onClick={() => setModal('recommend_rejection')} className="w-full rounded-lg border border-red-300 py-2 text-sm font-medium text-red-700 hover:bg-red-50">
                {t('moderation.recommendRejection')}
              </button>
            </>
          )}
          <button type="button" onClick={() => run(propertyModerationService.markComplete)} className="w-full rounded-lg border border-green-300 py-2 text-sm font-medium text-green-700 hover:bg-green-50">
            {t('moderation.markComplete')}
          </button>
        </aside>
      </div>

      {modal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 px-4 py-8">
          <form onSubmit={handleModalSubmit} className="max-h-full w-full max-w-lg overflow-y-auto rounded-xl bg-warm-white p-6 shadow-xl">
            <h2 className="font-semibold text-brand-800">
              {modal === 'changes' ? t('moderation.requestChanges') : modal === 'recommend_approval' ? t('moderation.recommendApproval') : t('moderation.recommendRejection')}
            </h2>
            <label htmlFor="mod-reason" className="mb-1 mt-3 block text-xs font-medium text-gray-600">{t('moderation.reasonLabel')}</label>
            <textarea
              id="mod-reason"
              required={modal !== 'recommend_approval'}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('moderation.reasonPlaceholder')}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            {modal === 'changes' && (
              <>
                <div className="mt-3">
                  <span className="mb-1 block text-xs font-medium text-gray-600">{t('moderation.fieldsLabel')}</span>
                  <div className="flex flex-wrap gap-2">
                    {FIELD_OPTIONS.map((f) => (
                      <label key={f} className="flex items-center gap-1 rounded-full border border-gray-200 px-2 py-1 text-xs">
                        <input type="checkbox" checked={selectedFields.includes(f)} onChange={() => toggleField(f)} className="h-3.5 w-3.5" />
                        {f}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="mt-3">
                  <span className="mb-1 block text-xs font-medium text-gray-600">{t('moderation.slotsLabel')}</span>
                  <div className="flex flex-wrap gap-2">
                    {slotAnalysis.slots.map((s) => (
                      <label key={s.id} className="flex items-center gap-1 rounded-full border border-gray-200 px-2 py-1 text-xs">
                        <input type="checkbox" checked={selectedSlots.includes(s.id)} onChange={() => toggleSlot(s.id)} className="h-3.5 w-3.5" />
                        {resolveSlotLabel(s, language, t)}
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}
            <div className="mt-4 flex justify-end gap-3">
              <button type="button" onClick={() => setModal(null)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm">{t('category.cancel')}</button>
              <button type="submit" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-warm-white">{t('modal.submit')}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
