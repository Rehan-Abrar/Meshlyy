import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiClient, isApiError } from '../../utils/apiClient';
import styles from './AIContentAssistant.module.css';

const LUMINA_AVATAR = 'AI';

const QUICK_PROMPTS = [
  'Create a strong opening hook for this campaign',
  'Give creator-specific dos and donts',
  'Generate hashtag direction for this brief',
  'Suggest caption direction for this content format',
];

const SMALL_TALK_PATTERN = /^(hi+|hello+|hey+|yo+|hola+|salam+|how\s+are\s+you|what'?s\s?up|good\s?(morning|evening|afternoon|night)|thank(s|\s+you)|bye|goodbye|who\s+are\s+you|help\s*$)/i;

const formatList = (items) => {
  if (!Array.isArray(items) || items.length === 0) return '- N/A';
  return items.map((item) => `- ${item}`).join('\n');
};

const formatHashtags = (tags) => {
  if (!Array.isArray(tags) || tags.length === 0) return 'N/A';
  return tags.map((tag) => (String(tag).startsWith('#') ? tag : `#${tag}`)).join(' ');
};

const formatContentBrief = (result, selectedFormat) => {
  return [
    `Content Brief (${selectedFormat.toUpperCase()})`,
    '',
    `Hook Idea: ${result.hookIdea || 'N/A'}`,
    '',
    `Tone Guidance:\n${result.toneGuidance || 'N/A'}`,
    '',
    `Format Guidance:\n${result.formatGuidance || 'N/A'}`,
    '',
    `Talking Points:\n${formatList(result.talkingPoints)}`,
    '',
    `Do:\n${formatList(result.dos)}`,
    '',
    `Don't:\n${formatList(result.donts)}`,
    '',
    `Caption Direction:\n${result.captionDirection || 'N/A'}`,
    '',
    `Creative Notes:\n${result.creativeNotes || 'N/A'}`,
    '',
    `Suggested Hashtags: ${formatHashtags(result.suggestedHashtags)}`,
    '',
    `Call To Action: ${result.callToAction || 'N/A'}`,
  ].join('\n');
};

const Message = ({ msg }) => (
  <div className={`${styles.msg} ${msg.role === 'user' ? styles.msgUser : styles.msgAI}`}>
    {msg.role === 'ai' && (
      <div className={styles.aiAvatar} aria-label="Lumina AI">{LUMINA_AVATAR}</div>
    )}
    <div className={styles.bubble}>
      {msg.text.split('\n').map((line, i) => (
        <p key={i} className={line.startsWith('**') ? styles.bold : undefined}>
          {line.startsWith('**') ? line.replace(/\*\*/g, '') : line}
        </p>
      ))}
    </div>
  </div>
);

const AIContentAssistant = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    {
      role: 'ai',
      text: `Hi${user?.name ? ` ${user.name.split(' ')[0]}` : ''}! I'm Lumina, your AI content co-pilot. I can help you write hooks, captions, scripts, pitches, and more. What would you like to create today?`,
    },
  ]);
  const [input, setInput]     = useState('');
  const [typing, setTyping]   = useState(false);
  const [campaignId, setCampaignId] = useState('');
  const [contentFormat, setContentFormat] = useState('reel');
  const [campaignOptions, setCampaignOptions] = useState([]);
  const bottomRef             = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  useEffect(() => {
    let ignore = false;

    async function loadCampaignOptions() {
      try {
        const response = await apiClient.get('/collaborations/incoming');
        const rows = response.data || [];
        if (!ignore) {
          const eligible = rows.filter((row) => ['PENDING', 'ACCEPTED'].includes(String(row.status || '').toUpperCase()));
          const map = new Map();

          eligible.forEach((row) => {
            const campaign = row.campaign;
            if (!campaign?.id || map.has(campaign.id)) return;
            map.set(campaign.id, {
              id: campaign.id,
              title: campaign.title || campaign.id,
            });
          });

          const options = Array.from(map.values());
          setCampaignOptions(options);
          if (options[0]?.id) setCampaignId(options[0].id);
        }
      } catch {
        if (!ignore) setCampaignOptions([]);
      }
    }

    loadCampaignOptions();
    return () => {
      ignore = true;
    };
  }, []);

  const send = async (text) => {
    const trimmed = (text || input).trim();
    if (!trimmed) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: trimmed }]);
    setTyping(true);

    // Small talk detection
    if (SMALL_TALK_PATTERN.test(trimmed)) {
      setTyping(false);
      const lower = trimmed.toLowerCase();
      let reply = "Hey! I'm Lumina, your content co-pilot. Select a campaign above and ask me to generate hooks, captions, scripts, or hashtag strategies!";
      if (/how\s+are\s+you/i.test(lower)) {
        reply = "I'm doing great, thanks! 😊 I'm ready to help you create amazing content. Select a campaign from the dropdown above and I'll generate a tailored content brief for you!";
      } else if (/thank/i.test(lower)) {
        reply = "You're welcome! Happy to help with your content. 🙌";
      } else if (/bye|goodbye/i.test(lower)) {
        reply = "See you later! Come back when you need content help. 👋";
      } else if (/who\s+are\s+you|help/i.test(lower)) {
        reply = "I'm Lumina, your AI content co-pilot! Here's what I can do:\n\n• Generate content briefs for your campaigns\n• Write hooks, captions, and scripts\n• Suggest hashtag strategies\n• Provide dos and don'ts for content creation\n\nSelect a campaign from the dropdown, then ask me anything!";
      }
      setMessages(prev => [...prev, { role: 'ai', text: reply }]);
      return;
    }

    if (!campaignId) {
      setTyping(false);
      setMessages(prev => [...prev, {
        role: 'ai',
        text: 'Please select a campaign from the dropdown above first, then I can generate a live content brief tailored to that campaign.',
      }]);
      return;
    }

    let reply;
    try {
      const result = await apiClient.post('/ai/influencer/content-brief', {
        campaignId,
        contentFormat,
      });
      reply = formatContentBrief(result || {}, contentFormat);
    } catch (error) {
      reply = isApiError(error)
        ? `AI brief request failed (${error.code}: ${error.message}).`
        : 'AI brief request failed due to a network/runtime issue.';
    }

    setTyping(false);
    setMessages(prev => [...prev, { role: 'ai', text: reply }]);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Lumina AI Assistant</h1>
          <p className={styles.subtitle}>Your personal content co-pilot</p>
        </div>
        <button
          className={styles.clearBtn}
          onClick={() => setMessages([{ role: 'ai', text: "Fresh start! What would you like to create?" }])}
        >
          Clear chat
        </button>
      </header>

      {/* Messages */}
      <div className={styles.chatArea} role="log" aria-live="polite">
        {messages.map((msg, i) => <Message key={i} msg={msg} />)}
        {typing && (
          <div className={`${styles.msg} ${styles.msgAI}`}>
            <div className={styles.aiAvatar}>{LUMINA_AVATAR}</div>
            <div className={styles.bubble}>
              <div className={styles.typingDots}>
                <span /><span /><span />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick prompts */}
      <div className={styles.promptChips}>
        <select value={campaignId} onChange={(e) => setCampaignId(e.target.value)} className={styles.chip}>
          <option value="">Select campaign for live brief</option>
          {campaignOptions.map((campaign) => (
            <option key={campaign.id} value={campaign.id}>{campaign.title}</option>
          ))}
        </select>
        <select value={contentFormat} onChange={(e) => setContentFormat(e.target.value)} className={styles.chip}>
          <option value="reel">reel</option>
          <option value="post">post</option>
          <option value="story">story</option>
          <option value="carousel">carousel</option>
        </select>
      </div>

      <div className={styles.promptChips}>
        {QUICK_PROMPTS.map(p => (
          <button key={p} className={styles.chip} onClick={() => send(p)}>{p}</button>
        ))}
      </div>

      {/* Input bar */}
      <div className={styles.inputBar}>
        <textarea
          className={styles.textarea}
          placeholder="Ask Lumina anything about your content…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          rows={1}
          aria-label="Message input"
        />
        <button
          className={styles.sendBtn}
          onClick={() => send()}
          disabled={!input.trim() || typing}
          aria-label="Send message"
        >
          ↑
        </button>
      </div>
    </div>
  );
};

export default AIContentAssistant;
