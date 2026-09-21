import { getInitials } from '../../utils/avatar';

/**
 * Greeting row with the logged-in user's profile photo (or initials).
 */
export default function DashboardGreeting({ name, photo, subtitle }) {
  const displayName = name || 'User';

  return (
    <div className="flex items-center gap-3 sm:gap-4">
      {photo ? (
        <img
          src={photo}
          alt={displayName}
          className="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-brand-200 sm:h-16 sm:w-16"
        />
      ) : (
        <span
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-700 text-lg font-bold text-white ring-2 ring-brand-200 sm:h-16 sm:w-16 sm:text-xl"
          aria-hidden="true"
        >
          {getInitials(displayName)}
        </span>
      )}
      <div className="min-w-0">
        <h1 className="truncate text-xl font-bold text-brand-800 sm:text-2xl">
          Hello, {displayName}
        </h1>
        {subtitle ? <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p> : null}
      </div>
    </div>
  );
}
