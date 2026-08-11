import { useTranslation } from 'react-i18next';
import { Search, MessagesSquare, FileCheck2, Handshake } from 'lucide-react';

const STEPS = [
  { icon: Search, titleKey: 'howItWorks.step1Title', descKey: 'howItWorks.step1Desc' },
  { icon: MessagesSquare, titleKey: 'howItWorks.step2Title', descKey: 'howItWorks.step2Desc' },
  { icon: FileCheck2, titleKey: 'howItWorks.step3Title', descKey: 'howItWorks.step3Desc' },
  { icon: Handshake, titleKey: 'howItWorks.step4Title', descKey: 'howItWorks.step4Desc' },
];

export default function HowItWorks() {
  const { t } = useTranslation('common');
  return (
    <section className="bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <h2 className="text-xl font-bold text-brand-800 sm:text-2xl">{t('sections.howItWorks')}</h2>
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ icon: Icon, titleKey, descKey }, i) => (
            <div key={titleKey} className="relative rounded-xl bg-warm-white p-5 shadow-sm">
              <span className="absolute -top-3 -left-3 flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-warm-white">
                {i + 1}
              </span>
              <Icon size={26} className="text-brand-600" />
              <h3 className="mt-3 font-semibold text-gray-800">{t(titleKey)}</h3>
              <p className="mt-1 text-sm text-gray-500">{t(descKey)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
