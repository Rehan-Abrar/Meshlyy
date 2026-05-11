import type { SubscriptionTier, UserRole } from '../types';

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

export type BrandFeatureGate = keyof typeof FEATURE_GATES.BRAND;
export type InfluencerFeatureGate = keyof typeof FEATURE_GATES.INFLUENCER;
export type FeatureGateRole = Exclude<UserRole, 'ADMIN'>;

const SUBSCRIPTION_TIERS: SubscriptionTier[] = ['trial', 'basic', 'pro', 'enterprise'];

export const isSubscriptionGatingActive = String(process.env.SUBSCRIPTION_GATING_ACTIVE || '').toLowerCase() === 'true';

export function normalizeSubscriptionTier(value: unknown): SubscriptionTier {
  const tier = String(value || '').toLowerCase() as SubscriptionTier;
  return SUBSCRIPTION_TIERS.includes(tier) ? tier : 'trial';
}

export function hasFeatureAccess(
  role: FeatureGateRole,
  feature: BrandFeatureGate | InfluencerFeatureGate,
  tier: SubscriptionTier
): boolean {
  if (role === 'BRAND') {
    const allowedTiers = (FEATURE_GATES.BRAND[feature as BrandFeatureGate] || []) as readonly SubscriptionTier[];
    return allowedTiers.includes(tier);
  }

  const allowedTiers = (FEATURE_GATES.INFLUENCER[feature as InfluencerFeatureGate] || []) as readonly SubscriptionTier[];
  return allowedTiers.includes(tier);
}
