import { api } from '../api/client';
import { getAccessToken } from '../api/session';

/** Public search for active approved agents (registration + profile). */
export async function searchReferralAgents(query, { limit = 8, signal } = {}) {
  const q = String(query || '').trim();
  if (q.length < 2) return [];

  const params = new URLSearchParams({ q, limit: String(limit) });
  const token = getAccessToken();
  const data = await api(`/auth/referral-agents/search?${params}`, {
    silent: true,
    token: token || undefined,
    signal,
  });
  return Array.isArray(data) ? data : [];
}
