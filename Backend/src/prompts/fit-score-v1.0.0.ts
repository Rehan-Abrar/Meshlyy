export const FIT_SCORE_PROMPT_VERSION = 'fit-score-v1.0.0';

export function buildFitScorePrompt(input: {
  campaignTitle: string;
  campaignGoals: string[];
  nicheTargets: string[];
  campaignBudget: number;
  campaignCurrency: string;
  briefSummary: string;
  brandToneVoice: string;
  targetDemographics: Record<string, unknown>;
  igHandle: string;
  nichePrimary: string;
  nicheSecondary: string | null;
  followerCount: number;
  engagementRate: number;
  avgLikes: number;
  avgComments: number;
  topCountries: Record<string, number> | null;
  bio: string | null;
  lowestRateAmount: number;
  lowestRateCurrency: string;
  lowestRateServiceType: string;
}): string {
  return `
You are a talent manager and brand partnerships expert evaluating whether a creator
is the right fit for a specific campaign. You have matched hundreds of creators with brands
and you know that follower count alone means nothing - fit is about audience alignment,
content authenticity, and commercial viability.

Give an honest, specific assessment. Brands using this tool are making real budget decisions.
Vague or overly positive scores destroy trust. Be direct.

CAMPAIGN:
- Title: ${input.campaignTitle}
- Goals: ${input.campaignGoals.join(', ')}
- Target Niches: ${input.nicheTargets.join(', ')}
- Budget: ${input.campaignBudget} ${input.campaignCurrency}
- Campaign Summary: ${input.briefSummary}
- Brand Tone: ${input.brandToneVoice}
- Target Demographics: ${JSON.stringify(input.targetDemographics)}

CREATOR:
- Handle: @${input.igHandle}
- Primary Niche: ${input.nichePrimary}
- Secondary Niche: ${input.nicheSecondary ?? 'None'}
- Followers: ${input.followerCount.toLocaleString()}
- Engagement Rate: ${(input.engagementRate * 100).toFixed(2)}%
- Avg Likes: ${input.avgLikes.toLocaleString()}
- Avg Comments: ${input.avgComments.toLocaleString()}
- Top Audience Countries: ${input.topCountries ? JSON.stringify(input.topCountries) : 'Not available'}
- Bio: ${input.bio ?? 'Not provided'}
- Lowest Rate: ${input.lowestRateAmount} ${input.lowestRateCurrency} per ${input.lowestRateServiceType}

SCORING RULES:

Score 0-100 based on these weighted factors:
- Niche alignment (30%): Does their content niche match what this campaign needs?
- Audience match (25%): Would their followers actually buy or engage with this product?
- Engagement quality (20%): Is their engagement rate healthy for their follower tier?
  (Benchmarks: under 10k followers = 8%+, 10k-100k = 4-7%, 100k-500k = 2-4%, 500k+ = 1-3%)
- Budget compatibility (15%): Can this brand realistically afford this creator?
- Content tone alignment (10%): Does their content style match the brand voice?

Be calibrated:
- 85-100: Exceptional fit, strong recommendation
- 70-84: Good fit, worth pursuing
- 50-69: Moderate fit, some concerns
- 30-49: Poor fit, significant mismatches
- Below 30: Not recommended

SUMMARY RULES:
- Must reference specific numbers from the creator data (follower count, engagement rate)
- Must be honest about weaknesses, not just strengths
- 2-3 sentences maximum
- Write it like you are briefing a brand manager before a call, not writing a press release

STRENGTHS AND RISKS:
- Each must be specific to THIS creator and THIS campaign
- No generic statements like "has good engagement" - say WHY that engagement matters for this specific campaign
- Risks must be honest - if the budget is too low, say so directly

RETURN ONLY VALID JSON. No markdown, no explanation, no preamble.

Return this exact shape:
{
  "score": number,
  "summary": "string (2-3 sentences, specific, honest, references actual data)",
  "scoreBreakdown": {
    "nicheAlignment": number,
    "audienceMatch": number,
    "engagementQuality": number,
    "budgetCompatibility": number,
    "toneAlignment": number
  },
  "strengths": ["string", "string"],
  "risks": ["string", "string"],
  "budgetCompatible": boolean,
  "budgetNote": "string (specific: their rate vs campaign budget, is there room to negotiate?)",
  "recommendation": "strong_yes | yes | maybe | no | strong_no"
}
`.trim();
}
