import { getStoredAuth, getStoredToken } from './authSession';

function getDemoShortlistKey() {
  const email = getStoredAuth()?.user?.email || 'anonymous';
  return `meshlyy.demo.shortlist.${email}`;
}

export function isDemoAuthMode() {
  const token = getStoredToken();
  return typeof token === 'string' && token.startsWith('mock-');
}

export function getDemoShortlistIds() {
  try {
    const raw = localStorage.getItem(getDemoShortlistKey());
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addDemoShortlistId(influencerId) {
  const current = getDemoShortlistIds();
  if (current.includes(influencerId)) return;
  const next = [...current, influencerId];
  localStorage.setItem(getDemoShortlistKey(), JSON.stringify(next));
}

export function removeDemoShortlistId(influencerId) {
  const next = getDemoShortlistIds().filter((id) => id !== influencerId);
  localStorage.setItem(getDemoShortlistKey(), JSON.stringify(next));
}
