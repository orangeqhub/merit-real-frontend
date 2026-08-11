import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import LanguageToggle from '../common/LanguageToggle';
const logoImage = '/logo-vertical.svg';

/**
 * Shared presentational shell for the Admin and Employee portal login
 * pages — identical layout/behaviour (logo, heading, ID field, password
 * field with show/hide, remember me, submit, secure-access message, back to
 * website), parameterised so the two portals never drift out of sync.
 * Enter-key submit works for free since this renders a real <form>.
 */
export default function PortalLoginCard({
  heading,
  secureMessage,
  idLabel,
  idValue,
  onIdChange,
  onSubmit,
  submitting,
  error,
  rememberMe,
  onRememberChange,
}) {
  const { t } = useTranslation('auth');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const idFieldId = useId();
  const passwordFieldId = useId();

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({ id: idValue, password });
  }

  return (
    <div className="relative flex min-h-[calc(100vh-1px)] items-center justify-center bg-brand-50 px-4 py-10">
      <div className="absolute right-4 top-4">
        <LanguageToggle />
      </div>
      <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-warm-white p-6 shadow-lg sm:p-8">
        <div className="flex flex-col items-center text-center">
          <img src={logoImage} alt={t('brand.logoAlt', { ns: 'common' })} className="h-24 sm:h-28 w-auto max-w-[260px] object-contain rounded-xl shadow-xs" />
          <h1 className="mt-3 text-xl font-bold text-brand-900 sm:text-2xl">{heading}</h1>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor={idFieldId} className="mb-1.5 block text-sm font-medium text-gray-700">
              {idLabel}
            </label>
            <input
              id={idFieldId}
              type="text"
              autoComplete="username"
              required
              value={idValue}
              onChange={(e) => onIdChange(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
          </div>

          <div>
            <label htmlFor={passwordFieldId} className="mb-1.5 block text-sm font-medium text-gray-700">
              {t('portal.password')}
            </label>
            <div className="relative">
              <input
                id={passwordFieldId}
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 pr-10 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? t('portal.hidePassword') : t('portal.showPassword')}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-500 hover:text-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => onRememberChange(e.target.checked)}
              className="rounded border-gray-300"
            />
            {t('portal.rememberMe')}
          </label>

          {error && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-warm-white hover:bg-brand-700 disabled:opacity-60"
          >
            {submitting ? t('portal.loggingIn') : t('portal.login')}
          </button>
        </form>

        <p className="mt-5 flex items-center justify-center gap-1.5 text-xs text-gray-500">
          <ShieldCheck size={14} className="text-brand-600" aria-hidden="true" />
          {secureMessage}
        </p>

        <Link to="/" className="mt-4 block text-center text-sm font-medium text-brand-700 hover:underline">
          {t('portal.backToWebsite')}
        </Link>
      </div>
    </div>
  );
}
