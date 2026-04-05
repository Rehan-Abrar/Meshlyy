// Brand ownership enforcement helpers
import { Errors } from '../lib/errors';
import type { AuthContext } from '../types/auth';

/**
 * Assert that the authenticated brand owns the specified resource
 * Throws FORBIDDEN error if ownership check fails
 * 
 * @param authContext - Authenticated user's context
 * @param resourceBrandId - Brand ID that owns the resource
 * @throws FORBIDDEN if brand_id mismatch or user is not a brand
 */
export function assertBrandOwnership(authContext: AuthContext, resourceBrandId: string): void {
  // Only brands can own resources
  if (authContext.role !== 'BRAND') {
    throw Errors.FORBIDDEN('Only brands can access this resource');
  }

  // Brand must have a brandId in auth context
  if (!authContext.brandId) {
    throw Errors.FORBIDDEN('Brand profile not found');
  }

  // Resource must belong to this brand
  if (authContext.brandId !== resourceBrandId) {
    throw Errors.FORBIDDEN('You do not have permission to access this resource');
  }
}

/**
 * Get brand ID from auth context
 * Throws FORBIDDEN if user is not a brand or has no brand profile
 * 
 * @param authContext - Authenticated user's context
 * @returns Brand ID
 * @throws FORBIDDEN if not a brand or no brand profile
 */
export function getBrandId(authContext: AuthContext): string {
  if (authContext.role !== 'BRAND') {
    throw Errors.FORBIDDEN('Only brands can perform this action');
  }

  if (!authContext.brandId) {
    throw Errors.FORBIDDEN('Brand profile not found. Please complete onboarding first.');
  }

  return authContext.brandId;
}
