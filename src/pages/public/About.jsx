import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import * as Icons from 'lucide-react';
import {
  ChevronRight,
  ShieldCheck,
  Handshake,
  Users,
  MapPin,
  Phone,
  UserPlus,
  BadgeCheck,
  Search,
  MessageSquare,
  MessageCircle,
  Mail,
  Clock,
  Navigation,
  CalendarClock,
  Sparkles,
  Scale,
  Heart,
  Compass,
  LifeBuoy,
} from 'lucide-react';
import { cmsService, contactEnquiryService } from '../../services/cmsService';
import { useLanguageStore } from '../../store/languageStore';
import { getLocalizedField } from '../../utils/localize';
import { toast } from '../../store/toastStore';
import { CITIES } from '../../data/locations';
import { CATEGORIES } from '../../config/categories';
import { ABOUT_SERVICES } from '../../config/aboutServices';
import { POPULAR_LOCATIONS } from '../../data/locations';

const WHY_ITEMS = [
  { icon: BadgeCheck, titleKey: 'aboutPage.why.verifiedTitle', descKey: 'aboutPage.why.verifiedDesc' },
  { icon: ShieldCheck, titleKey: 'aboutPage.why.safeTitle', descKey: 'aboutPage.why.safeDesc' },
  { icon: Handshake, titleKey: 'aboutPage.why.supportTitle', descKey: 'aboutPage.why.supportDesc' },
  { icon: MapPin, titleKey: 'aboutPage.why.localTitle', descKey: 'aboutPage.why.localDesc' },
  { icon: CalendarClock, titleKey: 'aboutPage.why.visitTitle', descKey: 'aboutPage.why.visitDesc' },
  { icon: Scale, titleKey: 'aboutPage.why.legalTitle', descKey: 'aboutPage.why.legalDesc' },
  { icon: Phone, titleKey: 'aboutPage.why.quickTitle', descKey: 'aboutPage.why.quickDesc' },
  { icon: MessageSquare, titleKey: 'aboutPage.why.bilingualTitle', descKey: 'aboutPage.why.bilingualDesc' },
];

const HOW_STEPS = [
  { icon: UserPlus, titleKey: 'aboutPage.how.step1Title', descKey: 'aboutPage.how.step1Desc' },
  { icon: BadgeCheck, titleKey: 'aboutPage.how.step2Title', descKey: 'aboutPage.how.step2Desc' },
  { icon: Search, titleKey: 'aboutPage.how.step3Title', descKey: 'aboutPage.how.step3Desc' },
  { icon: Phone, titleKey: 'aboutPage.how.step4Title', descKey: 'aboutPage.how.step4Desc' },
  { icon: CalendarClock, titleKey: 'aboutPage.how.step5Title', descKey: 'aboutPage.how.step5Desc' },
];

const VALUES = [
  { icon: ShieldCheck, titleKey: 'aboutPage.values.trustTitle', descKey: 'aboutPage.values.trustDesc' },
  { icon: Sparkles, titleKey: 'aboutPage.values.transparencyTitle', descKey: 'aboutPage.values.transparencyDesc' },
  { icon: Heart, titleKey: 'aboutPage.values.customerTitle', descKey: 'aboutPage.values.customerDesc' },
  { icon: Compass, titleKey: 'aboutPage.values.localTitle', descKey: 'aboutPage.values.localDesc' },
  { icon: Users, titleKey: 'aboutPage.values.responsibilityTitle', descKey: 'aboutPage.values.responsibilityDesc' },
  { icon: LifeBuoy, titleKey: 'aboutPage.values.supportTitle', descKey: 'aboutPage.values.supportDesc' },
];

const ENQUIRY_TYPES = ['buy', 'sell', 'post', 'siteVisit', 'info', 'mediator', 'general'];
const BUDGET_RANGES = ['under10L', '10to25L', '25to50L', '50Lto1Cr', 'above1Cr'];
const FAQ_KEYS = ['contactSeller', 'postProperty', 'registration', 'adminApproval', 'scheduleVisit', 'teluguSupport', 'whatsappContact'];

