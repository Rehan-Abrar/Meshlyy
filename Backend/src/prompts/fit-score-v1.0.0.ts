// fit-score-v1.0.0 prompt

export const FIT_SCORE_PROMPT_VERSION = 'fit-score-v1.0.0';

export function buildFitScorePrompt(input: {
  campaignTitle: string;
  campaignObjective: string;
  campaignNiches: string[];
  creatorHandle: string;
  creatorNiche: string;
  creatorFollowers: number;
  creatorEngagement: number;
  creatorAvgLikes: number;
  creatorAvgComments: number;
  creatorBio: string;
}): string {
  return `You are an expert at scoring creator-campaign fit for influencer marketing campaigns.

CAMPAIGN:
- Title: ${input.campaignTitle}
- Objective: ${input.campaignObjective}
- Target Niches: ${input.campaignNiches.join(', ')}

CREATOR:
- Handle: @${input.creatorHandle}
- Niche: ${input.creatorNiche}
- Followers: ${input.creatorFollowers.toLocaleString()}
- Engagement Rate: ${(input.creatorEngagement * 100).toFixed(2)}%
- Avg Likes: ${input.creatorAvgLikes.toLocaleString()}
- Avg Comments: ${input.creatorAvgComments.toLocaleString()}
- Bio: ${input.creatorBio}

TASK:
Score this creator's fit for the campaign on four dimensions:
1. Niche Match (0-100): How well does the creator's niche align with campaign targets?
2. Audience Match (0-100): How likely is the creator's audience to match campaign goals?
3. Engagement Quality (0-100): Quality of engagement (comments, saves, shares vs just likes)
4. Content Style (0-100): Does the creator's content style suit the campaign?

Also provide:
- Overall weighted score (0-100)
- Clear reasoning for the scores
- Any red flags or concerns

Return your analysis as valid JSON matching this exact structure:
{
  "overallScore": <number 0-100>,
  "nicheMatch": <number 0-100>,
  "audienceMatch": <number 0-100>,
  "engagementQuality": <number 0-100>,
  "contentStyle": <number 0-100>,
  "reasoning": "<detailed explanation>",
  "redFlags": ["<concern 1>", "<concern 2>", ...]
}

Return ONLY the JSON object, no additional text.`;
}
