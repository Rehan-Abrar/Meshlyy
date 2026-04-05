// brief-v1.0.0 prompt

export const BRIEF_PROMPT_VERSION = 'brief-v1.0.0';

export function buildBriefPrompt(input: {
  brandName: string;
  brandIndustry: string;
  brandTone: string;
  campaignGoal: string;
  targetAudience?: string;
  budget?: number;
}): string {
  return `You are an expert campaign strategist. Generate a comprehensive campaign brief based on the brand's goals.

BRAND PROFILE:
- Company: ${input.brandName}
- Industry: ${input.brandIndustry}
- Brand Voice: ${input.brandTone}

CAMPAIGN GOAL:
${input.campaignGoal}

${input.targetAudience ? `TARGET AUDIENCE:\n${input.targetAudience}\n` : ''}
${input.budget ? `BUDGET: $${input.budget.toLocaleString()}\n` : ''}

TASK:
Create a campaign brief that includes:
1. Compelling campaign title
2. Clear primary objective
3. Specific content deliverables (e.g., "1 reel", "3 stories", "2 posts")
4. Appropriate tone for content
5. Strong call to action
6. Suggested hashtags (optional)
7. Recommended timeline (optional)

Return your brief as valid JSON matching this exact structure:
{
  "title": "<campaign title>",
  "objective": "<primary objective>",
  "deliverables": ["<deliverable 1>", "<deliverable 2>", ...],
  "tone": "<content tone>",
  "cta": "<call to action>",
  "hashtags": ["<tag1>", "<tag2>", ...],
  "timeline": "<suggested timeline>"
}

Return ONLY the JSON object, no additional text.`;
}