const contactSchema = z.object({
  fullName: z.string().min(1, 'validation.required'),
  mobile: z.string().regex(/^\d{10}$/, 'validation.invalidMobile'),
  email: z.string().email('validation.invalidEmail').optional().or(z.literal('')),
  enquiryType: z.string().min(1, 'validation.required'),
  preferredLocation: z.string().optional().or(z.literal('')),
  propertyCategory: z.string().optional().or(z.literal('')),
  budgetRange: z.string().optional().or(z.literal('')),
  message: z.string().min(1, 'validation.required'),
  contactMethod: z.enum(['call', 'whatsapp', 'email']),
  consent: z.literal(true, { errorMap: () => ({ message: 'validation.consentRequired' }) }),
});

export default function About() {
  const { t } = useTranslation(['common', 'forms']);
  const language = useLanguageStore((s) => s.language);
  const [cms, setCms] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(contactSchema),
    defaultValues: { contactMethod: 'call' },
  });

  useEffect(() => {
    cmsService.getCms().then(setCms);
  }, []);

  async function onSubmitContact(data) {
    if (submitted) return;
    setSubmitted(true);
    try {
      await contactEnquiryService.submit({
        source: 'about',
        fullName: data.fullName,
        mobile: data.mobile,
        email: data.email || null,
        enquiryType: data.enquiryType,
        preferredLocation: data.preferredLocation || null,
        propertyCategory: data.propertyCategory || null,
        budgetRange: data.budgetRange || null,
        message: data.message,
        contactMethod: data.contactMethod,
      });
      toast.success(t('contactPage.successMessage'));
      reset();
    } catch {
      toast.error(t('error.generic'));
    } finally {
      setSubmitted(false);
    }
  }

  const whatsappDigits = (cms?.contactWhatsapp || '').replace(/\D/g, '');
  const whatsappMessage = encodeURIComponent(t('contactPage.whatsappDefaultMessage'));
  const mapUrl = cms?.contactMapUrl;

  return (
    <div>
      {/* 1. About Hero */}
      <section className="bg-gradient-to-b from-brand-50 to-warm-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1.5 text-sm text-gray-500">
            <Link to="/" className="hover:underline">{t('nav.home')}</Link>
            <ChevronRight size={14} />
            <span className="font-medium text-brand-800">{t('nav.about')}</span>
          </nav>

          <div className="grid gap-8 md:grid-cols-2 md:items-center">
            <div>
              <h1 className="text-3xl font-bold text-brand-800 sm:text-4xl">{t('aboutPage.hero.heading')}</h1>
              <p className="lang-te mt-3 text-lg font-medium text-brand-700">{t('aboutPage.hero.headingTe')}</p>
              <p className="mt-4 max-w-xl text-gray-600">{t('aboutPage.hero.description')}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/properties" className="rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-warm-white hover:bg-brand-700">
                  {t('buttons.browseProperties')}
                </Link>
                <a href="#contact" className="rounded-full border border-brand-500 px-5 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-50">
                  {t('nav.contact')}
                </a>
              </div>
            </div>
            <img
              src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=900&q=70"
              alt=""
              loading="eager"
              className="h-64 w-full rounded-2xl object-cover shadow-md sm:h-80"
            />
          </div>
        </div>
      </section>

      {/* 2. Company Story */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 md:grid-cols-2 md:items-center">
          <img
            src="https://images.unsplash.com/photo-1449844908441-8829872d2607?auto=format&fit=crop&w=900&q=70"
            alt=""
            loading="lazy"
            className="h-72 w-full rounded-2xl object-cover shadow-md md:order-2"
          />
          <div>
            <h2 className="text-xl font-bold text-brand-800 sm:text-2xl">{t('aboutPage.story.title')}</h2>
            <p className="lang-te mt-3 text-gray-700">{t('aboutPage.story.body')}</p>
          </div>
        </div>
      </section>

      {/* 3. Mission and Vision */}
      <section className="bg-brand-50">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-2xl bg-warm-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-brand-800">{t('aboutPage.mission.title')}</h3>
              <p className="lang-te mt-2 text-gray-700">{t('aboutPage.mission.body')}</p>
            </div>
            <div className="rounded-2xl bg-warm-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-brand-800">{t('aboutPage.vision.title')}</h3>
              <p className="lang-te mt-2 text-gray-700">{t('aboutPage.vision.body')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Why Choose Us */}
      <section>
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <div className="grid gap-8 md:grid-cols-2 md:items-center">
            <div>
              <h2 className="text-xl font-bold text-brand-800 sm:text-2xl">{t('aboutPage.whyTitle')}</h2>
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {WHY_ITEMS.map((item) => (
                  <div key={item.titleKey} className="flex items-start gap-3">
                    <item.icon size={20} className="mt-0.5 shrink-0 text-brand-600" aria-hidden="true" />
                    <div>
                      <p className="font-semibold text-gray-800">{t(item.titleKey)}</p>
                      <p className="lang-te text-sm text-gray-500">{t(item.descKey)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <img
              src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=70"
              alt=""
              loading="lazy"
              className="h-72 w-full rounded-2xl object-cover shadow-md"
            />
          </div>
        </div>
      </section>

      {/* 5. Our Services */}
      <section className="bg-brand-50">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <h2 className="text-xl font-bold text-brand-800 sm:text-2xl">{t('aboutPage.servicesTitle')}</h2>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {ABOUT_SERVICES.map((service) => {
              const Icon = Icons[service.icon] || Icons.Home;
              return (
                <Link
                  key={service.key}
                  to={service.to}
                  className="rounded-xl border border-gray-200 bg-warm-white p-4 transition-shadow hover:shadow-md"
                >
                  <Icon size={22} className="text-brand-600" aria-hidden="true" />
                  <p className="mt-2 font-semibold text-gray-800">{service.nameEn}</p>
                  <p className="lang-te text-sm font-medium text-brand-700">{service.nameTe}</p>
                  <p className="lang-te mt-1 text-sm text-gray-500">
                    {language === 'te' ? service.descriptionTe : service.descriptionEn}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* 6. How We Work */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <h2 className="text-xl font-bold text-brand-800 sm:text-2xl">{t('aboutPage.howTitle')}</h2>
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {HOW_STEPS.map((step, i) => (
            <div key={step.titleKey} className="rounded-xl border border-gray-200 p-4 text-center">
              <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-warm-white">
                {i + 1}
              </span>
              <step.icon size={22} className="mx-auto mt-3 text-brand-600" aria-hidden="true" />
              <p className="mt-2 font-semibold text-gray-800">{t(step.titleKey)}</p>
              <p className="lang-te mt-1 text-sm text-gray-500">{t(step.descKey)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 7. Our Values */}
      <section className="bg-brand-50">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <h2 className="text-xl font-bold text-brand-800 sm:text-2xl">{t('aboutPage.valuesTitle')}</h2>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {VALUES.map((value) => (
              <div key={value.titleKey} className="rounded-xl bg-warm-white p-5 shadow-sm">
                <value.icon size={22} className="text-brand-600" aria-hidden="true" />
                <p className="mt-2 font-semibold text-gray-800">{t(value.titleKey)}</p>
                <p className="lang-te mt-1 text-sm text-gray-500">{t(value.descKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. Service Locations */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <h2 className="text-xl font-bold text-brand-800 sm:text-2xl">{t('aboutPage.locationsTitle')}</h2>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {POPULAR_LOCATIONS.map((loc) => (
            <Link key={loc.city} to={`/properties?city=${encodeURIComponent(loc.city)}`} className="group text-center">
              <img src={loc.image} alt="" loading="lazy" className="h-20 w-full rounded-xl object-cover shadow-sm transition-transform group-hover:scale-105" />
              <p className="mt-2 text-sm font-semibold text-gray-800">{loc.city}</p>
            </Link>
          ))}
        </div>
        <div className="mt-6 text-center">
          <Link to="/properties" className="rounded-full border border-brand-500 px-5 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-50">
            {t('aboutPage.locationsButton')}
          </Link>
        </div>
      </section>

      {/* 9. Trust and Support */}
      <section className="bg-brand-900 text-brand-50">
        <div className="mx-auto max-w-7xl px-4 py-12 text-center sm:px-6">
          <ShieldCheck size={32} className="mx-auto text-brand-200" aria-hidden="true" />
          <h2 className="mt-3 text-xl font-bold text-warm-white sm:text-2xl">{t('aboutPage.trustTitle')}</h2>
          <p className="lang-te mx-auto mt-2 max-w-2xl text-brand-200">{t('aboutPage.trustBody')}</p>
        </div>
      </section>

      {/* 10. FAQ (merged from Contact) */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <h2 className="text-xl font-bold text-brand-800 sm:text-2xl">{t('contactPage.faqTitle')}</h2>
        <div className="mt-5 divide-y divide-gray-100 rounded-xl border border-gray-200">
          {FAQ_KEYS.map((key) => (
            <details key={key} className="group p-4">
              <summary className="cursor-pointer list-none font-medium text-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500">
                {t(`contactPage.faq.${key}Q`)}
              </summary>
              <p className="lang-te mt-2 text-sm text-gray-600">{t(`contactPage.faq.${key}A`)}</p>
            </details>
          ))}
        </div>
      </section>

      {/* 11. Contact section (merged from the removed /contact page) */}
      <section id="contact" className="scroll-mt-20 bg-brand-50">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <h2 className="text-2xl font-bold text-brand-800 sm:text-3xl">{t('contactPage.hero.heading')}</h2>
          <p className="lang-te mt-2 max-w-2xl text-gray-600">{t('contactPage.hero.description')}</p>

          {/* Contact Information Cards */}
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-gray-200 bg-warm-white p-5">
              <Phone size={20} className="text-brand-600" aria-hidden="true" />
              <p className="mt-2 text-sm font-semibold text-gray-800">{t('contact.phoneLabel')}</p>
              <a href={`tel:${cms?.contactPhone}`} className="text-sm text-gray-600 hover:underline">{cms?.contactPhone}</a>
            </div>
            <div className="rounded-xl border border-gray-200 bg-warm-white p-5">
              <MessageCircle size={20} className="text-brand-600" aria-hidden="true" />
              <p className="mt-2 text-sm font-semibold text-gray-800">{t('buttons.whatsapp')}</p>
              <a
                href={`https://wa.me/${whatsappDigits}?text=${whatsappMessage}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-600 hover:underline"
              >
                {cms?.contactWhatsapp}
              </a>
            </div>
            <div className="rounded-xl border border-gray-200 bg-warm-white p-5">
              <Mail size={20} className="text-brand-600" aria-hidden="true" />
              <p className="mt-2 text-sm font-semibold text-gray-800">{t('contact.emailLabel')}</p>
              <a href={`mailto:${cms?.contactEmail}`} className="break-all text-sm text-gray-600 hover:underline">{cms?.contactEmail}</a>
            </div>
            <div className="rounded-xl border border-gray-200 bg-warm-white p-5">
              <MapPin size={20} className="text-brand-600" aria-hidden="true" />
              <p className="mt-2 text-sm font-semibold text-gray-800">{t('contact.addressLabel')}</p>
              <p className="lang-te text-sm text-gray-600">{cms ? getLocalizedField(cms, 'contactAddress', language) : ''}</p>
            </div>
          </div>

          {/* Enquiry Form + Office/Hours */}
          <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <form onSubmit={handleSubmit(onSubmitContact)} className="space-y-4 rounded-xl border border-gray-200 bg-warm-white p-5 shadow-sm">
              <h3 className="text-lg font-bold text-brand-800">{t('contactPage.formTitle')}</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="cf-name" className="mb-1 block text-sm font-medium text-gray-700">
                    {t('contactPage.form.fullName')} <span className="text-red-600">*</span>
                  </label>
                  <input id="cf-name" {...register('fullName')} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                  {errors.fullName && <p className="mt-1 text-xs text-red-600">{t(errors.fullName.message, { ns: 'forms' })}</p>}
                </div>
                <div>
                  <label htmlFor="cf-mobile" className="mb-1 block text-sm font-medium text-gray-700">
                    {t('contactPage.form.mobile')} <span className="text-red-600">*</span>
                  </label>
                  <input id="cf-mobile" type="tel" {...register('mobile')} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                  {errors.mobile && <p className="mt-1 text-xs text-red-600">{t(errors.mobile.message, { ns: 'forms' })}</p>}
                </div>
              </div>

              <div>
                <label htmlFor="cf-email" className="mb-1 block text-sm font-medium text-gray-700">{t('contactPage.form.email')}</label>
                <input id="cf-email" type="email" {...register('email')} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                {errors.email && <p className="mt-1 text-xs text-red-600">{t(errors.email.message, { ns: 'forms' })}</p>}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="cf-enquiry-type" className="mb-1 block text-sm font-medium text-gray-700">
                    {t('contactPage.form.enquiryType')} <span className="text-red-600">*</span>
                  </label>
                  <select id="cf-enquiry-type" {...register('enquiryType')} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                    <option value="">{t('filters.all', { ns: 'dashboard' })}</option>
                    {ENQUIRY_TYPES.map((key) => (
                      <option key={key} value={key}>{t(`contactPage.form.enquiryTypes.${key}`)}</option>
                    ))}
                  </select>
                  {errors.enquiryType && <p className="mt-1 text-xs text-red-600">{t(errors.enquiryType.message, { ns: 'forms' })}</p>}
                </div>
                <div>
                  <label htmlFor="cf-location" className="mb-1 block text-sm font-medium text-gray-700">{t('contactPage.form.preferredLocation')}</label>
                  <select id="cf-location" {...register('preferredLocation')} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                    <option value="">-</option>
                    {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="cf-category" className="mb-1 block text-sm font-medium text-gray-700">{t('contactPage.form.propertyCategory')}</label>
                  <select id="cf-category" {...register('propertyCategory')} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                    <option value="">-</option>
                    {CATEGORIES.map((c) => (
                      <option key={c.slug} value={c.slug}>{language === 'te' ? c.nameTe : c.nameEn}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="cf-budget" className="mb-1 block text-sm font-medium text-gray-700">{t('contactPage.form.budgetRange')}</label>
                  <select id="cf-budget" {...register('budgetRange')} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                    <option value="">-</option>
                    {BUDGET_RANGES.map((key) => (
                      <option key={key} value={key}>{t(`contactPage.form.budgetRanges.${key}`)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="cf-message" className="mb-1 block text-sm font-medium text-gray-700">
                  {t('contactPage.form.message')} <span className="text-red-600">*</span>
                </label>
                <textarea id="cf-message" rows={4} {...register('message')} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                {errors.message && <p className="mt-1 text-xs text-red-600">{t(errors.message.message, { ns: 'forms' })}</p>}
              </div>

              <fieldset>
                <legend className="mb-1.5 text-sm font-medium text-gray-700">{t('contactPage.form.preferredContactMethod')}</legend>
                <Controller
                  control={control}
                  name="contactMethod"
                  render={({ field }) => (
                    <div className="flex flex-wrap gap-4">
                      {['call', 'whatsapp', 'email'].map((method) => (
                        <label key={method} className="flex items-center gap-1.5 text-sm text-gray-700">
                          <input
                            type="radio"
                            value={method}
                            checked={field.value === method}
                            onChange={() => field.onChange(method)}
                          />
                          {t(`contactPage.form.method${method[0].toUpperCase()}${method.slice(1)}`)}
                        </label>
                      ))}
                    </div>
                  )}
                />
              </fieldset>

              <div>
                <label className="flex items-start gap-2 text-sm text-gray-700">
                  <input type="checkbox" className="mt-0.5" {...register('consent')} />
                  {t('contactPage.form.consent')}
                </label>
                {errors.consent && <p className="mt-1 text-xs text-red-600">{t(errors.consent.message, { ns: 'forms' })}</p>}
              </div>

              <button
                type="submit"
                disabled={isSubmitting || submitted}
                className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-warm-white hover:bg-brand-700 disabled:opacity-60"
              >
                {isSubmitting || submitted ? t('contactPage.form.submitting') : t('contactPage.form.submit')}
              </button>
            </form>

            <div className="space-y-6">
              <div className="rounded-xl border border-gray-200 bg-warm-white p-5">
                <h3 className="text-lg font-bold text-brand-800">{t('contactPage.officeTitle')}</h3>
                <p className="lang-te mt-2 text-gray-700">{cms ? getLocalizedField(cms, 'contactAddress', language) : ''}</p>
                <p className="lang-te mt-1 text-sm text-gray-500">{cms ? getLocalizedField(cms, 'contactLandmark', language) : ''}</p>
                {mapUrl && (
                  <a
                    href={mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-brand-500 px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50"
                  >
                    <Navigation size={15} /> {t('contactPage.getDirections')}
                  </a>
                )}
                <div className="mt-4 flex h-32 items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 text-xs text-gray-400">
                  {t('contactPage.mapPlaceholder')}
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-warm-white p-5">
                <h3 className="flex items-center gap-2 text-lg font-bold text-brand-800">
                  <Clock size={18} /> {t('contactPage.hoursTitle')}
                </h3>
                <p className="lang-te mt-2 text-gray-700">{cms ? getLocalizedField(cms, 'businessHoursWeekday', language) : ''}</p>
                <p className="lang-te text-gray-700">{cms ? getLocalizedField(cms, 'businessHoursSunday', language) : ''}</p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <a href={`tel:${cms?.contactPhone}`} className="flex flex-col items-center gap-1.5 rounded-xl border border-gray-200 bg-warm-white p-3 text-center hover:bg-gray-50">
                  <Phone size={18} className="text-brand-600" aria-hidden="true" />
                  <span className="text-xs font-semibold text-gray-800">{t('contactPage.callNow')}</span>
                </a>
                <a
                  href={`https://wa.me/${whatsappDigits}?text=${whatsappMessage}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-gray-200 bg-warm-white p-3 text-center hover:bg-gray-50"
                >
                  <MessageCircle size={18} className="text-brand-600" aria-hidden="true" />
                  <span className="text-xs font-semibold text-gray-800">{t('buttons.whatsapp')}</span>
                </a>
                <a href={`mailto:${cms?.contactEmail}`} className="flex flex-col items-center gap-1.5 rounded-xl border border-gray-200 bg-warm-white p-3 text-center hover:bg-gray-50">
                  <Mail size={18} className="text-brand-600" aria-hidden="true" />
                  <span className="text-xs font-semibold text-gray-800">{t('contactPage.emailUs')}</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 12. Final CTA */}
      <section className="mx-auto max-w-7xl px-4 py-14 text-center sm:px-6">
        <h2 className="text-2xl font-bold text-brand-800 sm:text-3xl">{t('aboutPage.ctaTitle')}</h2>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link to="/properties" className="rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-warm-white hover:bg-brand-700">
            {t('buttons.browseProperties')}
          </Link>
          <Link to="/register/seller" className="rounded-full border border-brand-500 px-5 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-50">
            {t('buttons.postYourProperty')}
          </Link>
          <a href="#contact" className="rounded-full border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">
            {t('aboutPage.ctaContact')}
          </a>
        </div>
      </section>

      {/* 13. Footer is rendered globally by PublicLayout */}
    </div>
  );
}
