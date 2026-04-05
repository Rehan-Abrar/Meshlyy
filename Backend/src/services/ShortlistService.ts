// Shortlist service
import { supabase } from '../config/supabase';
import { Errors } from '../lib/errors';
import { assertBrandOwnership, getBrandId } from '../lib/ownership';
import type { AuthContext } from '../types/auth';

export interface AddToShortlistInput {
  influencerId: string;
  campaignId?: string;
  label?: string;
}

export interface Shortlist {
  id: string;
  brand_id: string;
  influencer_id: string;
  campaign_id: string | null;
  label: string | null;
  created_at: string;
}

export class ShortlistService {
  /**
   * Add influencer to shortlist
   * Can be campaign-specific or general
   */
  async add(authContext: AuthContext, input: AddToShortlistInput): Promise<Shortlist> {
    const brandId = getBrandId(authContext);

    // If campaign_id provided, verify ownership and existence
    if (input.campaignId) {
      const { data: campaign } = await supabase
        .from('campaigns')
        .select('id, brand_id')
        .eq('id', input.campaignId)
        .eq('is_deleted', false)
        .single();

      if (!campaign) {
        throw Errors.NOT_FOUND('Campaign not found');
      }

      assertBrandOwnership(authContext, campaign.brand_id);
    }

    // Verify influencer exists and is verified
    const { data: influencer } = await supabase
      .from('influencer_profiles')
      .select('id, is_verified')
      .eq('id', input.influencerId)
      .eq('is_deleted', false)
      .single();

    if (!influencer) {
      throw Errors.NOT_FOUND('Influencer not found');
    }

    if (!influencer.is_verified) {
      throw Errors.VALIDATION_ERROR('Cannot shortlist unverified influencer', 'influencerId');
    }

    // Check if already shortlisted (for this campaign or general)
    const { data: existing } = await supabase
      .from('shortlists')
      .select('id')
      .eq('brand_id', brandId)
      .eq('influencer_id', input.influencerId)
      .eq('campaign_id', input.campaignId || null)
      .maybeSingle();

    if (existing) {
      throw Errors.CONFLICT('Influencer already in shortlist');
    }

    // Add to shortlist
    const { data, error } = await supabase
      .from('shortlists')
      .insert({
        brand_id: brandId,
        influencer_id: input.influencerId,
        campaign_id: input.campaignId || null,
        label: input.label,
      })
      .select()
      .single();

    if (error || !data) {
      throw Errors.DATABASE_ERROR();
    }

    return data;
  }

  /**
   * Remove influencer from shortlist
   * Enforces ownership
   */
  async remove(authContext: AuthContext, shortlistId: string): Promise<void> {
    const brandId = getBrandId(authContext);

    // Get shortlist entry to verify ownership
    const { data: shortlist } = await supabase
      .from('shortlists')
      .select('brand_id')
      .eq('id', shortlistId)
      .single();

    if (!shortlist) {
      throw Errors.NOT_FOUND('Shortlist entry not found');
    }

    assertBrandOwnership(authContext, shortlist.brand_id);

    // Delete entry
    const { error } = await supabase
      .from('shortlists')
      .delete()
      .eq('id', shortlistId);

    if (error) {
      throw Errors.DATABASE_ERROR();
    }
  }

  /**
   * List shortlisted influencers
   * Optionally filtered by campaign
   */
  async list(
    authContext: AuthContext,
    campaignId?: string
  ): Promise<Array<Shortlist & { influencer: any }>> {
    const brandId = getBrandId(authContext);

    // If campaign_id provided, verify ownership
    if (campaignId) {
      const { data: campaign } = await supabase
        .from('campaigns')
        .select('brand_id')
        .eq('id', campaignId)
        .eq('is_deleted', false)
        .single();

      if (!campaign) {
        throw Errors.NOT_FOUND('Campaign not found');
      }

      assertBrandOwnership(authContext, campaign.brand_id);
    }

    let query = supabase
      .from('shortlists')
      .select(`
        *,
        influencer:influencer_profiles (
          id,
          ig_handle,
          niche_primary,
          niche_secondary,
          bio,
          is_verified,
          influencer_stats (
            follower_count,
            engagement_rate
          )
        )
      `)
      .eq('brand_id', brandId)
      .order('created_at', { ascending: false });

    if (campaignId !== undefined) {
      query = query.eq('campaign_id', campaignId);
    }

    const { data, error } = await query;

    if (error) {
      throw Errors.DATABASE_ERROR();
    }

    return data || [];
  }
}

export const shortlistService = new ShortlistService();
