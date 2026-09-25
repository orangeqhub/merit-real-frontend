import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Mail, Lock, LogIn, ShieldCheck, Sparkles } from 'lucide-react';
import { authService } from '../../services/authService';
import { useAuthStore } from '../../store/authStore';
import { getPostLoginDestination } from '../../config/navigation';
import {
  consumePendingExpressInterest,
  peekPendingExpressInterest,
  savePendingExpressInterest,
} from '../../utils/pendingExpressInterest';
import {
  consumePendingSiteVisit,
  peekPendingSiteVisit,
  savePendingSiteVisit,
} from '../../utils/pendingSiteVisit';
import {
  consumePendingBookPlot,
  peekPendingBookPlot,
  savePendingBookPlot,
} from '../../utils/pendingBookPlot';

export default function Login() {
  const { t } = useTranslation('forms');
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [emailOrMobile, setEmailOrMobile] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const intent = location.state?.intent;
  const fromPath =
    location.state?.from ||
    peekPendingSiteVisit() ||
    peekPendingExpressInterest() ||
    peekPendingBookPlot();
  const isExpressInterestIntent = intent === 'express-interest' || String(fromPath || '').startsWith('/express-interest/');
  const isScheduleVisitIntent = intent === 'schedule-visit' || String(fromPath || '').startsWith('/schedule-visit/');
  const isBookPlotIntent = intent === 'book-plot' || String(fromPath || '').startsWith('/book-plot/');
  const isPropertyIntent = isExpressInterestIntent || isScheduleVisitIntent || isBookPlotIntent;

  useEffect(() => {
    if (fromPath?.startsWith('/express-interest/')) {
      savePendingExpressInterest(fromPath);
    }
    if (fromPath?.startsWith('/schedule-visit/')) {
      savePendingSiteVisit(fromPath);
    }
    if (fromPath?.startsWith('/book-plot/')) {
      savePendingBookPlot(fromPath);
    }
  }, [fromPath]);

  // Already signed-in users: resume pending/return URL, otherwise land on public home.
  useEffect(() => {
    if (!user || user.status !== 'approved' || user.role === 'admin') return;
    const pending = peekPendingSiteVisit() || peekPendingExpressInterest() || peekPendingBookPlot();
    navigate(pending || location.state?.from || getPostLoginDestination(user.role), { replace: true });
  }, [user, navigate, location.state?.from]);

  async function handlePasswordLogin(e) {
    e.preventDefault();
    setError('');
    if (!emailOrMobile.trim()) {
      setError(t('validation.required', { defaultValue: 'Email address or mobile is required' }));
      return;
    }
    if (!password) {
      setError(t('validation.required', { defaultValue: 'Password is required' }));
      return;
    }

    setSubmitting(true);
    try {
      const user = await authService.loginPublicWithPassword(emailOrMobile, password);
      if (user.status === 'approved') {
        setUser(user);
        const pending = consumePendingSiteVisit() || consumePendingExpressInterest() || consumePendingBookPlot();
        const destination = pending || location.state?.from || getPostLoginDestination(user.role);
        navigate(destination);
      } else {
        setUser(null);
        const mobile = user.mobile || (/^\d{10}$/.test(emailOrMobile.trim()) ? emailOrMobile.trim() : '');
        navigate('/application-status', {
          state: {
            mobile,
            email: user.email,
            pendingExpressInterest: peekPendingExpressInterest(),
            pendingSiteVisit: peekPendingSiteVisit(),
            pendingBookPlot: peekPendingBookPlot(),
            intent: isScheduleVisitIntent
              ? 'schedule-visit'
              : isExpressInterestIntent
                ? 'express-interest'
                : isBookPlotIntent
                  ? 'book-plot'
                  : undefined,
          },
        });
      }
    } catch (err) {
      const code = err.message;
      if (code === 'ACCOUNT_PENDING' || code === 'Account pending approval.') {
        navigate('/application-status', {
          state: {
            mobile: /^\d{10}$/.test(emailOrMobile.trim()) ? emailOrMobile.trim() : undefined,
            email: emailOrMobile.includes('@') ? emailOrMobile.trim() : undefined,
            pendingExpressInterest: peekPendingExpressInterest(),
            pendingSiteVisit: peekPendingSiteVisit(),
            pendingBookPlot: peekPendingBookPlot(),
            intent: isScheduleVisitIntent
              ? 'schedule-visit'
              : isExpressInterestIntent
                ? 'express-interest'
                : isBookPlotIntent
                  ? 'book-plot'
                  : undefined,
          },
        });
        return;
      }
      if (code === 'ACCOUNT_INACTIVE') {
        setError(t('portal.employeeAccountInactive', { ns: 'auth' }));
        return;
      }
      if (code === 'ACCOUNT_REJECTED') {
        setError(t('portal.employeeAccountRejected', { ns: 'auth' }));
        return;
      }
      if (
        code === 'INVALID_CREDENTIALS' ||
        code === 'auth.error.invalidCredentials' ||
        code === 'error.invalidCredentials'
      ) {
        setError(t('error.invalidCredentials', { ns: 'auth' }));
        return;
      }
      if (code === 'auth.error.employeePasswordNotSet' || code === 'EMPLOYEE_PASSWORD_NOT_SET') {
        setError(t('error.employeePasswordNotSet', { ns: 'auth' }));
        return;
      }
      setError(t(err.message, { ns: 'auth', defaultValue: err.message }));
    } finally {
      setSubmitting(false);
    }
  }

  const registerState = {
    from: fromPath,
    intent: isScheduleVisitIntent
      ? 'schedule-visit'
      : isExpressInterestIntent
        ? 'express-interest'
        : isBookPlotIntent
          ? 'book-plot'
          : undefined,
    propertyId: location.state?.propertyId,
    mapPlotExternalId: location.state?.mapPlotExternalId,
  };

  const intentMessage = isScheduleVisitIntent
    ? 'Login to schedule your site visit.'
    : isExpressInterestIntent
      ? 'Login to continue Express Interest.'
      : isBookPlotIntent
        ? 'Login to continue booking your plot.'
        : 'Sign in to continue.';

  return (
    <div className="bg-gradient-to-br from-brand-50 via-warm-white to-gold-50/60 px-4 py-12 sm:py-16">
      <div className="mx-auto max-w-4xl">
        <div className="grid overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm shadow-brand-900/5 transition-shadow hover:shadow-lg hover:shadow-brand-900/10 lg:grid-cols-[1fr_1.1fr]">
          {/* Branding panel — desktop only */}
          <div className="relative hidden overflow-hidden bg-gradient-to-br from-brand-700 via-brand-800 to-brand-900 p-10 text-warm-white lg:flex lg:flex-col lg:justify-between">
            <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-gold-500/20 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-gold-400/10 blur-3xl" />
            <div className="relative">
              <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-gold-400">
                <Sparkles size={14} /> Merit Real Solutions
              </p>
              <h2 className="mt-4 text-3xl font-bold leading-snug">Welcome back</h2>
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-brand-100">
                Sign in to manage your listings, bookings and commissions on a trusted real-estate
                marketplace.
              </p>
            </div>
            <div className="relative mt-10 space-y-3">
              <div className="flex items-center gap-2 text-sm text-brand-100">
                <ShieldCheck size={16} className="text-gold-400" /> Verified listings & transparent process
              </div>
              <div className="flex items-center gap-2 text-sm text-brand-100">
                <ShieldCheck size={16} className="text-gold-400" /> Secure, role-based access
              </div>
            </div>
          </div>

          {/* Login card */}
          <div className="p-6 sm:p-8 lg:p-10">
            <h1 className="text-2xl font-bold text-brand-900">{t('login.title')}</h1>
            <p className="mt-1 text-sm text-gray-500">{intentMessage}</p>

            {isPropertyIntent && (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                Approved customers only. New users must register first.
              </div>
            )}

            {error && (
              <div className="mt-4 animate-[fadeIn_0.2s_ease-out] rounded-lg border-l-4 border-red-400 bg-red-50 p-3 text-xs font-medium text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handlePasswordLogin} className="mt-6 space-y-4">
              <div className="group">
                <label htmlFor="emailOrMobile" className="mb-1.5 block text-sm font-medium text-gray-700">
                  {t('login.emailOrMobile', { defaultValue: 'Email Address or Mobile Number' })}
                </label>
                <div className="relative">
                  <input
                    id="emailOrMobile"
                    type="text"
                    value={emailOrMobile}
                    onChange={(e) => setEmailOrMobile(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full rounded-lg border border-gray-300 pl-10 pr-3 py-2.5 text-sm transition-all hover:border-brand-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  />
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400 transition-colors group-hover:text-brand-500" />
                </div>
              </div>

              <div className="group">
                <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-gray-700">
                  {t('login.password', { defaultValue: 'Password' })}
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-gray-300 pl-10 pr-10 py-2.5 text-sm transition-all hover:border-brand-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  />
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400 transition-colors group-hover:text-brand-500" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-gray-400 transition-colors hover:text-brand-600"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-brand-600 to-brand-700 py-2.5 text-sm font-semibold text-warm-white shadow-sm transition-all hover:-translate-y-0.5 hover:from-brand-700 hover:to-brand-800 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {submitting ? (
                  t('login.loggingIn', { defaultValue: 'Logging in...' })
                ) : (
                  <>
                    <LogIn size={16} /> {t('login.login', { defaultValue: 'Login' })}
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 border-t border-gray-100 pt-5 text-center">
              <p className="text-sm text-gray-500">
                {isPropertyIntent
                  ? 'New here? Create a customer account to continue.'
                  : t('login.noAccount')}
              </p>
              <Link
                to="/register"
                state={registerState}
                className="mt-2.5 inline-block w-full rounded-lg border border-brand-300 bg-brand-50/50 px-4 py-2.5 text-sm font-semibold text-brand-800 transition-all hover:-translate-y-0.5 hover:border-gold-400 hover:bg-gold-50 hover:text-brand-900 hover:shadow-sm"
              >
                {isPropertyIntent
                  ? 'Customer Registration'
                  : t('nav.register', { ns: 'common', defaultValue: 'Register' })}
              </Link>
              {isPropertyIntent && (
                <p className="mt-2 text-xs text-gray-500">
                  After registration your account stays in <strong>Pending Approval</strong> until an admin approves it.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
