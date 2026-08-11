import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Upload, RefreshCw } from 'lucide-react';

export default function DocumentUploader({ label, document, onUpload, error, required = true, accept = 'application/pdf,image/jpeg,image/jpg,image/png,image/webp' }) {
  const { t } = useTranslation('forms');
  const inputRef = useRef(null);

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
    e.target.value = '';
  }

  return (
    <div className={`rounded-xl border p-3 ${error ? 'border-red-400' : 'border-gray-200'}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-800">{label}</span>
        <span className={`text-xs ${required ? 'text-red-500' : 'text-gray-400'}`}>
          {required ? t('media.required') : t('media.optional')}
        </span>
      </div>

      <div className="mt-2 flex h-16 items-center gap-2 rounded-lg bg-gray-50 px-3">
        <FileText size={20} className={document ? 'text-brand-600' : 'text-gray-300'} />
        <span className="truncate text-sm text-gray-700">
          {document ? t('documents.uploadedFile', { name: document.fileName }) : t('documents.acceptedFormats')}
        </span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
        id={`upload-doc-${label}`}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg border border-gray-300 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
      >
        {document ? <RefreshCw size={13} /> : <Upload size={13} />}
        {document ? t('documents.replace') : t('documents.uploadPrompt')}
      </button>

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
