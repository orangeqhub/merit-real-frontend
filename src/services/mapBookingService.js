import { api } from '../api/client';
import { getAccessToken } from '../api/session';

function token() {
  return getAccessToken();
}

export const mapBookingService = {
  async listPlots(params = {}) {
    const qs = new URLSearchParams();
    if (params.status) qs.set('status', params.status);
    if (params.propertyId) qs.set('propertyId', String(params.propertyId));
    if (params.search) qs.set('search', params.search);
    if (params.unique) qs.set('unique', '1');
    if (params.phase === 1 || params.phase === 2 || params.phase === '1' || params.phase === '2') {
      qs.set('phase', String(params.phase));
    }
    qs.set('page', String(params.page || 1));
    qs.set('pageSize', String(Math.min(Number(params.pageSize) || 200, 500)));
    const data = await api(`/map/plots?${qs.toString()}`, { silent: true });
    return {
      items: Array.isArray(data?.items) ? data.items : [],
      total: Number(data?.total) || 0,
      page: Number(data?.page) || 1,
      pageSize: Number(data?.pageSize) || 200,
      totalPages: Number(data?.totalPages) || 1,
    };
  },

  async getPlot(id) {
    return api(`/map/plots/${encodeURIComponent(id)}`, { silent: true });
  },

  async bookPlot(id, body = {}) {
    return api(`/map/plots/${encodeURIComponent(id)}/book`, {
      method: 'POST',
      token: token(),
      body,
    });
  },

  async upsertPlot(body = {}) {
    return api('/map/plots', {
      method: 'POST',
      token: token(),
      body,
    });
  },

  async updatePricing(idOrPlotNo, body = {}) {
    return api(`/map/plots/${encodeURIComponent(idOrPlotNo)}/pricing`, {
      method: 'PATCH',
      token: token(),
      body,
    });
  },

  async bulkPricing(body = {}) {
    return api('/map/plots/pricing/bulk', {
      method: 'POST',
      token: token(),
      body,
    });
  },

  async importSheet({ phase, rows, phase1, phase2 } = {}) {
    if (Array.isArray(phase1) && Array.isArray(phase2)) {
      return api('/map/plots/import', {
        method: 'POST',
        token: token(),
        body: { phase1, phase2 },
      });
    }
    return api('/map/plots/import', {
      method: 'POST',
      token: token(),
      body: { phase, rows },
    });
  },
};

export const MAP_LAYOUT_URL = (
  import.meta.env.VITE_MAP_LAYOUT_URL || 'http://187.127.163.100:3600'
  // || 'http://localhost:5174'
).replace(/\/$/, '');

export const PLOT_STATUS_COLORS = {
  available: '#A5D66A',
  booked: '#FFD54F',
  registered: '#42A5F5',
  sold: '#EF5350',
};

export const PLOT_STATUS_LABELS = {
  available: 'Available',
  booked: 'Booked',
  registered: 'Registered',
  sold: 'Sold',
};

export const PLOT_TYPE_COLORS = {
  residential: null,
  amenities: '#F48FB1',
  commercial: '#FFB74D',
  mortgage: '#CE93D8',
};

export const PLOT_TYPE_LABELS = {
  residential: 'Residential',
  amenities: 'Amenities',
  commercial: 'Commercial',
  mortgage: 'Mortgage',
};
