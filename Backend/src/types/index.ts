// Core type definitions for Meshly backend

export type UserRole = 'BRAND' | 'INFLUENCER' | 'ADMIN';

export type VerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'FLAGGED';

export type CampaignStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED';

export type CampaignVisibility = 'PRIVATE' | 'MATCHED';

export type CollaborationType = 'INVITE' | 'APPLICATION';

export type CollaborationStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CLARIFICATION_REQUESTED';

export type IngestStatus = 'pending' | 'running' | 'success' | 'partial_success' | 'failed';

export type IngestFailureClass =
  | 'rate_limited'
  | 'platform_unavailable'
  | 'handle_not_found'
  | 'handle_private'
  | 'parse_error'
  | 'partial_success'
  | 'budget_exceeded'
  | 'duplicate_handle';

export type SubscriptionTier = 'trial' | 'basic' | 'pro' | 'enterprise';

export type SubscriptionStatus = 'ACTIVE' | 'INACTIVE' | 'TRIAL' | 'CANCELLED';

export type RateCardServiceType = 'STORY' | 'POST' | 'REEL' | 'BUNDLE';

export interface AuthContext {
  userId: string;
  role: UserRole;
  brandId?: string;
  onboardingCompleted: boolean;
  onboardingStep?: number;
  subscriptionTier?: SubscriptionTier;
  subscriptionStatus?: SubscriptionStatus;
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    field?: string;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginationResponse {
  page: number;
  limit: number;
  total: number;
  hasNext: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationResponse;
}
