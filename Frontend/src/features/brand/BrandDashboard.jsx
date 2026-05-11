import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import CircularProgress from '../../components/common/CircularProgress';
import Badge from '../../components/common/Badge';
import Input from '../../components/common/Input';
import { apiClient, isApiError } from '../../utils/apiClient';
import Toast from '../../components/common/Toast';
import styles from './BrandDashboard.module.css';

const formatFollowers = (value) => {
  const count = Number(value || 0);
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${Math.round(count / 1000)}K`;
  return String(count);
};

const normalizeEngagementPercent = (value) => {
  const numeric = Number(value || 0);
  return numeric <= 1 ? numeric * 100 : numeric;
};

const calculateFitScore = (engagementRate) => {
  const engagement = normalizeEngagementPercent(engagementRate);
  return Math.max(40, Math.min(98, Math.round(engagement * 12)));
};

const normalizeCampaignStatus = (status) => {
  const value = String(status || 'DRAFT').toUpperCase();
  if (['ACTIVE', 'DRAFT', 'PAUSED', 'COMPLETED'].includes(value)) return value;
  return 'DRAFT';
};

const getCampaignBadgeVariant = (status) => {
  const normalized = normalizeCampaignStatus(status);
  if (normalized === 'ACTIVE') return 'verified';
  if (normalized === 'PAUSED') return 'primary';
  if (normalized === 'COMPLETED') return 'default';
  return 'secondary';
};

const formatCompactCurrency = (amount, currency = 'USD') => {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) return null;

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  } catch {
    return `${currency} ${Math.round(value)}`;
  }
};

const formatCampaignMeta = (campaign) => {
  const status = normalizeCampaignStatus(campaign.status);
  if (status === 'DRAFT') return 'Not launched';

  const details = [];
  const visibility = String(campaign.visibility || '').toUpperCase();
  if (visibility === 'PUBLIC') details.push('Public');
  if (visibility === 'MATCHED') details.push('Matched');

  const budget = formatCompactCurrency(campaign.budget, campaign.currency || 'USD');
  if (budget) details.push(`Budget ${budget}`);

  return details.length > 0 ? details.join(' · ') : 'Live campaign';
};

const KPICard = ({ label, value, delta = null, icon }) => (
  <Card variant="container" className={styles.kpiCard}>
    <div className={styles.kpiTop}>
      <span className={styles.kpiIcon}>{icon}</span>
      {typeof delta === 'number' && (
        <span className={`${styles.kpiDelta} ${delta >= 0 ? styles['kpiDelta--up'] : styles['kpiDelta--down']}`}>
          {delta >= 0 ? '↑' : '↓'} {Math.abs(delta)}%
        </span>
      )}
    </div>
    <p className={styles.kpiValue}>{value}</p>
    <p className={styles.kpiLabel}>{label}</p>
  </Card>
);

const CreatorCard = ({ creator, onShortlist, pendingShortlistId }) => {
  const handle = creator.ig_handle ? `@${creator.ig_handle}` : 'Unknown creator';
  const avatar = handle.replace('@', '').slice(0, 2).toUpperCase() || 'CR';
  const fit = calculateFitScore(creator.engagement_rate);

  return (
  <Card variant="standard" className={styles.creatorCard}>
    <div className={styles.creatorTop}>
      <div className={styles.creatorAvatar}>{avatar}</div>
      <div className={styles.creatorInfo}>
        <h3 className={styles.creatorName}>{handle}</h3>
        <Badge variant="primary">{creator.niche_primary || 'General'}</Badge>
      </div>
      <CircularProgress value={fit} size={56} />
    </div>
    <div className={styles.creatorStats}>
      <div className={styles.creatorStat}>
        <span className="micro-label">Platform</span>
        <span>Instagram</span>
      </div>
      <div className={styles.creatorStat}>
        <span className="micro-label">Followers</span>
        <span>{formatFollowers(creator.follower_count)}</span>
      </div>
    </div>
    <div className={styles.creatorActions}>
      <Link to={`/brand/creator/${creator.id}`}>
        <Button variant="secondary" size="sm">View Profile</Button>
      </Link>
      <Button
        variant="primary"
        size="sm"
        onClick={() => onShortlist(creator.id)}
        disabled={pendingShortlistId === creator.id}
      >
        {pendingShortlistId === creator.id ? 'Saving...' : '+ Shortlist'}
      </Button>
    </div>
  </Card>
  );
};

const BrandDashboard = () => {
  const { user, updateUser } = useAuth();
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [toast, setToast] = useState(null);
  const [editName, setEditName] = useState(user?.name || '');
  const [editCompany, setEditCompany] = useState(user?.company || '');
  const [editIndustry, setEditIndustry] = useState(user?.industry || '');
  const [topCreators, setTopCreators] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [metrics, setMetrics] = useState({
    activeCampaigns: 0,
    creatorsMatched: 0,
    shortlisted: 0,
    avgFitScore: null,
  });
  const [creatorLoading, setCreatorLoading] = useState(true);
  const [campaignLoading, setCampaignLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState('');
  const [pendingShortlistId, setPendingShortlistId] = useState(null);

  useEffect(() => {
    let ignore = false;

    const loadDashboardData = async () => {
      setCreatorLoading(true);
      setCampaignLoading(true);
      try {
        const [creatorResponse, campaignResponse, activeCampaignResponse, shortlistResponse] = await Promise.all([
          apiClient.get('/creators?page=1&limit=4'),
          apiClient.get('/campaigns?page=1&limit=2'),
          apiClient.get('/campaigns?status=ACTIVE&page=1&limit=1'),
          apiClient.get('/shortlists'),
        ]);

        const creators = Array.isArray(creatorResponse?.data) ? creatorResponse.data : [];
        const latestCampaigns = Array.isArray(campaignResponse?.data) ? campaignResponse.data : [];
        const shortlists = Array.isArray(shortlistResponse?.data) ? shortlistResponse.data : [];

        const fitScores = creators.map((creator) => calculateFitScore(creator.engagement_rate));
        const avgFitScore = fitScores.length > 0
          ? Math.round(fitScores.reduce((sum, score) => sum + score, 0) / fitScores.length)
          : null;

        if (!ignore) {
          setTopCreators(creators);
          setCampaigns(latestCampaigns);
          setMetrics({
            activeCampaigns: Number(activeCampaignResponse?.pagination?.total || 0),
            creatorsMatched: Number(creatorResponse?.pagination?.total || creators.length || 0),
            shortlisted: shortlists.length,
            avgFitScore,
          });
        }
      } catch (err) {
        if (!ignore) {
          setActionMessage(isApiError(err) ? `${err.code}: ${err.message}` : 'Failed to load dashboard data');
          setTopCreators([]);
          setCampaigns([]);
          setMetrics({
            activeCampaigns: 0,
            creatorsMatched: 0,
            shortlisted: 0,
            avgFitScore: null,
          });
        }
      } finally {
        if (!ignore) {
          setCreatorLoading(false);
          setCampaignLoading(false);
        }
      }
    };

    loadDashboardData();

    return () => {
      ignore = true;
    };
  }, []);

  const handleProfileSave = async () => {
    setIsSavingProfile(true);
    try {
      const payload = { name: editName, company: editCompany, industry: editIndustry };
      await apiClient.patch('/profile/me', payload);
      if (updateUser) {
        updateUser(payload);
      }
      setToast({ message: 'Profile updated successfully!', type: 'success' });
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving profile:', error);
      setToast({ message: 'Failed to update profile.', type: 'error' });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleAskAI = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    try {
      const campaignGoal = aiPrompt.trim().length >= 10
        ? aiPrompt.trim()
        : `Create a campaign brief for ${aiPrompt.trim()} with measurable goals.`;

      const result = await apiClient.post('/ai/brief', {
        campaign_goal: campaignGoal,
      });

      const deliverables = Array.isArray(result.deliverables)
        ? result.deliverables.map((item) => {
          if (typeof item === 'string') return item;
          if (item && typeof item === 'object') {
            const platform = item.platform || 'Platform';
            const format = item.format || 'Format';
            const spec = item.spec ? ` (${item.spec})` : '';
            return `${platform} ${format}${spec}`;
          }
          return 'Deliverable';
        }).join(', ')
        : 'N/A';

      const preview = result.briefPreview || result.title || 'Campaign brief generated';
      const objective = result.objective || 'N/A';

      const creatorFees = result?.budgetBreakdown?.creatorFees;
      const paidAmplification = result?.budgetBreakdown?.paidAmplification;
      const production = result?.budgetBreakdown?.production;

      const budgetSummary = [
        creatorFees ? `Creator ${creatorFees.percentage}%` : null,
        paidAmplification ? `Amplification ${paidAmplification.percentage}%` : null,
        production ? `Production ${production.percentage}%` : null,
      ].filter(Boolean).join(', ');

      const creatorFit = result?.creatorProfile?.rationale
        ? ` | Creator Fit: ${result.creatorProfile.rationale}`
        : '';

      setAiResponse(
        `Preview: ${preview} | Objective: ${objective} | Deliverables: ${deliverables}${budgetSummary ? ` | Budget: ${budgetSummary}` : ''}${creatorFit}`
      );
    } catch (error) {
      setAiResponse(
        isApiError(error)
          ? `${error.code}: ${error.message}`
          : 'AI request failed. Please try again.'
      );
    } finally {
      setAiLoading(false);
    }
  };

  const handleShortlist = async (creatorId) => {
    setActionMessage('');
    setPendingShortlistId(creatorId);

    try {
      await apiClient.post('/shortlists', { influencer_id: creatorId });
      setActionMessage('Creator added to shortlist.');
      setMetrics((previous) => ({
        ...previous,
        shortlisted: previous.shortlisted + 1,
      }));
    } catch (err) {
      if (isApiError(err) && err.code === 'CONFLICT') {
        setActionMessage('Creator is already shortlisted.');
      } else if (isApiError(err)) {
        setActionMessage(`${err.code}: ${err.message}`);
      } else {
        setActionMessage('Unable to add creator to shortlist.');
      }
    } finally {
      setPendingShortlistId(null);
    }
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
                <Button variant="primary" size="sm" onClick={handleProfileSave} disabled={isSavingProfile}>
                  {isSavingProfile ? 'Saving...' : 'Save Brand Profile'}
                </Button>
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
        <KPICard label="Active Campaigns" value={metrics.activeCampaigns} icon="◉" />
        <KPICard label="Creators Matched" value={metrics.creatorsMatched} icon="◎" />
        <KPICard label="Shortlisted" value={metrics.shortlisted} icon="◇" />
        <KPICard
          label="Avg. Fit Score"
          value={metrics.avgFitScore === null ? '--' : `${metrics.avgFitScore}%`}
          icon="✦"
        />
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
                  disabled={aiLoading || !aiPrompt.trim()}
                >
                  {aiLoading ? 'Thinking…' : 'Quick Suggest'}
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
            {campaignLoading ? (
              <Card variant="glass">Loading campaigns...</Card>
            ) : campaigns.length > 0 ? (
              campaigns.map((campaign) => {
                const status = normalizeCampaignStatus(campaign.status);
                return (
                  <Card key={campaign.id} variant="container" className={styles.campaignMiniCard}>
                    <Badge variant={getCampaignBadgeVariant(status)}>{status}</Badge>
                    <h4 className={styles.miniTitle}>{campaign.title || 'Untitled campaign'}</h4>
                    <p className={styles.miniMeta}>{formatCampaignMeta(campaign)}</p>
                  </Card>
                );
              })
            ) : (
              <Card variant="glass" className={styles.campaignMiniCard}>
                <h4 className={styles.miniTitle}>No campaigns yet</h4>
                <p className={styles.miniMeta}>Create your first campaign to start matching creators.</p>
              </Card>
            )}
            <Link to="/brand/campaigns/new" className={styles.viewAllLink}>View all campaigns →</Link>
          </div>
        </section>
      </div>

      {actionMessage && <Card variant="glass">{actionMessage}</Card>}

      {/* Matched creator preview */}
      <section aria-labelledby="matches-heading">
        <div className={styles.sectionHeader}>
          <h2 id="matches-heading" className={styles.sectionTitle}>Top Creator Matches</h2>
          <Link to="/brand/search">
            <Button variant="ghost" size="sm">See all →</Button>
          </Link>
        </div>
        <div className={styles.creatorGrid}>
          {creatorLoading ? (
            <Card variant="glass">Loading creators...</Card>
          ) : topCreators.length > 0 ? (
            topCreators.map((creator) => (
              <CreatorCard
                key={creator.id}
                creator={creator}
                onShortlist={handleShortlist}
                pendingShortlistId={pendingShortlistId}
              />
            ))
          ) : (
            <Card variant="glass">No creator matches available yet.</Card>
          )}
        </div>
      </section>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default BrandDashboard;
