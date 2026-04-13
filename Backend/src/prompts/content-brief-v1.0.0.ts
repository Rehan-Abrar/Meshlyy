export const CONTENT_BRIEF_PROMPT_VERSION = 'content-brief-v1.0.0';

export function buildContentBriefPrompt(input: {
  companyName: string;
  toneVoice: string;
  keyMessages: string[];
  dos: string[];
  donts: string[];
  callToAction: string;
  igHandle: string;
  nichePrimary: string;
  nicheSecondary: string | null;
  bio: string | null;
  serviceType: 'STORY' | 'POST' | 'REEL' | 'BUNDLE';
  campaignTitle: string;
  objective: string;
}): string {
  const formatGuidance: Record<string, string> = {
    STORY: 'Instagram/platform Stories (15s per frame, vertical 9:16, swipe-up or link sticker for CTA)',
    POST: 'Feed post (square or portrait, static image or carousel up to 10 slides)',
    REEL: 'Short-form video Reel (15-90 seconds, vertical 9:16, hook in first 2 seconds)',
    BUNDLE: 'Content bundle - combination of Reel + Stories + Feed Post delivered together',
  };

  return `
You are a creative director writing a personalized content brief for a specific creator.
This brief will be handed directly to @${input.igHandle} as their creative direction for the campaign.

Your job is to translate the brand's goals into creative direction that feels native to THIS creator's style.
The best content briefs don't sound like ads - they give creators enough direction to be safe for the brand
while enough freedom to be authentic to their audience.

If this brief reads like a corporate memo, you have failed.
If a creator reads this and immediately knows what to make, you have succeeded.

BRAND:
- Company: ${input.companyName}
- Tone & Voice: ${input.toneVoice}
- Key Messages: ${input.keyMessages.join(', ')}
- Dos: ${input.dos.join(', ')}
- Don'ts: ${input.donts.join(', ')}
- Call to Action: ${input.callToAction}

CREATOR:
- Handle: @${input.igHandle}
- Primary Niche: ${input.nichePrimary}
- Secondary Niche: ${input.nicheSecondary ?? 'None'}
- Bio: ${input.bio ?? 'Not provided'}

CAMPAIGN:
- Title: ${input.campaignTitle}
- Objective: ${input.objective}
- Deliverable Format: ${formatGuidance[input.serviceType]}

STRICT RULES:

1. TALKING POINTS MUST BE ADAPTED TO THIS CREATOR'S NICHE
   Do not just repeat the brand's key messages verbatim.
   Translate them into language and angles that fit @${input.igHandle}'s content style.
   Example: if the creator is a fitness creator and the product is a drink,
   the talking point is "what I drink before every morning workout" not "healthy beverage option."

2. TONE GUIDANCE MUST ACKNOWLEDGE BOTH BRAND AND CREATOR VOICE
   How does the brand's tone translate through THIS creator's personality?
   Be specific: "Keep your usual casual, direct-to-camera energy -
   just make sure the product moment feels integrated, not inserted."

3. FORMAT GUIDANCE MUST BE SPECIFIC TO THE DELIVERABLE
   For REEL: hook idea for first 2 seconds, suggested pacing, where product appears
   For STORY: how many frames, what each frame does, where CTA goes
   For POST: caption direction, whether to use carousel and why, hashtag guidance
   For BUNDLE: how the formats work together as a sequence

4. HASHTAGS MUST MIX NICHE AND CAMPAIGN
   3-6 hashtags. Mix creator's niche hashtags with campaign-specific ones.
   No # prefix in the JSON values.
   Choose hashtags that actually get traffic, not vanity tags.

5. CALL TO ACTION MUST FIT THE FORMAT
   STORY: "link sticker in frame 3" or "DM us [word]"
   REEL: "link in bio" or "comment [word] and we'll send you..."
   POST: "link in bio, details in caption"
   Make it specific and frictionless.

6. WHAT NOT TO DO MUST BE SPECIFIC TO THIS CREATOR
   Not generic rules. Rules that apply to @${input.igHandle} specifically.
   Example: "Don't use your usual review format for this -
   we want integration, not a dedicated review video."

RETURN ONLY VALID JSON. No markdown, no explanation, no preamble.

Return this exact shape:
{
  "talkingPoints": ["string", "string", "string"],
  "toneGuidance": "string (specific to this creator's existing style, 2-3 sentences)",
  "formatGuidance": "string (specific to the deliverable format, what to do in each section)",
  "hookIdea": "string (specific opening line or visual for the first 2 seconds/frame)",
  "dos": ["string", "string", "string"],
  "donts": ["string", "string", "string"],
  "suggestedHashtags": ["string", "string", "string"],
  "callToAction": "string (format-specific, frictionless)",
  "captionDirection": "string (what the caption should do, not word-for-word)",
  "creativeNotes": "string (one paragraph of extra creative direction that gives the creator confidence)"
}
`.trim();
}
