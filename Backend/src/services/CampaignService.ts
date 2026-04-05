// Campaign CRUD service
import { supabase } from '../config/supabase';
import { Errors } from '../lib/errors';
import { assertBrandOwnership, getBrandId } from '../lib/ownership';
import type { AuthContext } from '../types/auth';
import { parsePaginationParams, buildPaginatedResponse, type PaginatedResponse } from '../lib/pagination';

export interface CreateCampaignInput {
  title: string;
  briefPreview?: string;
  briefData?: Record<string, any>;
  budget?: number;
  currency?: string;
  nicheTargets?: string[];
  visibility?: 'MATCHED' | 'PUBLIC';
  idempotencyKey?: string;
}

export interface UpdateCampaignInput {
  title?: string;
  briefPreview?: string;
  briefData?: Record<string, any>;
  budget?: number;
  currency?: string;
  nicheTargets?: string[];
  visibility?: 'MATCHED' | 'PUBLIC';
}

export interface Campaign {
  id: string;
  brand_id: string;
  title: string;
  status: string;
  brief_preview: string | null;
  brief_data: Record<string, any> | null;
  budget: number | null;
  currency: string | null;
  niche_targets: string[] | null;
  visibility: string;
  created_at: string;
  updated_at: string;
}

export class CampaignService {
  /**
   * Create a new campaign
   * Supports idempotency via idempotency_key
   */
  async create(
    authContext: AuthContext,
    input: CreateCampaignInput
  ): Promise<Campaign> {
    const brandId = getBrandId(authContext);

    // Check idempotency if key provided
    if (input.idempotencyKey) {
      const { data: existing } = await supabase
        .from('idempotency_keys')
        .select('response_body, response_status')
        .eq('key', input.idempotencyKey)
        .eq('scope', 'campaign:create')
        .eq('user_id', authContext.userId)
        .single();

      if (existing && existing.response_status === 201) {
        // Return existing response
        return existing.response_body as Campaign;
      }
    }

    // Create campaign
    const { data, error } = await supabase
      .from('campaigns')
      .insert({
        brand_id: brandId,
        title: input.title,
        status: 'DRAFT',
        brief_preview: input.briefPreview,
        brief_data: input.briefData,
        budget: input.budget,
        currency: input.currency || 'USD',
        niche_targets: input.nicheTargets,
        visibility: input.visibility || 'MATCHED',
      })
      .select()
      .single();

    if (error || !data) {
      throw Errors.DATABASE_ERROR();
    }

    // Store idempotency key if provided
    if (input.idempotencyKey) {
      const requestHash = JSON.stringify(input);
      await supabase.from('idempotency_keys').insert({
        key: input.idempotencyKey,
        scope: 'campaign:create',
        user_id: authContext.userId,
        request_hash: requestHash,
        response_status: 201,
        response_body: data,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h expiry
      });
    }

    return data;
  }

  /**
   * Get campaign by ID
   * Enforces ownership
   */
  async getById(authContext: AuthContext, campaignId: string): Promise<Campaign> {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .eq('is_deleted', false)
      .single();

    if (error || !data) {
      throw Errors.NOT_FOUND('Campaign not found');
    }

    // Enforce ownership
    assertBrandOwnership(authContext, data.brand_id);

    return data;
  }

  /**
   * List all campaigns for the authenticated brand
   */
  async list(
    authContext: AuthContext,
    filters: { status?: string; page?: number; limit?: number }
  ): Promise<PaginatedResponse<Campaign>> {
    const brandId = getBrandId(authContext);
    const { page, limit, offset } = parsePaginationParams({
      page: filters.page,
      limit: filters.limit,
    });

    let query = supabase
      .from('campaigns')
      .select('*', { count: 'exact' })
      .eq('brand_id', brandId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      throw Errors.DATABASE_ERROR();
    }

    return buildPaginatedResponse(data || [], page, limit, count || 0);
  }

  /**
   * Update campaign
   * Enforces ownership
   */
  async update(
    authContext: AuthContext,
    campaignId: string,
    updates: UpdateCampaignInput
  ): Promise<Campaign> {
    // First get campaign to verify ownership
    await this.getById(authContext, campaignId);

    const { data, error } = await supabase
      .from('campaigns')
      .update({
        title: updates.title,
        brief_preview: updates.briefPreview,
        brief_data: updates.briefData,
        budget: updates.budget,
        currency: updates.currency,
        niche_targets: updates.nicheTargets,
        visibility: updates.visibility,
      })
      .eq('id', campaignId)
      .select()
      .single();

    if (error || !data) {
      throw Errors.DATABASE_ERROR();
    }

    return data;
  }

  /**
   * Update campaign status (DRAFT → ACTIVE → PAUSED → COMPLETED)
   * Enforces ownership
   */
  async updateStatus(
    authContext: AuthContext,
    campaignId: string,
    newStatus: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED'
  ): Promise<Campaign> {
    // Verify ownership
    await this.getById(authContext, campaignId);

    const { data, error } = await supabase
      .from('campaigns')
      .update({ status: newStatus })
      .eq('id', campaignId)
      .select()
      .single();

    if (error || !data) {
      throw Errors.DATABASE_ERROR();
    }

    return data;
  }

  /**
   * Soft delete campaign
   * Enforces ownership
   */
  async delete(authContext: AuthContext, campaignId: string): Promise<void> {
    // Verify ownership
    await this.getById(authContext, campaignId);

    const { error } = await supabase
      .from('campaigns')
      .update({ is_deleted: true })
      .eq('id', campaignId);

    if (error) {
      throw Errors.DATABASE_ERROR();
    }
  }

  /**
   * Get matched campaigns for influencer
   * Returns campaigns where niche_targets overlaps with influencer's niches
   * Only shows brief_preview, not full brief_data
   */
  async getMatchedForInfluencer(
    influencerId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<Omit<Campaign, 'brief_data'>>> {
    // Get influencer profile
    const { data: profile } = await supabase
      .from('influencer_profiles')
      .select('niche_primary, niche_secondary')
      .eq('id', influencerId)
      .single();

    if (!profile) {
      throw Errors.NOT_FOUND('Influencer profile not found');
    }

    const { page: validPage, limit: validLimit, offset } = parsePaginationParams({ page, limit });

    // Find campaigns with matching niches
    const niches = [profile.niche_primary, profile.niche_secondary].filter(Boolean);
    
    const { data, error, count } = await supabase
      .from('campaigns')
      .select('id, brand_id, title, status, brief_preview, budget, currency, niche_targets, visibility, created_at, updated_at', { count: 'exact' })
      .eq('status', 'ACTIVE')
      .eq('visibility', 'MATCHED')
      .eq('is_deleted', false)
      .contains('niche_targets', niches)
      .order('created_at', { ascending: false })
      .range(offset, offset + validLimit - 1);

    if (error) {
      throw Errors.DATABASE_ERROR();
    }

    return buildPaginatedResponse(data || [], validPage, validLimit, count || 0);
  }
}

export const campaignService = new CampaignService();
