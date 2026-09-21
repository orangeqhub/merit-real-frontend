import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import EmployeePermissionsGrid from './EmployeePermissionsGrid';

/**
 * Standalone "Permissions for {name}" modal — Cancel / Save footer.
 */
export default function EmployeePermissionsModal({
  open,
  employeeName,
  permissions = [],
  saving = false,
  onClose,
  onSave,
}) {
  const { t } = useTranslation(['dashboard', 'common']);
  const [selected, setSelected] = useState(permissions);

  useEffect(() => {
    if (open) setSelected(permissions || []);
  }, [open, permissions]);

  if (!open) return null;

  function handleSubmit(e) {
    e.preventDefault();
    onSave(selected);
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 px-4 py-6">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-gray-100 shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 bg-gray-100 px-5 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {t('employeePermissions.title', { name: employeeName || '—' })}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-200"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <EmployeePermissionsGrid selected={selected} onChange={setSelected} disabled={saving} />
          </div>

          <div className="flex justify-end gap-3 border-t border-gray-200 bg-gray-100 px-5 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
            >
              {t('buttons.cancel', { ns: 'common' })}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {t('buttons.save', { ns: 'common' })}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
