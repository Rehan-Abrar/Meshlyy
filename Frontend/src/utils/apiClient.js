import { supabase } from './supabaseClient.js';

const API_BASE = (import.meta.env.VITE_API_URL || 'https://meshlyy-backend.onrender.com/v1').replace(/\/$/, '');

let accessTokenGetter = () => null;
const responseCache = new Map();
const inFlightGetRequests = new Map();

export function clearApiCache() {
  responseCache.clear();
  inFlightGetRequests.clear();
}

export function setAccessTokenGetter(getter) {
  accessTokenGetter = typeof getter === 'function' ? getter : () => null;
}

export class ApiError extends Error {
  constructor({ status, code, message, field = null, retryAfter = null, details = null }) {
    super(message || 'Request failed');
    this.name = 'ApiError';
    this.status = status;
    this.code = code || 'UNKNOWN_ERROR';
    this.field = field;
    this.retryAfter = retryAfter;
    this.details = details;
  }
}

export function isApiError(error) {
  return error instanceof ApiError;
}

async function parseJsonSafe(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function buildHeaders(headers = {}, hasBody = false) {
  const merged = { ...headers };

  if (hasBody && !merged['Content-Type']) {
    merged['Content-Type'] = 'application/json';
  }

  const token = accessTokenGetter?.();
  if (token && !merged.Authorization) {
    merged.Authorization = `Bearer ${token}`;
  }

  return merged;
}

function normalizePath(path) {
  return path.startsWith('/') ? path : `/${path}`;
}

function buildCacheKey(path, token, customKey) {
  if (customKey) return String(customKey);
  const normalizedPath = normalizePath(path);
  return `GET:${normalizedPath}:token:${token || 'anon'}`;
}

async function executeRequest(path, method, finalHeaders, hasBody, body, signal) {
  const normalizedPath = normalizePath(path);

  const response = await fetch(`${API_BASE}${normalizedPath}`, {
    method,
    headers: finalHeaders,
    body: hasBody ? JSON.stringify(body) : undefined,
    signal,
  });

  const retryAfterHeader = response.headers.get('Retry-After');
  const retryAfter = retryAfterHeader ? Number(retryAfterHeader) : null;
  const json = await parseJsonSafe(response);

  if (!response.ok) {
    if (response.status === 401) {
      clearApiCache();
      try {
        await supabase.auth.signOut();
      } catch {
        // Continue with redirect even if sign-out fails.
      }

      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }

    const backendError = json?.error;
    throw new ApiError({
      status: response.status,
      code: backendError?.code || `HTTP_${response.status}`,
      message: backendError?.message || response.statusText || 'Request failed',
      field: backendError?.field || null,
      retryAfter: Number.isFinite(retryAfter) ? retryAfter : null,
      details: json,
    });
  }

  if (response.status === 204) return null;
  return json;
}

async function request(path, options = {}) {
  const {
    method = 'GET',
    headers,
    body,
    signal,
    useCache = true,
    forceRefresh = false,
    cacheKey,
  } = options;

  const upperMethod = String(method).toUpperCase();

  const hasBody = body !== undefined && body !== null;
  const finalHeaders = buildHeaders(headers, hasBody);

  const token = accessTokenGetter?.() || '';
  const shouldCacheGet = upperMethod === 'GET' && useCache && !signal;
  const key = shouldCacheGet ? buildCacheKey(path, token, cacheKey) : null;

  if (shouldCacheGet && !forceRefresh) {
    if (responseCache.has(key)) {
      return responseCache.get(key);
    }

    if (inFlightGetRequests.has(key)) {
      return inFlightGetRequests.get(key);
    }
  }

  const requestPromise = executeRequest(path, upperMethod, finalHeaders, hasBody, body, signal);

  if (shouldCacheGet) {
    const trackedRequest = requestPromise
      .then((result) => {
        responseCache.set(key, result);
        return result;
      })
      .finally(() => {
        inFlightGetRequests.delete(key);
      });

    inFlightGetRequests.set(key, trackedRequest);
    return trackedRequest;
  }

  const result = await requestPromise;

  if (upperMethod !== 'GET') {
    clearApiCache();
  }

  return result;
}

export const apiClient = {
  request,
  clearCache: clearApiCache,
  get: (path, options = {}) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options = {}) => request(path, { ...options, method: 'POST', body }),
  patch: (path, body, options = {}) => request(path, { ...options, method: 'PATCH', body }),
  put: (path, body, options = {}) => request(path, { ...options, method: 'PUT', body }),
  delete: (path, options = {}) => request(path, { ...options, method: 'DELETE' }),
};
