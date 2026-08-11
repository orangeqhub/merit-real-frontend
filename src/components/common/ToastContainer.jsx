import { CheckCircle2, XCircle, Info, X } from 'lucide-react';
import { useToastStore } from '../../store/toastStore';

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

const STYLES = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  error: 'border-red-200 bg-red-50 text-red-900',
  info: 'border-sky-200 bg-sky-50 text-sky-900',
};

const ICON_STYLES = {
  success: 'text-emerald-600',
  error: 'text-red-600',
  info: 'text-sky-600',
};

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[120] flex flex-col items-center gap-2 px-3 pt-4 sm:pt-5"
      aria-live="polite"
    >
      {toasts.map((t) => {
        const Icon = ICONS[t.type] || Info;
        return (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg backdrop-blur-sm animate-[slideDown_0.25s_ease-out] ${STYLES[t.type] || STYLES.info}`}
          >
            <Icon size={20} className={`mt-0.5 shrink-0 ${ICON_STYLES[t.type] || ICON_STYLES.info}`} />
            <p className="flex-1 font-medium leading-snug">{t.message}</p>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss notification"
              className="shrink-0 rounded-md p-0.5 text-current/60 hover:bg-black/5 hover:text-current"
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
