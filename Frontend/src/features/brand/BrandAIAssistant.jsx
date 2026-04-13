import { useState, useRef, useEffect } from 'react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import { aiApi, campaignsApi, creatorsApi } from '../../services/api';
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
  const [mode, setMode] = useState('brief');
  const [campaigns, setCampaigns] = useState([]);
  const [creators, setCreators] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [selectedCreator, setSelectedCreator] = useState('');
  const [error, setError] = useState('');
  const chatEndRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  useEffect(() => {
    const loadContextData = async () => {
      try {
        const [campaignResult, creatorResult] = await Promise.all([
          campaignsApi.list({ page: 1, limit: 25 }),
          creatorsApi.discover({ page: 1, limit: 25 }),
        ]);

        const campaignList = campaignResult?.data || [];
        const creatorList = creatorResult?.data || [];
        setCampaigns(campaignList);
        setCreators(creatorList);
        if (campaignList[0]) setSelectedCampaign(campaignList[0].id);
        if (creatorList[0]) setSelectedCreator(creatorList[0].id);
      } catch {
        // Non-blocking context load failure.
      }
    };

    loadContextData();
  }, []);

  const handleSend = async () => {
    if (!input.trim()) return;
    setError('');

    const userMsg = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      let response = null;

      if (mode === 'brief') {
        response = await aiApi.brief({ campaign_goal: input, target_audience: user?.industry || 'General audience' });
      }

      if (mode === 'strategy') {
        if (!selectedCreator) {
          throw new Error('Please select a creator for strategy generation.');
        }
        response = await aiApi.strategy(selectedCreator);
      }

      if (mode === 'fit-score') {
        if (!selectedCampaign || !selectedCreator) {
          throw new Error('Please select both campaign and creator for fit scoring.');
        }
        response = await aiApi.fitScore(selectedCampaign, selectedCreator);
      }

      const responseText =
        response?.brief ||
        response?.reasoning ||
        response?.collaborationAdvice ||
        response?.score?.toString() ||
        JSON.stringify(response, null, 2);

      setMessages(prev => [...prev, { role: 'assistant', text: responseText }]);
    } catch (err) {
      const msg = err?.message || 'AI request failed. Please retry.';
      setError(msg);
      setMessages(prev => [...prev, { role: 'assistant', text: msg }]);
    } finally {
      setIsTyping(false);
    }
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
        <Card variant="standard" className={styles.inputCard}>
          <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            <select className={styles.chatInput} value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="brief">Campaign Brief</option>
              <option value="strategy">Creator Strategy</option>
              <option value="fit-score">Fit Score</option>
            </select>

            <select className={styles.chatInput} value={selectedCampaign} onChange={(e) => setSelectedCampaign(e.target.value)} disabled={mode === 'strategy'}>
              {campaigns.length === 0 ? <option value="">No campaigns available</option> : campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>{campaign.title}</option>
              ))}
            </select>

            <select className={styles.chatInput} value={selectedCreator} onChange={(e) => setSelectedCreator(e.target.value)} disabled={mode === 'brief'}>
              {creators.length === 0 ? <option value="">No creators available</option> : creators.map((creator) => (
                <option key={creator.id} value={creator.id}>@{String(creator.ig_handle || '').replace(/^@/, '') || 'creator'}</option>
              ))}
            </select>
          </div>
          {error && <p role="alert">{error}</p>}
        </Card>

        <div className={styles.messageList}>
          {messages.map((msg, i) => (
            <div key={i} className={`${styles.messageWrapper} ${styles[msg.role]}`}>
              <div className={styles.messageAvatar}>
                {msg.role === 'assistant' ? 'AI' : (user?.name?.charAt(0) || 'U')}
              </div>
              <div className={styles.messageBubble}>
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
              placeholder="Ask about strategy, creator matches, or campaign ideas..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              className={styles.chatInput}
            />
            <Button variant="primary" size="sm" onClick={handleSend} disabled={!input.trim()}>
              Send
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default BrandAIAssistant;
