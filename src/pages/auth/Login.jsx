import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { authService } from '../../services/authService';
import { useAuthStore } from '../../store/authStore';
import { ROLE_HOME } from '../../config/navigation';
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
    peekPendingExpressInterest();
  const isExpressInterestIntent = intent === 'express-interest' || String(fromPath || '').startsWith('/express-interest/');
  const isScheduleVisitIntent = intent === 'schedule-visit' || String(fromPath || '').startsWith('/schedule-visit/');
  const isPropertyIntent = isExpressInterestIntent || isScheduleVisitIntent;

  useEffect(() => {
    if (fromPath?.startsWith('/express-interest/')) {
      savePendingExpressInterest(fromPath);
    }
    if (fromPath?.startsWith('/schedule-visit/')) {
      savePendingSiteVisit(fromPath);
    }
  }, [fromPath]);

  // Already signed-in users land on their home (customers → dashboard, employees → public home).
  useEffect(() => {
    if (!user || user.status !== 'approved') return;
    if (user.role === 'customer' || user.role === 'buyer') {
      const pending = peekPendingSiteVisit() || peekPendingExpressInterest();
      navigate(pending || location.state?.from || ROLE_HOME[user.role] || '/buyer/dashboard', { replace: true });
      return;
    }
    if (user.role === 'employee') {
      navigate(location.state?.from || ROLE_HOME.employee || '/', { replace: true });
    }
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
        const pending = consumePendingSiteVisit() || consumePendingExpressInterest();
        const destination = pending || location.state?.from || ROLE_HOME[user.role] || '/';
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
            intent: isScheduleVisitIntent ? 'schedule-visit' : isExpressInterestIntent ? 'express-interest' : undefined,
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
            intent: isScheduleVisitIntent ? 'schedule-visit' : isExpressInterestIntent ? 'express-interest' : undefined,
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
    intent: isScheduleVisitIntent ? 'schedule-visit' : isExpressInterestIntent ? 'express-interest' : undefined,
    propertyId: location.state?.propertyId,
  };

  const intentMessage = isScheduleVisitIntent
    ? 'Login to schedule your site visit.'
    : isExpressInterestIntent
      ? 'Login to continue Express Interest.'
      : 'Sign in to continue.';

  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:py-16">
      <div className="rounded-2xl border border-gray-100 bg-white p-6 sm:p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-brand-900 text-center">{t('login.title')}</h1>
        <p className="mt-1 text-center text-sm text-gray-500">{intentMessage}</p>

        {isPropertyIntent && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Approved customers only. New users must register first.
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-xs text-red-700 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handlePasswordLogin} className="mt-6 space-y-4">
          <div>
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
                className="w-full rounded-lg border border-gray-300 pl-10 pr-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-gray-700">
              {t('login.password', { defaultValue: 'Password' })}
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-gray-300 pl-10 pr-10 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-warm-white hover:bg-brand-700 disabled:opacity-60 transition-colors"
          >
            {submitting ? t('login.loggingIn', { defaultValue: 'Logging in...' }) : t('login.login', { defaultValue: 'Login' })}
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
            className="mt-2.5 inline-block w-full rounded-lg border border-brand-300 bg-brand-50/50 px-4 py-2.5 text-sm font-semibold text-brand-800 hover:bg-brand-100 transition-colors"
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
  );
}
