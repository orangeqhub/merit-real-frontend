import { useEffect, useState } from 'react';
import { Phone, Mail, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { siteSettingsService } from '../../services/settingsService';

const logoImage = '/logo.svg';

function FacebookIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12" />
    </svg>
  );
}

function InstagramIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function TwitterXIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M18.9 2H22l-7.6 8.68L23.3 22H16.6l-5.2-6.8L5.4 22H2.3l8.1-9.26L1.4 2h6.9l4.7 6.22zM17.6 20h1.7L7.1 4H5.3z" />
    </svg>
  );
}

function YoutubeIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M22.5 6.9a2.9 2.9 0 0 0-2.05-2.06C18.7 4.3 12 4.3 12 4.3s-6.7 0-8.45.54A2.9 2.9 0 0 0 1.5 6.9 30 30 0 0 0 1 12a30 30 0 0 0 .5 5.1 2.9 2.9 0 0 0 2.05 2.06C5.3 19.7 12 19.7 12 19.7s6.7 0 8.45-.54A2.9 2.9 0 0 0 22.5 17.1 30 30 0 0 0 23 12a30 30 0 0 0-.5-5.1M9.75 15.4V8.6L15.75 12z" />
    </svg>
  );
}

const SOCIAL_LINKS = [
  { icon: FacebookIcon, label: 'Facebook', href: '#' },
  { icon: InstagramIcon, label: 'Instagram', href: '#' },
  { icon: TwitterXIcon, label: 'Twitter', href: '#' },
  { icon: YoutubeIcon, label: 'YouTube', href: '#' },
];

function telHref(phone) {
  const digits = String(phone || '').replace(/[^\d+]/g, '');
  return digits ? `tel:${digits}` : undefined;
}

export default function Footer() {
  const { t } = useTranslation('common');
  const [contact, setContact] = useState({ address: '', phone: '', email: '' });

  useEffect(() => {
    let active = true;
    siteSettingsService
      .getPublic()
      .then((data) => {
        if (!active || !data) return;
        setContact({
          address: data.address || '',
          phone: data.phone || '',
          email: data.email || '',
        });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  return (
    <footer className="border-t border-gray-100 bg-brand-900 text-brand-50">
      <div className="mx-auto grid max-w-5xl gap-5 px-3 py-6 sm:gap-6 sm:px-4 sm:py-8 md:grid-cols-2 md:px-6 md:py-8 lg:px-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <img src={logoImage} alt={t('brand.logoAlt')} className="h-10 sm:h-12 w-auto max-w-[260px] object-contain rounded-lg" />
          </div>
          <p className="mt-2.5 text-sm text-brand-200">{t('footer.about')}</p>
        </div>

        <div className="min-w-0">
          <h3 className="font-semibold text-warm-white">{t('footer.contact')}</h3>
          <ul className="mt-2.5 space-y-2 text-sm text-brand-200">
            {contact.address ? (
              <li className="flex items-start gap-2">
                <MapPin size={16} className="mt-0.5 shrink-0" />
                <span>{contact.address}</span>
              </li>
            ) : null}
            {contact.phone ? (
              <li className="flex items-center gap-2">
                <Phone size={16} className="shrink-0" />
                <a href={telHref(contact.phone)} className="lang-te block hover:text-warm-white">
                  {contact.phone}
                </a>
              </li>
            ) : null}
            {contact.email ? (
              <li className="flex items-center gap-2">
                <Mail size={16} className="shrink-0" />
                <a href={`mailto:${contact.email}`} className="lang-te block hover:text-warm-white">
                  {contact.email}
                </a>
              </li>
            ) : null}
            {!contact.address && !contact.phone && !contact.email ? (
              <li className="text-brand-300">—</li>
            ) : null}
          </ul>
        </div>
      </div>

      <div className="border-t border-brand-800 px-4 py-3">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-center text-xs text-brand-300 sm:text-left">
            &copy; {new Date().getFullYear()} {t('brand.name')}. {t('footer.rights')}
          </p>
          <div className="flex items-center gap-2">
            {SOCIAL_LINKS.map(({ icon: Icon, label, href }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-800 text-brand-200 transition-colors hover:bg-brand-700 hover:text-warm-white"
              >
                <Icon width={15} height={15} />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
