// Brand onboarding service
import { supabase } from '../config/supabase';
import type { AuthContext } from '../types/auth';
import { Errors } from '../lib/errors';

export interface BrandOnboardingData {
  companyName: string;
  website?: string;
  industry?: string;
  targetDemographics?: Record<string, any>;
  budgetRangeMin?: number;
  budgetRangeMax?: number;
  toneVoice?: string;
  campaignGoals?: string[];
}

export class BrandService {
  /**
   * Complete brand onboarding
   * Creates brand_profile and marks onboarding as complete
   */
  async completeOnboarding(
    userId: string,
    data: BrandOnboardingData
  ): Promise<{ brandId: string }> {
    // Check if brand profile already exists
    const { data: existing } = await supabase
      .from('brand_profiles')
      .select('id')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .single();

    if (existing) {
      throw Errors.VALIDATION_ERROR('Brand profile already exists', 'user_id');
    }

    // Create brand profile
    const { data: brandProfile, error: profileError } = await supabase
      .from('brand_profiles')
      .insert({
        user_id: userId,
        company_name: data.companyName,
        website: data.website,
        industry: data.industry,
        target_demographics: data.targetDemographics,
        budget_range_min: data.budgetRangeMin,
        budget_range_max: data.budgetRangeMax,
        tone_voice: data.toneVoice,
        campaign_goals: data.campaignGoals,
      })
      .select('id')
      .single();

    if (profileError || !brandProfile) {
      throw Errors.DATABASE_ERROR();
    }

    // Mark onboarding as complete
    const { error: updateError } = await supabase
      .from('users')
      .update({
        onboarding_completed: true,
        onboarding_step: 5, // Final step
      })
      .eq('id', userId);

    if (updateError) {
      throw Errors.DATABASE_ERROR();
    }

    return { brandId: brandProfile.id };
  }

  /**
   * Get brand profile by user ID
   */
  async getProfile(userId: string) {
    const { data, error } = await supabase
      .from('brand_profiles')
      .select('*')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .single();

    if (error || !data) {
      throw Errors.NOT_FOUND('Brand profile not found');
    }

    return data;
  }

  /**
   * Update brand profile
   */
  async updateProfile(brandId: string, updates: Partial<BrandOnboardingData>) {
    const { data, error } = await supabase
      .from('brand_profiles')
      .update({
        company_name: updates.companyName,
        website: updates.website,
        industry: updates.industry,
        target_demographics: updates.targetDemographics,
        budget_range_min: updates.budgetRangeMin,
        budget_range_max: updates.budgetRangeMax,
        tone_voice: updates.toneVoice,
        campaign_goals: updates.campaignGoals,
      })
      .eq('id', brandId)
      .eq('is_deleted', false)
      .select()
      .single();

    if (error || !data) {
      throw Errors.NOT_FOUND('Brand profile not found');
    }

    return data;
  }
}

export const brandService = new BrandService();
