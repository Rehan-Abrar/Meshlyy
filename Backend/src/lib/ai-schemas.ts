// Zod schemas for AI tool outputs
import { z } from 'zod';

/**
 * Strategy Tool Output Schema
 * Analyzes brand-creator fit and generates strategic recommendations
 */
export const StrategyOutputSchema = z.object({
  fitScore: z.number().min(0).max(100).describe('Overall brand-creator alignment score (0-100)'),
  audienceOverlap: z.number().min(0).max(100).describe('Percentage of creator audience matching brand target'),
  toneAlignment: z.enum(['perfect', 'good', 'moderate', 'poor']).describe('Creator tone vs brand voice alignment'),
  risks: z.array(z.string()).describe('List of identified risks or concerns'),
  opportunities: z.array(z.string()).describe('List of strategic opportunities'),
  recommendation: z.enum(['highly_recommended', 'recommended', 'consider', 'not_recommended']).describe('Overall recommendation'),
});

export type StrategyOutput = z.infer<typeof StrategyOutputSchema>;

/**
 * Brief Tool Output Schema
 * Generates campaign brief from brand goals
 */
export const BriefOutputSchema = z.object({
  title: z.string().describe('Campaign title'),
  objective: z.string().describe('Primary campaign objective'),
  deliverables: z.array(z.string()).describe('Required content deliverables'),
  tone: z.string().describe('Desired content tone'),
  cta: z.string().describe('Call to action'),
  hashtags: z.array(z.string()).optional().describe('Suggested hashtags'),
  timeline: z.string().optional().describe('Suggested timeline'),
});

export type BriefOutput = z.infer<typeof BriefOutputSchema>;

/**
 * Fit Score Tool Output Schema
 * Scores creator fit for a specific campaign
 */
export const FitScoreOutputSchema = z.object({
  overallScore: z.number().min(0).max(100).describe('Overall fit score (0-100)'),
  nicheMatch: z.number().min(0).max(100).describe('Niche alignment score'),
  audienceMatch: z.number().min(0).max(100).describe('Audience demographic match score'),
  engagementQuality: z.number().min(0).max(100).describe('Engagement quality score'),
  contentStyle: z.number().min(0).max(100).describe('Content style compatibility score'),
  reasoning: z.string().describe('Explanation of score components'),
  redFlags: z.array(z.string()).optional().describe('Potential concerns or red flags'),
});

export type FitScoreOutput = z.infer<typeof FitScoreOutputSchema>;

/**
 * Content Brief Tool Output Schema
 * Creates detailed content brief for creator
 */
export const ContentBriefOutputSchema = z.object({
  postType: z.enum(['reel', 'post', 'story', 'carousel']).describe('Content format'),
  keyMessages: z.array(z.string()).describe('Key messages to convey'),
  visualGuidelines: z.string().describe('Visual style and aesthetic guidelines'),
  dosAndDonts: z.object({
    dos: z.array(z.string()).describe('Things to include or emphasize'),
    donts: z.array(z.string()).describe('Things to avoid'),
  }).describe('Do and dont guidelines'),
  exampleContent: z.string().optional().describe('Example content or reference'),
  approvalProcess: z.string().describe('Content approval workflow'),
});

export type ContentBriefOutput = z.infer<typeof ContentBriefOutputSchema>;
