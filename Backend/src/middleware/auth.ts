// Authentication middleware stack

import { Request, Response, NextFunction } from 'express';
import { verifySupabaseJWT } from '../config/supabase';
import { supabase } from '../config/supabase';
import { AuthContext, UserRole } from '../types';
import { Errors, sendError, AppError } from '../lib/errors';

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
    const user = await verifySupabaseJWT(token);
    
    // Attach user ID to request for loadAuthContext
    (req as any).supabaseUserId = user.id;
    (req as any).supabaseToken = token;
    
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
    
    if (!supabaseUserId) {
      throw Errors.INVALID_TOKEN();
    }
    
    // Query user with retry logic for provisioning race conditions
    let user = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      const { data, error } = await supabase
        .from('users')
        .select('id, role, onboarding_completed, is_deleted')
        .eq('id', supabaseUserId)
        .eq('is_deleted', false)
        .single();
      
      if (data) {
        user = data;
        break;
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
    };
    
    // If BRAND, load brand_id
    if (user.role === 'BRAND') {
      const { data: brandProfile } = await supabase
        .from('brand_profiles')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_deleted', false)
        .single();
      
      if (brandProfile) {
        authContext.brandId = brandProfile.id;
      }
    }
    
    // Attach to request
    req.authContext = authContext;
    
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
export function checkRole(allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.authContext) {
      return sendError(res, 401, 'INVALID_TOKEN', 'Authentication required');
    }
    
    if (!allowedRoles.includes(req.authContext.role)) {
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
