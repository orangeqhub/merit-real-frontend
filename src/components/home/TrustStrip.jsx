import { useTranslation } from 'react-i18next';
import { ShieldCheck, Handshake, Heart, TrendingUp } from 'lucide-react';

const ITEMS = [
  { icon: ShieldCheck, key: 'trust.trust' },
  { icon: Handshake, key: 'trust.transparency' },
  { icon: Heart, key: 'trust.value' },
  { icon: TrendingUp, key: 'trust.growth' },
];

export default function TrustStrip() {
  const { t } = useTranslation('common');
  return (
    <section className="bg-[#0D2B45] py-5 text-white border-y border-[#183d63]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid grid-cols-2 gap-4 divide-y divide-[#1e4875] sm:grid-cols-4 sm:divide-x sm:divide-y-0 sm:divide-[#1e4875]">
          {ITEMS.map(({ icon: Icon, key }, idx) => (
            <div key={key} className={`flex items-center justify-center gap-3 ${idx !== 0 ? 'pt-3 sm:pt-0' : ''}`}>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#163a5c] text-[#D49B28] ring-1 ring-[#C88E28]/40">
                <Icon size={20} strokeWidth={2.2} />
              </div>
              <span className="text-xs font-bold tracking-wider text-white sm:text-sm uppercase">{t(key)}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

