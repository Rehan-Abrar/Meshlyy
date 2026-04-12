import { useState, useRef, useEffect } from 'react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import styles from './BrandAIAssistant.module.css';
import { useAuth } from '../../context/AuthContext';

const INITIAL_MESSAGES = [
  { role: 'assistant', text: "Hello! I'm your Meshlyy Brand Co-pilot. How can I help you scale your creator marketing today?" },
];

const BrandAIAssistant = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Mock AI Response
    setTimeout(() => {
      let response = "That's a great goal. I recommend focusing on micro-creators in the tech space for high engagement.";
      if (input.toLowerCase().includes('skincare')) {
        response = "For your skincare campaign, I've identified 3 creators (Zara, Sophie, and Maya) who match your Gen Z target audience and have high trust scores.";
      }
      setMessages(prev => [...prev, { role: 'assistant', text: response }]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.titleInfo}>
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
                {msg.role === 'assistant' ? '✦' : (user?.name?.charAt(0) || 'U')}
              </div>
              <div className={styles.messageBubble}>
                {msg.text}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className={`${styles.messageWrapper} ${styles.assistant}`}>
              <div className={styles.messageAvatar}>✦</div>
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
              placeholder="Ask about strategy, creator matches, or campaign ideas..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              className={styles.chatInput}
            />
            <Button variant="primary" size="sm" onClick={handleSend} disabled={!input.trim()}>
              Send ✦
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default BrandAIAssistant;
