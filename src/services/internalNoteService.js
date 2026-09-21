import { api } from '../api/client';
import { getAccessToken } from '../api/session';

function token() {
  return getAccessToken();
}

export const internalNoteService = {
  async getForRecord(_user, recordType, recordId) {
    if (recordType === 'enquiry') {
      const data = await api(`/express-interests/${recordId}/internal-notes`, { token: token() });
      return Array.isArray(data) ? data : (data?.items || []);
    }
    return [];
  },

  async addNote(_user, payload) {
    if (payload.recordType === 'enquiry') {
      return api(`/express-interests/${payload.recordId}/internal-notes`, {
        method: 'POST',
        token: token(),
        body: { text: payload.text },
      });
    }
    throw new Error('Unsupported record type for internal notes.');
  },

  async updateNote() {
    throw new Error('Editing internal notes is not supported yet.');
  },

  async deleteNote() {
    throw new Error('Deleting internal notes is not supported yet.');
  },
};
