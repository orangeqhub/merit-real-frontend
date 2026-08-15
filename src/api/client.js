import { loaderService } from '../store/loaderStore';

/** Canonical production API origin for uploads & media. */
// export const SERVER_ORIGIN = 'http://localhost:3001';
export const SERVER_ORIGIN = 'http://187.127.163.100:3500';

const BAD_HOST_RE =
  /^(your_server_ip|localhost|127\.0\.0\.1)$/i;

function stripTrailingSlash(value) {
  return String(value || '').replace(/\/$/, '');
}

/**
 * Normalize any host/origin string; placeholder hosts always become SERVER_ORIGIN.
 */
export function sanitizeOrigin(value) {
  const raw = stripTrailingSlash(value);
  if (!raw) return SERVER_ORIGIN;
  try {
    const withProtocol = /^https?:\/\//i.test(raw) ? raw : `http://${raw}`;
    const parsed = new URL(withProtocol);
    if (BAD_HOST_RE.test(parsed.hostname)) return SERVER_ORIGIN;
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    if (/your_server_ip/i.test(raw) || /localhost/i.test(raw) || /127\.0\.0\.1/.test(raw)) {
      return SERVER_ORIGIN;
    }
    return SERVER_ORIGIN;
  }
}

const configuredBase = stripTrailingSlash(
  import.meta.env.VITE_API_BASE_URL || `${SERVER_ORIGIN}/api`
);

// If env was baked with your_server_ip, fall back to the real origin.
const API_BASE_URL = (() => {
  try {
    const probe = configuredBase.startsWith('http')
      ? configuredBase
      : `${SERVER_ORIGIN}${configuredBase.startsWith('/') ? '' : '/'}${configuredBase}`;
    const parsed = new URL(probe);
    if (BAD_HOST_RE.test(parsed.hostname)) return `${SERVER_ORIGIN}/api`;
    return stripTrailingSlash(configuredBase.includes('/api')
      ? configuredBase
      : `${sanitizeOrigin(configuredBase)}/api`);
  } catch {
    return `${SERVER_ORIGIN}/api`;
  }
})();

export class ApiError extends Error {
  constructor(message, { status, code, errors } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.errors = errors || [];
  }
}

/**
 * Thin fetch wrapper for merit-api.
 * Expects response shape: { success, message, data, errors, code }
 */
export async function api(path, { method = 'GET', body, token, headers, formData, silent = false, signal } = {}) {
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

  const requestHeaders = {
    Accept: 'application/json',
    ...(formData ? {} : body != null ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...headers,
  };

  if (!silent) loaderService.show();

  let response;
  try {
    response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: formData || (body != null ? JSON.stringify(body) : undefined),
      signal,
    });
  } catch (err) {
    if (!silent) loaderService.hide();
    if (err?.name === 'AbortError') throw err;
    throw new ApiError('Unable to reach the server. Is merit-api running?', {
      status: 0,
      code: 'NETWORK_ERROR',
    });
  }

  let payload = null;
  try {
    const text = await response.text();
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = null;
      }
    }

    if (!response.ok || payload?.success === false) {
      throw new ApiError(payload?.message || `Request failed (${response.status})`, {
        status: response.status,
        code: payload?.code || 'REQUEST_ERROR',
        errors: payload?.errors || [],
      });
    }

    return payload?.data !== undefined ? payload.data : payload;
  } finally {
    if (!silent) loaderService.hide();
  }
}

/** Origin without /api — always a real reachable host (never your_server_ip). */
export function getApiOrigin() {
  const fromBase = API_BASE_URL.replace(/\/api\/?$/, '');
  return sanitizeOrigin(fromBase || SERVER_ORIGIN);
}

/**
 * Resolve upload / media URLs to the live server.
 * Rewrites placeholders (your_server_ip, localhost) and relative /uploads paths.
 * Leaves already-correct absolute URLs unchanged.
 */
export function resolveAssetUrl(pathOrUrl) {
  if (pathOrUrl == null || pathOrUrl === '') return '';
  let raw = String(pathOrUrl).trim();
  if (!raw) return '';

  // Keep blob:/data: URLs (local previews) untouched.
  if (/^(blob:|data:)/i.test(raw)) return raw;

  // Protocol-relative //host/...
  if (raw.startsWith('//')) raw = `http:${raw}`;

  // Host without scheme: your_server_ip:3500/uploads/...
  if (/^your_server_ip(?::\d+)?(\/|$)/i.test(raw) || /^localhost(?::\d+)?(\/|$)/i.test(raw) || /^127\.0\.0\.1(?::\d+)?(\/|$)/i.test(raw)) {
    raw = `http://${raw}`;
  }

  // String-level placeholder rewrite (covers http/https + optional port).
  raw = raw
    .replace(/https?:\/\/your_server_ip(?::\d+)?/gi, SERVER_ORIGIN)
    .replace(/https?:\/\/localhost(?::\d+)?/gi, SERVER_ORIGIN)
    .replace(/https?:\/\/127\.0\.0\.1(?::\d+)?/gi, SERVER_ORIGIN);

  const origin = getApiOrigin();

  if (/^https?:\/\//i.test(raw)) {
    try {
      const parsed = new URL(raw);
      if (BAD_HOST_RE.test(parsed.hostname)) {
        return `${SERVER_ORIGIN}${parsed.pathname}${parsed.search}${parsed.hash}`;
      }
      // Already on the real production origin — keep as-is.
      if (sanitizeOrigin(parsed.origin) === SERVER_ORIGIN) {
        return `${SERVER_ORIGIN}${parsed.pathname}${parsed.search}${parsed.hash}`;
      }
      // Other absolute URLs (CDN, etc.) — keep unless it's an /uploads path we own.
      if (parsed.pathname.startsWith('/uploads/')) {
        return `${SERVER_ORIGIN}${parsed.pathname}${parsed.search}${parsed.hash}`;
      }
      return raw;
    } catch {
      return raw.replace(/your_server_ip/gi, '187.127.163.100');
    }
  }

  const path = raw.startsWith('/') ? raw : `/${raw}`;
  return `${origin}${path}`;
}

export { API_BASE_URL };
