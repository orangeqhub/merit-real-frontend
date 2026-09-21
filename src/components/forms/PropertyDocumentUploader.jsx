import { useCallback, useEffect, useRef, useState } from 'react';
import { FileText, Trash2, Upload } from 'lucide-react';

const ACCEPT = 'application/pdf';
const MAX_SIZE_BYTES = 20 * 1024 * 1024;

function makeNewItem(file) {
  return {
    uid: `new-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    kind: 'new',
    file,
  };
}

function makeExistingItem(doc) {
  return {
    uid: `existing-${doc.id}`,
    kind: 'existing',
    id: doc.id,
    fileName: doc.fileName,
    fileSize: doc.fileSize,
  };
}

function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Property Documents (PDF) uploader for the Admin Add/Edit Property form.
 * Mirrors PropertyImageGalleryUploader's UX (drag/drop, list, remove) but for
 * PDF-only multi-file uploads. Actual upload/delete happens via separate
 * authenticated endpoints once the property itself is saved — see
 * buildDocumentPayload + AdminPropertyPanel's save flow.
 */
export default function PropertyDocumentUploader({ existingDocuments = [], value, onChange }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');

  const items = value?.items || [];
  const deletedIds = value?.deletedIds || [];

  const setState = useCallback(
    (next) => {
      onChange({
        items: next.items ?? items,
        deletedIds: next.deletedIds ?? deletedIds,
      });
    },
    [onChange, items, deletedIds]
  );

  useEffect(() => {
    if (!existingDocuments?.length) return;
    if ((value?.items || []).length || (value?.deletedIds || []).length) return;
    onChange({
      items: existingDocuments.map(makeExistingItem),
      deletedIds: [],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingDocuments]);

  function addFiles(fileList) {
    const incoming = Array.from(fileList || []);
    const rejected = [];
    const accepted = [];

    incoming.forEach((file) => {
      const isPdfType = file.type === 'application/pdf';
      const isPdfExt = /\.pdf$/i.test(file.name || '');
      if (!isPdfType || !isPdfExt) {
        rejected.push(`${file.name}: only PDF files are allowed`);
        return;
      }
      if (file.size > MAX_SIZE_BYTES) {
        rejected.push(`${file.name}: exceeds 20 MB limit`);
        return;
      }
      accepted.push(file);
    });

    setError(rejected.length ? rejected.join('; ') : '');
    if (accepted.length) {
      setState({ items: [...items, ...accepted.map(makeNewItem)] });
    }
  }

  function removeItem(index) {
    const target = items[index];
    const nextItems = items.filter((_, i) => i !== index);
    const nextDeleted = target?.kind === 'existing'
      ? [...deletedIds, target.id]
      : deletedIds;
    setState({ items: nextItems, deletedIds: nextDeleted });
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  }

  return (
    <div className="sm:col-span-2 border-t border-gray-100 pt-3">
      <label className="mb-1 block text-xs font-medium text-gray-600">Property Documents</label>
      <p className="mb-2 text-xs text-gray-500">
        Upload PDF documents related to this property (brochure, floor plan, specifications). You can upload
        multiple PDF files. Only authenticated users can view or download them on the website.
      </p>

      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`mb-3 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-6 text-center transition ${
          dragOver ? 'border-brand-500 bg-brand-50' : 'border-gray-300 hover:border-brand-400 hover:bg-gray-50'
        }`}
      >
        <Upload size={22} className="mb-2 text-gray-400" />
        <p className="text-sm font-medium text-gray-700">Click or drag PDF files here</p>
        <p className="mt-1 text-xs text-gray-500">PDF only, up to 20 MB each. Select multiple files at once.</p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {error && <p className="mb-2 text-xs text-red-600">{error}</p>}

      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map((item, index) => (
            <li
              key={item.uid}
              className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-2"
            >
              <FileText size={18} className="shrink-0 text-brand-600" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-gray-700">
                  {item.kind === 'new' ? item.file?.name : item.fileName}
                </p>
                <p className="text-[10px] text-gray-400">
                  {item.kind === 'new'
                    ? formatFileSize(item.file?.size)
                    : formatFileSize(item.fileSize)}
                  {item.kind === 'new' && <span className="ml-1 text-brand-600">New</span>}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeItem(index)}
                title="Remove"
                className="rounded p-1.5 text-gray-400 hover:text-red-600"
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Extract new File objects and IDs marked for deletion from the uploader state. */
export function buildDocumentPayload(documentState) {
  const items = documentState?.items || [];
  const deletedIds = documentState?.deletedIds || [];
  const newFiles = items.filter((i) => i.kind === 'new').map((i) => i.file);
  return { newFiles, deletedIds };
}
