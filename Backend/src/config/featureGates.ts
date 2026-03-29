export const FEATURE_GATES = {
  BRAND: {
    discovery: ['basic', 'pro', 'enterprise'],
    ai_copilot: ['pro', 'enterprise'],
    shortlists: ['basic', 'pro', 'enterprise'],
    campaign_create: ['basic', 'pro', 'enterprise']
  },
  INFLUENCER: {
    campaign_feed: ['basic', 'pro', 'enterprise'],
    portfolio_upload: ['basic', 'pro', 'enterprise']
  }
} as const;

// MVP: this is intentionally a stub and is not enforced.
export const isSubscriptionGatingActive = false;
