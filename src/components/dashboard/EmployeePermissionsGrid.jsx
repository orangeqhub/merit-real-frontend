import { useTranslation } from 'react-i18next';
import { ASSIGNABLE_EMPLOYEE_PERMISSIONS } from '../../config/employeePermissions';

/**
 * Two-column checkbox grid of grantable employee permissions.
 * Matches the admin "Permissions for …" layout.
 */
export default function EmployeePermissionsGrid({ selected = [], onChange, disabled = false }) {
  const { t } = useTranslation('dashboard');

  function toggle(permission) {
    if (disabled) return;
    const next = selected.includes(permission)
      ? selected.filter((p) => p !== permission)
      : [...selected, permission];
    onChange(next);
  }

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {ASSIGNABLE_EMPLOYEE_PERMISSIONS.map((permission) => {
        const checked = selected.includes(permission);
        return (
          <label
            key={permission}
            className={`flex cursor-pointer items-start gap-2.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 transition-colors ${
              checked ? 'border-blue-200 bg-blue-50/40' : 'hover:bg-gray-100'
            } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
          >
            <input
              type="checkbox"
              checked={checked}
              disabled={disabled}
              onChange={() => toggle(permission)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm leading-snug text-gray-800">
              {t(`permissionLabels.${permission}`)}
            </span>
          </label>
        );
      })}
    </div>
  );
}
