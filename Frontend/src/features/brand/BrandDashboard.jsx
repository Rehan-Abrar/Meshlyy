import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import CircularProgress from '../../components/common/CircularProgress';
import Badge from '../../components/common/Badge';
import Input from '../../components/common/Input';
import styles from './BrandDashboard.module.css';

const MOCK_CREATORS = [
  { id:1, name:'Zara Ahmed',    niche:'Lifestyle',  platform:'Instagram', followers:'234K', fit:92, avatar:'ZA' },
  { id:2, name:'Leo Kim',       niche:'Tech',       platform:'YouTube',   followers:'890K', fit:87, avatar:'LK' },
  { id:3, name:'Maya Rodriguez',niche:'Fitness',    platform:'TikTok',    followers:'1.2M', fit:84, avatar:'MR' },
  { id:4, name:'Dev Patel',     niche:'Finance',    platform:'Instagram', followers:'156K', fit:79, avatar:'DP' },
];

const KPICard = ({ label, value, delta, icon }) => (
  <Card variant="container" className={styles.kpiCard}>
    <div className={styles.kpiTop}>
      <span className={styles.kpiIcon}>{icon}</span>
      <span className={`${styles.kpiDelta} ${delta >= 0 ? styles['kpiDelta--up'] : styles['kpiDelta--down']}`}>
        {delta >= 0 ? '↑' : '↓'} {Math.abs(delta)}%
      </span>
    </div>
    <p className={styles.kpiValue}>{value}</p>
    <p className={styles.kpiLabel}>{label}</p>
  </Card>
);

const CreatorCard = ({ creator }) => (
  <Card variant="standard" className={styles.creatorCard}>
    <div className={styles.creatorTop}>
      <div className={styles.creatorAvatar}>{creator.avatar}</div>
      <div className={styles.creatorInfo}>
        <h3 className={styles.creatorName}>{creator.name}</h3>
        <Badge variant="primary">{creator.niche}</Badge>
      </div>
      <CircularProgress value={creator.fit} size={56} />
    </div>
    <div className={styles.creatorStats}>
      <div className={styles.creatorStat}>
        <span className="micro-label">Platform</span>
        <span>{creator.platform}</span>
      </div>
      <div className={styles.creatorStat}>
        <span className="micro-label">Followers</span>
        <span>{creator.followers}</span>
      </div>
    </div>
    <div className={styles.creatorActions}>
      <Link to={`/brand/creator/${creator.id}`}>
        <Button variant="secondary" size="sm">View Profile</Button>
      </Link>
      <Button variant="primary" size="sm">+ Shortlist</Button>
    </div>
  </Card>
);

const BrandDashboard = () => {
  const { user } = useAuth();
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const handleAskAI = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    setAiResponse(
      `Based on your prompt, I recommend targeting micro-influencers in the ${user?.industry || 'lifestyle'} niche with 50K–250K followers on Instagram. Focus on creators with engagement rates above 4% for maximum ROI. Consider a 3-week campaign with 2 posts per creator.`
    );
    setAiLoading(false);
  };

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <div>
          <h1 className={styles.greeting}>
            Welcome back, <span className={styles.brandName}>{user?.name || 'Brand'}</span>
          </h1>
          <p className={styles.subGreet}>Here's your campaign overview for today.</p>
        </div>
        <Link to="/brand/campaigns/new">
          <Button variant="primary">+ New Campaign</Button>
        </Link>
      </div>

      {/* KPIs */}
      <section className={styles.kpiGrid} aria-label="Key metrics">
        <KPICard label="Active Campaigns" value="4"   delta={12}  icon="◉" />
        <KPICard label="Creators Matched"  value="128" delta={23}  icon="◎" />
        <KPICard label="Shortlisted"       value="18"  delta={5}   icon="◇" />
        <KPICard label="Avg. Fit Score"    value="86%" delta={-2}  icon="✦" />
      </section>

      <div className={styles.mainGrid}>
        {/* AI Campaign Assistant */}
        <section className={styles.aiSection} aria-labelledby="ai-heading">
          <h2 id="ai-heading" className={styles.sectionTitle}>
            <span className={styles.aiIcon}>✦</span>
            AI Campaign Assistant
          </h2>
          <Card variant="glass" className={styles.aiCard}>
            <Input
              id="ai-prompt"
              label="Describe your campaign goal"
              placeholder="e.g. I want to launch a summer skincare campaign targeting Gen Z women..."
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
            />
            <div className={styles.aiActions}>
              <Button
                variant="primary"
                onClick={handleAskAI}
                disabled={aiLoading || !aiPrompt.trim()}
              >
                {aiLoading ? '✦ Thinking…' : '✦ Ask Claude'}
              </Button>
            </div>
            {aiResponse && (
              <div className={styles.aiResponse}>
                <span className="micro-label">Claude's Recommendation</span>
                <p>{aiResponse}</p>
              </div>
            )}
          </Card>
        </section>

        {/* Quick links */}
        <section className={styles.quickSection} aria-label="Quick actions">
          <h2 className={styles.sectionTitle}>Quick Actions</h2>
          <div className={styles.quickLinks}>
            <Link to="/brand/search" className={styles.quickLink}>
              <span>◎</span> Discover Creators
            </Link>
            <Link to="/brand/campaigns" className={styles.quickLink}>
              <span>◉</span> View Campaigns
            </Link>
            <Link to="/brand/shortlist" className={styles.quickLink}>
              <span>◇</span> My Shortlist
            </Link>
          </div>
        </section>
      </div>

      {/* Matched creator preview */}
      <section aria-labelledby="matches-heading">
        <div className={styles.sectionHeader}>
          <h2 id="matches-heading" className={styles.sectionTitle}>Top Creator Matches</h2>
          <Link to="/brand/search">
            <Button variant="ghost" size="sm">See all →</Button>
          </Link>
        </div>
        <div className={styles.creatorGrid}>
          {MOCK_CREATORS.map(c => <CreatorCard key={c.id} creator={c} />)}
        </div>
      </section>
    </div>
  );
};

export default BrandDashboard;
