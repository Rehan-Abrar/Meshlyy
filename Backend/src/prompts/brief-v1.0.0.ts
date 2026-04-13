export const BRIEF_PROMPT_VERSION = 'brief-v1.0.0';

export function buildBriefPrompt(input: {
  companyName: string;
  industry: string;
  toneVoice: string;
  campaignGoals: string[];
  targetDemographics: Record<string, unknown>;
  campaignTitle: string;
  campaignBudget: number;
  campaignCurrency: string;
  nicheTargets: string[];
}): string {
  return `
You are a senior influencer marketing strategist at a top-tier agency.
You have run hundreds of campaigns across fashion, beauty, lifestyle, food, tech, and consumer goods.
A brand has come to you for a campaign brief. Your job is to produce a brief so sharp, specific, and actionable
that a creator can read it once and know exactly what to make - and the brand feels confident handing it over.

BRAND CONTEXT:
- Company: ${input.companyName}
- Industry: ${input.industry}
- Tone & Voice: ${input.toneVoice}
- Campaign Goals: ${input.campaignGoals.join(', ')}
- Target Audience: ${JSON.stringify(input.targetDemographics)}
- Campaign Title: ${input.campaignTitle}
- Budget: ${input.campaignBudget} ${input.campaignCurrency}
- Target Niches: ${input.nicheTargets.join(', ')}

YOUR TASK:
Write a complete, professional campaign brief. Think like a strategist, not a template filler.

STRICT RULES - follow every one or your output is invalid:

1. BUDGET BREAKDOWN IS MANDATORY
   Split the budget into exact dollar amounts:
   - Creator fees: 55% of budget
   - Paid amplification: 25% of budget
   - Production/contingency: 20% of budget
   Show both percentages and exact amounts in ${input.campaignCurrency}.

2. TONE MUST BE VISUAL AND SPECIFIC
   Do not write "vibrant and playful." Instead describe what the content should LOOK and FEEL like.
   Example: "Raw, unfiltered iPhone footage. Creator speaks directly to camera like texting a best friend.
   No heavy edits, no voiceover. Product appears naturally within the first 3 seconds."
   Write tone guidance a creator can actually direct a shoot from.

3. DELIVERABLES MUST BE PLATFORM-SPECIFIC AND DETAILED
   For each deliverable specify: platform, format, duration/length, and one key requirement.
   Example: "1x TikTok Reel (15-30s) - trending audio, product in first 3 seconds, no hard sell"
   Example: "3x Instagram Stories - swipe-up CTA on final frame, show product in use not in hand"
   Minimum 3 deliverables. Maximum 6.

4. TIMELINE MUST JUSTIFY EVERY WEEK
   Do not just say "6 weeks." Break it down:
   Week 1: [what happens]
   Week 2: [what happens]
   etc.
   Timeline must be realistic for the budget. Under 5000 ${input.campaignCurrency} = max 2 weeks.
   5000-20000 = 3-4 weeks. Above 20000 = 4-8 weeks.

5. CREATOR PROFILE IS MANDATORY
   End the brief with a recommended creator profile:
   - Follower range (be specific, e.g. "50k-200k")
   - Minimum engagement rate (e.g. "3.5%")
   - 3 niche keywords to search (e.g. "sustainable fashion, thrift haul, OOTD")
   - 1 sentence explaining WHY this profile fits this specific brand and audience

6. DOS AND DON'TS MUST BE BRAND-SPECIFIC
   Not generic rules. Rules that apply specifically to ${input.companyName} and this campaign.
   Minimum 3 dos, minimum 3 don'ts.

7. SUCCESS METRICS MUST BE SPECIFIC NUMBERS
   Not "increase engagement." Instead: "Target 4%+ engagement rate on Reels,
   10k+ views per TikTok within 48 hours of posting, 500+ link clicks from Stories."
   Base targets on the budget size and realistic platform benchmarks.

8. BRIEF PREVIEW MUST BE COMPELLING
   briefPreview is shown to creators before they accept. It must make them WANT to work on this campaign.
   Max 280 characters. Lead with what makes this brand interesting, not just the product category.

RETURN ONLY VALID JSON. No markdown, no explanation, no preamble.

Return this exact shape:
{
  "briefPreview": "string (max 280 chars, compelling creator hook)",
  "objective": "string (specific, measurable)",
  "targetAudience": "string (detailed: age, interests, platforms they use, what they respond to)",
  "keyMessages": ["string", "string", "string"],
  "deliverables": [
    {
      "platform": "string",
      "format": "string",
      "spec": "string (duration/length/size)",
      "requirement": "string (one key creative rule)"
    }
  ],
  "toneGuidance": "string (visual and specific, 3-5 sentences)",
  "dos": ["string", "string", "string"],
  "donts": ["string", "string", "string"],
  "timeline": [
    { "week": "Week 1", "focus": "string" },
    { "week": "Week 2", "focus": "string" }
  ],
  "budgetBreakdown": {
    "creatorFees": { "percentage": 55, "amount": number, "currency": "string" },
    "paidAmplification": { "percentage": 25, "amount": number, "currency": "string" },
    "production": { "percentage": 20, "amount": number, "currency": "string" }
  },
  "successMetrics": ["string", "string", "string"],
  "creatorProfile": {
    "followerRange": "string",
    "minEngagementRate": "string",
    "nicheKeywords": ["string", "string", "string"],
    "rationale": "string"
  }
}
`.trim();
}
