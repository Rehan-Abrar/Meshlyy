// Creator discovery and detail service
import { supabase } from '../config/supabase';
import { Errors } from '../lib/errors';
import { parsePaginationParams, buildPaginatedResponse, type PaginatedResponse } from '../lib/pagination';
import { cacheStore } from '../stores';
import { logger } from '../middleware/logging';

export interface DiscoveryFilters {
  niche?: string;
  follower_min?: number;
  follower_max?: number;
  engagement_min?: number;
  country?: string;
  is_verified?: boolean;
  page?: number;
  limit?: number;
}

export interface CreatorSearchResult {
  id: string;
  ig_handle: string;
  niche_primary: string;
  niche_secondary: string | null;
  bio: string | null;
  follower_count: number;
  engagement_rate: number;
  avg_likes: number;
  avg_comments: number;
  is_verified: boolean;
}

export interface CreatorDetail extends CreatorSearchResult {
  portfolio_url: string | null;
  media_kit_url: string | null;
  top_countries: Record<string, number> | null;
  age_split: Record<string, number> | null;
  gender_split: Record<string, number> | null;
  rate_cards: Array<{
    service_type: string;
    price: number;
    currency: string;
  }>;
}

export class CreatorService {
  /**
   * Discovery search with filters and pagination
   * Results are cached for 5 minutes
   */
  async discover(filters: DiscoveryFilters): Promise<PaginatedResponse<CreatorSearchResult>> {
    // Parse pagination params
    const { page, limit, offset } = parsePaginationParams({
      page: filters.page,
      limit: filters.limit,
    });

    // Build cache key from filters
    const cacheKey = this.buildCacheKey(filters, page, limit);
    
    // Check cache
    const cached = await cacheStore.get<string>(cacheKey);
    if (cached) {
      logger.info('[CreatorService] Cache HIT for discovery', { cacheKey });
      return JSON.parse(cached);
    }

    logger.info('[CreatorService] Cache MISS for discovery', { cacheKey });

    // Use RPC function to bypass PostgREST's broken embedded filter behavior
    const { data, error } = await supabase.rpc('search_creators', {
      p_niche: filters.niche ?? null,
      p_follower_min: filters.follower_min ?? null,
      p_follower_max: filters.follower_max ?? null,
      p_engagement_min: filters.engagement_min ?? null,
      p_is_verified: filters.is_verified !== undefined ? filters.is_verified : true,
      p_limit: limit,
      p_offset: offset,
    });

    if (error) {
      logger.error('[CreatorService] Discovery RPC query failed', { error });
      throw Errors.DATABASE_ERROR();
    }

    // Transform results - RPC returns flat rows with stats already joined
    const results: CreatorSearchResult[] = (data || []).map((row: any) => ({
      id: row.id,
      ig_handle: row.ig_handle,
      niche_primary: row.niche_primary,
      niche_secondary: row.niche_secondary,
      bio: row.bio,
      follower_count: row.follower_count,
      engagement_rate: row.engagement_rate,
      avg_likes: row.avg_likes,
      avg_comments: row.avg_comments,
      is_verified: row.is_verified,
    }));

    // Get total count from first row (window function COUNT(*) OVER())
    const totalCount = data && data.length > 0 ? parseInt(data[0].total_count) : 0;
    const response = buildPaginatedResponse(results, page, limit, totalCount);

    // Cache for 5 minutes (300 seconds)
    await cacheStore.set(cacheKey, JSON.stringify(response), 300);

    return response;
  }

  /**
   * Get creator detail by ID
   * Includes full profile, stats, and rate cards
   */
  async getDetail(creatorId: string): Promise<CreatorDetail> {
    const { data, error } = await supabase
      .from('influencer_profiles')
      .select(`
        id,
        ig_handle,
        niche_primary,
        niche_secondary,
        bio,
        portfolio_url,
        media_kit_url,
        is_verified,
        influencer_stats (
          follower_count,
          engagement_rate,
          avg_likes,
          avg_comments,
          top_countries,
          age_split,
          gender_split
        ),
        rate_cards (
          service_type,
          price,
          currency
        )
      `)
      .eq('id', creatorId)
      .eq('is_deleted', false)
      .eq('is_verified', true)
      .single();

    if (error || !data) {
      throw Errors.NOT_FOUND('Creator not found or not verified');
    }

    const stats = Array.isArray(data.influencer_stats) 
      ? data.influencer_stats[0] 
      : data.influencer_stats;

    return {
      id: data.id,
      ig_handle: data.ig_handle,
      niche_primary: data.niche_primary,
      niche_secondary: data.niche_secondary,
      bio: data.bio,
      portfolio_url: data.portfolio_url,
      media_kit_url: data.media_kit_url,
      follower_count: stats?.follower_count || 0,
      engagement_rate: stats?.engagement_rate || 0,
      avg_likes: stats?.avg_likes || 0,
      avg_comments: stats?.avg_comments || 0,
      top_countries: stats?.top_countries || null,
      age_split: stats?.age_split || null,
      gender_split: stats?.gender_split || null,
      is_verified: data.is_verified,
      rate_cards: data.rate_cards || [],
    };
  }

  /**
   * Build cache key from filters
   */
  private buildCacheKey(filters: DiscoveryFilters, page: number, limit: number): string {
    const parts = [
      'discovery',
      filters.niche || 'all',
      filters.follower_min || 0,
      filters.follower_max || 'max',
      filters.engagement_min || 0,
      filters.country || 'all',
      filters.is_verified !== undefined ? filters.is_verified : 'verified',
      page,
      limit,
    ];
    return parts.join(':');
  }
}

export const creatorService = new CreatorService();
