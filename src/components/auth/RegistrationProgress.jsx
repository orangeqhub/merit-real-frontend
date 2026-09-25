import { Check } from 'lucide-react';

/**
 * Step indicator for the registration wizard.
 * Desktop: horizontal stepper with numbered/checked circles.
 * Mobile: compact "Step X of Y" bar with a progress track.
 */
export default function RegistrationProgress({ steps, currentStep, onStepClick }) {
  return (
    <div>
      {/* Desktop / tablet horizontal stepper */}
      <ol className="hidden items-start gap-2 sm:flex">
        {steps.map((step, i) => {
          const isDone = i < currentStep;
          const isActive = i === currentStep;
          const clickable = isDone && typeof onStepClick === 'function';
          return (
            <li key={step.key} className="flex flex-1 items-start gap-2">
              <div className="flex flex-1 flex-col items-center text-center">
                <button
                  type="button"
                  disabled={!clickable}
                  onClick={() => clickable && onStepClick(i)}
                  aria-current={isActive ? 'step' : undefined}
                  className={[
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-all',
                    isDone
                      ? 'bg-gold-500 text-brand-900 hover:scale-105'
                      : isActive
                        ? 'bg-brand-600 text-warm-white ring-4 ring-brand-100'
                        : 'bg-gray-100 text-gray-400',
                    clickable ? 'cursor-pointer' : 'cursor-default',
                  ].join(' ')}
                >
                  {isDone ? <Check size={16} /> : String(i + 1).padStart(2, '0')}
                </button>
                <span
                  className={[
                    'mt-1.5 text-[11px] font-medium leading-tight sm:text-xs',
                    isActive ? 'text-brand-800' : isDone ? 'text-gray-700' : 'text-gray-400',
                  ].join(' ')}
                >
                  {step.title}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div
                  className={['mt-4 h-0.5 flex-1 rounded transition-colors', isDone ? 'bg-gold-500' : 'bg-gray-200'].join(' ')}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>

      {/* Mobile compact indicator */}
      <div className="sm:hidden" role="status" aria-live="polite">
        <p className="text-xs font-semibold text-brand-700">
          Step {currentStep + 1} of {steps.length} · {steps[currentStep].title}
        </p>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-600 to-gold-500 transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
