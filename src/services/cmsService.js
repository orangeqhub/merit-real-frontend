import { api } from '../api/client';
import { getAccessToken } from '../api/session';

const EMPTY_CMS = {
  aboutEn: '',
  aboutTe: '',
  disclaimerEn: '',
  disclaimerTe: '',
  contactPhone: '',
  contactWhatsapp: '',
  contactEmail: '',
  contactAddressEn: '',
  contactAddressTe: '',
  contactLandmarkEn: '',
  contactLandmarkTe: '',
  contactMapUrl: '',
  businessHoursWeekdayEn: '',
  businessHoursWeekdayTe: '',
  businessHoursSundayEn: '',
  businessHoursSundayTe: '',
};

export const cmsService = {
  async getCms() {
    try {
      const data = await api('/cms', { silent: true });
      return { ...EMPTY_CMS, ...(data || {}) };
    } catch {
      return { ...EMPTY_CMS };
    }
  },
  async updateCms(payload) {
    return api('/cms', {
      method: 'PUT',
      token: getAccessToken(),
      body: payload,
    });
  },
};

export const contactEnquiryService = {
  async submit(payload) {
    return api('/contact-enquiries', { method: 'POST', body: payload });
  },

  async list(params = {}) {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v != null && v !== '') q.set(k, v);
    });
    const qs = q.toString();
    return api(`/contact-enquiries${qs ? `?${qs}` : ''}`, { token: getAccessToken() });
  },

  async getById(id) {
    return api(`/contact-enquiries/${id}`, { token: getAccessToken() });
  },

  async updateStatus(id, status) {
    return api(`/contact-enquiries/${id}/status`, {
      method: 'PATCH',
      token: getAccessToken(),
      body: { status },
    });
  },
};
