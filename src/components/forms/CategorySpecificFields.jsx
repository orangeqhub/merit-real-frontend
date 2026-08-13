import { getCategorySection } from '../../utils/propertyCategoryFieldConfig';

const inputClass = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm';

function YesNoField({ field, value, onChange }) {
  return (
    <select value={value || ''} onChange={(e) => onChange(e.target.value)} className={inputClass}>
      <option value="">Select</option>
      <option value="Yes">Yes</option>
      <option value="No">No</option>
    </select>
  );
}

function MultiSelectField({ field, value, onChange }) {
  const selected = Array.isArray(value) ? value : [];
  return (
    <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
      {(field.options || []).map((opt) => (
        <label key={opt} className="flex items-start gap-2 rounded border border-gray-100 px-2 py-1.5 text-xs text-gray-700">
          <input
            type="checkbox"
            checked={selected.includes(opt)}
            onChange={() => {
              const next = selected.includes(opt)
                ? selected.filter((x) => x !== opt)
                : [...selected, opt];
              onChange(next);
            }}
            className="mt-0.5 h-3.5 w-3.5 rounded border-gray-300 text-brand-600"
          />
          <span>{opt}</span>
        </label>
      ))}
    </div>
  );
}

export default function CategorySpecificFields({ categorySlug, values = {}, onChange }) {
  const section = getCategorySection(categorySlug);
  if (!section) return null;

  function updateField(key, val) {
    onChange({ ...values, [key]: val });
  }

  const regularFields = section.fields.filter((f) => f.type !== 'multiselect');
  const multiFields = section.fields.filter((f) => f.type === 'multiselect');

  return (
    <div className="sm:col-span-2 border-t border-gray-100 pt-3">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand-700">{section.title}</p>
      {section.hint && <p className="mb-3 text-xs text-gray-500">{section.hint}</p>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {regularFields.map((field) => (
          <div key={field.key} className={field.type === 'textarea' ? 'sm:col-span-2' : ''}>
            <label className="mb-1 block text-xs font-medium text-gray-600">{field.label}</label>
            {field.type === 'yesno' && (
              <YesNoField field={field} value={values[field.key]} onChange={(v) => updateField(field.key, v)} />
            )}
            {field.type === 'textarea' && (
              <textarea
                rows={2}
                value={values[field.key] || ''}
                onChange={(e) => updateField(field.key, e.target.value)}
                className={inputClass}
              />
            )}
            {(field.type === 'text' || field.type === 'number') && (
              <input
                type={field.type === 'number' ? 'number' : 'text'}
                value={values[field.key] || ''}
                onChange={(e) => updateField(field.key, e.target.value)}
                className={inputClass}
              />
            )}
          </div>
        ))}
      </div>

      {multiFields.map((field) => (
        <div key={field.key} className="mt-4">
          <p className="mb-2 text-xs font-medium text-gray-600">{field.label}</p>
          <MultiSelectField field={field} value={values[field.key]} onChange={(v) => updateField(field.key, v)} />
        </div>
      ))}
    </div>
  );
}
