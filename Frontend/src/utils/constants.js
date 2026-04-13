/**
 * Meshlyy Frontend — Constants
 * All token values as JS constants for use in components.
 */

// === ROUTES ===
export const ROUTES = {
  HOME:           '/',
  ROLE_SELECT:    '/role-select',
  SIGNUP_BRAND:   '/signup/brand',
  SIGNUP_CREATOR: '/signup/influencer',

  BRAND_DASHBOARD: '/brand/dashboard',
  BRAND_SEARCH:    '/brand/search',
  BRAND_CAMPAIGNS: '/brand/campaigns/all',
  BRAND_SHORTLIST: '/brand/shortlist',

  INFLUENCER_DASHBOARD: '/influencer/dashboard',
  INFLUENCER_PROFILE:   '/influencer/profile',
  INFLUENCER_INVITES:   '/influencer/invitations',
  INFLUENCER_AI:        '/influencer/ai-assistant',
  INFLUENCER_ANALYTICS: '/influencer/analytics',

  ADMIN_QUEUE:    '/admin/queue',
};

// === ROLES ===
export const ROLES = {
  BRAND:      'brand',
  INFLUENCER: 'influencer',
  ADMIN:      'admin',
};

// === NICHES ===
export const NICHES = [
  'Lifestyle', 'Tech', 'Fitness', 'Finance', 'Fashion',
  'Gaming', 'Beauty', 'Food', 'Travel', 'Education',
];

// === PLATFORMS ===
export const PLATFORMS = ['Instagram', 'YouTube', 'TikTok', 'Twitter', 'LinkedIn', 'Pinterest'];

// === API BASE (replace with actual endpoint) ===
export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
