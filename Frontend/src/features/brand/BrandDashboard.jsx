import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import CircularProgress from '../../components/common/CircularProgress';
import Badge from '../../components/common/Badge';
import Input from '../../components/common/Input';
import { aiApi, campaignsApi, creatorsApi, shortlistsApi } from '../../services/api';
import styles from './BrandDashboard.module.css';

const formatNumber = (num) => {
  if (!Number.isFinite(num)) return '0';
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${Math.round(num / 1000)}K`;
  return String(num);
};

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

const CreatorCard = ({ creator, onShortlist, saving }) => (
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
      <Button variant="primary" size="sm" onClick={() => onShortlist(creator.id)} disabled={saving}>
        {saving ? 'Saving...' : '+ Shortlist'}
      </Button>
    </div>
  </Card>
);

const BrandDashboard = () => {
  const { user, updateUser } = useAuth();
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState('');
  const [creators, setCreators] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [shortlistingId, setShortlistingId] = useState(null);

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
    if (!aiPrompt.trim() || aiPrompt.trim().length < 10) return;
    setError('');
    setAiLoading(true);
    try {
      const result = await aiApi.brief({
        campaign_goal: aiPrompt,
        target_audience: user?.industry || 'General audience',
      });
      setAiResponse(result?.brief || result?.reasoning || 'AI recommendation generated.');
    } catch (err) {
      setError(err?.message || 'Unable to generate AI suggestion right now.');
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    const loadDashboard = async () => {
      setDashboardLoading(true);
      setError('');
      try {
        const [campaignResult, creatorResult] = await Promise.all([
          campaignsApi.list({ page: 1, limit: 10 }),
          creatorsApi.discover({ page: 1, limit: 4 }),
        ]);

        setCampaigns(campaignResult?.data || []);
        setCreators((creatorResult?.data || []).map((creator) => {
          const followers = creator.follower_count || 0;
          const engagement = creator.engagement_rate || 0;
          const handle = `@${(creator.ig_handle || 'creator').replace(/^@/, '')}`;
          return {
            id: creator.id,
            name: handle,
            niche: creator.niche_primary || 'General',
            platform: 'Instagram',
            followers: formatNumber(followers),
            fit: Math.max(50, Math.min(99, Math.round((engagement * 10) + 40))),
            avatar: handle.replace('@', '').slice(0, 2).toUpperCase(),
          };
        }));
      } catch (err) {
        setError(err?.message || 'Failed to load dashboard data.');
      } finally {
        setDashboardLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const handleShortlist = async (creatorId) => {
    setShortlistingId(creatorId);
    setError('');
    try {
      await shortlistsApi.add({ influencer_id: creatorId });
    } catch (err) {
      setError(err?.message || 'Unable to shortlist this creator.');
    } finally {
      setShortlistingId(null);
    }
  };

  const campaignKpis = useMemo(() => {
    const active = campaigns.filter((c) => c.status === 'ACTIVE').length;
    const draft = campaigns.filter((c) => c.status === 'DRAFT').length;
    const avgBudget = campaigns.length
      ? Math.round(campaigns.reduce((sum, c) => sum + (Number(c.budget) || 0), 0) / campaigns.length)
      : 0;

    return {
      active,
      total: campaigns.length,
      draft,
      avgBudget,
    };
  }, [campaigns]);

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
                <Button variant="primary" size="sm" onClick={handleProfileSave}>Save Brand Profile</Button>
                <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <>
              <h1 className={styles.greeting}>
                Welcome back, <span className={styles.brandName}>{user?.name || 'Brand'}</span>
              </h1>
              <p className={styles.subGreet}>Managing {user?.company || 'Your Brand'} · {user?.industry || 'General'}</p>
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} style={{ marginTop: '0.5rem', padding: 0 }}>Edit Brand Details</Button>
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
        <KPICard label="Active Campaigns" value={String(campaignKpis.active)} delta={campaignKpis.active ? 5 : 0} icon="C" />
        <KPICard label="Total Campaigns" value={String(campaignKpis.total)} delta={campaignKpis.total ? 8 : 0} icon="M" />
        <KPICard label="Draft Campaigns" value={String(campaignKpis.draft)} delta={campaignKpis.draft ? 3 : 0} icon="S" />
        <KPICard label="Avg Budget" value={`$${formatNumber(campaignKpis.avgBudget)}`} delta={campaignKpis.avgBudget ? 2 : 0} icon="F" />
      </section>

      <div className={styles.mainGrid}>
        <div className={styles.contentColumn}>
          {/* Notifications Section */}
          <section className={styles.section} aria-labelledby="notif-heading">
            <h2 id="notif-heading" className={styles.sectionTitle}>
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
                    disabled={aiLoading || !aiPrompt.trim() || aiPrompt.trim().length < 10}
                >
                  {aiLoading ? 'Thinking…' : 'Quick Suggest'}
                </Button>
              </div>
              {aiResponse && (
                <div className={styles.aiResponse}>
                  <p>{aiResponse}</p>
                </div>
              )}
                {error && (
                  <div className={styles.aiResponse} role="alert">
                    <p>{error}</p>
                  </div>
                )}
            </Card>
          </section>
        </div>

        {/* My Campaigns Column */}
        <section className={styles.campaignsColumn} aria-labelledby="campaigns-heading">
          <h2 id="campaigns-heading" className={styles.sectionTitle}>My Campaigns</h2>
          <div className={styles.campaignList}>
            {campaigns.length === 0 ? (
              <Card variant="container" className={styles.campaignMiniCard}>
                <h4 className={styles.miniTitle}>No campaigns yet</h4>
                <p className={styles.miniMeta}>Create your first campaign to start discovery.</p>
              </Card>
            ) : campaigns.slice(0, 2).map((campaign) => (
              <Card key={campaign.id} variant="container" className={styles.campaignMiniCard}>
                <Badge variant={campaign.status === 'ACTIVE' ? 'verified' : 'secondary'}>{campaign.status}</Badge>
                <h4 className={styles.miniTitle}>{campaign.title}</h4>
                <p className={styles.miniMeta}>Budget: ${formatNumber(Number(campaign.budget) || 0)}</p>
              </Card>
            ))}
            <Link to="/brand/campaigns/new" className={styles.viewAllLink}>View all campaigns →</Link>
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
          {dashboardLoading ? (
            <Card variant="container" className={styles.campaignMiniCard}>Loading creator matches...</Card>
          ) : creators.length === 0 ? (
            <Card variant="container" className={styles.campaignMiniCard}>No verified creators found for your filters yet.</Card>
          ) : creators.map(c => (
            <CreatorCard
              key={c.id}
              creator={c}
              onShortlist={handleShortlist}
              saving={shortlistingId === c.id}
            />
          ))}
        </div>
      </section>
    </div>
  );
};

export default BrandDashboard;
