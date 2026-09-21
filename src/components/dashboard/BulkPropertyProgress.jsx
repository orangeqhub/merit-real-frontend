import { X, RotateCcw, CheckCircle2, AlertCircle } from 'lucide-react';

export default function BulkPropertyProgress({
  open,
  title = 'Posting Properties',
  completed = 0,
  total = 0,
  succeeded = 0,
  failed = 0,
  results = [],
  onClose,
  onRetryFailed,
}) {
  if (!open) return null;

  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const remaining = Math.max(0, total - completed);
  const done = completed >= total && total > 0;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg rounded-xl bg-warm-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-brand-800">{title}</h3>
          {done && (
            <button type="button" onClick={onClose} className="rounded-lg p-1 hover:bg-gray-100" aria-label="Close">
              <X size={18} />
            </button>
          )}
        </div>

        <div className="mb-2 h-2.5 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-brand-600 transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>

        <p className="text-sm font-medium text-gray-700">
          {completed} / {total} completed
        </p>
        <div className="mt-1 flex flex-wrap gap-4 text-xs text-gray-500">
          <span>Completed: {succeeded}</span>
          <span>Failed: {failed}</span>
          <span>Remaining: {remaining}</span>
        </div>

        {results.length > 0 && (
          <ul className="mt-4 max-h-48 space-y-1 overflow-y-auto text-sm">
            {results.map((row, i) => {
              if (!row) return null;
              const label = row.item?.titleEn || row.item?.label || `Property ${i + 1}`;
              return (
                <li key={i} className="flex items-center gap-2 rounded border border-gray-100 px-2 py-1.5">
                  {row.ok ? (
                    <CheckCircle2 size={14} className="shrink-0 text-green-600" />
                  ) : (
                    <AlertCircle size={14} className="shrink-0 text-red-500" />
                  )}
                  <span className="min-w-0 flex-1 truncate">{label}</span>
                  {!row.ok && <span className="truncate text-xs text-red-600">{row.error}</span>}
                </li>
              );
            })}
          </ul>
        )}

        {done && (
          <div className="mt-4 flex justify-end gap-2">
            {failed > 0 && onRetryFailed && (
              <button
                type="button"
                onClick={onRetryFailed}
                className="inline-flex items-center gap-1.5 rounded-lg border border-brand-300 px-3 py-2 text-sm font-semibold text-brand-700"
              >
                <RotateCcw size={14} /> Retry failed
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-warm-white"
            >
              {failed === 0 ? 'Done' : 'Close'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
