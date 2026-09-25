import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { registrationService } from '../../services/registrationService';
import { registrationSchema } from '../../utils/validationSchemas';
import { toast } from '../../store/toastStore';
import ProfilePhotoUploader from '../../components/forms/ProfilePhotoUploader';
import DocumentUploader from '../../components/forms/DocumentUploader';
import { validateDocumentFile } from '../../utils/documentValidation';
import { savePendingExpressInterest, peekPendingExpressInterest } from '../../utils/pendingExpressInterest';
import { savePendingSiteVisit, peekPendingSiteVisit } from '../../utils/pendingSiteVisit';
import { savePendingBookPlot, peekPendingBookPlot } from '../../utils/pendingBookPlot';
import AgentReferralSearch from '../../components/forms/AgentReferralSearch';
import RegistrationProgress from '../../components/auth/RegistrationProgress';
import RegistrationReview from '../../components/auth/RegistrationReview';

const ROLES = ['customer', 'agent', 'sales_member'];
const DOC_ACCEPT = 'application/pdf,image/jpeg,image/jpg,image/png,.pdf,.jpg,.jpeg,.png';

const ROLE_LABEL_KEYS = {
  customer: 'nav.registerAsCustomer',
  agent: 'nav.registerAsAgent',
  sales_member: 'nav.registerAsSalesMember',
};

const STEPS = [
  { key: 'basic', title: 'Basic Information', description: "Let's start with who you are." },
  { key: 'personal', title: 'Personal Details', description: 'Where can we reach and find you.' },
  { key: 'security', title: 'Account & Security', description: 'Secure your account with a password.' },
  { key: 'role', title: 'Role & Professional', description: 'Tell us a bit more about your role.' },
  { key: 'profile', title: 'Profile', description: 'Choose a username and add a profile picture.' },
  { key: 'review', title: 'Review & Confirm', description: 'Check everything before you submit.' },
];

