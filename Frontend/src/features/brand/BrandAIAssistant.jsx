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

function formatBriefResponse(result) {
  const lines = [];

  if (result?.title) lines.push(`Title: ${result.title}`);
  if (result?.objective) lines.push(`Objective: ${result.objective}`);

  if (Array.isArray(result?.deliverables) && result.deliverables.length > 0) {
    lines.push(`Deliverables: ${result.deliverables.join(', ')}`);
  }

  if (result?.tone) lines.push(`Tone: ${result.tone}`);
  if (result?.cta) lines.push(`CTA: ${result.cta}`);

  if (Array.isArray(result?.hashtags) && result.hashtags.length > 0) {
    lines.push(`Hashtags: ${result.hashtags.join(' ')}`);
  }

  if (result?.timeline) {
    lines.push(`Timeline: ${result.timeline}`);
  }

  const provider = result?._meta?.provider;
  if (provider) {
    const fallback = result?._meta?.fallbackUsed ? ' (fallback used)' : '';
    lines.push(`Provider: ${provider}${fallback}`);
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
    setIsTyping(true);

    try {
      const campaignGoal = prompt.length >= 10
        ? prompt
        : `Create a campaign brief for ${prompt} with clear objective, deliverables, and CTA.`;

      const result = await apiClient.post('/ai/brief', {
        campaign_goal: campaignGoal,
      });

      const response = formatBriefResponse(result);
      setMessages((prev) => [...prev, { role: 'assistant', text: response }]);
    } catch (error) {
      const response = isApiError(error)
        ? `Live AI error (${error.code}: ${error.message}).\n\n${buildFallbackReply(prompt, user?.industry)}`
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
