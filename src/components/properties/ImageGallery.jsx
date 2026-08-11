import { useState } from 'react';
import { resolveAssetUrl } from '../../api/client';

export default function ImageGallery({ images = [], title }) {
  const ordered = [...images].sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0));
  const [active, setActive] = useState(0);

  if (ordered.length === 0) {
    return <div className="aspect-video w-full rounded-xl bg-gray-100" />;
  }

  return (
    <div>
      <div className="aspect-video w-full overflow-hidden rounded-xl bg-gray-100">
        <img
          src={resolveAssetUrl(ordered[active].url)}
          alt={ordered[active].caption || title}
          className="h-full w-full object-cover"
        />
      </div>
      {ordered.length > 1 && (
        <div className="mt-2 flex gap-2 overflow-x-auto scrollbar-none">
          {ordered.map((img, i) => (
            <button
              key={img.slotId}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Show image ${i + 1}`}
              aria-current={i === active}
              className={`h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 ${
                i === active ? 'border-brand-600' : 'border-transparent'
              }`}
            >
              <img src={resolveAssetUrl(img.url)} alt={img.caption || ''} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
