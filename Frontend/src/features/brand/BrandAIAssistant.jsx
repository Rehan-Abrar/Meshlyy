import { useEffect, useRef, useState } from 'react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import styles from './BrandAIAssistant.module.css';
import { useAuth } from '../../context/AuthContext';
import { apiClient, isApiError } from '../../utils/apiClient';

const INITIAL_MESSAGES = [
  {
    role: 'assistant',
    text: "Hello! I'm your Meshlyy Brand Co-pilot. Describe your campaign goal and I will generate a live AI brief.",
  },
];

const SMALL_TALK_PATTERN = /^(hi+|hello+|hey+|yo+|hola+|salam+|assalam\s?o\s?alaikum|helloo+)\b/i;
const CAMPAIGN_INTENT_PATTERN = /(campaign|brief|launch|promot|audience|influencer|creator|reel|story|post|cta|budget|objective|goal|kpi|brand|product|target|marketing|awareness|conversion|engagement)/i;

function isSmallTalk(prompt) {
  return SMALL_TALK_PATTERN.test(prompt.trim());
}

function hasCampaignIntent(prompt) {
  return CAMPAIGN_INTENT_PATTERN.test(prompt);
}

function buildSmallTalkReply() {
  return 'Hey! I can help you build a campaign brief. Tell me your product, target audience, objective, and budget (optional).';
}

function buildGuidanceReply() {
  return [
    'I can help with campaign strategy and brief generation.',
    'Try: "Launch a campaign for Gen Z in Lahore with 20k budget".',
  ].join('\n');
}

function formatMoney(amount, currency) {
  if (typeof amount !== 'number' || Number.isNaN(amount)) {
    return null;
  }
  return `${currency || 'USD'} ${Math.round(amount).toLocaleString()}`;
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
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async () => {
    const prompt = input.trim();
    if (!prompt || isTyping) return;

    setMessages((prev) => [...prev, { role: 'user', text: prompt }]);
    setInput('');

    if (isSmallTalk(prompt)) {
      setMessages((prev) => [...prev, { role: 'assistant', text: buildSmallTalkReply() }]);
      return;
    }

    if (!hasCampaignIntent(prompt)) {
      setMessages((prev) => [...prev, { role: 'assistant', text: buildGuidanceReply() }]);
      return;
    }

    setIsTyping(true);

    try {
      const campaignGoal = prompt.length >= 12
        ? prompt
        : `Create a campaign brief for ${prompt} with clear objective, deliverables, and CTA.`;

      const result = await apiClient.post('/ai/brief', {
        campaign_goal: campaignGoal,
      });

      const response = formatBriefResponse(result);
      setMessages((prev) => [...prev, { role: 'assistant', text: response }]);
    } catch (error) {
      const response = isApiError(error)
        ? `AI is temporarily unavailable right now.\n\n${buildFallbackReply(prompt, user?.industry)}`
        : buildFallbackReply(prompt, user?.industry);

      setMessages((prev) => [...prev, { role: 'assistant', text: response }]);
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
          {messages.map((msg, i) => (
            <div key={i} className={`${styles.messageWrapper} ${styles[msg.role]}`}>
              <div className={styles.messageAvatar}>
                {msg.role === 'assistant' ? 'AI' : (user?.name?.charAt(0) || 'U')}
              </div>
              <div className={styles.messageBubble} style={{ whiteSpace: 'pre-wrap' }}>
                {msg.text}
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
              placeholder="Describe your campaign goal and audience..."
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
