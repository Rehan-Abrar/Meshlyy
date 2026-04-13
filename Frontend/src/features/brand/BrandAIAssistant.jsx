import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import styles from './BrandAIAssistant.module.css';
import { useAuth } from '../../context/AuthContext';
import { apiClient, isApiError } from '../../utils/apiClient';

const INITIAL_MESSAGES = [
  {
    id: 'welcome',
    role: 'assistant',
    type: 'text',
    text: "Hello! I'm your Meshlyy Brand Co-pilot. Describe your campaign goal and I will generate a live AI brief.",
  },
];

const SMALL_TALK_PATTERN = /^(hi+|hello+|hey+|yo+|hola+|salam+|assalam\s?o\s?alaikum|helloo+)\b/i;
const DISCOVERY_INTENT_PATTERN = /\b(find|search|discover|source|who should|which creator|which influencer|creator|influencer)\b/i;
const BRIEF_INTENT_PATTERN = /\b(campaign brief|write a brief|create a brief|generate a brief|brief)\b/i;
const STRATEGY_INTENT_PATTERN = /\b(strategy|help me plan|plan|planning)\b/i;
const FIT_SCORE_INTENT_PATTERN = /\b(score|fit|good fit|should i work with|work with)\b/i;
const FIT_SCORE_RETRYABLE_CODES = new Set(['INTERNAL_ERROR', 'REQUEST_TIMEOUT', 'AI_UNAVAILABLE', 'AI_RATE_LIMIT']);

function createMessageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isSmallTalk(prompt) {
  return SMALL_TALK_PATTERN.test(prompt.trim());
}

function detectIntent(prompt) {
  if (FIT_SCORE_INTENT_PATTERN.test(prompt)) {
    return 'fit_score';
  }

  if (BRIEF_INTENT_PATTERN.test(prompt)) {
    return 'brief';
  }

  if (DISCOVERY_INTENT_PATTERN.test(prompt) && !BRIEF_INTENT_PATTERN.test(prompt)) {
    return 'discover';
  }

  if (STRATEGY_INTENT_PATTERN.test(prompt)) {
    return 'strategy';
  }

  return 'strategy';
}

function buildSmallTalkReply() {
  return 'Hey! I can generate strategy, briefs, creator discovery, and fit scores. Tell me what you want to do.';
}

function shouldRetryFitScoreError(error) {
  if (!isApiError(error)) return false;
  return error.status >= 500 || FIT_SCORE_RETRYABLE_CODES.has(error.code);
}

function buildFitScoreErrorMessage(error) {
  if (!isApiError(error)) {
    return 'I could not score this creator right now. Please try again in a moment.';
  }

  if (error.status === 429 || error.code === 'AI_RATE_LIMIT') {
    return 'Fit scoring is busy right now. Please try again in a moment.';
  }

  return 'I could not score this creator right now. Please try again in a moment.';
}

function formatNumber(value) {
  const numeric = Number(value || 0);
  if (numeric >= 1000000) return `${(numeric / 1000000).toFixed(1)}M`;
  if (numeric >= 1000) return `${Math.round(numeric / 1000)}K`;
  return String(numeric);
}

function normalizeEngagementPercent(value) {
  const numeric = Number(value || 0);
  return numeric <= 1 ? numeric * 100 : numeric;
}

function parseShortNumber(value) {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return null;

  const cleaned = value.trim().toLowerCase();
  const match = cleaned.match(/^(\d+(?:\.\d+)?)(k|m)?$/i);
  if (!match) return null;

  const base = Number(match[1]);
  if (Number.isNaN(base)) return null;

  if (match[2] === 'm') return Math.round(base * 1000000);
  if (match[2] === 'k') return Math.round(base * 1000);
  return Math.round(base);
}

function parseFollowerRange(range) {
  if (!range) {
    return { min: null, max: null };
  }

  if (typeof range === 'object') {
    const min = Number(range.min);
    const max = Number(range.max);
    return {
      min: Number.isFinite(min) ? min : null,
      max: Number.isFinite(max) ? max : null,
    };
  }

  if (typeof range === 'string') {
    const match = range.match(/([\d.]+\s*[kKmM]?)\s*[-to]+\s*([\d.]+\s*[kKmM]?)/i);
    if (!match) {
      return { min: null, max: null };
    }

    return {
      min: parseShortNumber(match[1]),
      max: parseShortNumber(match[2]),
    };
  }

  return { min: null, max: null };
}

