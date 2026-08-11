import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { registrationService } from '../../services/registrationService';
import { registrationSchema } from '../../utils/validationSchemas';
import { toast } from '../../store/toastStore';
import ImageSlotUploader from '../../components/forms/ImageSlotUploader';
import DocumentUploader from '../../components/forms/DocumentUploader';
import { validateDocumentFile } from '../../utils/documentValidation';
import { savePendingExpressInterest, peekPendingExpressInterest } from '../../utils/pendingExpressInterest';
import { savePendingSiteVisit, peekPendingSiteVisit } from '../../utils/pendingSiteVisit';

const ROLES = ['customer', 'agent', 'sales_member'];
const DOC_ACCEPT = 'application/pdf,image/jpeg,image/jpg,image/png,.pdf,.jpg,.jpeg,.png';

const ROLE_LABEL_KEYS = {
  customer: 'nav.registerAsCustomer',
  agent: 'nav.registerAsAgent',
  sales_member: 'nav.registerAsSalesMember',
};

export default function Register() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation('forms');
  const [submitting, setSubmitting] = useState(false);
  const [agentCategories, setAgentCategories] = useState([]);
  const [fileError, setFileError] = useState('');
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [aadhaarProof, setAadhaarProof] = useState(null);
  const [panProof, setPanProof] = useState(null);

  const intent = location.state?.intent;
  const fromPath = location.state?.from || peekPendingSiteVisit() || peekPendingExpressInterest();
  const isExpressInterestIntent = intent === 'express-interest' || String(fromPath || '').startsWith('/express-interest/');
  const isScheduleVisitIntent = intent === 'schedule-visit' || String(fromPath || '').startsWith('/schedule-visit/');
  const isCustomerIntent = isExpressInterestIntent || isScheduleVisitIntent;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registrationSchema),
    defaultValues: { role: 'customer' },
  });

  const selectedRole = watch('role') || 'customer';

  useEffect(() => {
    if (fromPath?.startsWith('/express-interest/')) {
      savePendingExpressInterest(fromPath);
    }
    if (fromPath?.startsWith('/schedule-visit/')) {
      savePendingSiteVisit(fromPath);
    }
    if (isCustomerIntent) {
      setValue('role', 'customer');
    }
  }, [fromPath, isCustomerIntent, setValue]);

  useEffect(() => {
    registrationService.listAgentCategories()
      .then(setAgentCategories)
      .catch(() => setAgentCategories([]));
  }, []);

  useEffect(() => () => {
    if (profilePhoto?.url) URL.revokeObjectURL(profilePhoto.url);
  }, [profilePhoto]);

  function handleProfileUpload(file) {
    setProfilePhoto((prev) => {
      if (prev?.url) URL.revokeObjectURL(prev.url);
      return { file, url: URL.createObjectURL(file), fileName: file.name };
    });
  }

  function handleProfileRemove() {
    setProfilePhoto((prev) => {
      if (prev?.url) URL.revokeObjectURL(prev.url);
      return null;
    });
  }

  function handleDocUpload(setter) {
    return (file) => {
      const result = validateDocumentFile(file);
      if (!result.valid) {
        setFileError(t(result.errorKey, result.errorParams || {}));
        return;
      }
      setFileError('');
      setter({ file, fileName: file.name });
    };
  }

  async function onSubmitForm(data) {
    setFileError('');
    if (!aadhaarProof?.file) {
      setFileError(t('registration.aadhaarProofRequired', { defaultValue: 'Aadhaar proof document is required.' }));
      return;
    }
    if (!panProof?.file) {
      setFileError(t('registration.panProofRequired', { defaultValue: 'PAN proof document is required.' }));
      return;
    }

    setSubmitting(true);
    try {
      const { acceptTerms: _acceptTerms, confirmPassword: _confirmPassword, role, ...rest } = data;
      const registerRole = isCustomerIntent ? 'customer' : role;
      await registrationService.register(registerRole, {
        ...rest,
        aadhaarNumber: String(rest.aadhaarNumber || '').replace(/\D/g, ''),
        panNumber: String(rest.panNumber || '').toUpperCase(),
        occupation: String(rest.occupation || '').trim(),
        agentCategoryId: registerRole === 'agent' ? Number(rest.agentCategoryId) || undefined : undefined,
        profilePhoto: profilePhoto?.file || undefined,
        aadhaarProof: aadhaarProof.file,
        panProof: panProof.file,
      });
      toast.success(t('registration.success'));
      navigate('/application-status', {
        state: {
          mobile: data.mobile,
          intent: isScheduleVisitIntent ? 'schedule-visit' : isExpressInterestIntent ? 'express-interest' : undefined,
          message: isCustomerIntent
            ? 'Your account is pending admin approval.'
            : undefined,
        },
      });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-2xl font-bold text-brand-800">{t('registration.title')}</h1>
      {isCustomerIntent && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Account stays <strong>Pending</strong> until admin approval.
        </div>
      )}
      <form onSubmit={handleSubmit(onSubmitForm)} className="mt-6 space-y-4">
        <div>
          <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-gray-700">
            {selectedRole === 'customer' || isCustomerIntent
              ? 'Buyer / Seller Name'
              : t('registration.fullName')}
          </label>
          <input id="name" {...register('name')} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
          {errors.name && <p className="mt-1 text-xs text-red-600">{t(errors.name.message)}</p>}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="mobile" className="mb-1.5 block text-sm font-medium text-gray-700">{t('registration.mobile')}</label>
            <input id="mobile" inputMode="numeric" {...register('mobile')} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
            {errors.mobile && <p className="mt-1 text-xs text-red-600">{t(errors.mobile.message)}</p>}
          </div>
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700">{t('registration.email')}</label>
            <input id="email" type="email" {...register('email')} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
            {errors.email && <p className="mt-1 text-xs text-red-600">{t(errors.email.message)}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-gray-700">{t('registration.password')}</label>
            <input id="password" type="password" {...register('password')} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
            {errors.password && <p className="mt-1 text-xs text-red-600">{t(errors.password.message)}</p>}
          </div>
          <div>
            <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-gray-700">{t('registration.confirmPassword')}</label>
            <input id="confirmPassword" type="password" {...register('confirmPassword')} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
            {errors.confirmPassword && <p className="mt-1 text-xs text-red-600">{t(errors.confirmPassword.message)}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="district" className="mb-1.5 block text-sm font-medium text-gray-700">{t('registration.district')}</label>
            <input id="district" type="text" {...register('district')} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
            {errors.district && <p className="mt-1 text-xs text-red-600">{t(errors.district.message)}</p>}
          </div>
          <div>
            <label htmlFor="city" className="mb-1.5 block text-sm font-medium text-gray-700">{t('registration.city')}</label>
            <input id="city" type="text" {...register('city')} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
            {errors.city && <p className="mt-1 text-xs text-red-600">{t(errors.city.message)}</p>}
          </div>
        </div>

        <div>
          <label htmlFor="address" className="mb-1.5 block text-sm font-medium text-gray-700">{t('registration.address')}</label>
          <textarea id="address" rows={2} {...register('address')} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
          {errors.address && <p className="mt-1 text-xs text-red-600">{t(errors.address.message)}</p>}
        </div>

        <div>
          <label htmlFor="occupation" className="mb-1.5 block text-sm font-medium text-gray-700">
            {t('registration.occupation', { defaultValue: 'Occupation' })}
            <span className="text-red-500"> *</span>
          </label>
          <input
            id="occupation"
            {...register('occupation')}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
            placeholder={t('registration.occupationPlaceholder', {
              defaultValue: 'e.g. Software Engineer, Business Owner, Teacher',
            })}
          />
          {errors.occupation && <p className="mt-1 text-xs text-red-600">{t(errors.occupation.message)}</p>}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="aadhaarNumber" className="mb-1.5 block text-sm font-medium text-gray-700">
              {t('registration.aadhaarNumber', { defaultValue: 'Aadhaar Card Number' })}
              <span className="text-red-500"> *</span>
            </label>
            <input
              id="aadhaarNumber"
              inputMode="numeric"
              maxLength={12}
              {...register('aadhaarNumber', {
                onChange: (e) => {
                  e.target.value = e.target.value.replace(/\D/g, '').slice(0, 12);
                },
              })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
              placeholder="123456789012"
            />
            {errors.aadhaarNumber && <p className="mt-1 text-xs text-red-600">{t(errors.aadhaarNumber.message)}</p>}
          </div>
          <div>
            <label htmlFor="panNumber" className="mb-1.5 block text-sm font-medium text-gray-700">
              {t('registration.panNumber', { defaultValue: 'PAN Card Number' })}
              <span className="text-red-500"> *</span>
            </label>
            <input
              id="panNumber"
              maxLength={10}
              {...register('panNumber', {
                onChange: (e) => {
                  e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
                },
              })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm uppercase"
              placeholder="ABCDE1234F"
            />
            {errors.panNumber && <p className="mt-1 text-xs text-red-600">{t(errors.panNumber.message)}</p>}
          </div>
        </div>

        <div>
          <label htmlFor="role" className="mb-1.5 block text-sm font-medium text-gray-700">{t('registration.role')}</label>
          {isCustomerIntent ? (
            <>
              <input type="hidden" {...register('role')} />
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-medium text-gray-800">
                Buyer / Seller
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Register as Buyer / Seller (Customer account).
              </p>
            </>
          ) : (
            <select id="role" {...register('role')} className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm font-medium text-gray-800">
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {t(ROLE_LABEL_KEYS[role], {
                    ns: 'common',
                    defaultValue: role === 'sales_member' ? 'Sales Member' : role === 'customer' ? 'Buyer / Seller' : role,
                  })}
                </option>
              ))}
            </select>
          )}
        </div>

        {selectedRole === 'customer' && (
          <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-4">
            <label htmlFor="preferredPropertyType" className="mb-1.5 block text-sm font-semibold text-brand-900">
              {t('registration.preferredPropertyType', { defaultValue: 'Preferred Property Type' })}
            </label>
            <select
              id="preferredPropertyType"
              {...register('preferredPropertyType')}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm"
            >
              <option value="">{t('registration.selectPropertyType', { defaultValue: '-- Select Preferred Property Type --' })}</option>
              <option value="Residential Plot / Open Land">Residential Plot / Open Land</option>
              <option value="Apartment / Flat">Apartment / Flat</option>
              <option value="Villa / Independent House">Villa / Independent House</option>
              <option value="Commercial Property">Commercial Property</option>
              <option value="Agricultural Land">Agricultural Land</option>
              <option value="Industrial Land">Industrial Land</option>
              <option value="Other">Other</option>
            </select>
            {errors.preferredPropertyType && (
              <p className="mt-1 text-xs text-red-600">{t(errors.preferredPropertyType.message)}</p>
            )}
          </div>
        )}

        {selectedRole === 'customer' && (
          <div className="rounded-lg border border-dashed border-gray-300 p-4">
            <label htmlFor="referralAgentCode" className="mb-1.5 block text-sm font-medium text-gray-700">
              Agent Referral Code <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <input
              id="referralAgentCode"
              {...register('referralAgentCode')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
              placeholder="e.g. Venkat26001 or Karthik26001"
            />
            <p className="mt-1 text-xs text-gray-500">
              Enter the agent’s code during registration to assign that agent to your account.
            </p>
          </div>
        )}

        {selectedRole === 'agent' && (
          <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-4">
            <label htmlFor="agentCategoryId" className="mb-1.5 block text-sm font-semibold text-brand-900">
              {t('registration.agentCategory', { defaultValue: 'Agent Category' })}
            </label>
            <select
              id="agentCategoryId"
              {...register('agentCategoryId')}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm"
            >
              <option value="">
                {agentCategories.length
                  ? t('registration.selectAgentCategory', { defaultValue: '-- Select Agent Category (optional) --' })
                  : t('registration.noAgentCategoriesOptional', { defaultValue: 'No categories configured (optional)' })}
              </option>
              {agentCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            {errors.agentCategoryId && (
              <p className="mt-1 text-xs text-red-600">{t(errors.agentCategoryId.message)}</p>
            )}
          </div>
        )}

        <div className="space-y-3 border-t border-gray-100 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">{t('documents.title')}</p>

          <ImageSlotUploader
            label={t('registration.profilePhoto')}
            required={false}
            showCaption={false}
            primaryEligible={false}
            image={profilePhoto}
            onUpload={handleProfileUpload}
            onRemove={handleProfileRemove}
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <DocumentUploader
              label={t('registration.aadhaarProof', { defaultValue: 'Aadhaar Proof (Mandatory)' })}
              required
              accept={DOC_ACCEPT}
              document={aadhaarProof}
              onUpload={handleDocUpload(setAadhaarProof)}
            />
            <DocumentUploader
              label={t('registration.panProof', { defaultValue: 'PAN Proof (Mandatory)' })}
              required
              accept={DOC_ACCEPT}
              document={panProof}
              onUpload={handleDocUpload(setPanProof)}
            />
          </div>
          {fileError && <p className="text-xs text-red-600">{fileError}</p>}
        </div>

        <label className="flex items-start gap-2 text-sm text-gray-700">
          <input type="checkbox" {...register('acceptTerms')} className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-600" />
          {t('registration.termsLabel')}
        </label>
        {errors.acceptTerms && <p className="text-xs text-red-600">{t(errors.acceptTerms.message)}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-warm-white hover:bg-brand-700 disabled:opacity-60"
        >
          {submitting ? t('registration.submitting', { defaultValue: 'Submitting...' }) : t('registration.submit')}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Already have an account?{' '}
        <button
          type="button"
          onClick={() =>
            navigate('/login', {
              state: {
                from: fromPath,
                intent: isCustomerIntent
                  ? (isScheduleVisitIntent ? 'schedule-visit' : 'express-interest')
                  : undefined,
                propertyId: location.state?.propertyId,
              },
            })
          }
          className="font-semibold text-brand-700 hover:underline"
        >
          Login
        </button>
      </p>
    </div>
  );
}
