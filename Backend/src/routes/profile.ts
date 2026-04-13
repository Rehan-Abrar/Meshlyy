import { Router } from 'express';
import { z } from 'zod';
import { verifyToken, loadAuthContext } from '../middleware/auth';
import { Errors } from '../lib/errors';
import { supabase } from '../config/supabase';
import { brandService } from '../services/BrandService';
import type { AuthenticatedRequest } from '../types/auth';

const router = Router();

router.use(verifyToken, loadAuthContext);

const BrandProfileUpdateSchema = z.object({
  companyName: z.string().min(1).max(200).optional(),
  website: z.string().url().optional(),
  industry: z.string().max(100).optional(),
  targetDemographics: z.record(z.any()).optional(),
  budgetRangeMin: z.number().min(0).optional(),
  budgetRangeMax: z.number().min(0).optional(),
  toneVoice: z.string().max(500).optional(),
  campaignGoals: z.array(z.string()).optional(),
}).strict();

const InfluencerProfileUpdateSchema = z.object({
  nichePrimary: z.string().min(1).max(50).optional(),
  nicheSecondary: z.string().max(50).optional(),
  bio: z.string().max(500).optional(),
  portfolioUrl: z.string().url().optional(),
  mediaKitUrl: z.string().url().optional(),
}).strict();

function ensureNonEmptyPatch(payload: Record<string, unknown>) {
  if (Object.keys(payload).length === 0) {
    throw Errors.VALIDATION_ERROR('At least one field is required', 'body');
  }
}

async function getUserSummary(userId: string) {
  const { data: userRow, error } = await supabase
    .from('users')
    .select('id, email, role, onboarding_completed, onboarding_step')
    .eq('id', userId)
    .eq('is_deleted', false)
    .single();

  if (error || !userRow) {
    throw Errors.USER_NOT_FOUND();
  }

  return {
    id: userRow.id,
    email: userRow.email,
    role: userRow.role,
    onboardingCompleted: Boolean(userRow.onboarding_completed),
    onboardingStep: userRow.onboarding_step || 0,
  };
}

router.get('/me', async (req: AuthenticatedRequest, res, next) => {
  try {
    const auth = req.auth!;
    const user = await getUserSummary(auth.userId);

    let roleProfile: unknown = null;

    if (auth.role === 'BRAND') {
      roleProfile = await brandService.getProfile(auth.userId);
    } else if (auth.role === 'INFLUENCER') {
      const { data: profile, error } = await supabase
        .from('influencer_profiles')
        .select('*')
        .eq('user_id', auth.userId)
        .eq('is_deleted', false)
        .single();

      if (error || !profile) {
        throw Errors.NOT_FOUND('Influencer profile not found');
      }

      roleProfile = profile;
    }

    res.json({ data: { user, role_profile: roleProfile } });
  } catch (error) {
    next(error);
  }
});

router.patch('/me', async (req: AuthenticatedRequest, res, next) => {
  try {
    const auth = req.auth!;

    if (auth.role === 'BRAND') {
      const updates = BrandProfileUpdateSchema.parse(req.body ?? {});
      ensureNonEmptyPatch(updates as Record<string, unknown>);

      const existing = await brandService.getProfile(auth.userId);
      const updated = await brandService.updateProfile(existing.id, updates);
      const user = await getUserSummary(auth.userId);
      return res.json({ data: { user, role_profile: updated } });
    }

    if (auth.role === 'INFLUENCER') {
      const updates = InfluencerProfileUpdateSchema.parse(req.body ?? {});
      ensureNonEmptyPatch(updates as Record<string, unknown>);

      const { data: updated, error } = await supabase
        .from('influencer_profiles')
        .update({
          niche_primary: updates.nichePrimary,
          niche_secondary: updates.nicheSecondary,
          bio: updates.bio,
          portfolio_url: updates.portfolioUrl,
          media_kit_url: updates.mediaKitUrl,
        })
        .eq('user_id', auth.userId)
        .eq('is_deleted', false)
        .select('*')
        .single();

      if (error || !updated) {
        throw Errors.NOT_FOUND('Influencer profile not found');
      }

      const user = await getUserSummary(auth.userId);
      return res.json({ data: { user, role_profile: updated } });
    }

    throw Errors.FORBIDDEN('Profile update is not supported for this role');
  } catch (error) {
    next(error);
  }
});

export default router;
