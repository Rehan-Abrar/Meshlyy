export type UserRole = 'BRAND' | 'INFLUENCER' | 'ADMIN';

export interface AuthContext {
  userId: string;
  role: UserRole;
  brandId?: string;
  onboardingCompleted: boolean;
  subscriptionTier?: string;
  subscriptionStatus?: string;
}

export interface TokenPayload {
  sub: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}
