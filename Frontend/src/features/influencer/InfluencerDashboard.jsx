import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Card from '../../components/common/Card';
import { apiClient, isApiError } from '../../utils/apiClient';
import styles from './InfluencerDashboard.module.css';

const StatBlock = ({ label, value, sub }) => (
  <div className={styles.statBlock}>
    <span className={styles.statValue}>{value}</span>
    {sub && <span className={styles.statSub}>{sub}</span>}
    <span className="micro-label">{label}</span>
  </div>
);

const formatNumber = (value) => {
  if (value === null || value === undefined) {
    return '—';
  }
  const count = Number(value || 0);
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${Math.round(count / 1000)}K`;
  return String(count);
};

const isValidUrl = (value) => {
  try {
    // eslint-disable-next-line no-new
    new URL(value);
    return true;
  } catch {
    return false;
  }
};

const InfluencerDashboard = () => {
  const { user, updateUser } = useAuth();
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState('');
  const [message, setMessage] = useState('');

  const [isEditing, setIsEditing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPortfolio, setSavingPortfolio] = useState(false);

  const [profile, setProfile] = useState({
    igHandle: '',
    nichePrimary: '',
    bio: '',
    portfolioUrl: '',
    mediaKitUrl: '',
    isVerified: false,
    verificationStatus: '',
  });
  const [editNiche, setEditNiche] = useState('');
  const [editBio, setEditBio] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');

  const [stats, setStats] = useState({
    followerCount: 0,
    avgLikes: 0,
    totalViews30d: null,
    engagementRate: 0,
    pendingInvites: 0,
    acceptedCollaborations: 0,
  });

  useEffect(() => {
    let ignore = false;

    (async () => {
      try {
        const [dashboardResponse, profileResponse] = await Promise.all([
          apiClient.get('/influencer/dashboard'),
          apiClient.get('/profile/me'),
        ]);

        const data = dashboardResponse?.data || {};
        const roleProfile = profileResponse?.data?.role_profile || {};

        if (!ignore) {
          setStats({
            followerCount: Number(data.followerCount || 0),
            avgLikes: Number(data.avgLikes || 0),
            totalViews30d: data.totalViews30d === null || data.totalViews30d === undefined
              ? null
              : Number(data.totalViews30d),
            engagementRate: Number(data.engagementRate || 0),
            pendingInvites: Number(data.pendingInvites || 0),
            acceptedCollaborations: Number(data.acceptedCollaborations || 0),
          });

          const resolvedProfile = {
            igHandle: roleProfile.ig_handle || '',
            nichePrimary: roleProfile.niche_primary || '',
            bio: roleProfile.bio || '',
            portfolioUrl: roleProfile.portfolio_url || '',
            mediaKitUrl: roleProfile.media_kit_url || '',
            isVerified: Boolean(roleProfile.is_verified),
            verificationStatus: roleProfile.verification_status || '',
          };

          setProfile(resolvedProfile);
          setEditNiche(resolvedProfile.nichePrimary);
          setEditBio(resolvedProfile.bio);
          setPortfolioUrl(resolvedProfile.portfolioUrl);
        }
      } catch (error) {
        if (!ignore) {
          setDashboardError(isApiError(error) ? `${error.code}: ${error.message}` : 'Failed to load influencer dashboard data.');
        }
      } finally {
        if (!ignore) {
          setDashboardLoading(false);
        }
      }
    })();

    return () => {
      ignore = true;
    };
  }, []);

  const handleProfileSave = async () => {
    const nextNiche = editNiche.trim();
    const nextBio = editBio.trim();

    const updates = {};
    if (nextNiche && nextNiche !== profile.nichePrimary) {
      updates.nichePrimary = nextNiche;
    }
    if (nextBio !== profile.bio) {
      updates.bio = nextBio;
    }

    if (Object.keys(updates).length === 0) {
      setIsEditing(false);
      setMessage('No profile changes to save.');
      return;
    }

    setSavingProfile(true);
    setMessage('');
    setDashboardError('');

    try {
      const response = await apiClient.patch('/profile/me', updates);
      const updated = response?.data?.role_profile || {};

      const nextProfile = {
        ...profile,
        nichePrimary: updated.niche_primary || nextNiche,
        bio: updated.bio || nextBio,
      };

      setProfile(nextProfile);
      setEditNiche(nextProfile.nichePrimary);
      setEditBio(nextProfile.bio);
      if (updateUser) {
        updateUser({ niche: nextProfile.nichePrimary });
      }
      setIsEditing(false);
      setMessage('Profile updated.');
    } catch (error) {
      setDashboardError(isApiError(error) ? `${error.code}: ${error.message}` : 'Unable to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePortfolioSave = async () => {
    const nextUrl = portfolioUrl.trim();

    if (!nextUrl) {
      setDashboardError('Portfolio URL is required.');
      return;
    }

    if (!isValidUrl(nextUrl)) {
      setDashboardError('Please provide a valid portfolio URL.');
      return;
    }

    setSavingPortfolio(true);
    setDashboardError('');
    setMessage('');

    try {
      const response = await apiClient.patch('/profile/me', { portfolioUrl: nextUrl });
      const updated = response?.data?.role_profile || {};
      const resolvedUrl = updated.portfolio_url || nextUrl;
      setProfile((prev) => ({ ...prev, portfolioUrl: resolvedUrl }));
      setPortfolioUrl(resolvedUrl);
      setMessage('Portfolio link updated.');
    } catch (error) {
      setDashboardError(isApiError(error) ? `${error.code}: ${error.message}` : 'Unable to update portfolio link.');
    } finally {
      setSavingPortfolio(false);
    }
  };

  const verificationLabel = profile.isVerified
    ? 'VERIFIED CREATOR'
    : (profile.verificationStatus ? `${profile.verificationStatus} REVIEW` : 'VERIFICATION IN PROGRESS');

  const discoveryTitle = profile.isVerified ? 'Ready for Discovery' : 'Verification in Progress';
  const discoverySub = profile.isVerified
    ? `Your profile is visible to brands right now. You currently have ${stats.pendingInvites} pending invitations.`
    : 'Your profile is being reviewed. Keep your niche, bio, and portfolio link updated for faster approval.';

  return (
    <div className={styles.page}>

      {dashboardError && <Card variant="glass">{dashboardError}</Card>}
      {message && <Card variant="glass">{message}</Card>}
      {dashboardLoading && <Card variant="glass">Loading influencer profile...</Card>}

      {/* ── Profile Hero ── */}
      <section className={styles.hero} aria-labelledby="influencer-name">
        <div className={styles.heroGlow} aria-hidden="true" />
        <div className={styles.avatarRing}>
          <div className={styles.heroAvatar}>
            {user?.name?.charAt(0)?.toUpperCase() || 'C'}
          </div>
        </div>
        <div className={styles.heroInfo}>
          {isEditing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
              <input 
                value={editNiche} 
                onChange={(e) => setEditNiche(e.target.value)} 
                placeholder="Primary niche"
                style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--glass-border)', background: 'var(--color-surface-container-high)', color: 'var(--color-on-surface)' }}
              />
              <textarea
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                placeholder="Write your creator bio"
                rows={3}
                style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--glass-border)', background: 'var(--color-surface-container-high)', color: 'var(--color-on-surface)', resize: 'vertical' }}
              />
            </div>
          ) : (
            <>
              <span className={styles.heroTagline}>{profile.igHandle ? `@${profile.igHandle}` : verificationLabel}</span>
              <h1 id="influencer-name" className={styles.heroName}>{user?.name || 'Creator'}</h1>
            </>
          )}
          <p className={styles.heroBio}>
            {profile.bio || 'Complete your profile bio to improve campaign matching.'}
          </p>
          <div className={styles.heroTags}>
            <Badge variant="primary">{profile.nichePrimary || user?.niche || 'General'}</Badge>
            <Badge variant={profile.isVerified ? 'verified' : 'secondary'}>
              {profile.isVerified ? 'Verified' : (profile.verificationStatus || 'Pending').toUpperCase()}
            </Badge>
          </div>
        </div>
        <div className={styles.heroActions}>
          {isEditing ? (
            <>
              <Button variant="primary" onClick={handleProfileSave} disabled={savingProfile}>
                {savingProfile ? 'Saving...' : 'Save Profile'}
              </Button>
              <Button variant="ghost" onClick={() => setIsEditing(false)} disabled={savingProfile}>Cancel</Button>
            </>
          ) : (
            <Button variant="secondary" onClick={() => setIsEditing(true)}>Edit Profile</Button>
          )}
          <Button
            variant="ghost"
            onClick={() => {
              if (profile.mediaKitUrl) {
                window.open(profile.mediaKitUrl, '_blank', 'noopener,noreferrer');
              }
            }}
            disabled={!profile.mediaKitUrl}
          >
            Media Kit
          </Button>
        </div>
      </section>

      {/* ── Live Stats ── */}
      <div className={styles.statStrip}>
        <StatBlock label="Followers"  value={formatNumber(stats.followerCount)} sub={`${stats.pendingInvites} pending invites`} />
        <StatBlock label="Avg Likes"  value={formatNumber(stats.avgLikes)}  sub={`${stats.acceptedCollaborations} accepted`} />
        <StatBlock label="Total Views" value={formatNumber(stats.totalViews30d)} sub="Last 30 days" />
        <StatBlock label="Engagement" value={`${stats.engagementRate.toFixed(1)}%`}  sub="Current average" />
      </div>

      {/* ── Portfolio Link ── */}
      <section className={styles.section} aria-labelledby="post-heading">
        <h2 id="post-heading" className={styles.sectionTitle}>Portfolio Link</h2>
        <div className={styles.postWidget}>
          <p className={styles.postDesc}>
            Keep your portfolio link up to date so brands can evaluate your work.
          </p>
          <div className={styles.postInputRow}>
            <input
              className={styles.postInput}
              type="url"
              placeholder="Paste your portfolio URL…"
              value={portfolioUrl}
              onChange={e => setPortfolioUrl(e.target.value)}
              aria-label="Portfolio URL"
            />
            <Button variant="primary" onClick={handlePortfolioSave} disabled={savingPortfolio}>
              {savingPortfolio ? 'Saving...' : 'Save Link'}
            </Button>
          </div>
          {profile.portfolioUrl && (
            <a href={profile.portfolioUrl} target="_blank" rel="noreferrer" className={styles.savedPostLink}>
              Portfolio linked: {profile.portfolioUrl}
            </a>
          )}
        </div>
      </section>

      {/* ── AI Assistant teaser ── */}
      <section className={styles.section} aria-labelledby="lumina-heading">
        <div className={styles.luminaCard}>
          <div className={styles.luminaLeft}>
            <span className={styles.luminaLabel}>LUMINA AI</span>
            <h2 id="lumina-heading" className={styles.luminaTitle}>Your content co-pilot is ready</h2>
            <p className={styles.luminaSub}>
              Get AI-written hooks, captions, and campaign drafts — personalized to your niche.
            </p>
          </div>
          <Link to="/influencer/ai-assistant">
            <Button variant="primary">Open AI Assistant →</Button>
          </Link>
        </div>
      </section>

      {/* ── Discovery Banner ── */}
      <section className={styles.discoveryBanner} aria-label="Discovery status">
        <span className={styles.discoveryPill}>{verificationLabel}</span>
        <h2 className={styles.discoveryTitle}>{discoveryTitle}</h2>
        <p className={styles.discoverySub}>
          {discoverySub}
        </p>
        <div className={styles.discoveryActions}>
          <Link to="/influencer/invitations">
            <Button variant="secondary">View Invitations</Button>
          </Link>
          <Link to="/influencer/campaigns">
            <Button variant="ghost">Browse Campaigns</Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default InfluencerDashboard;
