import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ChevronRight,
  Trash2,
  AlertTriangle,
  Info,
  CheckCircle,
  FileText,
  Lock,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { toast } from '../../store/toastStore';

export default function DeleteAccount() {
  const { t } = useTranslation('common');
  const [form, setForm] = useState({
    fullName: '',
    identity: '', // email or mobile
    role: 'buyer',
    reason: '',
    confirm: false,
  });
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ticketId, setTicketId] = useState('');

  const validate = () => {
    const next = {};
    if (!form.fullName.trim()) next.fullName = 'Full Name is required';
    
    const idVal = form.identity.trim();
    if (!idVal) {
      next.identity = 'Email or Mobile Number is required';
    } else {
      // Basic check if it matches either email or standard mobile pattern
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(idVal);
      const isMobile = /^\+?[\d\s-]{10,15}$/.test(idVal);
      if (!isEmail && !isMobile) {
        next.identity = 'Please enter a valid Email Address or Mobile Number';
      }
    }

    if (!form.confirm) next.confirm = 'You must confirm the deletion policy check';

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);

    // Simulate API request submission
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
      const randomTicket = 'DEL-' + Math.floor(100000 + Math.random() * 900000);
      setTicketId(randomTicket);
      toast.success('Your deletion request has been submitted successfully.');
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-warm-white">
      {/* Hero Header */}
      <section className="bg-gradient-to-b from-brand-50 to-warm-white border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-1.5 text-sm text-gray-500">
            <Link to="/" className="hover:underline hover:text-brand-600 transition-colors">
              {t('nav.home') || 'Home'}
            </Link>
            <ChevronRight size={14} className="text-gray-400" />
            <span className="font-medium text-brand-800">Delete Account</span>
          </nav>

          <div className="max-w-3xl">
            <h1 className="text-3xl font-extrabold tracking-tight text-brand-800 sm:text-4xl flex items-center gap-3">
              <Trash2 className="text-red-600" />
              Delete Account Request
            </h1>
            <p className="mt-4 text-base text-gray-600 leading-relaxed">
              If you no longer wish to use Merit Real Solutions, you can request the permanent deletion of your account and associated personal data. Please review the policies below before submitting.
            </p>
          </div>
        </div>
      </section>

      {/* Main Grid */}
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          
          {/* Info Card - Left (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-2xl border border-red-100 bg-red-50/40 p-6 shadow-sm">
              <h2 className="text-lg font-bold text-red-800 flex items-center gap-2 mb-3">
                <ShieldAlert className="shrink-0" size={20} />
                What will be deleted?
              </h2>
              <p className="text-sm text-red-700 leading-relaxed mb-4">
                Upon completing the deletion request process, the following account information will be permanently purged from our active operational databases:
              </p>
              <ul className="space-y-2.5 text-sm text-red-900">
                <li className="flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500 mt-2 shrink-0"></span>
                  <span>Personal identification (Name, address, profile photos, occupation).</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500 mt-2 shrink-0"></span>
                  <span>Authentication credentials (passwords, active sessions).</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500 mt-2 shrink-0"></span>
                  <span>Favourited listings, saved searches, and wishlist items.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500 mt-2 shrink-0"></span>
                  <span>Unsubmitted property drafts or listing records.</span>
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
              <h2 className="text-lg font-bold text-brand-800 flex items-center gap-2">
                <Lock className="text-brand-600 shrink-0" size={20} />
                Legal Retention Requirements
              </h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                In compliance with Indian laws (including the Companies Act and the Income Tax Act, 1961), certain business and financial ledger data cannot be immediately deleted and will be securely archived for the statutory period (7 to 8 years):
              </p>
              <div className="space-y-3">
                <div className="flex items-start gap-3 rounded-lg bg-gray-50 p-3">
                  <FileText className="text-brand-500 shrink-0 mt-0.5" size={16} />
                  <div>
                    <h4 className="text-xs font-bold text-gray-700">Financial Ledger Transactions</h4>
                    <p className="text-xs text-gray-500 mt-0.5">Plot booking records, payment receipts, invoice generations, and mediator commission audits.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-lg bg-gray-50 p-3">
                  <Info className="text-brand-500 shrink-0 mt-0.5" size={16} />
                  <div>
                    <h4 className="text-xs font-bold text-gray-700">Audit & Log Integrity</h4>
                    <p className="text-xs text-gray-500 mt-0.5">Dispute settlement files and legal audit logs required by statutory bodies.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Form / Success Card - Right (7 cols) */}
          <div className="lg:col-span-7">
            {submitted ? (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/30 p-8 text-center shadow-sm space-y-5 animate-fadeIn">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <CheckCircle size={32} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-emerald-800">Request Submitted Successfully</h2>
                  <p className="mt-2 text-sm text-emerald-700 leading-relaxed">
                    We have received your account deletion request. Our administration team will review your identity information and process the deletion in accordance with legal requirements.
                  </p>
                </div>

                <div className="mx-auto max-w-xs rounded-xl bg-white border border-emerald-200 p-4 shadow-sm">
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Ticket Number</p>
                  <p className="text-lg font-mono font-bold text-brand-800 mt-1">{ticketId}</p>
                </div>

                <div className="text-sm text-gray-500 border-t border-emerald-100/50 pt-4">
                  <p>A verification mail/SMS has been sent. The process typically takes <strong>2-3 business days</strong>.</p>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => {
                      setSubmitted(false);
                      setForm({ fullName: '', identity: '', role: 'buyer', reason: '', confirm: false });
                    }}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-900 transition-colors"
                  >
                    Submit another request <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-gray-100 bg-white p-6 sm:p-8 shadow-sm">
                <h3 className="text-xl font-bold text-brand-800 mb-6">Submit Deletion Request</h3>
                
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label htmlFor="del-fullname" className="mb-1.5 block text-sm font-medium text-gray-700">
                      Full Name
                    </label>
                    <input
                      id="del-fullname"
                      type="text"
                      value={form.fullName}
                      onChange={(e) => setForm(f => ({ ...f, fullName: e.target.value }))}
                      className={`w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-all ${
                        errors.fullName ? 'border-red-400 focus:border-red-500 ring-1 ring-red-100' : 'border-gray-300 focus:border-brand-500'
                      }`}
                      placeholder="Enter your registered full name"
                    />
                    {errors.fullName && <p className="mt-1 text-xs text-red-600">{errors.fullName}</p>}
                  </div>

                  <div>
                    <label htmlFor="del-identity" className="mb-1.5 block text-sm font-medium text-gray-700">
                      Registered Email Address or Mobile Number
                    </label>
                    <input
                      id="del-identity"
                      type="text"
                      value={form.identity}
                      onChange={(e) => setForm(f => ({ ...f, identity: e.target.value }))}
                      className={`w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-all ${
                        errors.identity ? 'border-red-400 focus:border-red-500 ring-1 ring-red-100' : 'border-gray-300 focus:border-brand-500'
                      }`}
                      placeholder="e.g. user@email.com or +91 9999999999"
                    />
                    {errors.identity && <p className="mt-1 text-xs text-red-600">{errors.identity}</p>}
                  </div>

                  <div>
                    <label htmlFor="del-role" className="mb-1.5 block text-sm font-medium text-gray-700">
                      Account Role
                    </label>
                    <select
                      id="del-role"
                      value={form.role}
                      onChange={(e) => setForm(f => ({ ...f, role: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm bg-white focus:border-brand-500 outline-none"
                    >
                      <option value="buyer">Buyer / Customer</option>
                      <option value="seller">Seller / Land Owner</option>
                      <option value="mediator">Mediator / Agent</option>
                      <option value="employee">Employee</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="del-reason" className="mb-1.5 block text-sm font-medium text-gray-700">
                      Reason for Deletion <span className="text-gray-400 font-normal">(Optional)</span>
                    </label>
                    <textarea
                      id="del-reason"
                      rows={3}
                      value={form.reason}
                      onChange={(e) => setForm(f => ({ ...f, reason: e.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-brand-500 outline-none"
                      placeholder="Let us know why you would like to delete your account..."
                    />
                  </div>

                  <div className="pt-2">
                    <div className="flex items-start gap-3">
                      <input
                        id="del-confirm"
                        type="checkbox"
                        checked={form.confirm}
                        onChange={(e) => setForm(f => ({ ...f, confirm: e.target.checked }))}
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                      />
                      <label htmlFor="del-confirm" className="text-xs text-gray-500 leading-normal select-none cursor-pointer">
                        I understand that my profile details, active login, and preferences will be permanently deleted and cannot be recovered. I acknowledge that transaction ledgers will be retained due to statutory audit regulations.
                      </label>
                    </div>
                    {errors.confirm && <p className="mt-1.5 text-xs text-red-600">{errors.confirm}</p>}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-4 rounded-lg bg-red-600 py-3 text-sm font-bold text-white hover:bg-red-700 transition-colors disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                  >
                    {loading ? (
                      <span>Submitting Request...</span>
                    ) : (
                      <>
                        <Trash2 size={16} />
                        <span>Confirm Account Deletion Request</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
