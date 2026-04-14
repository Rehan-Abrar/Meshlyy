// Authentication middleware stack

import { Request, Response, NextFunction } from 'express';
import { verifySupabaseJWT } from '../config/supabase';
import { supabase } from '../config/supabase';
import { AuthContext, UserRole } from '../types';
import { Errors, sendError, AppError } from '../lib/errors';

type SupabaseJwtUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
  app_metadata?: Record<string, unknown> | null;
};

function normalizeUserRole(rawRole: unknown): UserRole {
  const upper = String(rawRole || '').toUpperCase();
  if (upper === 'BRAND' || upper === 'INFLUENCER' || upper === 'ADMIN') {
    return upper as UserRole;
  }
  return 'INFLUENCER';
}

function deriveCompanyName(email: string | undefined, userId: string): string {
  const prefix = (email || '').split('@')[0]?.trim();
  if (prefix) {
    return prefix
      .replace(/[._-]+/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }
  return `Brand ${userId.slice(0, 8)}`;
}

// Extend Express Request to include authContext
declare global {
  namespace Express {
    interface Request {
      authContext?: AuthContext;
    }
  }
}

/**
 * Middleware 1: verifyToken
 * Validates JWT signature using Supabase's public key
 * Returns 401 if invalid or expired
 */
export async function verifyToken(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw Errors.INVALID_TOKEN();
    }
    
    const token = authHeader.substring(7);
    
    // Verify JWT with Supabase
    const user = await verifySupabaseJWT(token) as SupabaseJwtUser;
    
    // Attach user ID to request for loadAuthContext
    (req as any).supabaseUserId = user.id;
    (req as any).supabaseUser = {
      id: user.id,
      email: user.email,
      user_metadata: user.user_metadata,
      app_metadata: user.app_metadata,
    } as SupabaseJwtUser;
    
    next();
  } catch (error) {
    if (error instanceof AppError) {
      return sendError(res, error.statusCode, error.code, error.message, error.field);
    }
    return sendError(res, 401, 'INVALID_TOKEN', 'JWT missing, expired, or invalid');
  }
}

/**
 * Middleware 2: loadAuthContext
 * Queries users and brand_profiles to populate req.authContext
 * Returns 401 if user row not found
 */