// Field names validated (via RHF's trigger) before allowing "Continue" past each step.
const STEP_FIELDS = [
  ['name', 'mobile', 'email'],
  ['city', 'district', 'address', 'occupation', 'aadhaarNumber', 'panNumber'],
  ['password', 'confirmPassword'],
  ['role', 'preferredPropertyType', 'agentCategoryId'],
  ['username'],
  ['acceptTerms'],
];

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
  const [selectedReferralAgent, setSelectedReferralAgent] = useState(null);
  const [step, setStep] = useState(0);

  const intent = location.state?.intent;
  const fromPath =
    location.state?.from ||
    peekPendingSiteVisit() ||
    peekPendingExpressInterest() ||
    peekPendingBookPlot();
  const isExpressInterestIntent = intent === 'express-interest' || String(fromPath || '').startsWith('/express-interest/');
  const isScheduleVisitIntent = intent === 'schedule-visit' || String(fromPath || '').startsWith('/schedule-visit/');
  const isBookPlotIntent = intent === 'book-plot' || String(fromPath || '').startsWith('/book-plot/');
  const isCustomerIntent = isExpressInterestIntent || isScheduleVisitIntent || isBookPlotIntent;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    getValues,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registrationSchema),
    defaultValues: { role: 'customer' },
  });

  const selectedRole = watch('role') || 'customer';
  const formValues = watch();

  useEffect(() => {
    if (fromPath?.startsWith('/express-interest/')) {
      savePendingExpressInterest(fromPath);
    }
    if (fromPath?.startsWith('/schedule-visit/')) {
      savePendingSiteVisit(fromPath);
    }
    if (fromPath?.startsWith('/book-plot/')) {
      savePendingBookPlot(fromPath);
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

  async function goNext() {
    const ok = await trigger(STEP_FIELDS[step]);
    if (!ok) return;

    // The password/confirmPassword match check is a whole-schema zod
    // .refine(), which only runs once every other field (including
    // later-step ones like acceptTerms) already passes -- so mid-wizard,
    // trigger() alone can't see it yet. Enforce it explicitly here.
    if (step === 2) {
      const { password, confirmPassword } = getValues();
      if (password !== confirmPassword) {
        setError('confirmPassword', { type: 'manual', message: 'validation.passwordMismatch' });
        return;
      }
      clearErrors('confirmPassword');
    }

    // Same whole-schema-refine limitation applies to the
    // "customer must pick a preferred property type" rule.
    if (step === 3) {
      const { role, preferredPropertyType } = getValues();
      if ((role || 'customer') === 'customer' && !String(preferredPropertyType || '').trim()) {
        setError('preferredPropertyType', { type: 'manual', message: 'validation.required' });
        return;
      }
      clearErrors('preferredPropertyType');
    }

    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function goBack() {
    setStep((s) => Math.max(0, s - 1));
  }

  function jumpToStep(index) {
    setStep(Math.max(0, Math.min(index, STEPS.length - 1)));
  }

  async function onSubmitForm(data) {
    setFileError('');
    setSubmitting(true);
    try {
      const { acceptTerms: _acceptTerms, confirmPassword: _confirmPassword, role, ...rest } = data;
      const registerRole = isCustomerIntent ? 'customer' : role;
      await registrationService.register(registerRole, {
        ...rest,
        aadhaarNumber: rest.aadhaarNumber ? String(rest.aadhaarNumber).replace(/\D/g, '') : undefined,
        panNumber: rest.panNumber ? String(rest.panNumber).toUpperCase() : undefined,
        occupation: rest.occupation ? String(rest.occupation).trim() : undefined,
        agentCategoryId: registerRole === 'agent' ? Number(rest.agentCategoryId) || undefined : undefined,
        profilePhoto: profilePhoto?.file || undefined,
        aadhaarProof: aadhaarProof?.file || undefined,
        panProof: panProof?.file || undefined,
        referralAgentCode: selectedReferralAgent?.memberId || undefined,
        referralAgentId: selectedReferralAgent?.id || undefined,
      });
      toast.success(t('registration.success'));
      navigate('/application-status', {
        state: {
          mobile: data.mobile,
          intent: isScheduleVisitIntent
            ? 'schedule-visit'
            : isExpressInterestIntent
              ? 'express-interest'
              : isBookPlotIntent
                ? 'book-plot'
                : undefined,
          pendingExpressInterest: peekPendingExpressInterest(),
          pendingSiteVisit: peekPendingSiteVisit(),
          pendingBookPlot: peekPendingBookPlot(),
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

  const agentCategoryName = agentCategories.find(
    (c) => String(c.id) === String(formValues.agentCategoryId)
  )?.name;

  const isLastStep = step === STEPS.length - 1;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:py-14">
      <div className="grid gap-8 lg:grid-cols-[340px_1fr] lg:items-start">
        {/* Branding / welcome panel — hidden on mobile, shown on desktop */}
        <div className="hidden rounded-2xl bg-gradient-to-br from-brand-700 to-brand-900 p-8 text-warm-white lg:block">
          <p className="text-xs font-semibold uppercase tracking-widest text-gold-400">Merit Real Solutions</p>
          <h2 className="mt-3 text-2xl font-bold leading-snug">Create your account</h2>
          <p className="mt-3 text-sm leading-relaxed text-brand-100">
            Join a trusted real-estate marketplace connecting buyers, sellers and mediators with verified
            listings and transparent processes.
          </p>
          <div className="mt-8 space-y-4">
            {STEPS.map((s, i) => (
              <div key={s.key} className="flex items-start gap-3">
                <span
                  className={[
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
                    i <= step ? 'bg-gold-500 text-brand-900' : 'bg-white/10 text-brand-200',
                  ].join(' ')}
                >
                  {i + 1}
                </span>
                <div>
                  <p className={['text-sm font-semibold', i <= step ? 'text-warm-white' : 'text-brand-200'].join(' ')}>
                    {s.title}
                  </p>
                  <p className="text-xs text-brand-200/80">{s.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Wizard card */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-8">
          <div className="lg:hidden">
            <h1 className="text-xl font-bold text-brand-900">{t('registration.title')}</h1>
          </div>

          <div className="mt-2">
            <RegistrationProgress steps={STEPS} currentStep={step} onStepClick={jumpToStep} />
          </div>

          {isCustomerIntent && step === 0 && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Account stays <strong>Pending</strong> until admin approval.
            </div>
          )}

          <div className="mt-6 hidden sm:block">
            <h2 className="text-lg font-bold text-brand-900">{STEPS[step].title}</h2>
            <p className="text-sm text-gray-500">{STEPS[step].description}</p>
          </div>

          <form onSubmit={handleSubmit(onSubmitForm)} className="mt-5 animate-[fadeIn_0.2s_ease-out]" key={step}>
            {step === 0 && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-gray-700">
                    {selectedRole === 'customer' || isCustomerIntent
                      ? 'Buyer / Seller Name'
                      : t('registration.fullName')}
                  </label>
                  <input
                    id="name"
                    autoFocus
                    autoComplete="name"
                    {...register('name')}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm transition-all hover:border-brand-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  />
                  {errors.name && <p className="mt-1 text-xs text-red-600">{t(errors.name.message)}</p>}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="mobile" className="mb-1.5 block text-sm font-medium text-gray-700">{t('registration.mobile')}</label>
                    <input
                      id="mobile"
                      inputMode="numeric"
                      {...register('mobile')}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm transition-all hover:border-brand-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                    />
                    {errors.mobile && <p className="mt-1 text-xs text-red-600">{t(errors.mobile.message)}</p>}
                  </div>
                  <div>
                    <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700">{t('registration.email')}</label>
                    <input
                      id="email"
                      type="email"
                      {...register('email')}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm transition-all hover:border-brand-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                    />
                    {errors.email && <p className="mt-1 text-xs text-red-600">{t(errors.email.message)}</p>}
                  </div>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="city" className="mb-1.5 block text-sm font-medium text-gray-700">{t('registration.city')}</label>
                    <input
                      id="city"
                      type="text"
                      autoFocus
                      {...register('city')}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm transition-all hover:border-brand-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                    />
                    {errors.city && <p className="mt-1 text-xs text-red-600">{t(errors.city.message)}</p>}
                  </div>
                  <div>
                    <label htmlFor="district" className="mb-1.5 block text-sm font-medium text-gray-700">{t('registration.district')}</label>
                    <input
                      id="district"
                      type="text"
                      {...register('district')}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm transition-all hover:border-brand-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                    />
                    {errors.district && <p className="mt-1 text-xs text-red-600">{t(errors.district.message)}</p>}
                  </div>
                </div>

                <div>
                  <label htmlFor="address" className="mb-1.5 block text-sm font-medium text-gray-700">{t('registration.address')}</label>
                  <textarea
                    id="address"
                    rows={2}
                    {...register('address')}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm transition-all hover:border-brand-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  />
                  {errors.address && <p className="mt-1 text-xs text-red-600">{t(errors.address.message)}</p>}
                </div>

                <div>
                  <label htmlFor="occupation" className="mb-1.5 block text-sm font-medium text-gray-700">
                    {t('registration.occupation', { defaultValue: 'Occupation' })}
                  </label>
                  <input
                    id="occupation"
                    {...register('occupation')}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm transition-all hover:border-brand-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                    placeholder={t('registration.occupationPlaceholder', {
                      defaultValue: 'e.g. Software Engineer, Business Owner (Optional)',
                    })}
                  />
                  {errors.occupation && <p className="mt-1 text-xs text-red-600">{t(errors.occupation.message)}</p>}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="aadhaarNumber" className="mb-1.5 block text-sm font-medium text-gray-700">
                      {t('registration.aadhaarNumber', { defaultValue: 'Aadhaar Card Number' })}
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
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm transition-all hover:border-brand-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                      placeholder="123456789012 (Optional)"
                    />
                    {errors.aadhaarNumber && <p className="mt-1 text-xs text-red-600">{t(errors.aadhaarNumber.message)}</p>}
                  </div>
                  <div>
                    <label htmlFor="panNumber" className="mb-1.5 block text-sm font-medium text-gray-700">
                      {t('registration.panNumber', { defaultValue: 'PAN Card Number' })}
                    </label>
                    <input
                      id="panNumber"
                      maxLength={10}
                      {...register('panNumber', {
                        onChange: (e) => {
                          e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
                        },
                      })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm uppercase transition-all hover:border-brand-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                      placeholder="ABCDE1234F (Optional)"
                    />
                    {errors.panNumber && <p className="mt-1 text-xs text-red-600">{t(errors.panNumber.message)}</p>}
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-gray-700">{t('registration.createPassword', { defaultValue: 'Create your new password' })}</label>
                    <input
                      id="password"
                      type="password"
                      autoFocus
                      autoComplete="new-password"
                      {...register('password')}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm transition-all hover:border-brand-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                    />
                    {errors.password && <p className="mt-1 text-xs text-red-600">{t(errors.password.message)}</p>}
                  </div>
                  <div>
                    <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-gray-700">{t('registration.confirmPassword')}</label>
                    <input
                      id="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      {...register('confirmPassword')}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm transition-all hover:border-brand-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                    />
                    {errors.confirmPassword && <p className="mt-1 text-xs text-red-600">{t(errors.confirmPassword.message)}</p>}
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
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
                    <select
                      id="role"
                      {...register('role')}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm font-medium text-gray-800 transition-all hover:border-brand-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                    >
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
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm transition-all hover:border-brand-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
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
                  <AgentReferralSearch
                    value={selectedReferralAgent}
                    onChange={setSelectedReferralAgent}
                    label="Referral Agent"
                  />
                )}

                {selectedRole === 'agent' && (
                  <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-4">
                    <label htmlFor="agentCategoryId" className="mb-1.5 block text-sm font-semibold text-brand-900">
                      {t('registration.agentCategory', { defaultValue: 'Agent Category' })}
                    </label>
                    <select
                      id="agentCategoryId"
                      {...register('agentCategoryId')}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm transition-all hover:border-brand-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
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

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <DocumentUploader
                      label={t('registration.aadhaarProof', { defaultValue: 'Aadhaar Proof (Optional)' })}
                      required={false}
                      accept={DOC_ACCEPT}
                      document={aadhaarProof}
                      onUpload={handleDocUpload(setAadhaarProof)}
                    />
                    <DocumentUploader
                      label={t('registration.panProof', { defaultValue: 'PAN Proof (Optional)' })}
                      required={false}
                      accept={DOC_ACCEPT}
                      document={panProof}
                      onUpload={handleDocUpload(setPanProof)}
                    />
                  </div>
                  {fileError && <p className="text-xs text-red-600">{fileError}</p>}
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-5">
                <ProfilePhotoUploader
                  label={t('registration.profilePhoto')}
                  image={profilePhoto}
                  onUpload={handleProfileUpload}
                  onRemove={handleProfileRemove}
                />

                <div>
                  <label htmlFor="username" className="mb-1.5 block text-sm font-medium text-gray-700">
                    {t('registration.username', { defaultValue: 'Username' })}
                  </label>
                  <input
                    id="username"
                    autoFocus
                    autoComplete="username"
                    maxLength={30}
                    {...register('username')}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm transition-all hover:border-brand-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                    placeholder={t('registration.usernamePlaceholder', { defaultValue: 'e.g. ravi.kumar' })}
                  />
                  {errors.username && <p className="mt-1 text-xs text-red-600">{t(errors.username.message)}</p>}
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-4">
                <RegistrationReview
                  values={formValues}
                  role={selectedRole}
                  uploads={{ profilePhoto, aadhaarProof, panProof }}
                  referralAgent={selectedReferralAgent}
                  agentCategoryName={agentCategoryName}
                  onEdit={jumpToStep}
                />

                <label className="flex items-start gap-2 rounded-lg p-2 text-sm text-gray-700 transition-colors hover:bg-brand-50/60">
                  <input
                    type="checkbox"
                    {...register('acceptTerms')}
                    className="mt-0.5 h-4 w-4 cursor-pointer rounded border-gray-300 text-brand-600 transition-transform hover:scale-110 focus:ring-2 focus:ring-brand-100"
                  />
                  {t('registration.termsLabel')}
                </label>
                {errors.acceptTerms && <p className="text-xs text-red-600">{t(errors.acceptTerms.message)}</p>}
              </div>
            )}

            <div className="mt-7 flex items-center justify-between gap-3 border-t border-gray-100 pt-5">
              <button
                type="button"
                onClick={goBack}
                disabled={step === 0 || submitting}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ArrowLeft size={16} /> Back
              </button>

              {isLastStep ? (
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-warm-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                >
                  {submitting && <Loader2 size={16} className="animate-spin" />}
                  {submitting ? t('registration.submitting', { defaultValue: 'Submitting...' }) : t('registration.submit')}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={goNext}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-warm-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow"
                >
                  Continue <ArrowRight size={16} />
                </button>
              )}
            </div>
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
                      ? (isScheduleVisitIntent
                        ? 'schedule-visit'
                        : isBookPlotIntent
                          ? 'book-plot'
                          : 'express-interest')
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
      </div>
    </div>
  );
}
