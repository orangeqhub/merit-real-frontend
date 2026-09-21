import { api } from '../api/client';
import { getAccessToken } from '../api/session';

function token() {
  return getAccessToken();
}

export const callNoteService = {
  async getForEnquiry(enquiryId) {
    const data = await api(`/express-interests/${enquiryId}/call-notes`, { token: token() });
    return Array.isArray(data) ? data : (data?.items || []);
  },

  async addCallNote(_user, payload) {
    return api(`/express-interests/${payload.enquiryId}/call-notes`, {
      method: 'POST',
      token: token(),
      body: {
        direction: payload.direction,
        result: payload.result,
        summary: payload.summary,
        interestLevel: payload.interestLevel,
        nextAction: payload.nextAction,
        nextFollowUpAt: payload.nextFollowUpAt || null,
        callDateTime: payload.callDateTime || null,
      },
    });
  },
};
