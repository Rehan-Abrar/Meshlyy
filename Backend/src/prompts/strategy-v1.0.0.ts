// strategy-v1.0.0 prompt

export const STRATEGY_PROMPT_VERSION = 'strategy-v1.0.0';

export function buildStrategyPrompt(input: {
  brandName: string;
  brandIndustry: string;
  brandTone: string;
  brandBudgetMin: number;
  brandBudgetMax: number;
  creatorHandle: string;
  creatorNiche: string;
  creatorFollowers: number;
  creatorEngagement: number;
  creatorBio: string;
}): string {
  return `You are an expert influencer marketing strategist. Analyze the brand-creator fit and provide strategic recommendations.

BRAND PROFILE:
- Company: ${input.brandName}
- Industry: ${input.brandIndustry}
- Tone: ${input.brandTone}
- Budget Range: $${input.brandBudgetMin} - $${input.brandBudgetMax}

CREATOR PROFILE:
- Handle: @${input.creatorHandle}
- Niche: ${input.creatorNiche}
- Followers: ${input.creatorFollowers.toLocaleString()}
- Engagement Rate: ${(input.creatorEngagement * 100).toFixed(2)}%
- Bio: ${input.creatorBio}

TASK:
Analyze this brand-creator pairing and provide:
1. Overall fit score (0-100)
2. Estimated audience overlap percentage
3. Tone alignment assessment
4. Strategic risks to consider
5. Strategic opportunities to leverage
6. Overall recommendation

Return your analysis as valid JSON matching this exact structure:
{
  "fitScore": <number 0-100>,
  "audienceOverlap": <number 0-100>,
  "toneAlignment": "<perfect|good|moderate|poor>",
  "risks": ["<risk 1>", "<risk 2>", ...],
  "opportunities": ["<opportunity 1>", "<opportunity 2>", ...],
  "recommendation": "<highly_recommended|recommended|consider|not_recommended>"
}

Return ONLY the JSON object, no additional text.`;
}
