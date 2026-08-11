import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function SearchBox({ value, onChange, placeholderKey = 'placeholders.search', ns = 'dashboard' }) {
  const { t } = useTranslation(ns);
  return (
    <div className="relative">
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t(placeholderKey)}
        aria-label={t(placeholderKey)}
        className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm"
      />
    </div>
  );
}
