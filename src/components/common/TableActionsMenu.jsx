import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical } from 'lucide-react';

/**
 * Compact table actions dropdown with icons + labels.
 * @param {{ items: Array<{ key?: string, label: string, icon?: import('react').ComponentType, onClick: () => void, tone?: 'default'|'danger'|'success'|'brand'|'warning', disabled?: boolean, hidden?: boolean }> }} props
 */
export default function TableActionsMenu({ items = [], align = 'right', label = 'Actions' }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const menuId = useId();

  const visibleItems = items.filter((item) => item && !item.hidden);

  useEffect(() => {
    if (!open) return undefined;

    function updatePosition() {
      const btn = buttonRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const menuWidth = 220;
      const estimatedHeight = Math.min(320, visibleItems.length * 40 + 16);
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp = spaceBelow < estimatedHeight && rect.top > spaceBelow;
      const top = openUp ? rect.top - estimatedHeight - 6 : rect.bottom + 6;
      let left = align === 'left' ? rect.left : rect.right - menuWidth;
      left = Math.max(8, Math.min(left, window.innerWidth - menuWidth - 8));
      setCoords({ top, left });
    }

    updatePosition();

    function handlePointer(e) {
      if (
        buttonRef.current?.contains(e.target)
        || menuRef.current?.contains(e.target)
      ) return;
      setOpen(false);
    }

    function handleKey(e) {
      if (e.key === 'Escape') setOpen(false);
    }

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open, align, visibleItems.length]);

  if (!visibleItems.length) return null;

  const toneClass = {
    default: 'text-gray-700 hover:bg-gray-50',
    danger: 'text-red-700 hover:bg-red-50',
    success: 'text-emerald-700 hover:bg-emerald-50',
    brand: 'text-brand-800 hover:bg-brand-50',
    warning: 'text-amber-800 hover:bg-amber-50',
  };

  return (
    <div className="relative inline-flex">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
      >
        <MoreVertical size={15} />
        <span className="hidden sm:inline">Actions</span>
      </button>

      {open && createPortal(
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          style={{ top: coords.top, left: coords.left }}
          className="fixed z-[130] w-[220px] overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-xl"
        >
          {visibleItems.map((item, index) => {
            const Icon = item.icon;
            const tone = toneClass[item.tone || 'default'] || toneClass.default;
            return (
              <button
                key={item.key || `${item.label}-${index}`}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  setOpen(false);
                  item.onClick?.();
                }}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40 ${tone}`}
              >
                {Icon ? <Icon size={15} className="shrink-0" /> : <span className="w-[15px]" />}
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}
