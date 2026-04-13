// Zod schemas for AI tool outputs
import { z } from 'zod';

/**
 * Strategy Tool Output Schema
 * Generates a full influencer campaign strategy with allocations, cadence, and risk planning
 */
export const StrategyOutputSchema = z.object({
  executiveSummary: z.string().describe('High-level summary of campaign strategy'),
  recommendedPlatforms: z.array(
    z.object({
      platform: z.string(),
      rationale: z.string(),
      primaryFormat: z.string(),
    })
  ).describe('Recommended platform mix with rationale'),
  contentAngles: z.array(
    z.object({
      title: z.string(),
      concept: z.string(),
      whyItWorks: z.string(),
    })
  ).describe('Scroll-stopping creative concepts'),
  recommendedPostingCadence: z.object({
    postsPerWeek: z.number().min(0),
    storiesPerWeek: z.number().min(0),
    campaignDurationWeeks: z.number().min(1),
    optimalDays: z.array(z.string()),
    rationale: z.string(),
  }).describe('Posting frequency and timing plan'),
  recommendedCreatorProfile: z.object({
    followerRange: z.object({
      min: z.number().min(0),
      max: z.number().min(0),
    }),
    minEngagementRate: z.number().min(0),
    nicheKeywords: z.array(z.string()),
    creatorPersonality: z.string(),
    rationale: z.string(),
  }).describe('Ideal creator profile for the campaign'),
  budgetAllocation: z.object({
    planningBudget: z.number().min(0),
    currency: z.string(),
    breakdown: z.object({
      creatorFees: z.object({
        percentage: z.number().min(0).max(100),
        amount: z.number().min(0),
        note: z.string(),
      }),
      paidAmplification: z.object({
        percentage: z.number().min(0).max(100),
        amount: z.number().min(0),
        note: z.string(),
      }),
      production: z.object({
        percentage: z.number().min(0).max(100),
        amount: z.number().min(0),
        note: z.string(),
      }),
      contingency: z.object({
        percentage: z.number().min(0).max(100),
        amount: z.number().min(0),
        note: z.string(),
      }),
    }),
  }).describe('Budget split with exact amounts and rationale'),
  kpiTargets: z.object({
    estimatedReach: z.number().min(0),
    engagementRateTarget: z.string(),
    viewTarget: z.number().min(0),
    clickTarget: z.number().min(0),
    rationale: z.string(),
  }).describe('Numeric performance targets'),
  riskFactors: z.array(
    z.object({
      risk: z.string(),
      mitigation: z.string(),
    })
  ).describe('Potential campaign risks and mitigations'),
  nextSteps: z.array(z.string()).describe('Immediate execution steps'),
});

export type StrategyOutput = z.infer<typeof StrategyOutputSchema>;

/**
 * Brief Tool Output Schema
 * Generates campaign brief from brand goals
 */
export const BriefOutputSchema = z.object({
  briefPreview: z.string().max(280).describe('Compelling creator-facing preview text'),
  objective: z.string().describe('Specific, measurable objective'),
  targetAudience: z.string().describe('Detailed audience description'),
  keyMessages: z.array(z.string()).describe('Core campaign messages'),
  deliverables: z.array(
    z.object({
      platform: z.string(),
      format: z.string(),
      spec: z.string(),
      requirement: z.string(),
    })
  ).describe('Platform-specific deliverable requirements'),
  toneGuidance: z.string().describe('Visual and specific creative tone guidance'),
  dos: z.array(z.string()).describe('Brand-specific dos'),
  donts: z.array(z.string()).describe('Brand-specific donts'),
  timeline: z.array(
    z.object({
      week: z.string(),
      focus: z.string(),
    })
  ).describe('Week-by-week execution plan'),
  budgetBreakdown: z.object({
    creatorFees: z.object({
      percentage: z.number().min(0).max(100),
      amount: z.number().min(0),
      currency: z.string(),
    }),
    paidAmplification: z.object({
      percentage: z.number().min(0).max(100),
      amount: z.number().min(0),
      currency: z.string(),
    }),
    production: z.object({
      percentage: z.number().min(0).max(100),
      amount: z.number().min(0),
      currency: z.string(),
    }),
  }).describe('Mandatory budget allocation split'),
  successMetrics: z.array(z.string()).describe('Specific numeric success thresholds'),
  creatorProfile: z.object({
    followerRange: z.string(),
    minEngagementRate: z.string(),
    nicheKeywords: z.array(z.string()),
    rationale: z.string(),
  }).describe('Recommended creator profile and fit rationale'),
});

export type BriefOutput = z.infer<typeof BriefOutputSchema>;

/**
 * Fit Score Tool Output Schema
 * Scores creator fit for a specific campaign
 */
export const FitScoreOutputSchema = z.object({
  score: z.number().min(0).max(100).describe('Overall calibrated fit score'),
  summary: z.string().describe('2-3 sentence decision-oriented summary'),
  scoreBreakdown: z.object({
    nicheAlignment: z.number().min(0).max(100),
    audienceMatch: z.number().min(0).max(100),
    engagementQuality: z.number().min(0).max(100),
    budgetCompatibility: z.number().min(0).max(100),
    toneAlignment: z.number().min(0).max(100),
  }).describe('Weighted dimension scoring components'),
  strengths: z.array(z.string()).describe('Top creator strengths for campaign fit'),
  risks: z.array(z.string()).describe('Top fit risks for this pairing'),
  budgetCompatible: z.boolean().describe('Whether creator rates fit campaign budget'),
  budgetNote: z.string().describe('Specific budget comparison and negotiation note'),
  recommendation: z.enum(['strong_yes', 'yes', 'maybe', 'no', 'strong_no']).describe('Final recommendation'),
});

export type FitScoreOutput = z.infer<typeof FitScoreOutputSchema>;

/**
 * Content Brief Tool Output Schema
 * Creates detailed content brief for creator
 */
export const ContentBriefOutputSchema = z.object({
  talkingPoints: z.array(z.string()).describe('Creator-adapted message points'),
  toneGuidance: z.string().describe('How to blend brand tone with creator voice'),
  formatGuidance: z.string().describe('Detailed structure guidance for requested format'),
  hookIdea: z.string().describe('Opening hook idea for first frames/seconds'),
  dos: z.array(z.string()).describe('Creator-specific creative dos'),
  donts: z.array(z.string()).describe('Creator-specific creative donts'),
  suggestedHashtags: z.array(z.string()).describe('Traffic-oriented niche+campaign hashtags without #'),
  callToAction: z.string().describe('Format-optimized CTA instruction'),
  captionDirection: z.string().describe('Caption strategy direction'),
  creativeNotes: z.string().describe('Additional confidence-building creative direction'),
});

export type ContentBriefOutput = z.infer<typeof ContentBriefOutputSchema>;
