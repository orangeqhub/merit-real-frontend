import { useCallback, useEffect, useRef, useState } from 'react';
import { GripVertical, Star, Trash2, Upload } from 'lucide-react';
import { resolveAssetUrl } from '../../api/client';

const ACCEPT = 'image/jpeg,image/jpg,image/png,image/webp';

function makeNewItem(file) {
  return {
    uid: `new-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    kind: 'new',
    file,
    previewUrl: URL.createObjectURL(file),
  };
}

function makeExistingItem(img) {
  return {
    uid: `existing-${img.id}`,
    kind: 'existing',
    id: img.id,
    url: img.url,
    isPrimary: Boolean(img.isPrimary),
  };
}

export default function PropertyImageGalleryUploader({ existingImages = [], value, onChange }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);

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
    if (!existingImages?.length) return;
    if ((value?.items || []).length || (value?.deletedIds || []).length) return;
    onChange({
      items: existingImages.map(makeExistingItem),
      deletedIds: [],
    });
  }, [existingImages, onChange, value?.deletedIds, value?.items]);

  function addFiles(fileList) {
    const allowed = ACCEPT.split(',').map((t) => t.trim());
    const files = Array.from(fileList || []).filter((f) => allowed.includes(f.type));
    if (!files.length) return;
    setState({ items: [...items, ...files.map(makeNewItem)] });
  }

  function removeItem(index) {
    const target = items[index];
    const nextItems = items.filter((_, i) => i !== index);
    const nextDeleted = target?.kind === 'existing'
      ? [...deletedIds, target.id]
      : deletedIds;
    if (target?.kind === 'new' && target.previewUrl) URL.revokeObjectURL(target.previewUrl);
    setState({ items: nextItems, deletedIds: nextDeleted });
  }

  function setCover(index) {
    setState({
      items: items.map((item, i) => ({ ...item, isPrimary: i === index })),
    });
  }

  function moveItem(from, to) {
    if (from === to || to < 0 || to >= items.length) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setState({ items: next });
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  }

  const coverIndex = items.findIndex((i) => i.isPrimary);
  const effectiveCover = coverIndex >= 0 ? coverIndex : 0;

  return (
    <div className="sm:col-span-2">
      <label className="mb-1 block text-xs font-medium text-gray-600">Property Images</label>
      <p className="mb-2 text-xs text-gray-500">
        Upload multiple images (JPG, JPEG, PNG, WebP). Drag to reorder. Star one as cover image.
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
        <p className="text-sm font-medium text-gray-700">Click or drag images here</p>
        <p className="mt-1 text-xs text-gray-500">Select multiple files at once</p>
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

      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map((item, index) => {
            const src = item.kind === 'existing' ? resolveAssetUrl(item.url) : item.previewUrl;
            const isCover = item.isPrimary || (effectiveCover === index && !items.some((x) => x.isPrimary));
            return (
              <li
                key={item.uid}
                draggable
                onDragStart={() => setDragIndex(index)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragIndex != null) moveItem(dragIndex, index);
                  setDragIndex(null);
                }}
                className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-2"
              >
                <GripVertical size={16} className="shrink-0 cursor-grab text-gray-400" aria-hidden />
                <img src={src} alt="" className="h-14 w-20 shrink-0 rounded object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs text-gray-600">
                    {item.kind === 'new' ? item.file?.name : `Image #${item.id}`}
                  </p>
                  {isCover && (
                    <span className="mt-0.5 inline-block rounded bg-brand-100 px-1.5 py-0.5 text-[10px] font-semibold text-brand-700">
                      Cover
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setCover(index)}
                  title="Set as cover"
                  className={`rounded p-1.5 ${isCover ? 'text-amber-500' : 'text-gray-400 hover:text-amber-500'}`}
                >
                  <Star size={16} fill={isCover ? 'currentColor' : 'none'} />
                </button>
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  title="Remove"
                  className="rounded p-1.5 text-gray-400 hover:text-red-600"
                >
                  <Trash2 size={16} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Extract new File objects and gallery meta for API payload. */
export function buildImageGalleryPayload(galleryState) {
  const items = galleryState?.items || [];
  const deletedIds = galleryState?.deletedIds || [];
  const newFiles = items.filter((i) => i.kind === 'new').map((i) => i.file);

  const order = items.map((item) => (
    item.kind === 'existing'
      ? { type: 'existing', id: item.id }
      : { type: 'new', index: newFiles.indexOf(item.file) }
  ));

  const coverItem = items.find((i) => i.isPrimary) || items[0];
  let primaryKey = null;
  if (coverItem) {
    primaryKey = coverItem.kind === 'existing'
      ? `existing:${coverItem.id}`
      : `new:${newFiles.indexOf(coverItem.file)}`;
  }

  return {
    newFiles,
    imageGalleryMeta: { deletedIds, order, primaryKey },
  };
}