export async function loadAuthContext(req: Request, res: Response, next: NextFunction) {
  try {
    const supabaseUserId = (req as any).supabaseUserId;
    const supabaseUser = (req as any).supabaseUser as SupabaseJwtUser | undefined;
    const isOnboardingRoute = req.originalUrl.startsWith('/v1/onboarding');
    
    if (!supabaseUserId) {
      throw Errors.INVALID_TOKEN();
    }
    
    // Query user with retry logic for provisioning race conditions
    let user = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, role, onboarding_completed, onboarding_step, is_deleted')
        .eq('id', supabaseUserId)
        .eq('is_deleted', false)
        .single();
      
      if (data) {
        user = data;
        break;
      }

      // Auto-provision real Supabase users if auth is valid but users row is not created yet.
      if (!data && supabaseUser && supabaseUser.id === supabaseUserId) {
        const resolvedRole = normalizeUserRole(
          supabaseUser.user_metadata?.role ?? supabaseUser.app_metadata?.role
        );

        await supabase.from('users').upsert({
          id: supabaseUser.id,
          email: supabaseUser.email || `${supabaseUser.id}@unknown.local`,
          role: resolvedRole,
          onboarding_step: 0,
          onboarding_completed: false,
          is_deleted: false,
        }, { onConflict: 'id' });
      }
      
      if (attempt === 0) {
        // Wait 250ms before retry
        await new Promise(resolve => setTimeout(resolve, 250));
      }
    }
    
    if (!user) {
      throw Errors.USER_NOT_FOUND();
    }
    
    // Build authContext
    const authContext: AuthContext = {
      userId: user.id,
      role: user.role as UserRole,
      onboardingCompleted: user.onboarding_completed,
      onboardingStep: user.onboarding_step,
    };
    
    // If BRAND, load brand_id
    if (user.role === 'BRAND') {
      let { data: brandProfile } = await supabase
        .from('brand_profiles')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_deleted', false)
        .single();

      // Self-heal legacy brand users on non-onboarding routes.
      // This avoids USER_NOT_FOUND / missing profile failures for older accounts,
      // while keeping explicit onboarding flows untouched.
      if (!brandProfile && !isOnboardingRoute) {
        const { data: provisioned, error: provisionError } = await supabase
          .from('brand_profiles')
          .upsert({
            user_id: user.id,
            company_name: deriveCompanyName(user.email, user.id),
            industry: 'General',
            is_deleted: false,
          }, { onConflict: 'user_id' })
          .select('id')
          .single();

        if (!provisionError && provisioned) {
          brandProfile = provisioned;
          await supabase
            .from('users')
            .update({ onboarding_completed: true, onboarding_step: 5 })
            .eq('id', user.id)
            .eq('is_deleted', false);

          user.onboarding_completed = true;
          user.onboarding_step = 5;
        }
      }

      // If a brand profile exists but onboarding flags are stale, heal them.
      if (brandProfile && !user.onboarding_completed && !isOnboardingRoute) {
        await supabase
          .from('users')
          .update({ onboarding_completed: true, onboarding_step: 5 })
          .eq('id', user.id)
          .eq('is_deleted', false);

        user.onboarding_completed = true;
        user.onboarding_step = 5;
      }
      
      if (brandProfile) {
        authContext.brandId = brandProfile.id;
      }
    }
    
    // Attach to request
    req.authContext = authContext;
    (req as any).auth = authContext;
    
    next();
  } catch (error) {
    if (error instanceof AppError) {
      return sendError(res, error.statusCode, error.code, error.message, error.field);
    }
    return sendError(res, 503, 'AUTH_CONTEXT_UNAVAILABLE', 'Authentication context unavailable');
  }
}

/**
 * Middleware 3: checkRole
 * Asserts required role from req.authContext.role
 * Returns 403 if mismatched
 */
export function checkRole(allowedRoles: UserRole | UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.authContext) {
      return sendError(res, 401, 'INVALID_TOKEN', 'Authentication required');
    }
    
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    if (!roles.includes(req.authContext.role)) {
      return sendError(res, 403, 'FORBIDDEN', 'You do not have permission to access this resource');
    }
    
    next();
  };
}

/**
 * Middleware 4: onboardingGuard
 * Blocks access if onboarding not completed
 * Allows: public pages, auth endpoints, onboarding endpoints
 * Returns 403 with redirect hint
 */
export function onboardingGuard(req: Request, res: Response, next: NextFunction) {
  if (!req.authContext) {
    return next();
  }
  
  // Skip guard for onboarding and auth routes
  if (req.path.startsWith('/v1/auth') || req.path.startsWith('/v1/onboarding')) {
    return next();
  }
  
  if (!req.authContext.onboardingCompleted) {
    return res.status(403).json({
      error: {
        code: 'ONBOARDING_INCOMPLETE',
        message: 'Please complete onboarding',
        redirect: '/onboarding/step/1' // Simplified - should use actual step from DB
      }
    });
  }
  
  next();
}

/**
 * Middleware 5: subscriptionGuard (MVP: pass-through)
 * Post-MVP: checks req.authContext.subscriptionTier against FEATURE_GATES
 * MVP behavior: always next()
 */
export function subscriptionGuard(req: Request, res: Response, next: NextFunction) {
  // MVP: No gating, always pass through
  next();
  
  // Post-MVP implementation:
  // const requiredTier = getRequiredTier(req.path, req.authContext.role);
  // if (!hasAccess(req.authContext.subscriptionTier, requiredTier)) {
  //   return sendError(res, 403, 'SUBSCRIPTION_REQUIRED', 'Subscription tier insufficient');
  // }
}
