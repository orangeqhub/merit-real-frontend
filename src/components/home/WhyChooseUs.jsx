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
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <h2 className="text-xl font-bold text-brand-800 sm:text-2xl">{t('sections.whyChooseUs')}</h2>
      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {ITEMS.map(({ icon: Icon, titleKey, descKey }) => (
          <div key={titleKey} className="rounded-xl border border-gray-200 p-5 shadow-sm">
            <Icon size={28} className="text-brand-600" />
            <h3 className="mt-3 font-semibold text-gray-800">{t(titleKey)}</h3>
            <p className="mt-1 text-sm text-gray-500">{t(descKey)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
