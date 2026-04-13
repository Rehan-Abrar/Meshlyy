import { getStoredAuth } from './authSession';

const DEMO_CAMPAIGNS_KEY_PREFIX = 'meshlyy.demo.campaigns.';

function getDemoCampaignsKey() {
  const email = getStoredAuth()?.user?.email || 'anonymous';
  return `${DEMO_CAMPAIGNS_KEY_PREFIX}${email}`;
}

export function getDemoCampaigns() {
  try {
    const raw = localStorage.getItem(getDemoCampaignsKey());
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function upsertDemoCampaign(campaign) {
  const current = getDemoCampaigns();
  const nextCampaign = {
    id: campaign.id || `demo-campaign-${Date.now()}`,
    title: campaign.title,
    brief_preview: campaign.brief_preview || campaign.briefPreview || '',
    brief_data: campaign.brief_data || campaign.briefData || {},
    budget: Number(campaign.budget || 0),
    currency: campaign.currency || 'USD',
    niche_targets: campaign.niche_targets || campaign.nicheTargets || [],
    visibility: campaign.visibility || 'MATCHED',
    status: campaign.status || 'ACTIVE',
    created_at: campaign.created_at || new Date().toISOString(),
  };

  const next = [nextCampaign, ...current.filter((item) => item.id !== nextCampaign.id)];
  localStorage.setItem(getDemoCampaignsKey(), JSON.stringify(next));
  return nextCampaign;
}

export function getVisibleDemoCampaigns() {
  return getDemoCampaigns().filter((campaign) => campaign.status === 'ACTIVE');
}