function formatMoney(amount, currency) {
  if (typeof amount !== 'number' || Number.isNaN(amount)) {
    return null;
  }
  return `${currency || 'USD'} ${Math.round(amount).toLocaleString()}`;
}

function formatStrategyResponse(result) {
  const lines = [];

  if (result?.executiveSummary) {
    lines.push(`Executive Summary: ${result.executiveSummary}`);
  }

  if (Array.isArray(result?.recommendedPlatforms) && result.recommendedPlatforms.length > 0) {
    lines.push('Recommended Platforms:');
    result.recommendedPlatforms.forEach((item) => {
      lines.push(`- ${item.platform} (${item.primaryFormat}): ${item.rationale}`);
    });
  }

  if (Array.isArray(result?.contentAngles) && result.contentAngles.length > 0) {
    lines.push('Content Angles:');
    result.contentAngles.forEach((angle) => {
      lines.push(`- ${angle.title}: ${angle.concept}`);
    });
  }

  if (result?.recommendedPostingCadence) {
    const cadence = result.recommendedPostingCadence;
    lines.push(
      `Posting Cadence: ${cadence.postsPerWeek} posts/week, ${cadence.storiesPerWeek} stories/week for ${cadence.campaignDurationWeeks} weeks.`
    );
    if (Array.isArray(cadence.optimalDays) && cadence.optimalDays.length > 0) {
      lines.push(`Optimal Days: ${cadence.optimalDays.join(', ')}`);
    }
  }

  if (result?.recommendedCreatorProfile) {
    const profile = result.recommendedCreatorProfile;
    const range = profile?.followerRange
      ? `${formatNumber(profile.followerRange.min)} - ${formatNumber(profile.followerRange.max)}`
      : 'N/A';

    lines.push('Creator Profile:');
    lines.push(`- Follower range: ${range}`);
    lines.push(`- Minimum engagement: ${profile.minEngagementRate}%`);
    if (Array.isArray(profile.nicheKeywords) && profile.nicheKeywords.length > 0) {
      lines.push(`- Niche keywords: ${profile.nicheKeywords.join(', ')}`);
    }
    if (profile.rationale) {
      lines.push(`- Rationale: ${profile.rationale}`);
    }
  }

  if (result?.budgetAllocation?.breakdown) {
    const breakdown = result.budgetAllocation.breakdown;
    lines.push('Budget Allocation:');
    if (breakdown.creatorFees) {
      lines.push(`- Creator fees: ${breakdown.creatorFees.percentage}% (${formatMoney(breakdown.creatorFees.amount, 'USD')})`);
    }
    if (breakdown.paidAmplification) {
      lines.push(`- Paid amplification: ${breakdown.paidAmplification.percentage}% (${formatMoney(breakdown.paidAmplification.amount, 'USD')})`);
    }
    if (breakdown.production) {
      lines.push(`- Production: ${breakdown.production.percentage}% (${formatMoney(breakdown.production.amount, 'USD')})`);
    }
    if (breakdown.contingency) {
      lines.push(`- Contingency: ${breakdown.contingency.percentage}% (${formatMoney(breakdown.contingency.amount, 'USD')})`);
    }
  }

  if (result?.kpiTargets) {
    lines.push('KPI Targets:');
    lines.push(`- Estimated reach: ${formatNumber(result.kpiTargets.estimatedReach)}`);
    lines.push(`- Engagement target: ${result.kpiTargets.engagementRateTarget}`);
    lines.push(`- View target: ${formatNumber(result.kpiTargets.viewTarget)}`);
    lines.push(`- Click target: ${formatNumber(result.kpiTargets.clickTarget)}`);
  }

  return lines.join('\n') || 'AI returned an empty strategy. Please try again with a clearer request.';
}

function formatFitScoreResponse(result) {
  const lines = [];

  lines.push(`Fit Score: ${Math.round(Number(result?.score || 0))}/100 (${result?.recommendation || 'n/a'})`);

  if (result?.summary) {
    lines.push(`Summary: ${result.summary}`);
  }

  if (result?.scoreBreakdown) {
    lines.push('Score Breakdown:');
    lines.push(`- Niche alignment: ${Math.round(Number(result.scoreBreakdown.nicheAlignment || 0))}`);
    lines.push(`- Audience match: ${Math.round(Number(result.scoreBreakdown.audienceMatch || 0))}`);
    lines.push(`- Engagement quality: ${Math.round(Number(result.scoreBreakdown.engagementQuality || 0))}`);
    lines.push(`- Budget compatibility: ${Math.round(Number(result.scoreBreakdown.budgetCompatibility || 0))}`);
    lines.push(`- Tone alignment: ${Math.round(Number(result.scoreBreakdown.toneAlignment || 0))}`);
  }

  if (Array.isArray(result?.strengths) && result.strengths.length > 0) {
    lines.push('Strengths:');
    result.strengths.forEach((item) => lines.push(`- ${item}`));
  }

  if (Array.isArray(result?.risks) && result.risks.length > 0) {
    lines.push('Risks:');
    result.risks.forEach((item) => lines.push(`- ${item}`));
  }

  if (result?.budgetNote) {
    lines.push(`Budget Note: ${result.budgetNote}`);
  }

  return lines.join('\n');
}

