import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import styles from './AIContentAssistant.module.css';

const LUMINA_AVATAR = 'AI';

const QUICK_PROMPTS = [
  'Write a hook for an Instagram Reel',
  'Generate 5 caption ideas for a brand collab',
  'Create a content schedule for next week',
  'Draft a brand pitch email',
];

// Simulate AI response (replace with real API call)
const getAIResponse = async (message) => {
  await new Promise(r => setTimeout(r, 1200 + Math.random() * 800));
  const responses = {
    hook: "Here's a punchy hook: \"Stop scrolling — I tried this for 7 days so you don't have to.\" It creates curiosity and sets up a transformation arc instantly.",
    caption: `Here are 5 caption ideas:\n\n1. "Collab that made sense before I even opened the package 📦"\n2. "This is what authentic partnerships look like — and here's the proof."\n3. "Brands that let you be you > everything else."\n4. "Added this to my routine and haven't looked back. Details in bio."\n5. "Not an ad. Wait — it is. But a good one 😂"`,
    schedule: "Suggested schedule:\n**Mon** – Educational Reel (niche tip)\n**Wed** – Brand collab story + post\n**Fri** – Personal/lifestyle carousel\n**Sun** – Community Q&A story",
    pitch: "Subject: Collaboration Inquiry — [Your Handle]\n\nHi [Brand Name] team,\n\nI'm [Name], a [niche] creator with [X] engaged followers on Instagram. My audience aligns closely with your brand's values around [shared value].\n\nI'd love to explore a collaboration for [specific campaign]. I've attached my media kit for your review.\n\nLooking forward to connecting!",
  };
  const lower = message.toLowerCase();
  if (lower.includes('hook')) return responses.hook;
  if (lower.includes('caption')) return responses.caption;
  if (lower.includes('schedule')) return responses.schedule;
  if (lower.includes('pitch') || lower.includes('email')) return responses.pitch;
  return `Great question! For "${message}", I'd recommend starting with understanding your audience's core pain point, then crafting content that shows transformation — not just promotion. Want me to go deeper on any specific direction?`;
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
  const bottomRef             = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

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

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Lumina AI Assistant</h1>
          <p className={styles.subtitle}>Your personal content co-pilot</p>
          <p className={styles.subtitle}>
            Live backend content-brief generation is currently brand-role only, so this assistant runs in local guidance mode for influencers.
          </p>
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
