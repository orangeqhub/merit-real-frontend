import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Phone, Mail, MapPin } from 'lucide-react';
import { cmsService, contactEnquiryService } from '../../services/cmsService';
import { useLanguageStore } from '../../store/languageStore';
import { getLocalizedField } from '../../utils/localize';
import { toast } from '../../store/toastStore';

const schema = z.object({
  name: z.string().min(1, 'error.requiredField'),
  phone: z.string().regex(/^\d{10}$/, 'error.requiredField'),
  message: z.string().min(1, 'error.requiredField'),
});

export default function ContactSection() {
  const { t } = useTranslation('common');
  const language = useLanguageStore((s) => s.language);
  const [cms, setCms] = useState(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) });

  useEffect(() => {
    cmsService.getCms().then(setCms);
  }, []);

  async function onSubmit(data) {
    try {
      await contactEnquiryService.submit({
        source: 'home',
        fullName: data.name,
        mobile: data.phone,
        message: data.message,
      });
      toast.success(t('contact.sentSuccess'));
      reset();
    } catch (err) {
      toast.error(err.message || t('error.generic'));
    }
  }

  return (
    <section id="contact" className="mx-auto max-w-7xl px-3 py-8 sm:px-4 sm:py-10 md:px-6 md:py-12 lg:px-6 lg:py-12">
      <h2 className="text-xl font-bold text-brand-800 sm:text-2xl">{t('sections.contact')}</h2>
      <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-2">
        <ul className="space-y-4 text-sm text-gray-700">
          <li className="flex items-start gap-2">
            <MapPin size={18} className="mt-0.5 shrink-0 text-brand-600" />
            <span className="lang-te">{cms ? getLocalizedField(cms, 'contactAddress', language) : ''}</span>
          </li>
          <li className="flex items-center gap-2">
            <Phone size={18} className="shrink-0 text-brand-600" />
            <a href={`tel:${cms?.contactPhone}`} className="hover:underline">{cms?.contactPhone}</a>
          </li>
          <li className="flex items-center gap-2">
            <Mail size={18} className="shrink-0 text-brand-600" />
            <a href={`mailto:${cms?.contactEmail}`} className="hover:underline">{cms?.contactEmail}</a>
          </li>
        </ul>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="font-semibold text-gray-800">{t('contact.formTitle')}</h3>
          <div>
            <label htmlFor="contact-name" className="mb-1 block text-sm font-medium text-gray-700">
              {t('contact.nameLabel')}
            </label>
            <input id="contact-name" {...register('name')} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            {errors.name && <p className="mt-1 text-xs text-red-600">{t(errors.name.message)}</p>}
          </div>
          <div>
            <label htmlFor="contact-phone" className="mb-1 block text-sm font-medium text-gray-700">
              {t('contact.phoneFieldLabel')}
            </label>
            <input id="contact-phone" {...register('phone')} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            {errors.phone && <p className="mt-1 text-xs text-red-600">{t(errors.phone.message)}</p>}
          </div>
          <div>
            <label htmlFor="contact-message" className="mb-1 block text-sm font-medium text-gray-700">
              {t('contact.messageLabel')}
            </label>
            <textarea id="contact-message" rows={3} {...register('message')} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            {errors.message && <p className="mt-1 text-xs text-red-600">{t(errors.message.message)}</p>}
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-warm-white hover:bg-brand-700 disabled:opacity-60"
          >
            {t('contact.sendButton')}
          </button>
        </form>
      </div>
    </section>
  );
}
