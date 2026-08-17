import { useTranslation } from 'react-i18next';
import { ShieldCheck, Handshake, BadgeIndianRupee, MapPinned } from 'lucide-react';

const ITEMS = [
  { icon: ShieldCheck, titleKey: 'whyChooseUs.verifiedTitle', descKey: 'whyChooseUs.verifiedDesc' },
  { icon: Handshake, titleKey: 'whyChooseUs.supportTitle', descKey: 'whyChooseUs.supportDesc' },
  { icon: BadgeIndianRupee, titleKey: 'whyChooseUs.transparentTitle', descKey: 'whyChooseUs.transparentDesc' },
  { icon: MapPinned, titleKey: 'whyChooseUs.localTitle', descKey: 'whyChooseUs.localDesc' },
];

export default function WhyChooseUs() {
  const { t } = useTranslation('common');
  return (
    <section className="mx-auto max-w-7xl px-3 py-8 sm:px-4 sm:py-10 md:px-6 md:py-12 lg:px-6 lg:py-12">
      <h2 className="text-xl font-bold text-brand-800 sm:text-2xl md:text-2xl">{t('sections.whyChooseUs')}</h2>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:mt-6 sm:grid-cols-2 sm:gap-5 md:gap-6 lg:grid-cols-4">
        {ITEMS.map(({ icon: Icon, titleKey, descKey }) => (
          <div key={titleKey} className="rounded-xl border border-gray-200 p-5 shadow-sm md:p-6">
            <Icon size={28} className="text-brand-600" />
            <h3 className="mt-3 font-semibold text-gray-800">{t(titleKey)}</h3>
            <p className="mt-1 text-sm text-gray-500">{t(descKey)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
