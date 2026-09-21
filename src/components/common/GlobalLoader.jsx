import { useEffect, useState } from 'react';
import { useLoaderStore } from '../../store/loaderStore';

const LOADER_MARK = '/loader-mark.png';

/**
 * Full-screen branded loader overlay. Visibility is driven by loaderStore
 * (API + route + init). Fade in/out via CSS opacity transition.
 */
export default function GlobalLoader() {
  const visible = useLoaderStore((s) => s.visible);
  const [mounted, setMounted] = useState(visible);
  const [opaque, setOpaque] = useState(false);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      const id = requestAnimationFrame(() => setOpaque(true));
      return () => cancelAnimationFrame(id);
    }
    setOpaque(false);
    const t = setTimeout(() => setMounted(false), 220);
    return () => clearTimeout(t);
  }, [visible]);

  if (!mounted) return null;

  return (
    <div
      className={`fixed inset-0 z-[200] flex items-center justify-center transition-opacity duration-200 ${
        opaque ? 'opacity-100' : 'opacity-0'
      }`}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading"
    >
      {/* Blocks clicks while loading */}
      <div className="absolute inset-0 bg-[#08182e]/45 backdrop-blur-[2px]" />

      <div className="relative flex flex-col items-center gap-4 px-6">
        <div className="loader-mark-wrap relative flex h-20 w-20 items-center justify-center sm:h-24 sm:w-24">
          <span className="loader-mark-glow absolute inset-0 rounded-full" aria-hidden />
          <img
            src={LOADER_MARK}
            alt=""
            width={96}
            height={96}
            className="loader-mark-img relative z-[1] h-14 w-14 object-contain sm:h-16 sm:w-16"
            draggable={false}
          />
        </div>
        <p className="text-sm font-medium tracking-wide text-warm-white/90">Loading…</p>
      </div>
    </div>
  );
}
