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
  const { user, updateUser } = useAuth();
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [editCompany, setEditCompany] = useState(user?.company || '');
  const [editIndustry, setEditIndustry] = useState(user?.industry || '');

  const handleProfileSave = () => {
    if (updateUser) {
      updateUser({ name: editName, company: editCompany, industry: editIndustry });
    }
    setIsEditing(false);
  };

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
        <div className={styles.greetingSection}>
          {isEditing ? (
            <div className={styles.editForm}>
              <div className={styles.editInputGroup}>
                <Input size="sm" label="Your Name" value={editName} onChange={e => setEditName(e.target.value)} />
                <Input size="sm" label="Company Name" value={editCompany} onChange={e => setEditCompany(e.target.value)} />
                <Input size="sm" label="Industry" value={editIndustry} onChange={e => setEditIndustry(e.target.value)} />
              </div>
              <div className={styles.editActions}>
                <Button variant="primary" size="sm" onClick={handleProfileSave}>💾 Save Brand Profile</Button>
                <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <>
              <h1 className={styles.greeting}>
                Welcome back, <span className={styles.brandName}>{user?.name || 'Brand'}</span>
              </h1>
              <p className={styles.subGreet}>Managing {user?.company || 'Your Brand'} · {user?.industry || 'General'}</p>
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} style={{ marginTop: '0.5rem', padding: 0 }}>✏ Edit Brand Details</Button>
            </>
          )}
        </div>
        {!isEditing && (
          <Link to="/brand/campaigns/new">
            <Button variant="primary">+ New Campaign</Button>
          </Link>
        )}
      </div>

      {/* KPIs */}
      <section className={styles.kpiGrid} aria-label="Key metrics">
        <KPICard label="Active Campaigns" value="4"   delta={12}  icon="◉" />
        <KPICard label="Creators Matched"  value="128" delta={23}  icon="◎" />
        <KPICard label="Shortlisted"       value="18"  delta={5}   icon="◇" />
        <KPICard label="Avg. Fit Score"    value="86%" delta={-2}  icon="✦" />
      </section>

      <div className={styles.mainGrid}>
        <div className={styles.contentColumn}>
          {/* Notifications Section */}
          <section className={styles.section} aria-labelledby="notif-heading">
            <h2 id="notif-heading" className={styles.sectionTitle}>
              <span className={styles.icon}>🔔</span>
              Notifications
            </h2>
            <Card variant="standard" className={styles.notifList}>
              <div className={styles.notifItem}>
                <div className={styles.notifAvatar}>MS</div>
                <div className={styles.notifText}>
                  <strong>Maya Sterling</strong> responded to your "Summer Glow" campaign brief.
                  <span className={styles.notifTime}>2 hours ago</span>
                </div>
                <Button variant="ghost" size="sm">Review</Button>
              </div>
              <div className={styles.divider} />
              <div className={styles.notifItem}>
                <div className={styles.notifAvatar}>LK</div>
                <div className={styles.notifText}>
                  <strong>Leo Kim</strong> accepted your invitation for "Tech Review 2025".
                  <span className={styles.notifTime}>5 hours ago</span>
                </div>
                <Button variant="ghost" size="sm">Review</Button>
              </div>
            </Card>
          </section>

          {/* AI Campaign Assistant */}
          <section className={styles.aiSection} aria-labelledby="ai-heading">
            <h2 id="ai-heading" className={styles.sectionTitle}>
              <span className={styles.aiIcon}>✦</span>
              AI Strategy Hub
            </h2>
            <Card variant="glass" className={styles.aiCard}>
              <Input
                id="ai-prompt"
                label="Launch new strategy"
                placeholder="e.g. Find me creators similar to Zara Ahmed for a fashion drop..."
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
              />
              <div className={styles.aiActions}>
                <Link to="/brand/ai-assistant">
                  <Button variant="ghost" size="sm">Open Full Chat →</Button>
                </Link>
                <Button
                  variant="primary"
                  onClick={handleAskAI}
                  disabled={aiLoading || !aiPrompt.trim()}
                >
                  {aiLoading ? '✦ Thinking…' : '✦ Quick Suggest'}
                </Button>
              </div>
              {aiResponse && (
                <div className={styles.aiResponse}>
                  <p>{aiResponse}</p>
                </div>
              )}
            </Card>
          </section>
        </div>

        {/* My Campaigns Column */}
        <section className={styles.campaignsColumn} aria-labelledby="campaigns-heading">
          <h2 id="campaigns-heading" className={styles.sectionTitle}>My Campaigns</h2>
          <div className={styles.campaignList}>
            <Card variant="container" className={styles.campaignMiniCard}>
              <Badge variant="verified">Active</Badge>
              <h4 className={styles.miniTitle}>Summer Glow 2025</h4>
              <p className={styles.miniMeta}>12 Creators · $5.4K Spent</p>
            </Card>
            <Card variant="container" className={styles.campaignMiniCard}>
              <Badge variant="secondary">Draft</Badge>
              <h4 className={styles.miniTitle}>Holiday Gift Guide</h4>
              <p className={styles.miniMeta}>Not launched</p>
            </Card>
            <Link to="/brand/campaigns" className={styles.viewAllLink}>View all campaigns →</Link>
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
