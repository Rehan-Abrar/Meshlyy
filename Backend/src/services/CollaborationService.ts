// Collaboration request service with state machine
import { supabase } from '../config/supabase';
import { Errors } from '../lib/errors';
import { assertBrandOwnership, getBrandId } from '../lib/ownership';
import type { AuthContext } from '../types/auth';

export interface SendInviteInput {
  campaignId: string;
  influencerId: string;
  message?: string;
  idempotencyKey?: string;
}

export interface ApplyToCampaignInput {
  campaignId: string;
  message?: string;
  idempotencyKey?: string;
}

export interface CollaborationRequest {
  id: string;
  campaign_id: string;
  brand_id: string;
  influencer_id: string;
  type: 'INVITE' | 'APPLICATION';
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  message: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Collaboration state machine rules:
 * - PENDING → ACCEPTED (terminal)
 * - PENDING → DECLINED (terminal)
 * - DECLINED is terminal per campaign (cannot re-invite or re-apply)
 */
export class CollaborationService {
  /**
   * Send collaboration invite from brand to influencer
   * Supports idempotency
   */
  async sendInvite(
    authContext: AuthContext,
    input: SendInviteInput
  ): Promise<CollaborationRequest> {
    const brandId = getBrandId(authContext);

    // Verify campaign ownership
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('id, brand_id, status')
      .eq('id', input.campaignId)
      .eq('is_deleted', false)
      .single();

    if (!campaign) {
      throw Errors.NOT_FOUND('Campaign not found');
    }

    assertBrandOwnership(authContext, campaign.brand_id);

    if (campaign.status !== 'ACTIVE') {
      throw Errors.VALIDATION_ERROR('Campaign must be ACTIVE to send invites', 'campaignId');
    }

    // Check idempotency
    if (input.idempotencyKey) {
      const { data: existing } = await supabase
        .from('idempotency_keys')
        .select('response_body, response_status')
        .eq('key', input.idempotencyKey)
        .eq('scope', 'collaboration:invite')
        .eq('user_id', authContext.userId)
        .single();

      if (existing && existing.response_status === 201) {
        return existing.response_body as CollaborationRequest;
      }
    }

    // Check for existing collaboration (any status)
    const { data: existingCollab } = await supabase
      .from('collaboration_requests')
      .select('id, status')
      .eq('campaign_id', input.campaignId)
      .eq('influencer_id', input.influencerId)
      .maybeSingle();

    if (existingCollab) {
      if (existingCollab.status === 'DECLINED') {
        throw Errors.VALIDATION_ERROR(
          'This influencer has declined collaboration for this campaign. DECLINED is terminal.',
          'influencerId'
        );
      }
      throw Errors.CONFLICT('Collaboration request already exists for this campaign and influencer');
    }

    // Verify influencer exists and is verified
    const { data: influencer } = await supabase
      .from('influencer_profiles')
      .select('id, is_verified')
      .eq('id', input.influencerId)
      .eq('is_deleted', false)
      .single();

    if (!influencer || !influencer.is_verified) {
      throw Errors.NOT_FOUND('Influencer not found or not verified');
    }

    // Create invite
    const { data, error } = await supabase
      .from('collaboration_requests')
      .insert({
        campaign_id: input.campaignId,
        brand_id: brandId,
        influencer_id: input.influencerId,
        type: 'INVITE',
        status: 'PENDING',
        message: input.message,
      })
      .select()
      .single();

    if (error || !data) {
      throw Errors.DATABASE_ERROR();
    }

    // Store idempotency key
    if (input.idempotencyKey) {
      const requestHash = JSON.stringify(input);
      await supabase.from('idempotency_keys').insert({
        key: input.idempotencyKey,
        scope: 'collaboration:invite',
        user_id: authContext.userId,
        request_hash: requestHash,
        response_status: 201,
        response_body: data,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    return data;
  }

  /**
   * Influencer applies to campaign
   * Supports idempotency
   */
  async apply(
    authContext: AuthContext,
    influencerId: string,
    input: ApplyToCampaignInput
  ): Promise<CollaborationRequest> {
    // Verify campaign exists and is active
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('id, brand_id, status, visibility')
      .eq('id', input.campaignId)
      .eq('is_deleted', false)
      .single();

    if (!campaign) {
      throw Errors.NOT_FOUND('Campaign not found');
    }

    if (campaign.status !== 'ACTIVE') {
      throw Errors.VALIDATION_ERROR('Campaign is not active', 'campaignId');
    }

    // Check idempotency
    if (input.idempotencyKey) {
      const { data: existing } = await supabase
        .from('idempotency_keys')
        .select('response_body, response_status')
        .eq('key', input.idempotencyKey)
        .eq('scope', 'collaboration:apply')
        .eq('user_id', authContext.userId)
        .single();

      if (existing && existing.response_status === 201) {
        return existing.response_body as CollaborationRequest;
      }
    }

    // Check for existing collaboration
    const { data: existingCollab } = await supabase
      .from('collaboration_requests')
      .select('id, status')
      .eq('campaign_id', input.campaignId)
      .eq('influencer_id', influencerId)
      .maybeSingle();

    if (existingCollab) {
      if (existingCollab.status === 'DECLINED') {
        throw Errors.VALIDATION_ERROR(
          'You have declined this campaign. DECLINED is terminal per campaign.',
          'campaignId'
        );
      }
      throw Errors.CONFLICT('You have already applied to this campaign');
    }

    // Create application
    const { data, error } = await supabase
      .from('collaboration_requests')
      .insert({
        campaign_id: input.campaignId,
        brand_id: campaign.brand_id,
        influencer_id: influencerId,
        type: 'APPLICATION',
        status: 'PENDING',
        message: input.message,
      })
      .select()
      .single();

    if (error || !data) {
      throw Errors.DATABASE_ERROR();
    }

    // Store idempotency key
    if (input.idempotencyKey) {
      const requestHash = JSON.stringify(input);
      await supabase.from('idempotency_keys').insert({
        key: input.idempotencyKey,
        scope: 'collaboration:apply',
        user_id: authContext.userId,
        request_hash: requestHash,
        response_status: 201,
        response_body: data,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    return data;
  }

  /**
   * Update collaboration status
   * Enforces state machine rules
   */
  async updateStatus(
    authContext: AuthContext,
    collaborationId: string,
    newStatus: 'ACCEPTED' | 'DECLINED'
  ): Promise<CollaborationRequest> {
    // Get collaboration
    const { data: collab } = await supabase
      .from('collaboration_requests')
      .select('*')
      .eq('id', collaborationId)
      .single();

    if (!collab) {
      throw Errors.NOT_FOUND('Collaboration request not found');
    }

    // Verify permissions based on type
    if (collab.type === 'INVITE') {
      // Influencer can accept/decline invites
      const { data: profile } = await supabase
        .from('influencer_profiles')
        .select('id')
        .eq('user_id', authContext.userId)
        .eq('is_deleted', false)
        .single();

      if (!profile || profile.id !== collab.influencer_id) {
        throw Errors.FORBIDDEN('You can only respond to invites sent to you');
      }
    } else if (collab.type === 'APPLICATION') {
      // Brand can accept/decline applications
      assertBrandOwnership(authContext, collab.brand_id);
    }

    // Check current status
    if (collab.status !== 'PENDING') {
      throw Errors.VALIDATION_ERROR(
        `Cannot change status from ${collab.status}. State is terminal.`,
        'status'
      );
    }

    // Update status
    const { data, error } = await supabase
      .from('collaboration_requests')
      .update({ status: newStatus })
      .eq('id', collaborationId)
      .select()
      .single();

    if (error || !data) {
      throw Errors.DATABASE_ERROR();
    }

    return data;
  }

  /**
   * Get collaboration by ID
   */
  async getById(authContext: AuthContext, collaborationId: string): Promise<CollaborationRequest> {
    const { data, error } = await supabase
      .from('collaboration_requests')
      .select(`
        *,
        campaign:campaigns (
          id,
          title,
          brief_preview,
          budget,
          currency
        ),
        brand:brand_profiles (
          id,
          company_name
        )
      `)
      .eq('id', collaborationId)
      .single();

    if (error || !data) {
      throw Errors.NOT_FOUND('Collaboration request not found');
    }

    if (authContext.role === 'BRAND') {
      assertBrandOwnership(authContext, data.brand_id);
    } else if (authContext.role === 'INFLUENCER') {
      const { data: influencerProfile } = await supabase
        .from('influencer_profiles')
        .select('id')
        .eq('user_id', authContext.userId)
        .eq('is_deleted', false)
        .single();

      if (!influencerProfile || influencerProfile.id !== data.influencer_id) {
        throw Errors.FORBIDDEN('You can only access your own collaboration requests');
      }
    }

    return data;
  }

  /**
   * Get incoming collaboration requests for influencer
   */
  async getIncoming(influencerId: string): Promise<CollaborationRequest[]> {
    const { data, error } = await supabase
      .from('collaboration_requests')
      .select(`
        *,
        campaign:campaigns (
          id,
          title,
          brief_preview,
          budget,
          currency
        ),
        brand:brand_profiles (
          id,
          company_name
        )
      `)
      .eq('influencer_id', influencerId)
      .eq('type', 'INVITE')
      .order('created_at', { ascending: false });

    if (error) {
      throw Errors.DATABASE_ERROR();
    }

    return data || [];
  }

  /**
   * List collaborations for a campaign
   * Brand-only, enforces ownership
   */
  async listForCampaign(
    authContext: AuthContext,
    campaignId: string
  ): Promise<CollaborationRequest[]> {
    // Verify campaign ownership
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

    const { data, error } = await supabase
      .from('collaboration_requests')
      .select(`
        *,
        influencer:influencer_profiles (
          id,
          ig_handle,
          niche_primary,
          influencer_stats (
            follower_count,
            engagement_rate
          )
        )
      `)
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false });

    if (error) {
      throw Errors.DATABASE_ERROR();
    }

    return data || [];
  }
}

export const collaborationService = new CollaborationService();
