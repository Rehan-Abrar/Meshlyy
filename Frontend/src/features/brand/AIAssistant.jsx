import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import styles from './AIAssistant.module.css';

const QUICK_PROMPTS = [
  'Find creators for a fitness campaign',
  'Write a campaign brief for skincare',
  'Suggest budget for 10K followers creator',
  'What KPIs should I track?',
];

const getAIResponse = async (message) => {
  await new Promise(r => setTimeout(r, 1000 + Math.random() * 800));
  const lower = message.toLowerCase();
  if (lower.includes('find') || lower.includes('creator'))
    return "Based on your brand profile, I recommend looking for **micro-influencers (10K–50K)** in your niche with engagement rates above 3.5%. These outperform macro-influencers on ROI by 60% on average. Shall I pull up matching profiles from your industry?";
  if (lower.includes('brief') || lower.includes('campaign'))
    return "Here's a campaign brief template:\n\n**Campaign:** [Name]\n**Objective:** Brand awareness / Conversion\n**Target Audience:** [Age range, interests]\n**Deliverables:** 1 Reel + 3 Stories\n**Budget:** $X per creator\n**Timeline:** Start [date], Post by [date]\n**Key Message:** [Core value prop in one sentence]";
  if (lower.includes('budget'))
    return "For a creator with 10K followers and 4%+ engagement, expect $150–$400 per post depending on niche. Beauty/Lifestyle commands higher rates than general lifestyle. I'd recommend starting with a test batch of 3–5 nano creators at $200 each (~$600 total) to validate messaging.";
  if (lower.includes('kpi') || lower.includes('track'))
    return "Key KPIs to track:\n\n**Awareness:** Reach, Impressions, Story views\n**Engagement:** Likes, Comments, Saves, Shares\n**Conversion:** Link clicks, Promo code redemptions, Sales\n**Efficiency:** CPM (Cost per 1K impressions), CPC, ROAS\n\nFor MVP, focus on Reach + Engagement Rate + Promo Code redemptions.";
  return `Great question! For "${message}", the key is aligning creator audience demographics with your ICP. Want me to break down a specific strategy for your campaign type?`;
};

const Message = ({ msg }) => (
  <div className={`${styles.msg} ${msg.role === 'user' ? styles.msgUser : styles.msgAI}`}>
    {msg.role === 'ai' && <div className={styles.aiAvatar}>✦</div>}
    <div className={styles.bubble}>
      {msg.text.split('\n').map((line, i) => (
        <p key={i} className={line.startsWith('**') ? styles.bold : undefined}>
          {line.startsWith('**') ? line.replace(/\*\*/g, '') : line}
        </p>
      ))}
    </div>
  </div>
);

const AIAssistant = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    { role: 'ai', text: `Hi${user?.name ? ` ${user.name.split(' ')[0]}` : ''}! I'm your Meshlyy Campaign AI. I can help you find the right creators, write campaign briefs, plan budgets, and track performance. What's your campaign goal today?` },
  ]);
  const [input, setInput]   = useState('');
  const [typing, setTyping] = useState(false);
  const bottomRef           = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, typing]);

  const send = async (text) => {
    const trimmed = (text || input).trim();
    if (!trimmed) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: trimmed }]);
    setTyping(true);
    const reply = await getAIResponse(trimmed);
    setTyping(false);
    setMessages(prev => [...prev, { role: 'ai', text: reply }]);
  };

  const handleKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>✦ Campaign AI Assistant</h1>
          <p className={styles.subtitle}>Strategy, briefs, creator matching — all in one place</p>
        </div>
        <button className={styles.clearBtn} onClick={() => setMessages([{ role: 'ai', text: 'Fresh start! What campaign are we working on?' }])}>
          Clear chat
        </button>
      </header>

      <div className={styles.chatArea} role="log" aria-live="polite">
        {messages.map((msg, i) => <Message key={i} msg={msg} />)}
        {typing && (
          <div className={`${styles.msg} ${styles.msgAI}`}>
            <div className={styles.aiAvatar}>✦</div>
            <div className={styles.bubble}>
              <div className={styles.typingDots}><span /><span /><span /></div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className={styles.promptChips}>
        {QUICK_PROMPTS.map(p => <button key={p} className={styles.chip} onClick={() => send(p)}>{p}</button>)}
      </div>

      <div className={styles.inputBar}>
        <textarea
          className={styles.textarea}
          placeholder="Ask about campaigns, creators, budgets…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          rows={1}
          aria-label="Message input"
        />
        <button className={styles.sendBtn} onClick={() => send()} disabled={!input.trim() || typing} aria-label="Send">↑</button>
      </div>
    </div>
  );
};

export default AIAssistant;
