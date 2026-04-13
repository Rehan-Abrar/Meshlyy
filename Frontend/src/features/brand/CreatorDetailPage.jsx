import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import CircularProgress from '../../components/common/CircularProgress';
import { creatorsApi, shortlistsApi } from '../../services/api';
import styles from './CreatorDetailPage.module.css';

const formatNumber = (num) => {
  if (!Number.isFinite(num)) return '0';
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${Math.round(num / 1000)}K`;
  return String(num);
};

const StatStrip = ({ stats }) => (
  <div className={styles.statStrip}>
    {stats.map(({ label, value, icon }) => (
      <div key={label} className={styles.statBlock}>
        <span className={styles.statIcon}>{icon}</span>
        <span className={styles.statValue}>{value}</span>
        <span className="micro-label">{label}</span>
      </div>
    ))}
  </div>
);

const CreatorDetailPage = () => {
  const { id } = useParams();
  const [creator, setCreator] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadCreator = async () => {
      if (!id) return;
      setLoading(true);
      setError('');
      try {
        const result = await creatorsApi.getDetail(id);
        setCreator(result);
      } catch (err) {
        setError(err?.message || 'Failed to load creator profile.');
      } finally {
        setLoading(false);
      }
    };

    loadCreator();
  }, [id]);

  const c = useMemo(() => {
    if (!creator) return null;
    const handle = creator.ig_handle ? `@${creator.ig_handle.replace(/^@/, '')}` : 'Creator';
    const stats = creator.influencer_stats || {};
    const followers = stats.follower_count || 0;
    const engagement = stats.engagement_rate || 0;
    return {
      id: creator.id,
      name: handle,
      niche: creator.niche_primary || 'General',
      platform: 'Instagram',
      followers: formatNumber(followers),
      engagement: `${engagement}%`,
      avgLikes: formatNumber(stats.avg_likes || 0),
      avgViews: formatNumber((stats.avg_likes || 0) * 4),
      location: creator.country || 'Global',
      verified: !!creator.is_verified,
      fit: Math.max(50, Math.min(99, Math.round((engagement * 10) + 40))),
      bio: creator.bio || 'No bio available yet.',
      avatar: handle.replace('@', '').slice(0, 2).toUpperCase() || 'CR',
      recentPosts: [1, 2, 3, 4, 5, 6],
      rateCards: creator.rate_cards || [],
    };
  }, [creator]);

  const handleShortlist = async () => {
    if (!c?.id) return;
    setSaving(true);
    setError('');
    try {
      await shortlistsApi.add({ influencer_id: c.id });
    } catch (err) {
      setError(err?.message || 'Unable to add creator to shortlist.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className={styles.page}><p>Loading creator profile...</p></div>;
  }

  if (error && !c) {
    return (
      <div className={styles.page}>
        <p>{error}</p>
        <Link to="/brand/search">
          <Button variant="secondary">Back to Search</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Identity Hero */}
      <section className={styles.heroSection} aria-labelledby="creator-name">
        <div className={styles.heroGlow} aria-hidden="true" />
        <div className={styles.heroAvatar}>
          <div className={styles.avatarRing}>
            <div className={styles.avatar}>{c.avatar}</div>
          </div>
          {c.verified && (
            <div className={styles.verifiedBadge} title="Verified creator">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="8" fill="#10B981"/>
                <path d="M4.5 8l2.5 2.5L11.5 5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          )}
        </div>

        <div className={styles.heroInfo}>
          <div className={styles.heroTags}>
            <Badge variant="primary">{c.niche}</Badge>
            <Badge variant="secondary">{c.platform}</Badge>
            {c.verified && <Badge variant="verified" icon="✓">Verified</Badge>}
          </div>
          <h1 id="creator-name" className={styles.heroName}>{c.name}</h1>
          <p className={styles.heroBio}>{c.bio}</p>
          <p className={styles.heroLocation}>📍 {c.location}</p>
        </div>

        <div className={styles.heroScore}>
          <span className="micro-label">AI Fit Score</span>
          <CircularProgress value={c.fit} size={96} />
        </div>
      </section>

      {/* Live Stats Strip */}
      <StatStrip stats={[
        { label: 'Followers',   value: c.followers,   icon: '◎' },
        { label: 'Eng. Rate',   value: c.engagement,  icon: '◉' },
        { label: 'Avg. Likes',  value: c.avgLikes,    icon: '♥' },
        { label: 'Avg. Views',  value: c.avgViews,    icon: '▶' },
      ]} />

      {/* Portfolio Grid */}
      <section aria-labelledby="portfolio-heading">
        <h2 id="portfolio-heading" className={styles.sectionTitle}>Recent Content</h2>
        <div className={styles.portfolioGrid}>
          {c.recentPosts.map((bg, i) => (
            <div key={i} className={styles.portfolioItem} style={{ background: `rgba(186,158,255,${0.04 + i * 0.02})` }}>
              <div className={styles.portfolioOverlay}>
                <span className={styles.portfolioIcon}>▶</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="rates-heading" className={styles.sectionTitle}>
        <h2 id="rates-heading" className={styles.sectionTitle}>Rate Cards</h2>
        {c.rateCards.length === 0 ? (
          <p>No rate card data available yet.</p>
        ) : (
          <div className={styles.statStrip}>
            {c.rateCards.map((rate) => (
              <div key={`${rate.service_type}-${rate.id || rate.price}`} className={styles.statBlock}>
                <span className={styles.statValue}>{rate.currency} {rate.price}</span>
                <span className="micro-label">{rate.service_type}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* CTA */}
      <div className={styles.ctaRow}>
        <Link to="/brand/search">
          <Button variant="secondary">← Back to Search</Button>
        </Link>
        <Button variant="primary" size="lg" onClick={handleShortlist} disabled={saving}>
          {saving ? 'Saving...' : '+ Add to Shortlist'}
        </Button>
      </div>
      {error && <p role="alert">{error}</p>}
    </div>
  );
};

export default CreatorDetailPage;
