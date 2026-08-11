import { Languages } from 'lucide-react';
import { useLanguageStore } from '../../store/languageStore';

export default function LanguageToggle({ className = '' }) {
  const language = useLanguageStore((s) => s.language);
  const toggleLanguage = useLanguageStore((s) => s.toggleLanguage);

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      className={`inline-flex items-center gap-1.5 rounded-full border border-brand-300 px-3 py-1.5 text-sm font-medium text-brand-800 hover:bg-brand-50 ${className}`}
      aria-label="Toggle language between English and Telugu"
    >
      <Languages size={16} />
      <span className={language === 'en' ? 'font-semibold' : ''}>EN</span>
      <span aria-hidden="true">/</span>
      <span className={`lang-te ${language === 'te' ? 'font-semibold' : ''}`}>తెలుగు</span>
    </button>
  );
}
