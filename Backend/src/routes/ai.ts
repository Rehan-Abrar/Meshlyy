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

type JsonObject = Record<string, unknown>;

function asObject(value: unknown): JsonObject {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as JsonObject;
  }
  return {};
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function firstNonEmptyString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.length > 0) {
        return trimmed;
      }
    }
  }
  return null;
}

function toPositiveNumber(value: unknown): number | null {
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) {
    return numeric;
  }
  return null;
}

function mapContentFormatToServiceType(format: 'reel' | 'post' | 'story' | 'carousel'): 'STORY' | 'POST' | 'REEL' | 'BUNDLE' {
  if (format === 'story') return 'STORY';
  if (format === 'reel') return 'REEL';
  if (format === 'carousel') return 'POST';
  return 'POST';
}

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
      .select('company_name, industry, tone_voice, target_demographics, campaign_goals, budget_range_min, budget_range_max')
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
        bio
      `)
      .eq('id', creator_id)
      .eq('is_verified', true)
      .eq('is_deleted', false)
      .single();

    if (!creator) {
      throw Errors.NOT_FOUND('Creator not found');
    }

    const budgetMin = Number(brand.budget_range_min) > 0 ? Number(brand.budget_range_min) : 5000;
    const budgetMaxRaw = Number(brand.budget_range_max) > 0 ? Number(brand.budget_range_max) : budgetMin;
    const budgetMax = Math.max(budgetMaxRaw, budgetMin);

    const campaignGoals = asStringArray(brand.campaign_goals);
    if (campaignGoals.length === 0) {
      campaignGoals.push(`Increase qualified reach for ${brand.company_name}`);
    }

    const productDescription = [
      `${brand.company_name} ${brand.industry || 'consumer'} offerings`,
      `Creator context: @${creator.ig_handle} (${creator.niche_primary})`,
    ].join('. ');

    // Build prompt
    const prompt = buildStrategyPrompt({
      companyName: brand.company_name,
      industry: brand.industry || 'Consumer Goods',
      productDescription,
      campaignGoals,
      targetDemographics: asObject(brand.target_demographics),
      budgetRangeMin: budgetMin,
      budgetRangeMax: budgetMax,
      toneVoice: brand.tone_voice || 'Clear, direct, and authentic',
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
  currency: z.string().min(3).max(8).optional(),
});

router.post('/brief', checkRole('BRAND'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { campaign_goal, target_audience, budget, currency } = BriefRequestSchema.parse(req.body);
    const brandId = getBrandId(req.auth!);

    // Fetch brand profile
    const { data: brand } = await supabase
      .from('brand_profiles')
      .select('company_name, industry, tone_voice, target_demographics, campaign_goals, budget_range_min, budget_range_max')
      .eq('id', brandId)
      .single();

    if (!brand) {
      throw Errors.NOT_FOUND('Brand profile not found');
    }

    const normalizedGoal = campaign_goal.trim();
    const existingGoals = asStringArray(brand.campaign_goals);
    const campaignGoals = [...existingGoals, normalizedGoal].slice(0, 5);

    const targetDemographics = {
      ...asObject(brand.target_demographics),
      ...(target_audience ? { userProvidedAudience: target_audience } : {}),
    };

    const maxBudget = Number(brand.budget_range_max) > 0 ? Number(brand.budget_range_max) : 0;
    const minBudget = Number(brand.budget_range_min) > 0 ? Number(brand.budget_range_min) : 0;
    const campaignBudget = budget ?? (maxBudget > 0 ? maxBudget : (minBudget > 0 ? minBudget : 10000));

    const nicheTargets = asStringArray(brand.campaign_goals).slice(0, 3);
    if (nicheTargets.length === 0 && brand.industry) {
      nicheTargets.push(brand.industry);
    }

    const titleSeed = normalizedGoal.replace(/[.!?].*$/, '').trim();
    const campaignTitle = titleSeed.length > 0
      ? titleSeed.slice(0, 90)
      : `${brand.company_name} Creator Growth Campaign`;

    // Build prompt
    const prompt = buildBriefPrompt({
      companyName: brand.company_name,
      industry: brand.industry || 'Consumer Goods',
      toneVoice: brand.tone_voice || 'Authentic and direct',
      campaignGoals,
      targetDemographics,
      campaignTitle,
      campaignBudget,
      campaignCurrency: currency || 'USD',
      nicheTargets,
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

const FitScoreContextParamsSchema = z.object({
  creatorId: z.string().uuid(),
});

const FitScoreContextRequestSchema = z.object({
  brief: z.record(z.unknown()).optional(),
  strategy: z.record(z.unknown()).optional(),
  campaignContext: z.record(z.unknown()).optional(),
});

router.post('/fit-score', checkRole('BRAND'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { campaign_id, creator_id } = FitScoreRequestSchema.parse(req.body);
    const brandId = getBrandId(req.auth!);

    // Fetch campaign
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('title, brief_preview, brief_data, niche_targets, budget, currency, brand_id')
      .eq('id', campaign_id)
      .eq('is_deleted', false)
      .single();

    if (!campaign || campaign.brand_id !== brandId) {
      throw Errors.NOT_FOUND('Campaign not found');
    }

    const { data: brand } = await supabase
      .from('brand_profiles')
      .select('tone_voice, target_demographics, campaign_goals')
      .eq('id', brandId)
      .single();

    if (!brand) {
      throw Errors.NOT_FOUND('Brand profile not found');
    }

    // Fetch creator with stats
    const { data: creator } = await supabase
      .from('influencer_profiles')
      .select(`
        ig_handle,
        niche_primary,
        niche_secondary,
        bio,
        influencer_stats (
          follower_count,
          engagement_rate,
          avg_likes,
          avg_comments,
          top_countries
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

    const { data: lowestRateCard } = await supabase
      .from('rate_cards')
      .select('price, currency, service_type')
      .eq('influencer_id', creator_id)
      .order('price', { ascending: true })
      .limit(1)
      .maybeSingle();

    const briefData = asObject(campaign.brief_data);
    const campaignGoals = asStringArray(brand.campaign_goals);
    if (campaignGoals.length === 0 && typeof campaign.brief_preview === 'string') {
      campaignGoals.push(campaign.brief_preview);
    }

    const topCountriesObject = asObject(stats?.top_countries);
    const topCountries = Object.keys(topCountriesObject).length > 0
      ? topCountriesObject as Record<string, number>
      : null;

    const budgetRaw = Number(campaign.budget);
    const campaignBudget = Number.isFinite(budgetRaw) && budgetRaw > 0 ? budgetRaw : 5000;
    const campaignCurrency = campaign.currency || 'USD';

    const summaryFromObjective = typeof briefData.objective === 'string' ? briefData.objective : null;
    const briefSummary = summaryFromObjective || campaign.brief_preview || 'No campaign summary provided';

    // Build prompt
    const prompt = buildFitScorePrompt({
      campaignTitle: campaign.title,
      campaignGoals,
      nicheTargets: asStringArray(campaign.niche_targets),
      campaignBudget,
      campaignCurrency,
      briefSummary,
      brandToneVoice: brand.tone_voice || 'Authentic and direct',
      targetDemographics: asObject(brand.target_demographics),
      igHandle: creator.ig_handle,
      nichePrimary: creator.niche_primary,
      nicheSecondary: creator.niche_secondary,
      followerCount: Number(stats?.follower_count) || 0,
      engagementRate: Number(stats?.engagement_rate) || 0,
      avgLikes: Number(stats?.avg_likes) || 0,
      avgComments: Number(stats?.avg_comments) || 0,
      topCountries,
      bio: creator.bio,
      lowestRateAmount: Number(lowestRateCard?.price) || 0,
      lowestRateCurrency: lowestRateCard?.currency || campaignCurrency,
      lowestRateServiceType: lowestRateCard?.service_type || 'POST',
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
 * POST /v1/ai/fit-score/:creatorId
 * Score creator fit using in-conversation context (no saved campaign required)
 */
router.post('/fit-score/:creatorId', checkRole('BRAND'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { creatorId } = FitScoreContextParamsSchema.parse(req.params);
    const { brief, strategy, campaignContext } = FitScoreContextRequestSchema.parse(req.body ?? {});
    const brandId = getBrandId(req.auth!);

    const { data: brand } = await supabase
      .from('brand_profiles')
      .select('company_name, tone_voice, target_demographics, campaign_goals, budget_range_min, budget_range_max')
      .eq('id', brandId)
      .single();

    if (!brand) {
      throw Errors.NOT_FOUND('Brand profile not found');
    }

    const { data: creator } = await supabase
      .from('influencer_profiles')
      .select(`
        ig_handle,
        niche_primary,
        niche_secondary,
        bio,
        influencer_stats (
          follower_count,
          engagement_rate,
          avg_likes,
          avg_comments,
          top_countries
        )
      `)
      .eq('id', creatorId)
      .eq('is_verified', true)
      .eq('is_deleted', false)
      .single();

    if (!creator) {
      throw Errors.NOT_FOUND('Creator not found');
    }

    const stats = Array.isArray(creator.influencer_stats)
      ? creator.influencer_stats[0]
      : creator.influencer_stats;

    const { data: lowestRateCard } = await supabase
      .from('rate_cards')
      .select('price, currency, service_type')
      .eq('influencer_id', creatorId)
      .order('price', { ascending: true })
      .limit(1)
      .maybeSingle();

    const briefData = asObject(brief);
    const strategyData = asObject(strategy);
    const contextualData = asObject(campaignContext);

    const briefBudgetBreakdown = asObject(briefData.budgetBreakdown);
    const creatorFees = asObject(briefBudgetBreakdown.creatorFees);
    const paidAmplification = asObject(briefBudgetBreakdown.paidAmplification);
    const production = asObject(briefBudgetBreakdown.production);

    const briefBudgetParts = [
      toPositiveNumber(creatorFees.amount),
      toPositiveNumber(paidAmplification.amount),
      toPositiveNumber(production.amount),
    ].filter((amount): amount is number => amount !== null);

    const briefBudgetTotal = briefBudgetParts.length > 0
      ? briefBudgetParts.reduce((sum, amount) => sum + amount, 0)
      : null;

    const strategyBudgetAllocation = asObject(strategyData.budgetAllocation);
    const strategyBudget = toPositiveNumber(strategyBudgetAllocation.planningBudget);
    const contextBudget = toPositiveNumber(contextualData.budget);

    const maxBudget = toPositiveNumber(brand.budget_range_max);
    const minBudget = toPositiveNumber(brand.budget_range_min);
    const campaignBudget = contextBudget
      ?? briefBudgetTotal
      ?? strategyBudget
      ?? maxBudget
      ?? minBudget
      ?? 5000;

    const campaignCurrency = firstNonEmptyString(
      contextualData.currency,
      strategyBudgetAllocation.currency,
      creatorFees.currency,
      paidAmplification.currency,
      production.currency,
      'USD'
    ) || 'USD';

    const campaignTitle = firstNonEmptyString(
      contextualData.title,
      briefData.title,
      briefData.campaignTitle,
      strategyData.campaignTitle,
      `${brand.company_name} Creator Campaign`
    ) || `${brand.company_name} Creator Campaign`;

    const campaignGoals = [
      ...asStringArray(brand.campaign_goals),
      ...asStringArray(contextualData.goals),
    ];

    const contextualObjective = firstNonEmptyString(
      contextualData.objective,
      briefData.objective,
      strategyData.executiveSummary
    );

    if (contextualObjective) {
      campaignGoals.push(contextualObjective);
    }

    const normalizedCampaignGoals = [...new Set(campaignGoals)];
    if (normalizedCampaignGoals.length === 0) {
      normalizedCampaignGoals.push(`Increase qualified reach for ${brand.company_name}`);
    }

    const nicheTargets = [
      ...asStringArray(contextualData.nicheTargets),
      ...asStringArray(contextualData.nicheKeywords),
      ...asStringArray(asObject(briefData.creatorProfile).nicheKeywords),
      ...asStringArray(asObject(strategyData.recommendedCreatorProfile).nicheKeywords),
    ];

    const normalizedNiches = [...new Set(nicheTargets)];
    if (normalizedNiches.length === 0) {
      normalizedNiches.push(...asStringArray(brand.campaign_goals).slice(0, 3));
    }

    const contextualDemographics = asObject(contextualData.targetDemographics);
    const targetDemographics = Object.keys(contextualDemographics).length > 0
      ? contextualDemographics
      : asObject(brand.target_demographics);

    const briefSummary = firstNonEmptyString(
      contextualData.summary,
      briefData.objective,
      briefData.briefPreview,
      strategyData.executiveSummary,
      `Fit score evaluation for ${brand.company_name}`
    ) || `Fit score evaluation for ${brand.company_name}`;

    const topCountriesObject = asObject(stats?.top_countries);
    const topCountries = Object.keys(topCountriesObject).length > 0
      ? topCountriesObject as Record<string, number>
      : null;

    const prompt = buildFitScorePrompt({
      campaignTitle,
      campaignGoals: normalizedCampaignGoals,
      nicheTargets: normalizedNiches,
      campaignBudget,
      campaignCurrency,
      briefSummary,
      brandToneVoice: brand.tone_voice || 'Authentic and direct',
      targetDemographics,
      igHandle: creator.ig_handle,
      nichePrimary: creator.niche_primary,
      nicheSecondary: creator.niche_secondary,
      followerCount: Number(stats?.follower_count) || 0,
      engagementRate: Number(stats?.engagement_rate) || 0,
      avgLikes: Number(stats?.avg_likes) || 0,
      avgComments: Number(stats?.avg_comments) || 0,
      topCountries,
      bio: creator.bio,
      lowestRateAmount: Number(lowestRateCard?.price) || 0,
      lowestRateCurrency: lowestRateCard?.currency || campaignCurrency,
      lowestRateServiceType: lowestRateCard?.service_type || 'POST',
    });

    const result = await callAI(
      prompt,
      'fit_score',
      FIT_SCORE_PROMPT_VERSION,
      brandId,
      null,
      { timeoutMs: 30000 }
    );

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
        contextSource: 'conversation_context',
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
      .select('company_name, tone_voice')
      .eq('id', brandId)
      .single();

    if (!brand) {
      throw Errors.NOT_FOUND('Brand profile not found');
    }

    // Fetch creator
    const { data: creator } = await supabase
      .from('influencer_profiles')
      .select('ig_handle, niche_primary, niche_secondary, bio')
      .eq('id', creator_id)
      .eq('is_verified', true)
      .eq('is_deleted', false)
      .single();

    if (!creator) {
      throw Errors.NOT_FOUND('Creator not found');
    }

    const briefData = asObject(campaign.brief_data);
    const keyMessages = asStringArray(briefData.keyMessages);
    if (keyMessages.length === 0) {
      keyMessages.push(campaign.brief_preview || 'Highlight what makes this campaign worth acting on');
    }

    const dos = asStringArray(briefData.dos);
    if (dos.length === 0) {
      dos.push(
        'Show product integration within the first moments of content',
        'Use a natural first-person explanation of why this matters',
        'Close with a direct, low-friction CTA'
      );
    }

    const donts = asStringArray(briefData.donts);
    if (donts.length === 0) {
      donts.push(
        'Do not use over-produced ad-like visuals',
        'Do not delay product visibility until late in the content',
        'Do not make claims the brand cannot substantiate'
      );
    }

    const callToAction = typeof briefData.callToAction === 'string'
      ? briefData.callToAction
      : (typeof briefData.cta === 'string' ? briefData.cta : 'Use link in bio to discover and shop now');

    const objective = typeof briefData.objective === 'string'
      ? briefData.objective
      : (campaign.brief_preview || 'Drive awareness and qualified conversions');

    // Build prompt
    const prompt = buildContentBriefPrompt({
      companyName: brand.company_name,
      toneVoice: brand.tone_voice || 'Authentic and direct',
      keyMessages,
      dos,
      donts,
      callToAction,
      igHandle: creator.ig_handle,
      nichePrimary: creator.niche_primary,
      nicheSecondary: creator.niche_secondary,
      bio: creator.bio,
      serviceType: mapContentFormatToServiceType(content_format),
      campaignTitle: campaign.title,
      objective,
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
      .select('id, ig_handle, niche_primary, niche_secondary, bio')
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
      .select('company_name, tone_voice')
      .eq('id', campaign.brand_id)
      .single();

    if (!brand) {
      throw Errors.NOT_FOUND('Brand profile not found');
    }

    const briefData = asObject(campaign.brief_data);
    const keyMessages = asStringArray(briefData.keyMessages);
    if (keyMessages.length === 0) {
      keyMessages.push(campaign.brief_preview || 'Show why this campaign matters to your audience');
    }

    const dos = asStringArray(briefData.dos);
    if (dos.length === 0) {
      dos.push(
        'Lead with an authentic personal angle',
        'Keep product placement natural and early',
        'Include a clear CTA with minimal friction'
      );
    }

    const donts = asStringArray(briefData.donts);
    if (donts.length === 0) {
      donts.push(
        'Avoid scripted ad tone',
        'Avoid hidden or unclear product moments',
        'Avoid unsupported claims or guarantees'
      );
    }

    const callToAction = typeof briefData.callToAction === 'string'
      ? briefData.callToAction
      : (typeof briefData.cta === 'string' ? briefData.cta : 'Direct viewers to link in bio to learn more');

    const objective = typeof briefData.objective === 'string'
      ? briefData.objective
      : (campaign.brief_preview || 'Drive awareness and conversion-ready traffic');

    const prompt = buildContentBriefPrompt({
      companyName: brand.company_name,
      toneVoice: brand.tone_voice || 'Authentic and direct',
      keyMessages,
      dos,
      donts,
      callToAction,
      igHandle: influencer.ig_handle,
      nichePrimary: influencer.niche_primary,
      nicheSecondary: influencer.niche_secondary,
      bio: influencer.bio,
      serviceType: mapContentFormatToServiceType(contentFormat),
      campaignTitle: campaign.title,
      objective,
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