function getDiscoveryFiltersFromStrategy(strategy) {
  const profile = strategy?.recommendedCreatorProfile;

  if (!profile) {
    return {
      niche: null,
      followerMin: null,
      followerMax: null,
      engagementMin: null,
    };
  }

  const followerRange = parseFollowerRange(profile.followerRange);
  const keyword = Array.isArray(profile.nicheKeywords)
    ? profile.nicheKeywords.find((item) => typeof item === 'string' && item.trim().length > 0)
    : null;

  const engagementValue = Number(profile.minEngagementRate);
  const engagementPercent = Number.isFinite(engagementValue)
    ? (engagementValue <= 1 ? engagementValue * 100 : engagementValue)
    : null;

  return {
    niche: keyword || null,
    followerMin: followerRange.min,
    followerMax: followerRange.max,
    engagementMin: engagementPercent,
  };
}

function findCreatorIdByPromptHandle(prompt, creators) {
  const match = prompt.match(/@([a-z0-9._]+)/i);
  if (!match) {
    return null;
  }

  const handle = match[1].toLowerCase();
  const creator = creators.find((item) => (item.ig_handle || '').toLowerCase() === handle);
  return creator?.id || null;
}

function formatBriefResponse(result) {
  const lines = [];

  if (result?.briefPreview) lines.push(`Brief Preview: ${result.briefPreview}`);
  if (result?.title) lines.push(`Title: ${result.title}`);
  if (result?.objective) lines.push(`Objective: ${result.objective}`);
  if (result?.targetAudience) lines.push(`Target Audience: ${result.targetAudience}`);

  if (Array.isArray(result?.keyMessages) && result.keyMessages.length > 0) {
    lines.push('Key Messages:');
    result.keyMessages.forEach((message, index) => {
      lines.push(`${index + 1}. ${message}`);
    });
  }

  if (Array.isArray(result?.deliverables) && result.deliverables.length > 0) {
    const objectDeliverables = result.deliverables.every((item) => item && typeof item === 'object');

    if (objectDeliverables) {
      lines.push('Deliverables:');
      result.deliverables.forEach((item) => {
        const platform = item.platform || 'Platform';
        const format = item.format || 'Format';
        const spec = item.spec ? ` (${item.spec})` : '';
        const requirement = item.requirement ? ` - ${item.requirement}` : '';
        lines.push(`- ${platform} ${format}${spec}${requirement}`);
      });
    } else {
      const normalizedDeliverables = result.deliverables.map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') {
          const platform = item.platform || 'Platform';
          const format = item.format || 'Format';
          const spec = item.spec ? ` (${item.spec})` : '';
          return `${platform} ${format}${spec}`;
        }
        return 'Deliverable';
      });
      lines.push(`Deliverables: ${normalizedDeliverables.join(', ')}`);
    }
  }

  if (result?.toneGuidance) lines.push(`Tone Guidance: ${result.toneGuidance}`);
  if (result?.tone) lines.push(`Tone: ${result.tone}`);
  if (result?.cta) lines.push(`CTA: ${result.cta}`);

  if (Array.isArray(result?.hashtags) && result.hashtags.length > 0) {
    lines.push(`Hashtags: ${result.hashtags.join(' ')}`);
  }

  if (Array.isArray(result?.timeline) && result.timeline.length > 0) {
    lines.push('Timeline:');
    result.timeline.forEach((item) => {
      lines.push(`- ${item.week}: ${item.focus}`);
    });
  } else if (result?.timeline) {
    lines.push(`Timeline: ${result.timeline}`);
  }

  if (result?.budgetBreakdown) {
    const creatorFees = result.budgetBreakdown.creatorFees;
    const paidAmplification = result.budgetBreakdown.paidAmplification;
    const production = result.budgetBreakdown.production;

    lines.push('Budget Breakdown:');
    if (creatorFees) {
      const amount = formatMoney(creatorFees.amount, creatorFees.currency);
      lines.push(`- Creator fees: ${creatorFees.percentage}%${amount ? ` (${amount})` : ''}`);
    }
    if (paidAmplification) {
      const amount = formatMoney(paidAmplification.amount, paidAmplification.currency);
      lines.push(`- Paid amplification: ${paidAmplification.percentage}%${amount ? ` (${amount})` : ''}`);
    }
    if (production) {
      const amount = formatMoney(production.amount, production.currency);
      lines.push(`- Production/contingency: ${production.percentage}%${amount ? ` (${amount})` : ''}`);
    }
  }

  if (Array.isArray(result?.successMetrics) && result.successMetrics.length > 0) {
    lines.push('Success Metrics:');
    result.successMetrics.forEach((metric) => {
      lines.push(`- ${metric}`);
    });
  }

  if (result?.creatorProfile) {
    lines.push('Creator Profile Recommendation:');
    if (result.creatorProfile.followerRange) {
      lines.push(`- Follower range: ${result.creatorProfile.followerRange}`);
    }
    if (result.creatorProfile.minEngagementRate) {
      lines.push(`- Min engagement rate: ${result.creatorProfile.minEngagementRate}`);
    }
    if (Array.isArray(result.creatorProfile.nicheKeywords) && result.creatorProfile.nicheKeywords.length > 0) {
      lines.push(`- Niche keywords: ${result.creatorProfile.nicheKeywords.join(', ')}`);
    }
    if (result.creatorProfile.rationale) {
      lines.push(`- Why this fit works: ${result.creatorProfile.rationale}`);
    }
  }

  return lines.join('\n') || 'AI returned an empty brief. Please try a more specific prompt.';
}

