import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, CheckCircle2, AlertTriangle, XCircle, RotateCcw } from 'lucide-react';
import { resolveAssetUrl } from '../../api/client';

const STATUS_STYLES = {
  verified: 'bg-green-50 text-green-700',
  unclear: 'bg-amber-50 text-amber-700',
  missing: 'bg-red-50 text-red-700',
};

/**
 * Frontend-demo document preview used across verification and property
 * moderation review — never rendered on any public/buyer/seller/mediator
 * page, since identity documents must stay private to Employee/Admin.
 */
export default function DocumentPreview({ title, fileName, uploadDate, previewUrl, status, onStatusChange }) {
  const { t } = useTranslation('dashboard');
  const [note, setNote] = useState('');

  return (
    <div className="rounded-xl border border-gray-200 p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-800">{title}</span>
        {status && (
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[status] || 'bg-gray-100 text-gray-500'}`}>
            {t(`document.status.${status}`)}
          </span>
        )}
      </div>

      <div className="mt-2 flex h-32 items-center justify-center overflow-hidden rounded-lg bg-gray-50">
        {previewUrl ? (
          <img src={resolveAssetUrl(previewUrl)} alt={title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-1 text-gray-300">
            <FileText size={28} />
            <span className="text-[11px]">{t('document.placeholder')}</span>
          </div>
        )}
      </div>

      <p className="mt-2 truncate text-xs text-gray-500">{fileName || t('document.noFile')}</p>
      {uploadDate && <p className="text-xs text-gray-400">{t('document.uploadedOn', { date: new Date(uploadDate).toLocaleDateString() })}</p>}

      {onStatusChange && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          <button type="button" onClick={() => onStatusChange('verified')} className="flex items-center gap-1 rounded-lg border border-green-200 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-50">
            <CheckCircle2 size={13} /> {t('document.markVerified')}
          </button>
          <button type="button" onClick={() => onStatusChange('unclear')} className="flex items-center gap-1 rounded-lg border border-amber-200 px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50">
            <AlertTriangle size={13} /> {t('document.markUnclear')}
          </button>
          <button type="button" onClick={() => onStatusChange('missing')} className="flex items-center gap-1 rounded-lg border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50">
            <XCircle size={13} /> {t('document.markMissing')}
          </button>
          <button type="button" onClick={() => onStatusChange('replacement_requested')} className="flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50">
            <RotateCcw size={13} /> {t('document.requestReplacement')}
          </button>
        </div>
      )}

      {onStatusChange && (
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t('document.reviewNotePlaceholder')}
          className="mt-2 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-xs"
        />
      )}
    </div>
  );
}

