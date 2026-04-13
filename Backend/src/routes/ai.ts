// AI Co-Pilot routes - four tools for campaign strategy and content creation
import { Router } from 'express';
import { z } from 'zod';
import { verifyToken, loadAuthContext, checkRole } from '../middleware/auth';
import { getBrandId } from '../lib/ownership';
import { supabase } from '../config/supabase';
import { Errors } from '../lib/errors';
import { callAI } from '../services/AIProviderService';
import {
  StrategyOutputSchema,
  BriefOutputSchema,
  FitScoreOutputSchema,
  ContentBriefOutputSchema,
} from '../lib/ai-schemas';
import {
  buildStrategyPrompt,
  STRATEGY_PROMPT_VERSION,
} from '../prompts/strategy-v1.0.0';
import {
  buildBriefPrompt,
  BRIEF_PROMPT_VERSION,
} from '../prompts/brief-v1.0.0';
import {
  buildFitScorePrompt,
  FIT_SCORE_PROMPT_VERSION,
} from '../prompts/fit-score-v1.0.0';
import {
  buildContentBriefPrompt,
  CONTENT_BRIEF_PROMPT_VERSION,
} from '../prompts/content-brief-v1.0.0';
import type { AuthenticatedRequest } from '../types/auth';

const router = Router();

// AI endpoints require authenticated context; role checks are per-route.
router.use(verifyToken, loadAuthContext);

/**
 * POST /v1/ai/strategy
 * Generate strategic recommendations for brand-creator pairing
 */
const StrategyRequestSchema = z.object({
  creator_id: z.string().uuid(),
});