function buildFallbackReply(prompt, industry) {
  const niche = industry || 'your industry';
  return [
    'Live AI is temporarily unavailable, so here is a fallback brief:',
    `Title: ${niche} Growth Sprint`,
    `Objective: Drive awareness and conversions for "${prompt}".`,
    'Deliverables: 2 reels, 3 story frames, 1 static post.',
    'CTA: Visit landing page and use campaign code at checkout.',
    'Timeline: 2 weeks.',
  ].join('\n');
}

const BrandAIAssistant = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [lastBrief, setLastBrief] = useState(null);
  const [lastStrategy, setLastStrategy] = useState(null);
  const [lastCreatorResults, setLastCreatorResults] = useState([]);
  const [selectedCreatorId, setSelectedCreatorId] = useState(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const pushMessage = (message) => {
    setMessages((prev) => [
      ...prev,
      {
        id: createMessageId(),
        type: 'text',
        ...message,
      },
    ]);
  };

  const fetchFallbackCreators = async () => {
    const response = await apiClient.get('/creators?page=1&limit=5');
    const creators = Array.isArray(response?.data) ? response.data : [];
    if (creators.length > 0) {
      setLastCreatorResults(creators);
    }
    return creators;
  };

  const resolveCreatorId = async (prompt) => {
    const fromPrompt = findCreatorIdByPromptHandle(prompt, lastCreatorResults);
    if (fromPrompt) {
      return fromPrompt;
    }

    if (selectedCreatorId) {
      return selectedCreatorId;
    }

    if (lastCreatorResults[0]?.id) {
      return lastCreatorResults[0].id;
    }

    const fallbackCreators = await fetchFallbackCreators();
    if (fallbackCreators[0]?.id) {
      setSelectedCreatorId(fallbackCreators[0].id);
      return fallbackCreators[0].id;
    }

    return null;
  };

  const fetchLatestCampaignId = async () => {
    const response = await apiClient.get('/campaigns?page=1&limit=1');
    const campaigns = Array.isArray(response?.data) ? response.data : [];
    return campaigns[0]?.id || null;
  };

  const requestFitScoreForCreator = async (creatorId) => {
    const contextualPayload = {};
    if (lastBrief) {
      contextualPayload.brief = lastBrief;
    }
    if (lastStrategy) {
      contextualPayload.strategy = lastStrategy;
    }

    const campaignId = await fetchLatestCampaignId();
    if (campaignId) {
      try {
        return await apiClient.post('/ai/fit-score', {
          campaign_id: campaignId,
          creator_id: creatorId,
        });
      } catch (error) {
        const canFallback = Boolean(contextualPayload.brief || contextualPayload.strategy);
        if (!canFallback) {
          throw error;
        }
      }
    }

    if (contextualPayload.brief || contextualPayload.strategy) {
      const callContextualFitScore = () => apiClient.post(`/ai/fit-score/${creatorId}`, contextualPayload);

      try {
        return await callContextualFitScore();
      } catch (error) {
        if (!shouldRetryFitScoreError(error)) {
          throw error;
        }

        return callContextualFitScore();
      }
    }

    return null;
  };

  const handleDiscoveryIntent = async () => {
    const strategyFilters = getDiscoveryFiltersFromStrategy(lastStrategy);
    const params = new URLSearchParams({ page: '1', limit: '6' });

    if (strategyFilters.niche) {
      params.set('niche', strategyFilters.niche);
    }

    if (typeof strategyFilters.followerMin === 'number') {
      params.set('follower_min', String(Math.round(strategyFilters.followerMin)));
    }

    if (typeof strategyFilters.followerMax === 'number') {
      params.set('follower_max', String(Math.round(strategyFilters.followerMax)));
    }

    if (typeof strategyFilters.engagementMin === 'number') {
      params.set('engagement_min', String(Number(strategyFilters.engagementMin.toFixed(2))));
    }

    const response = await apiClient.get(`/creators?${params.toString()}`);
    const creators = Array.isArray(response?.data) ? response.data : [];

    setLastCreatorResults(creators);
    if (creators[0]?.id) {
      setSelectedCreatorId(creators[0].id);
    }

    if (creators.length === 0) {
      pushMessage({
        role: 'assistant',
        text: 'No creators matched the current filters. Try broadening follower range or niche keywords.',
      });
      return;
    }

    const filterSummary = [];
    if (strategyFilters.niche) filterSummary.push(`niche: ${strategyFilters.niche}`);
    if (typeof strategyFilters.followerMin === 'number' || typeof strategyFilters.followerMax === 'number') {
      filterSummary.push('strategy follower range');
    }
    if (typeof strategyFilters.engagementMin === 'number') {
      filterSummary.push(`engagement >= ${strategyFilters.engagementMin.toFixed(1)}%`);
    }

    pushMessage({
      role: 'assistant',
      type: 'creators',
      text: filterSummary.length > 0
        ? `I found ${creators.length} creators using your strategy profile filters (${filterSummary.join(', ')}).`
        : `I found ${creators.length} creators. Pick one to score fit or open profile details.`,
      creators,
    });
  };

  const handleBriefIntent = async (prompt) => {
    const campaignGoal = prompt.length >= 12
      ? prompt
      : `Create a campaign brief for ${prompt} with clear objective, deliverables, and CTA.`;

    const result = await apiClient.post('/ai/brief', {
      campaign_goal: campaignGoal,
    });

    setLastBrief(result);
    pushMessage({ role: 'assistant', text: formatBriefResponse(result) });
  };

  const handleStrategyIntent = async (prompt) => {
    const creatorId = await resolveCreatorId(prompt);

    if (!creatorId) {
      pushMessage({
        role: 'assistant',
        text: 'I need at least one creator profile to build strategy. Try "find creators" first.',
      });
      return;
    }

    const result = await apiClient.post('/ai/strategy', {
      creator_id: creatorId,
    });

    setLastStrategy(result);
    pushMessage({ role: 'assistant', text: formatStrategyResponse(result) });
  };

  const handleFitScoreIntent = async (prompt) => {
    const creatorId = await resolveCreatorId(prompt);
    if (!creatorId) {
      pushMessage({
        role: 'assistant',
        text: 'I could not identify a creator. Ask me to "find creators" first or mention a handle like @creatorname.',
      });
      return;
    }

    try {
      const result = await requestFitScoreForCreator(creatorId);
      if (!result) {
        pushMessage({
          role: 'assistant',
          text: 'I need campaign context to score fit. Generate a brief or strategy first, then try again.',
        });
        return;
      }

      pushMessage({ role: 'assistant', text: formatFitScoreResponse(result) });
    } catch (error) {
      pushMessage({ role: 'assistant', text: buildFitScoreErrorMessage(error) });
    }
  };

  const handleSelectCreator = async (creator) => {
    setSelectedCreatorId(creator.id);

    if (isTyping) {
      return;
    }

    setIsTyping(true);

    try {
      const result = await requestFitScoreForCreator(creator.id);

      if (!result) {
        pushMessage({
          role: 'assistant',
          text: `Selected @${creator.ig_handle}. I still need campaign context to score fit. Generate a brief or strategy first.`,
        });
        return;
      }

      pushMessage({
        role: 'assistant',
        text: `Fit score for @${creator.ig_handle}:\n${formatFitScoreResponse(result)}`,
      });
    } catch (error) {
      const response = buildFitScoreErrorMessage(error);

      pushMessage({ role: 'assistant', text: response });
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = async () => {
    const prompt = input.trim();
    if (!prompt || isTyping) return;

    const intent = detectIntent(prompt);

    pushMessage({ role: 'user', text: prompt });
    setInput('');

    if (isSmallTalk(prompt)) {
      pushMessage({ role: 'assistant', text: buildSmallTalkReply() });
      return;
    }

    setIsTyping(true);

    try {
      if (intent === 'discover') {
        await handleDiscoveryIntent();
      } else if (intent === 'brief') {
        await handleBriefIntent(prompt);
      } else if (intent === 'fit_score') {
        await handleFitScoreIntent(prompt);
      } else {
        await handleStrategyIntent(prompt);
      }
    } catch (error) {
      let response = 'I hit a temporary issue. Please try again in a moment.';

      if (intent === 'discover') {
        response = 'I could not load creator matches right now. Please try again in a moment.';
      } else if (intent === 'brief') {
        response = 'I could not generate a campaign brief right now. Please try again in a moment.';
      } else if (intent === 'strategy') {
        response = 'I could not generate strategy right now. Please try again in a moment.';
      } else if (!isApiError(error)) {
        response = buildFallbackReply(prompt, user?.industry);
      }

      pushMessage({ role: 'assistant', text: response });
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>AI Recruitment Co-pilot</h1>
          <p className={styles.subtitle}>Strategy, Discovery & Campaign Optimization</p>
        </div>
        <div className={styles.statusBadge}>
          <span className={styles.statusDot} />
          Online
        </div>
      </header>

      <div className={styles.chatContainer}>
        <div className={styles.messageList}>
          {messages.map((msg) => (
            <div key={msg.id} className={`${styles.messageWrapper} ${styles[msg.role]}`}>
              <div className={styles.messageAvatar}>
                {msg.role === 'assistant' ? 'AI' : (user?.name?.charAt(0) || 'U')}
              </div>
              <div className={styles.messageBubble}>
                {msg.type === 'creators' ? (
                  <div className={styles.creatorResults}>
                    {msg.text && <p className={styles.messageText}>{msg.text}</p>}
                    <div className={styles.creatorGrid}>
                      {(msg.creators || []).map((creator) => {
                        const engagement = normalizeEngagementPercent(creator.engagement_rate);
                        const handle = creator.ig_handle ? `@${creator.ig_handle}` : 'Unknown creator';
                        return (
                          <div key={creator.id} className={styles.creatorCard}>
                            <div className={styles.creatorCardTop}>
                              <strong className={styles.creatorHandle}>{handle}</strong>
                              {creator.is_verified && <span className={styles.creatorVerified}>Verified</span>}
                            </div>
                            <p className={styles.creatorNiche}>
                              {creator.niche_primary || 'General'}
                              {creator.niche_secondary ? ` · ${creator.niche_secondary}` : ''}
                            </p>
                            <div className={styles.creatorStats}>
                              <span>Followers: {formatNumber(creator.follower_count)}</span>
                              <span>Engagement: {engagement.toFixed(1)}%</span>
                            </div>
                            <div className={styles.creatorActions}>
                              <Link className={styles.creatorLink} to={`/brand/creator/${creator.id}`}>
                                View profile
                              </Link>
                              <button
                                type="button"
                                className={styles.creatorSelectButton}
                                onClick={() => handleSelectCreator(creator)}
                              >
                                Use for fit score
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className={styles.messageText}>{msg.text}</p>
                )}
              </div>
            </div>
          ))}

          {isTyping && (
            <div className={`${styles.messageWrapper} ${styles.assistant}`}>
              <div className={styles.messageAvatar}>AI</div>
              <div className={styles.typingDots}>
                <span /><span /><span />
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        <div className={styles.inputArea}>
          <Card variant="glass" className={styles.inputCard}>
            <input
              type="text"
              placeholder="Ask for strategy, brief, creator search, or fit score..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              className={styles.chatInput}
            />
            <Button variant="primary" size="sm" onClick={handleSend} disabled={!input.trim() || isTyping}>
              Send
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default BrandAIAssistant;
