import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, X, RefreshCw, Star, ImageOff } from 'lucide-react';
import { resolveAssetUrl } from '../../api/client';

export default function ImageSlotUploader({
  label,
  required,
  captionRequired,
  primaryEligible = true,
  showCaption = true,
  image,
  isPrimary,
  onUpload,
  onRemove,
  onSetPrimary,
  onCaptionChange,
  error,
}) {
  const { t } = useTranslation('forms');
  const inputRef = useRef(null);

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
    e.target.value = '';
  }

  const captionMissing = showCaption && captionRequired && image && !image.caption;

  return (
    <div className={`rounded-xl border p-3 ${error ? 'border-red-400' : 'border-gray-200'}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-800">{label}</span>
        <span className={`text-xs ${required ? 'text-red-500' : 'text-gray-400'}`}>
          {required ? t('media.required') : t('media.optional')}
        </span>
      </div>

      <div className="mt-2 flex h-32 items-center justify-center overflow-hidden rounded-lg bg-gray-50">
        {image ? (
          <img src={resolveAssetUrl(image.url)} alt={image.caption || label} className="h-full w-full object-cover" />
        ) : (
          <ImageOff size={28} className="text-gray-300" />
        )}
      </div>

      <input ref={inputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={handleFileChange} className="hidden" id={`upload-${label}`} />

      <div className="mt-2 flex gap-1.5">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-gray-300 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          {image ? <RefreshCw size={13} /> : <Upload size={13} />}
          {image ? t('media.replace') : t('media.uploadPrompt')}
        </button>
        {image && onRemove && (
          <button type="button" onClick={onRemove} aria-label={t('media.remove')} className="rounded-lg border border-gray-300 px-2 text-gray-500 hover:bg-gray-50">
            <X size={14} />
          </button>
        )}
      </div>

      {showCaption && image && (
        <>
          <input
            type="text"
            value={image.caption || ''}
            onChange={(e) => onCaptionChange?.(e.target.value)}
            placeholder={captionRequired ? `${t('media.captionPlaceholder')} *` : t('media.captionPlaceholder')}
            className={`mt-2 w-full rounded-lg border px-2 py-1.5 text-xs ${captionMissing ? 'border-red-400' : 'border-gray-200'}`}
          />
          {primaryEligible && (
            <button
              type="button"
              onClick={onSetPrimary}
              className={`mt-2 flex w-full items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-medium ${
                isPrimary ? 'bg-amber-100 text-amber-700' : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Star size={13} fill={isPrimary ? 'currentColor' : 'none'} />
              {isPrimary ? t('media.primaryImage') : t('media.setPrimary')}
            </button>
          )}
        </>
      )}

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
