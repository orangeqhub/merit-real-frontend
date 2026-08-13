import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { resolveAssetUrl } from '../../api/client';

export default function ImageGallery({ images = [], title }) {
  const ordered = [...images].sort((a, b) => {
    if (a.isPrimary && !b.isPrimary) return -1;
    if (!a.isPrimary && b.isPrimary) return 1;
    return (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || (a.id ?? 0) - (b.id ?? 0);
  });

  const [active, setActive] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false);
  const touchStartX = useRef(null);

  useEffect(() => {
    setActive(0);
  }, [images]);

  const goPrev = useCallback(() => {
    setActive((i) => (i <= 0 ? ordered.length - 1 : i - 1));
  }, [ordered.length]);

  const goNext = useCallback(() => {
    setActive((i) => (i >= ordered.length - 1 ? 0 : i + 1));
  }, [ordered.length]);

  useEffect(() => {
    if (!previewOpen) return undefined;
    function onKey(e) {
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'Escape') setPreviewOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [previewOpen, goPrev, goNext]);

  if (ordered.length === 0) {
    return <div className="aspect-video w-full rounded-xl bg-gray-100" />;
  }

  const current = ordered[active];

  function handleTouchStart(e) {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  }

  function handleTouchEnd(e) {
    if (touchStartX.current == null) return;
    const delta = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
    if (Math.abs(delta) > 40) {
      if (delta > 0) goPrev();
      else goNext();
    }
    touchStartX.current = null;
  }

  return (
    <div>
      <div
        className="relative aspect-video w-full overflow-hidden rounded-xl bg-gray-100"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <button
          type="button"
          onClick={() => setPreviewOpen(true)}
          className="block h-full w-full"
          aria-label="Open full-size image preview"
        >
          <img
            src={resolveAssetUrl(current.url)}
            alt={current.caption || title}
            className="h-full w-full object-cover"
          />
        </button>

        {ordered.length > 1 && (
          <>
            <button
              type="button"
              onClick={goPrev}
              aria-label="Previous image"
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/45 p-2 text-white hover:bg-black/60"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="Next image"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/45 p-2 text-white hover:bg-black/60"
            >
              <ChevronRight size={20} />
            </button>
            <span className="absolute bottom-2 right-2 rounded bg-black/50 px-2 py-0.5 text-xs text-white">
              {active + 1} / {ordered.length}
            </span>
          </>
        )}
      </div>

      {ordered.length > 1 && (
        <div className="mt-2 flex gap-2 overflow-x-auto scrollbar-none">
          {ordered.map((img, i) => (
            <button
              key={img.id || img.slotId || i}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Show image ${i + 1}`}
              aria-current={i === active}
              className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 ${
                i === active ? 'border-brand-600' : 'border-transparent'
              }`}
            >
              <img src={resolveAssetUrl(img.url)} alt={img.caption || ''} className="h-full w-full object-cover" />
              {img.isPrimary && (
                <span className="absolute bottom-0 left-0 right-0 bg-black/55 py-0.5 text-center text-[9px] text-white">
                  Cover
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {previewOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setPreviewOpen(false)}
        >
          <button
            type="button"
            onClick={() => setPreviewOpen(false)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            aria-label="Close preview"
          >
            <X size={22} />
          </button>
          {ordered.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); goPrev(); }}
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
                aria-label="Previous image"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); goNext(); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
                aria-label="Next image"
              >
                <ChevronRight size={24} />
              </button>
            </>
          )}
          <img
            src={resolveAssetUrl(current.url)}
            alt={current.caption || title}
            className="max-h-[90vh] max-w-full object-contain"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          />
        </div>
      )}
    </div>
  );
}
