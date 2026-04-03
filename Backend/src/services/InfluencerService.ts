// Influencer onboarding service
import { supabase } from '../config/supabase';
import { Errors } from '../lib/errors';

export interface InfluencerOnboardingStep1 {
  igHandle: string;
}

export interface InfluencerOnboardingStep2 {
  nichePrimary: string;
  nicheSecondary?: string;
  bio?: string;
}

export interface InfluencerOnboardingStep3 {
  portfolioUrl?: string;
  mediaKitUrl?: string;
}

export interface RateCardInput {
  serviceType: 'STORY' | 'POST' | 'REEL' | 'BUNDLE';
  price: number;
  currency: string;
}

export interface InfluencerOnboardingStep4 {
  rateCards: RateCardInput[];
}

export class InfluencerService {
  /**
   * Step 1: Validate and save Instagram handle
   * Checks uniqueness using partial unique index
   */
  async submitStep1(userId: string, data: InfluencerOnboardingStep1) {
    const handle = data.igHandle.toLowerCase().trim();

    // Validate handle format (basic Instagram handle rules)
    if (!/^[a-z0-9._]{1,30}$/.test(handle)) {
      throw Errors.VALIDATION_ERROR(
        'Invalid Instagram handle format. Use only letters, numbers, dots, and underscores.',
        'igHandle'
      );
    }

    // Check if handle is already taken (partial unique index will enforce this)
    const { data: existing } = await supabase
      .from('influencer_profiles')
      .select('id, user_id')
      .eq('ig_handle', handle)
      .eq('is_deleted', false)
      .maybeSingle();

    if (existing && existing.user_id !== userId) {
      throw Errors.VALIDATION_ERROR(
        'This Instagram handle is already registered',
        'igHandle'
      );
    }

    // Check resubmission limits if profile exists
    if (existing && existing.user_id === userId) {
      const { data: profile } = await supabase
        .from('influencer_profiles')
        .select('resubmission_count, last_resubmitted_at, verification_status')
        .eq('id', existing.id)
        .single();

      if (profile) {
        // Check max resubmissions (5 attempts)
        if (profile.resubmission_count >= 5) {
          throw Errors.VALIDATION_ERROR(
            'Maximum resubmission attempts (5) reached. Please contact support.',
            'igHandle'
          );
        }

        // Check 24-hour cooldown
        if (profile.last_resubmitted_at) {
          const hoursSinceLastSubmit = Math.floor(
            (Date.now() - new Date(profile.last_resubmitted_at).getTime()) / (1000 * 60 * 60)
          );
          if (hoursSinceLastSubmit < 24) {
            throw Errors.VALIDATION_ERROR(
              `Please wait ${24 - hoursSinceLastSubmit} more hours before resubmitting`,
              'igHandle'
            );
          }
        }
      }
    }

    // Create or update profile with handle only
    if (existing) {
      // Update existing profile for resubmission
      const { data: currentProfile } = await supabase
        .from('influencer_profiles')
        .select('resubmission_count')
        .eq('id', existing.id)
        .single();

      await supabase
        .from('influencer_profiles')
        .update({
          ig_handle: handle,
          last_resubmitted_at: new Date().toISOString(),
          resubmission_count: (currentProfile?.resubmission_count || 0) + 1,
          verification_status: 'PENDING',
        })
        .eq('id', existing.id);
    } else {
      // Create new profile
      await supabase.from('influencer_profiles').insert({
        user_id: userId,
        ig_handle: handle,
        niche_primary: '', // Will be filled in step 2
      });
    }

    // Update user onboarding step
    await supabase
      .from('users')
      .update({ onboarding_step: 1 })
      .eq('id', userId);

    return { success: true };
  }

  /**
   * Step 2: Save niche and bio
   */
  async submitStep2(userId: string, data: InfluencerOnboardingStep2) {
    const { data: profile } = await supabase
      .from('influencer_profiles')
      .select('id')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .single();

    if (!profile) {
      throw Errors.NOT_FOUND('Influencer profile not found. Please complete step 1 first.');
    }

    await supabase
      .from('influencer_profiles')
      .update({
        niche_primary: data.nichePrimary,
        niche_secondary: data.nicheSecondary,
        bio: data.bio,
      })
      .eq('id', profile.id);

    await supabase
      .from('users')
      .update({ onboarding_step: 2 })
      .eq('id', userId);

    return { success: true };
  }

  /**
   * Step 3: Save portfolio and media kit URLs
   */
  async submitStep3(userId: string, data: InfluencerOnboardingStep3) {
    const { data: profile } = await supabase
      .from('influencer_profiles')
      .select('id')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .single();

    if (!profile) {
      throw Errors.NOT_FOUND('Influencer profile not found');
    }

    await supabase
      .from('influencer_profiles')
      .update({
        portfolio_url: data.portfolioUrl,
        media_kit_url: data.mediaKitUrl,
      })
      .eq('id', profile.id);

    await supabase
      .from('users')
      .update({ onboarding_step: 3 })
      .eq('id', userId);

    return { success: true };
  }

  /**
   * Step 4: Save rate cards
   */
  async submitStep4(userId: string, data: InfluencerOnboardingStep4) {
    const { data: profile } = await supabase
      .from('influencer_profiles')
      .select('id, ig_handle')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .single();

    if (!profile) {
      throw Errors.NOT_FOUND('Influencer profile not found');
    }

    // Save rate cards
    const rateCardInserts = data.rateCards.map((rc) => ({
      influencer_id: profile.id,
      service_type: rc.serviceType,
      price: rc.price,
      currency: rc.currency,
    }));

    await supabase.from('rate_cards').insert(rateCardInserts);

    // Update onboarding step to 4 (not completed yet)
    await supabase
      .from('users')
      .update({
        onboarding_step: 4,
      })
      .eq('id', userId);

    return { 
      success: true,
    };
  }

  /**
   * Step 5: Complete onboarding
   * Marks onboarding as complete and triggers verification ingest job
   */
  async completeOnboarding(userId: string) {
    const { data: profile } = await supabase
      .from('influencer_profiles')
      .select('id, ig_handle')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .single();

    if (!profile) {
      throw Errors.NOT_FOUND('Influencer profile not found');
    }

    // Mark onboarding as complete
    await supabase
      .from('users')
      .update({
        onboarding_completed: true,
        onboarding_step: 5,
      })
      .eq('id', userId);

    // Return profile ID and handle for ingest trigger
    return { 
      success: true,
      profileId: profile.id,
      igHandle: profile.ig_handle
    };
  }

  /**
   * Get influencer profile by user ID
   */
  async getProfile(userId: string) {
    const { data, error } = await supabase
      .from('influencer_profiles')
      .select('*, rate_cards(*), influencer_stats(*)')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .single();

    if (error || !data) {
      throw Errors.NOT_FOUND('Influencer profile not found');
    }

    return data;
  }
}

export const influencerService = new InfluencerService();
