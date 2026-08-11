import { loaderService } from '../store/loaderStore';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api').replace(/\/$/, '');

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
 *
 * @param {string} path
 * @param {{ method?: string, body?: unknown, token?: string, headers?: Record<string, string>, formData?: FormData, silent?: boolean }} [options]
 *   silent — skip global loader (background polls / non-blocking fetches)
 */
export async function api(path, { method = 'GET', body, token, headers, formData, silent = false } = {}) {
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
    });
  } catch {
    if (!silent) loaderService.hide();
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

/** Origin without /api — used for uploaded asset URLs */
export function getApiOrigin() {
  return API_BASE_URL.replace(/\/api\/?$/, '');
}

export function resolveAssetUrl(pathOrUrl) {
  if (!pathOrUrl) return '';
  const raw = String(pathOrUrl);
  const origin = getApiOrigin();

  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    try {
      const parsed = new URL(raw);
      const host = parsed.hostname.toLowerCase();
      const needsRewrite =
        parsed.origin !== origin &&
        (host === 'your_server_ip' ||
          host === 'localhost' ||
          host === '127.0.0.1' ||
          parsed.pathname.startsWith('/uploads/'));
      if (needsRewrite) {
        return `${origin}${parsed.pathname}${parsed.search}${parsed.hash}`;
      }
    } catch {
      // fall through
    }
    return raw;
  }

  const path = raw.startsWith('/') ? raw : `/${raw}`;
  return `${origin}${path}`;
}

export { API_BASE_URL };
