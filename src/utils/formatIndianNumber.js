const INDIAN_LOCALE = 'en-IN';

/** Patterns that must never receive comma formatting. */
const PROTECTED_PATTERNS = [
  /^\d{10}$/, // mobile
  /^\d{12}$/, // aadhaar
  /^\d{6}$/, // pincode
  /^[A-Z]{5}\d{4}[A-Z]$/i, // PAN
  /^[A-Z0-9-]{8,}$/i, // alphanumeric IDs / RERA-style codes with letters
];

function parseNumeric(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const cleaned = String(value).replace(/,/g, '').trim();
  if (!cleaned || !/^-?\d+(?:\.\d+)?$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function isProtectedIdentifier(value) {
  const str = String(value ?? '').trim();
  if (!str) return true;
  if (/[A-Za-z]/.test(str) && !/^\d/.test(str)) return true;
  return PROTECTED_PATTERNS.some((re) => re.test(str));
}

/**
 * Format a numeric value using the Indian numbering system.
 * @param {number|string|null|undefined} value
 * @param {{ minimumFractionDigits?: number, maximumFractionDigits?: number, fallback?: string }} [options]
 */
export function formatIndianNumber(value, options = {}) {
  const {
    minimumFractionDigits,
    maximumFractionDigits,
    fallback = '',
  } = options;

  const n = parseNumeric(value);
  if (n == null) return fallback;

  const fmt = {};
  if (minimumFractionDigits != null) fmt.minimumFractionDigits = minimumFractionDigits;
  if (maximumFractionDigits != null) fmt.maximumFractionDigits = maximumFractionDigits;

  return new Intl.NumberFormat(INDIAN_LOCALE, fmt).format(n);
}

/**
 * Format currency with ₹ prefix using Indian numbering.
 */
export function formatIndianCurrency(value, options = {}) {
  const { fallback = '—', ...rest } = options;
  const n = parseNumeric(value);
  if (n == null) return fallback;
  return `₹${formatIndianNumber(n, rest)}`;
}

/**
 * Compact currency for dashboards (e.g. ₹12.5 L, ₹1.2 Cr).
 */
export function formatIndianCurrencyCompact(value, options = {}) {
  const { fallback = '—' } = options;
  const n = parseNumeric(value);
  if (n == null) return fallback;

  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';

  if (abs >= 1e7) return `${sign}₹${formatIndianNumber(abs / 1e7, { maximumFractionDigits: 2 })} Cr`;
  if (abs >= 1e5) return `${sign}₹${formatIndianNumber(abs / 1e5, { maximumFractionDigits: 2 })} L`;
  if (abs >= 1e3) return `${sign}₹${formatIndianNumber(abs / 1e3, { maximumFractionDigits: 2 })} K`;
  return formatIndianCurrency(n);
}

/**
 * Format only the leading numeric portion in mixed text (e.g. "1200 Sq.Ft" → "1,200 Sq.Ft").
 * Returns the original string when no safe numeric prefix is found or value is protected.
 */
export function formatIndianNumericText(value, options = {}) {
  if (value == null || value === '') return value ?? '';
  const str = String(value).trim();
  if (isProtectedIdentifier(str)) return str;

  const match = str.match(/^(-?\d+(?:\.\d+)?)(.*)$/);
  if (!match) return str;

  const [, numPart, suffix] = match;
  const formatted = formatIndianNumber(numPart, options);
  const rest = suffix.trim();
  return rest ? `${formatted} ${rest}` : formatted;
}

/** @deprecated Use formatIndianCurrency — kept for gradual migration */
export function formatInr(value, fallback = '—') {
  return formatIndianCurrency(value, { fallback });
}