router.post('/strategy', checkRole('BRAND'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { creator_id } = StrategyRequestSchema.parse(req.body);
    const brandId = getBrandId(req.auth!);

    // Fetch brand profile
    const { data: brand } = await supabase
      .from('brand_profiles')
      .select('company_name, industry, tone_voice, budget_range_min, budget_range_max')
      .eq('id', brandId)
      .single();

    if (!brand) {
      throw Errors.NOT_FOUND('Brand profile not found');
    }

    // Fetch creator profile with stats
    const { data: creator } = await supabase
      .from('influencer_profiles')
      .select(`
        ig_handle,
        niche_primary,
        bio,
        influencer_stats (
          follower_count,
          engagement_rate
        )
      `)
      .eq('id', creator_id)
      .eq('is_verified', true)
      .eq('is_deleted', false)
      .single();

    if (!creator) {
      throw Errors.NOT_FOUND('Creator not found');
    }

    const stats = Array.isArray(creator.influencer_stats)
      ? creator.influencer_stats[0]
      : creator.influencer_stats;

    // Build prompt
    const prompt = buildStrategyPrompt({
      brandName: brand.company_name,
      brandIndustry: brand.industry,
      brandTone: brand.tone_voice,
      brandBudgetMin: brand.budget_range_min,
      brandBudgetMax: brand.budget_range_max,
      creatorHandle: creator.ig_handle,
      creatorNiche: creator.niche_primary,
      creatorFollowers: stats?.follower_count || 0,
      creatorEngagement: stats?.engagement_rate || 0,
      creatorBio: creator.bio || '',
    });

    // Call AI provider (Gemini primary with automatic Groq fallback)
    const result = await callAI(
      prompt,
      'strategy',
      STRATEGY_PROMPT_VERSION,
      brandId,
      null,
      { timeoutMs: 30000 }
    );

    // Validate output schema
    const validatedOutput = StrategyOutputSchema.parse(result.output);

    res.json({
      ...validatedOutput,
      _meta: {
        tokenCount: result.tokenCount,
        latencyMs: result.latencyMs,
        promptVersion: STRATEGY_PROMPT_VERSION,
        provider: result.provider,
        fallbackUsed: result.fallbackUsed,
        attemptedProviders: result.attemptedProviders,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /v1/ai/brief
 * Generate campaign brief from brand goals
 */
const BriefRequestSchema = z.object({
  campaign_goal: z.string().min(10).max(2000),
  target_audience: z.string().optional(),
  budget: z.number().positive().optional(),
});

router.post('/brief', checkRole('BRAND'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { campaign_goal, target_audience, budget } = BriefRequestSchema.parse(req.body);
    const brandId = getBrandId(req.auth!);

    // Fetch brand profile
    const { data: brand } = await supabase
      .from('brand_profiles')
      .select('company_name, industry, tone_voice')
      .eq('id', brandId)
      .single();

    if (!brand) {
      throw Errors.NOT_FOUND('Brand profile not found');
    }

    // Build prompt
    const prompt = buildBriefPrompt({
      brandName: brand.company_name,
      brandIndustry: brand.industry,
      brandTone: brand.tone_voice,
      campaignGoal: campaign_goal,
      targetAudience: target_audience,
      budget,
    });

    // Call AI provider (Gemini primary with automatic Groq fallback)
    const result = await callAI(
      prompt,
      'brief',
      BRIEF_PROMPT_VERSION,
      brandId,
      null,
      { timeoutMs: 30000 }
    );

    // Validate output schema
    const validatedOutput = BriefOutputSchema.parse(result.output);

    res.json({
      ...validatedOutput,
      _meta: {
        tokenCount: result.tokenCount,
        latencyMs: result.latencyMs,
        promptVersion: BRIEF_PROMPT_VERSION,
        provider: result.provider,
        fallbackUsed: result.fallbackUsed,
        attemptedProviders: result.attemptedProviders,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /v1/ai/fit-score
 * Score creator fit for a specific campaign
 */
const FitScoreRequestSchema = z.object({
  campaign_id: z.string().uuid(),
  creator_id: z.string().uuid(),
});

router.post('/fit-score', checkRole('BRAND'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { campaign_id, creator_id } = FitScoreRequestSchema.parse(req.body);
    const brandId = getBrandId(req.auth!);

    // Fetch campaign
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('title, brief_preview, niche_targets, brand_id')
      .eq('id', campaign_id)
      .eq('is_deleted', false)
      .single();

    if (!campaign || campaign.brand_id !== brandId) {
      throw Errors.NOT_FOUND('Campaign not found');
    }

    // Fetch creator with stats
    const { data: creator } = await supabase
      .from('influencer_profiles')
      .select(`
        ig_handle,
        niche_primary,
        bio,
        influencer_stats (
          follower_count,
          engagement_rate,
          avg_likes,
          avg_comments
        )
      `)
      .eq('id', creator_id)
      .eq('is_verified', true)
      .eq('is_deleted', false)
      .single();

    if (!creator) {
      throw Errors.NOT_FOUND('Creator not found');
    }

    const stats = Array.isArray(creator.influencer_stats)
      ? creator.influencer_stats[0]
      : creator.influencer_stats;

    // Build prompt
    const prompt = buildFitScorePrompt({
      campaignTitle: campaign.title,
      campaignObjective: campaign.brief_preview || 'No objective provided',
      campaignNiches: campaign.niche_targets || [],
      creatorHandle: creator.ig_handle,
      creatorNiche: creator.niche_primary,
      creatorFollowers: stats?.follower_count || 0,
      creatorEngagement: stats?.engagement_rate || 0,
      creatorAvgLikes: stats?.avg_likes || 0,
      creatorAvgComments: stats?.avg_comments || 0,
      creatorBio: creator.bio || '',
    });

    // Call AI provider (Gemini primary with automatic Groq fallback)
    const result = await callAI(
      prompt,
      'fit_score',
      FIT_SCORE_PROMPT_VERSION,
      brandId,
      campaign_id,
      { timeoutMs: 30000 }
    );

    // Validate output schema
    const validatedOutput = FitScoreOutputSchema.parse(result.output);

    res.json({
      ...validatedOutput,
      _meta: {
        tokenCount: result.tokenCount,
        latencyMs: result.latencyMs,
        promptVersion: FIT_SCORE_PROMPT_VERSION,
        provider: result.provider,
        fallbackUsed: result.fallbackUsed,
        attemptedProviders: result.attemptedProviders,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /v1/ai/content-brief
 * Generate detailed content brief for creator
 */
const ContentBriefRequestSchema = z.object({
  campaign_id: z.string().uuid(),
  creator_id: z.string().uuid(),
  content_format: z.enum(['reel', 'post', 'story', 'carousel']),
});

router.post('/content-brief', checkRole('BRAND'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { campaign_id, creator_id, content_format } = ContentBriefRequestSchema.parse(req.body);
    const brandId = getBrandId(req.auth!);

    // Fetch campaign
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('title, brief_preview, brief_data, brand_id')
      .eq('id', campaign_id)
      .eq('is_deleted', false)
      .single();

    if (!campaign || campaign.brand_id !== brandId) {
      throw Errors.NOT_FOUND('Campaign not found');
    }

    // Fetch brand profile
    const { data: brand } = await supabase
      .from('brand_profiles')
      .select('tone_voice')
      .eq('id', brandId)
      .single();

    if (!brand) {
      throw Errors.NOT_FOUND('Brand profile not found');
    }

    // Fetch creator
    const { data: creator } = await supabase
      .from('influencer_profiles')
      .select('ig_handle, niche_primary')
      .eq('id', creator_id)
      .eq('is_verified', true)
      .eq('is_deleted', false)
      .single();

    if (!creator) {
      throw Errors.NOT_FOUND('Creator not found');
    }

    // Extract deliverables from brief_data if available
    const deliverables = campaign.brief_data?.deliverables || ['1 post'];

    // Build prompt
    const prompt = buildContentBriefPrompt({
      campaignTitle: campaign.title,
      campaignObjective: campaign.brief_preview || 'No objective provided',
      campaignDeliverables: deliverables,
      brandTone: brand.tone_voice,
      creatorHandle: creator.ig_handle,
      creatorNiche: creator.niche_primary,
      contentFormat: content_format,
    });

    // Call AI provider (Gemini primary with automatic Groq fallback)
    const result = await callAI(
      prompt,
      'content_brief',
      CONTENT_BRIEF_PROMPT_VERSION,
      brandId,
      campaign_id,
      { timeoutMs: 30000 }
    );

    // Validate output schema
    const validatedOutput = ContentBriefOutputSchema.parse(result.output);

    res.json({
      ...validatedOutput,
      _meta: {
        tokenCount: result.tokenCount,
        latencyMs: result.latencyMs,
        promptVersion: CONTENT_BRIEF_PROMPT_VERSION,
        provider: result.provider,
        fallbackUsed: result.fallbackUsed,
        attemptedProviders: result.attemptedProviders,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /v1/ai/influencer/content-brief
 * Generate a creator-side content brief for an influencer's invited campaign.
 */
const InfluencerContentBriefRequestSchema = z.object({
  campaignId: z.string().uuid(),
  contentFormat: z.enum(['reel', 'post', 'story', 'carousel']),
});

router.post('/influencer/content-brief', checkRole('INFLUENCER'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { campaignId, contentFormat } = InfluencerContentBriefRequestSchema.parse(req.body);

    const { data: influencer } = await supabase
      .from('influencer_profiles')
      .select('id, ig_handle, niche_primary')
      .eq('user_id', req.auth!.userId)
      .eq('is_deleted', false)
      .single();

    if (!influencer) {
      throw Errors.NOT_FOUND('Influencer profile not found');
    }

    const { data: collaboration } = await supabase
      .from('collaboration_requests')
      .select('id, status')
      .eq('campaign_id', campaignId)
      .eq('influencer_id', influencer.id)
      .in('status', ['PENDING', 'ACCEPTED'])
      .maybeSingle();

    if (!collaboration) {
      throw Errors.FORBIDDEN('You do not have access to this campaign');
    }

    const { data: campaign } = await supabase
      .from('campaigns')
      .select('id, title, brief_preview, brief_data, brand_id')
      .eq('id', campaignId)
      .eq('is_deleted', false)
      .single();

    if (!campaign) {
      throw Errors.NOT_FOUND('Campaign not found');
    }

    const { data: brand } = await supabase
      .from('brand_profiles')
      .select('tone_voice')
      .eq('id', campaign.brand_id)
      .single();

    if (!brand) {
      throw Errors.NOT_FOUND('Brand profile not found');
    }

    const deliverables = campaign.brief_data?.deliverables || ['1 post'];

    const prompt = buildContentBriefPrompt({
      campaignTitle: campaign.title,
      campaignObjective: campaign.brief_preview || 'No objective provided',
      campaignDeliverables: deliverables,
      brandTone: brand.tone_voice,
      creatorHandle: influencer.ig_handle,
      creatorNiche: influencer.niche_primary,
      contentFormat,
    });

    const result = await callAI(
      prompt,
      'content_brief',
      CONTENT_BRIEF_PROMPT_VERSION,
      campaign.brand_id,
      campaignId,
      { timeoutMs: 30000 }
    );

    const validatedOutput = ContentBriefOutputSchema.parse(result.output);

    res.json({
      ...validatedOutput,
      _meta: {
        tokenCount: result.tokenCount,
        latencyMs: result.latencyMs,
        promptVersion: CONTENT_BRIEF_PROMPT_VERSION,
        provider: result.provider,
        fallbackUsed: result.fallbackUsed,
        attemptedProviders: result.attemptedProviders,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
