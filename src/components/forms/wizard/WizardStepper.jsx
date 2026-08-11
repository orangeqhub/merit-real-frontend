import { Check } from 'lucide-react';

export default function WizardStepper({ steps, current }) {
  return (
    <div className="mb-8 overflow-x-auto scrollbar-none">
      <ol className="flex min-w-max gap-2">
        {steps.map((label, i) => {
          const stepNum = i + 1;
          const done = stepNum < current;
          const active = stepNum === current;
          return (
            <li key={label} className="flex items-center gap-2">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  done
                    ? 'bg-brand-600 text-warm-white'
                    : active
                    ? 'bg-brand-100 text-brand-800 ring-2 ring-brand-600'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                {done ? <Check size={14} /> : stepNum}
              </span>
              <span className={`text-xs font-medium ${active ? 'text-brand-800' : 'text-gray-400'}`}>{label}</span>
              {stepNum < steps.length && <span className="mx-1 h-px w-6 bg-gray-200" />}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
