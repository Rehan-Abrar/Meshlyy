/**
 * Centralized API client for Meshlyy backend.
 *
 * - Reads base URL from VITE_API_BASE_URL (.env)
 * - Auto-attaches Supabase JWT when available
 * - Provides typed convenience methods (get, post, patch, del)
 * - Standardized error handling
 */
import { getAccessToken } from './supabase';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

function notifyUnauthorized() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('meshlyy:unauthorized'));
  }
}

/**
 * Custom error class to surface HTTP details to callers.
 */
export class ApiError extends Error {
  constructor(status, code, message, field) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.field = field;
  }
}

/**
 * Internal request helper.
 * @param {string} method  - HTTP method
 * @param {string} path    - e.g. "/v1/creators"
 * @param {object} [body]  - JSON body (for POST/PATCH)
 * @param {object} [opts]  - Extra options (headers, signal, etc.)
 */
async function request(method, path, body, opts = {}) {
  const token = await getAccessToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(opts.headers || {}),
  };

  const config = {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
    ...(opts.signal ? { signal: opts.signal } : {}),
  };

  const url = `${BASE_URL}${path}`;

  let res;
  try {
    res = await fetch(url, config);
  } catch {
    // Network error / CORS / unreachable
    throw new ApiError(0, 'NETWORK_ERROR', 'Unable to connect to the server. Please check your connection.');
  }

  // 204 No Content
  if (res.status === 204) return null;

  let data;
  try {
    data = await res.json();
  } catch {
    // Permit empty non-JSON responses for success paths.
    if (res.ok) {
      return null;
    }
    throw new ApiError(res.status, 'PARSE_ERROR', 'Unexpected server response.');
  }

  if (!res.ok) {
    const err = data?.error || {};
    if (res.status === 401) {
      notifyUnauthorized();
    }
    throw new ApiError(
      res.status,
      err.code || 'UNKNOWN_ERROR',
      err.message || `Request failed with status ${res.status}`,
      err.field,
    );
  }

  return data;
}

/* ─── Convenience wrappers ─── */

export const api = {
  get:   (path, opts) => request('GET', path, undefined, opts),
  post:  (path, body, opts) => request('POST', path, body, opts),
  patch: (path, body, opts) => request('PATCH', path, body, opts),
  del:   (path, opts) => request('DELETE', path, undefined, opts),
};

/* ─── Domain-specific services ─── */

/** Auth / Onboarding */
export const onboardingApi = {
  getStatus: () => api.get('/v1/onboarding/status'),
  brandOnboard: (data) => api.post('/v1/onboarding/brand', data),
  influencerStep1: (data) => api.post('/v1/onboarding/influencer/step1', data),
  influencerStep2: (data) => api.post('/v1/onboarding/influencer/step2', data),
  influencerStep3: (data) => api.post('/v1/onboarding/influencer/step3', data),
  influencerStep4: (data) => api.post('/v1/onboarding/influencer/step4', data),
  influencerComplete: () => api.post('/v1/onboarding/influencer/complete'),
};

/** Creator Discovery */
export const creatorsApi = {
  discover: (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
    });
    const query = qs.toString();
    return api.get(`/v1/creators${query ? `?${query}` : ''}`);
  },
  getDetail: (id) => api.get(`/v1/creators/${id}`),
};

/** Campaigns */
export const campaignsApi = {
  create: (data) => api.post('/v1/campaigns', data),
  list: (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
    });
    const query = qs.toString();
    return api.get(`/v1/campaigns${query ? `?${query}` : ''}`);
  },
  getById: (id) => api.get(`/v1/campaigns/${id}`),
  update: (id, data) => api.patch(`/v1/campaigns/${id}`, data),
  updateStatus: (id, status) => api.patch(`/v1/campaigns/${id}/status`, { status }),
  remove: (id) => api.del(`/v1/campaigns/${id}`),
  getMatched: (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
    });
    const query = qs.toString();
    return api.get(`/v1/campaigns/matched${query ? `?${query}` : ''}`);
  },
};

/** Shortlists */
export const shortlistsApi = {
  add: (data) => api.post('/v1/shortlists', data),
  list: (campaignId) => {
    const qs = campaignId ? `?campaignId=${campaignId}` : '';
    return api.get(`/v1/shortlists${qs}`);
  },
  remove: (id) => api.del(`/v1/shortlists/${id}`),
};

/** Collaborations */
export const collaborationsApi = {
  sendInvite: (data) => api.post('/v1/collaborations/invite', data),
  apply: (data) => api.post('/v1/collaborations/apply', data),
  updateStatus: (id, status) => api.patch(`/v1/collaborations/${id}/status`, { status }),
  getIncoming: () => api.get('/v1/collaborations/incoming'),
  listForCampaign: (campaignId) => api.get(`/v1/collaborations/campaign/${campaignId}`),
};

/** AI Co-Pilot */
export const aiApi = {
  strategy: (creatorId) => api.post('/v1/ai/strategy', { creator_id: creatorId }),
  brief: (data) => api.post('/v1/ai/brief', data),
  fitScore: (campaignId, creatorId) => api.post('/v1/ai/fit-score', { campaign_id: campaignId, creator_id: creatorId }),
  contentBrief: (data) => api.post('/v1/ai/content-brief', data),
};
