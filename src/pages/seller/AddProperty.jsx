import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';
import { useDraftProperty } from '../../hooks/useDraftProperty';
import { toast } from '../../store/toastStore';
import { generateImageSlots } from '../../utils/mediaSlotGenerator';
import { mediaRuleService } from '../../services/mediaRuleService';
import { isBuildingType } from '../../utils/wizardDefaults';
import WizardStepper from '../../components/forms/wizard/WizardStepper';
import Step1BasicDetails from '../../components/forms/wizard/Step1BasicDetails';
import Step2Location from '../../components/forms/wizard/Step2Location';
import Step3PriceSize from '../../components/forms/wizard/Step3PriceSize';
import Step4Structure from '../../components/forms/wizard/Step4Structure';
import Step5Amenities from '../../components/forms/wizard/Step5Amenities';
import Step6Images from '../../components/forms/wizard/Step6Images';
import Step7ContactPreference from '../../components/forms/wizard/Step7ContactPreference';
import Step8PreviewSubmit from '../../components/forms/wizard/Step8PreviewSubmit';

function validateStep(step, data) {
  const errors = {};
  if (step === 1) {
    if (!data.titleEn) errors.titleEn = true;
    if (!data.categorySlug) errors.categorySlug = true;
    if (!data.descriptionEn) errors.descriptionEn = true;
  }
  if (step === 2) {
    if (!data.district) errors.district = true;
    if (!data.cityVillage) errors.cityVillage = true;
    if (!data.address) errors.address = true;
    if (!data.mapLocation) errors.mapLocation = true;
    if (data.pincode && !/^\d{6}$/.test(data.pincode)) errors.pincode = true;
  }
  if (step === 3) {
    if (!data.price || Number(data.price) <= 0) errors.price = true;
    if (!data.area || Number(data.area) <= 0) errors.area = true;
  }
  if (step === 7) {
    if (!data.contactName) errors.contactName = true;
    if (!/^\d{10}$/.test(data.contactPhone || '')) errors.contactPhone = true;
  }
  return errors;
}

const POST_SUBMIT_PATH = {
  buyer: '/buyer/my-properties',
  seller: '/seller/properties',
  mediator: '/mediator/dashboard',
};

export default function AddProperty() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation('forms');
  const { user } = useAuthStore();
  const { formData, updateData, saveDraft, submitForApproval, loaded } = useDraftProperty(user?.id, id);
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [rule, setRule] = useState(null);

  // Coming from the Property Type Selection screen (/post-property) pre-fills
  // the category — but only into a genuinely fresh draft, never over one
  // already being resumed/edited, so an in-progress draft is never clobbered.
  useEffect(() => {
    if (!loaded || formData.categorySlug) return;
    const { categorySlug, ruleKey } = location.state || {};
    if (categorySlug) updateData({ categorySlug, ruleKey });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  useEffect(() => {
    if (!formData.ruleKey) return;
    mediaRuleService.getRules().then((rules) => setRule(rules[formData.ruleKey] || null));
  }, [formData.ruleKey]);

  const steps = [
    t('wizard.step1Title'),
    t('wizard.step2Title'),
    t('wizard.step3Title'),
    t('wizard.step4Title'),
    t('wizard.step5Title'),
    t('wizard.step6Title'),
    t('wizard.step7Title'),
    t('wizard.step8Title'),
  ];

  const mediaReady = useMemo(() => {
    if (!formData.ruleKey || !rule) return false;
    const building = isBuildingType(formData.ruleKey);
    const structureCounts = building
      ? {
          bedrooms: formData.structure.bedrooms,
          bathrooms: formData.structure.bathrooms,
          halls: formData.structure.halls,
          balconies: formData.structure.balconies,
          kitchens: formData.structure.kitchens,
        }
      : {};
    const slots = generateImageSlots(rule, structureCounts, formData.extraSpaces);
    const requiredSlots = slots.filter((s) => s.required);
    const hasAllRequired = requiredSlots.every((s) => formData.images.some((img) => img.slotId === s.id));
    const captionsOk = slots
      .filter((s) => s.captionRequired)
      .every((s) => {
        const img = formData.images.find((i) => i.slotId === s.id);
        return !img || Boolean(img.caption);
      });
    const hasPrimary = formData.images.some((img) => img.isPrimary);
    return hasAllRequired && hasPrimary && captionsOk;
  }, [formData, rule]);

  const documentsReady = Boolean(formData.documents?.identityProof && formData.documents?.ownershipProof);

  const canSubmit = useMemo(
    () => [1, 2, 3, 7].every((s) => Object.keys(validateStep(s, formData)).length === 0) && mediaReady && documentsReady,
    [formData, mediaReady, documentsReady]
  );

  if (!loaded) return null;

  function handleNext() {
    const stepErrors = validateStep(step, formData);
    if (step === 6 && !mediaReady) {
      toast.error(t('media.error.requiredSlotsIncomplete'));
      return;
    }
    if (step === 6 && !documentsReady) {
      toast.error(t('media.error.documentsRequired'));
      return;
    }
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      toast.error(t('validation.required'));
      return;
    }
    setErrors({});
    setStep((s) => Math.min(8, s + 1));
  }

  function handleBack() {
    setStep((s) => Math.max(1, s - 1));
  }

  async function handleSaveDraft() {
    setSaving(true);
    try {
      await saveDraft();
      toast.success(t('buttons.saveDraft', { ns: 'common' }) + ' ✓');
    } catch (err) {
      toast.error(t(err.message));
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit() {
    if (!mediaReady) {
      toast.error(t('media.error.requiredSlotsIncomplete'));
      setStep(6);
      return;
    }
    if (!documentsReady) {
      toast.error(t('media.error.documentsRequired'));
      setStep(6);
      return;
    }
    const stepErrors = validateStep(7, formData);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      setStep(7);
      toast.error(t('validation.required'));
      return;
    }
    setSaving(true);
    try {
      await submitForApproval();
      toast.success(t('registration.success'));
      navigate(POST_SUBMIT_PATH[user.role] || '/');
    } catch (err) {
      toast.error(t(err.message));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-xl font-bold text-brand-800">{steps[step - 1]}</h1>
      <WizardStepper steps={steps} current={step} />

      {step === 1 && <Step1BasicDetails data={formData} onChange={updateData} errors={errors} />}
      {step === 2 && <Step2Location data={formData} onChange={updateData} errors={errors} />}
      {step === 3 && <Step3PriceSize data={formData} onChange={updateData} errors={errors} />}
      {step === 4 && <Step4Structure data={formData} onChange={updateData} />}
      {step === 5 && <Step5Amenities data={formData} onChange={updateData} />}
      {step === 6 && <Step6Images data={formData} onChange={updateData} />}
      {step === 7 && <Step7ContactPreference data={formData} onChange={updateData} errors={errors} />}
      {step === 8 && <Step8PreviewSubmit data={formData} />}

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-6">
        <button
          type="button"
          onClick={handleBack}
          disabled={step === 1}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 disabled:opacity-40"
        >
          {t('buttons.back', { ns: 'common' })}
        </button>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={saving}
            className="rounded-lg border border-brand-400 px-4 py-2 text-sm font-medium text-brand-700 disabled:opacity-50"
          >
            {t('buttons.saveDraft', { ns: 'common' })}
          </button>
          {step < 8 ? (
            <button
              type="button"
              onClick={handleNext}
              className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-warm-white hover:bg-brand-700"
            >
              {t('buttons.next', { ns: 'common' })}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving || !canSubmit}
              className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-warm-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {t('buttons.submitForApproval', { ns: 'common' })}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
