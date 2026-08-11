import { AlertTriangle, CheckCircle2, HelpCircle, X } from 'lucide-react';
import { useConfirmStore } from '../../store/confirmStore';

const VARIANT = {
  primary: {
    Icon: HelpCircle,
    iconWrap: 'bg-brand-50 text-brand-700',
    confirmBtn: 'bg-brand-700 hover:bg-brand-800 text-warm-white',
  },
  success: {
    Icon: CheckCircle2,
    iconWrap: 'bg-emerald-50 text-emerald-700',
    confirmBtn: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  },
  danger: {
    Icon: AlertTriangle,
    iconWrap: 'bg-red-50 text-red-600',
    confirmBtn: 'bg-red-600 hover:bg-red-700 text-white',
  },
};

export default function ConfirmDialog() {
  const open = useConfirmStore((s) => s.open);
  const options = useConfirmStore((s) => s.options);
  const resolve = useConfirmStore((s) => s.resolve);

  if (!open) return null;

  const variant = VARIANT[options.variant] || VARIANT.primary;
  const Icon = variant.Icon;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
        aria-label="Dismiss"
        onClick={() => resolve(false)}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5"
      >
        <div className="flex items-start gap-3 border-b border-gray-100 px-5 py-4">
          <span className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${variant.iconWrap}`}>
            <Icon size={20} />
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <h2 id="confirm-dialog-title" className="text-base font-bold text-gray-900">
              {options.title}
            </h2>
            {options.message ? (
              <p id="confirm-dialog-message" className="mt-1 text-sm leading-relaxed text-gray-600">
                {options.message}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => resolve(false)}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col-reverse gap-2 px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => resolve(false)}
            className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            {options.cancelLabel || 'Cancel'}
          </button>
          <button
            type="button"
            onClick={() => resolve(true)}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${variant.confirmBtn}`}
            autoFocus
          >
            {options.confirmLabel || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
