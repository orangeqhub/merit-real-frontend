import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, UserRound, X } from 'lucide-react';
import { resolveAssetUrl } from '../../api/client';

/** Circular avatar picker used for the profile photo during registration. */
export default function ProfilePhotoUploader({ label, image, onUpload, onRemove }) {
  const { t } = useTranslation('forms');
  const inputRef = useRef(null);

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
    e.target.value = '';
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          aria-label={image ? t('media.replace') : t('media.uploadPrompt')}
          className="group flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-gray-300 bg-gray-50 transition-all hover:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
        >
          {image ? (
            <img src={resolveAssetUrl(image.url)} alt={label} className="h-full w-full object-cover" />
          ) : (
            <UserRound size={44} className="text-gray-300 transition-colors group-hover:text-brand-400" />
          )}
        </button>

        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-1 right-1 flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-warm-white shadow ring-2 ring-white"
        >
          <Camera size={15} />
        </span>

        {image && onRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={t('media.remove')}
            className="absolute right-0 top-0 flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm hover:bg-gray-50"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />

      <p className="mt-2 text-sm font-medium text-gray-800">{label}</p>
      <p className="text-xs text-gray-400">
        {image ? t('media.replace') : t('media.uploadPrompt')} · {t('media.optional')}
      </p>
    </div>
  );
}
