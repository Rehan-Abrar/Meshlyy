import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import CircularProgress from '../../components/common/CircularProgress';
import { apiClient, isApiError } from '../../utils/apiClient';
import styles from './CreatorDetailPage.module.css';

function formatFollowers(value) {
  const count = Number(value || 0);
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${Math.round(count / 1000)}K`;
  return String(count);
}

function formatEngagement(value) {
  const numeric = Number(value || 0);
  const percent = numeric <= 1 ? numeric * 100 : numeric;
  return `${percent.toFixed(1)}%`;
}

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
  const [actionMessage, setActionMessage] = useState('');
  const [shortlistLoading, setShortlistLoading] = useState(false);

  useEffect(() => {
    let ignore = false;

    (async () => {
      try {
        const data = await apiClient.get(`/creators/${id}`);
        if (!ignore) setCreator(data);
      } catch (err) {
        if (!ignore) {
          setError(isApiError(err) ? `${err.code}: ${err.message}` : 'Creator not found');
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    })();

    return () => {
      ignore = true;
    };
  }, [id]);

  const handleAddToShortlist = async () => {
    if (!creator?.id) return;
    setShortlistLoading(true);
    setActionMessage('');
    try {
      await apiClient.post('/shortlists', { influencer_id: creator.id });
      setActionMessage('Creator added to shortlist.');
    } catch (err) {
      if (isApiError(err) && err.code === 'CONFLICT') {
        setActionMessage('Creator is already shortlisted.');
      } else if (isApiError(err)) {
        setActionMessage(`${err.code}: ${err.message}`);
      } else {
        setActionMessage('Unable to add creator to shortlist.');
      }
    } finally {
      setShortlistLoading(false);
    }
  };

  const portfolioBlocks = useMemo(() => {
    const cards = creator?.rate_cards || [];
    if (cards.length > 0) {
      return cards.map((card, index) => ({
        id: `${card.service_type}-${index}`,
        title: `${card.service_type} · ${Number(card.price || 0)} ${card.currency || 'USD'}`,
      }));
    }
    return [
      { id: 'fallback-1', title: 'No rate card uploaded yet' },
      { id: 'fallback-2', title: 'Ask creator for media kit details' },
    ];
  }, [creator]);

  if (loading) {
    return <Card variant="glass">Loading creator profile...</Card>;
  }

  if (error || !creator) {
    return (
      <div className={styles.page}>
        <Card variant="glass">{error || 'Creator not found.'}</Card>
        <div style={{ marginTop: '1rem' }}>
          <Link to="/brand/search">
            <Button variant="secondary">← Back to Search</Button>
          </Link>
        </div>
      </div>
    );
  }

  const handleLabel = creator.ig_handle ? `@${creator.ig_handle}` : 'Creator';
  const nicheLabel = creator.niche_primary || 'General';
  const bioLabel = creator.bio || 'No bio available yet.';
  const fit = Math.max(40, Math.min(98, Math.round((Number(creator.engagement_rate || 0) <= 1 ? Number(creator.engagement_rate || 0) * 100 : Number(creator.engagement_rate || 0)) * 12)));

  return (
    <div className={styles.page}>
      <section className={styles.heroSection} aria-labelledby="creator-name">
        <div className={styles.heroGlow} aria-hidden="true" />
        <div className={styles.heroAvatar}>
          <div className={styles.avatarRing}>
            <div className={styles.avatar}>{handleLabel.replace('@', '').slice(0, 2).toUpperCase()}</div>
          </div>
          {creator.is_verified && (
            <div className={styles.verifiedBadge} title="Verified creator">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="8" fill="#10B981" />
                <path d="M4.5 8l2.5 2.5L11.5 5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          )}
        </div>

        <div className={styles.heroInfo}>
          <div className={styles.heroTags}>
            <Badge variant="primary">{nicheLabel}</Badge>
            <Badge variant="secondary">Instagram</Badge>
            {creator.is_verified && <Badge variant="verified" icon="✓">Verified</Badge>}
          </div>
          <h1 id="creator-name" className={styles.heroName}>{handleLabel}</h1>
          <p className={styles.heroBio}>{bioLabel}</p>
        </div>

        <div className={styles.heroScore}>
          <span className="micro-label">AI Fit Score</span>
          <CircularProgress value={fit} size={96} />
        </div>
      </section>

      {actionMessage && (
        <div style={{ marginBottom: '1rem' }}>
          <Card variant="glass">{actionMessage}</Card>
        </div>
      )}

      <StatStrip
        stats={[
          { label: 'Followers', value: formatFollowers(creator.follower_count), icon: '◎' },
          { label: 'Eng. Rate', value: formatEngagement(creator.engagement_rate), icon: '◉' },
          { label: 'Avg. Likes', value: formatFollowers(creator.avg_likes), icon: '♥' },
          { label: 'Avg. Comments', value: formatFollowers(creator.avg_comments), icon: '▶' },
        ]}
      />

      <section aria-labelledby="portfolio-heading">
        <h2 id="portfolio-heading" className={styles.sectionTitle}>Rate Card Highlights</h2>
        <div className={styles.portfolioGrid}>
          {portfolioBlocks.map((block, i) => (
            <div key={block.id} className={styles.portfolioItem} style={{ background: `rgba(186,158,255,${0.04 + i * 0.02})` }}>
              <div className={styles.portfolioOverlay}>
                <span className={styles.portfolioIcon}>▶</span>
                <span style={{ marginTop: '0.75rem', textAlign: 'center' }}>{block.title}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className={styles.ctaRow}>
        <Link to="/brand/search">
          <Button variant="secondary">← Back to Search</Button>
        </Link>
        <Button variant="primary" size="lg" onClick={handleAddToShortlist} disabled={shortlistLoading}>
          {shortlistLoading ? 'Saving...' : '+ Add to Shortlist'}
        </Button>
      </div>
    </div>
  );
};

export default CreatorDetailPage;
