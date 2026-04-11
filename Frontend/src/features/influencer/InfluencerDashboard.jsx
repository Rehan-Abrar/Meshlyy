import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import styles from './InfluencerDashboard.module.css';

// Stats fetched from backend (placeholder until API wired)
const StatBlock = ({ label, value, sub, icon }) => (
  <div className={styles.statBlock}>
    <span className={styles.statValue}>{value}</span>
    {sub && <span className={styles.statSub}>{sub}</span>}
    <span className="micro-label">{label}</span>
  </div>
);

const InfluencerDashboard = () => {
  const { user } = useAuth();
  const [postUrl, setPostUrl] = useState('');
  const [savedPost, setSavedPost] = useState('');

  const handlePostSave = () => {
    if (postUrl.trim()) {
      setSavedPost(postUrl.trim());
      setPostUrl('');
    }
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
          <span className={styles.heroTagline}>{user?.niche || 'Lifestyle & Tech Enthusiast'}</span>
          <h1 id="influencer-name" className={styles.heroName}>{user?.name || 'Creator'}</h1>
          <p className={styles.heroBio}>
            Creating authentic content and partnering with global brands.
          </p>
          <div className={styles.heroTags}>
            <Badge variant="primary">{user?.niche || 'Lifestyle'}</Badge>
            <Badge variant="secondary">Instagram</Badge>
          </div>
        </div>
        <div className={styles.heroActions}>
          <Link to="/influencer/profile">
            <Button variant="secondary">✏ Edit Profile</Button>
          </Link>
          <Button variant="ghost">↗ Media Kit</Button>
        </div>
      </section>

      {/* ── Live Stats — placeholder, wired to GET /api/v1/influencer/stats ── */}
      <div className={styles.statStrip}>
        <StatBlock label="Followers"  value={user?.audience || '—'} sub="+12.4% ↑" />
        <StatBlock label="Avg Likes"  value="—"  sub="Pending sync" />
        <StatBlock label="Total Views" value="—" sub="Last 30 days" />
        <StatBlock label="Engagement" value="—"  sub="Pending sync" />
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
              ✔ Post linked: {savedPost}
            </a>
          )}
        </div>
      </section>

      {/* ── AI Assistant teaser ── */}
      <section className={styles.section} aria-labelledby="lumina-heading">
        <div className={styles.luminaCard}>
          <div className={styles.luminaLeft}>
            <span className={styles.luminaLabel}>✦ LUMINA AI</span>
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
        <span className={styles.discoveryPill}>● ACTIVE DISCOVERY MODE</span>
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
