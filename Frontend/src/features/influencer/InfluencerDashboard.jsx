import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import { apiClient } from '../../utils/apiClient';
import styles from './InfluencerDashboard.module.css';

// Stats fetched from backend (placeholder until API wired)
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

const InfluencerDashboard = () => {
  const { user, updateUser } = useAuth();
  const [postUrl, setPostUrl] = useState('');
  const [savedPost, setSavedPost] = useState('');
  
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [editNiche, setEditNiche] = useState(user?.niche || '');
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
        const response = await apiClient.get('/influencer/dashboard');
        const data = response?.data || {};
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
        }
      } catch {
        // Keep dashboard usable with default stats when API is unavailable.
      }
    })();

    return () => {
      ignore = true;
    };
  }, []);

  const handlePostSave = () => {
    if (postUrl.trim()) {
      setSavedPost(postUrl.trim());
      setPostUrl('');
    }
  };

  const handleProfileSave = () => {
    if (updateUser) {
      updateUser({ name: editName, niche: editNiche });
    }
    setIsEditing(false);
  };

  return (
    <div className={styles.page}>

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
                placeholder="Your Niche"
                style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--glass-border)', background: 'var(--color-surface-container-high)', color: 'var(--color-on-surface)' }}
              />
              <input 
                value={editName} 
                onChange={(e) => setEditName(e.target.value)} 
                placeholder="Your Name"
                style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--glass-border)', background: 'var(--color-surface-container-high)', color: 'var(--color-on-surface)' }}
              />
            </div>
          ) : (
            <>
              <span className={styles.heroTagline}>{user?.niche || 'Lifestyle & Tech Enthusiast'}</span>
              <h1 id="influencer-name" className={styles.heroName}>{user?.name || 'Creator'}</h1>
            </>
          )}
          <p className={styles.heroBio}>
            Creating authentic content and partnering with global brands.
          </p>
          <div className={styles.heroTags}>
            <Badge variant="primary">{user?.niche || 'Lifestyle'}</Badge>
            <Badge variant="secondary">Instagram</Badge>
          </div>
        </div>
        <div className={styles.heroActions}>
          {isEditing ? (
            <Button variant="primary" onClick={handleProfileSave}>Save Profile</Button>
          ) : (
            <Button variant="secondary" onClick={() => setIsEditing(true)}>Edit Profile</Button>
          )}
          <Button variant="ghost">Media Kit</Button>
        </div>
      </section>

      {/* ── Live Stats ── */}
      <div className={styles.statStrip}>
        <StatBlock label="Followers"  value={formatNumber(stats.followerCount)} sub={`${stats.pendingInvites} pending invites`} />
        <StatBlock label="Avg Likes"  value={formatNumber(stats.avgLikes)}  sub={`${stats.acceptedCollaborations} accepted`} />
        <StatBlock label="Total Views" value={formatNumber(stats.totalViews30d)} sub="Last 30 days" />
        <StatBlock label="Engagement" value={`${stats.engagementRate.toFixed(1)}%`}  sub="Current average" />
      </div>

      {/* ── Post Latest Content ── */}
      <section className={styles.section} aria-labelledby="post-heading">
        <h2 id="post-heading" className={styles.sectionTitle}>Latest Post</h2>
        <div className={styles.postWidget}>
          <p className={styles.postDesc}>
            Share your most recent Instagram post to display on your public profile.
          </p>
          <div className={styles.postInputRow}>
            <input
              className={styles.postInput}
              type="url"
              placeholder="Paste your Instagram post URL…"
              value={postUrl}
              onChange={e => setPostUrl(e.target.value)}
              aria-label="Instagram post URL"
            />
            <Button variant="primary" onClick={handlePostSave}>Save Post</Button>
          </div>
          {savedPost && (
            <a href={savedPost} target="_blank" rel="noreferrer" className={styles.savedPostLink}>
              Post linked: {savedPost}
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
        <span className={styles.discoveryPill}>ACTIVE DISCOVERY MODE</span>
        <h2 className={styles.discoveryTitle}>Ready for Discovery</h2>
        <p className={styles.discoverySub}>
          Your profile is currently prioritized in the Meshlyy marketplace.
          Brands are browsing your portfolio in the 'Rising Talent' category.
        </p>
        <div className={styles.discoveryActions}>
          <Button variant="secondary">Update Availability</Button>
          <Button variant="ghost">Go Invisible</Button>
        </div>
      </section>
    </div>
  );
};

export default InfluencerDashboard;
