// content-brief-v1.0.0 prompt

export const CONTENT_BRIEF_PROMPT_VERSION = 'content-brief-v1.0.0';

export function buildContentBriefPrompt(input: {
  campaignTitle: string;
  campaignObjective: string;
  campaignDeliverables: string[];
  brandTone: string;
  creatorHandle: string;
  creatorNiche: string;
  contentFormat: 'reel' | 'post' | 'story' | 'carousel';
}): string {
  return `You are an expert content strategist creating detailed content briefs for influencer collaborations.

CAMPAIGN:
- Title: ${input.campaignTitle}
- Objective: ${input.campaignObjective}
- Deliverables: ${input.campaignDeliverables.join(', ')}
- Brand Voice: ${input.brandTone}

CREATOR:
- Handle: @${input.creatorHandle}
- Niche: ${input.creatorNiche}

CONTENT FORMAT: ${input.contentFormat}

TASK:
Create a detailed content brief for this ${input.contentFormat} that includes:
1. Key messages to communicate (3-5 points)
2. Visual guidelines and aesthetic direction
3. Clear dos and don'ts for content creation
4. Example content or reference (optional)
5. Approval process explanation

The brief should balance brand requirements with the creator's authentic voice and style.

Return your brief as valid JSON matching this exact structure:
{
  "postType": "${input.contentFormat}",
  "keyMessages": ["<message 1>", "<message 2>", ...],
  "visualGuidelines": "<visual direction and aesthetic>",
  "dosAndDonts": {
    "dos": ["<do 1>", "<do 2>", ...],
    "donts": ["<dont 1>", "<dont 2>", ...]
  },
  "exampleContent": "<optional example>",
  "approvalProcess": "<approval workflow>"
}

Return ONLY the JSON object, no additional text.`;
}
