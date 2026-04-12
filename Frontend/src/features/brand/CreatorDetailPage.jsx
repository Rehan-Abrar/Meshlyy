import { useParams, Link } from 'react-router-dom';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import CircularProgress from '../../components/common/CircularProgress';
import styles from './CreatorDetailPage.module.css';

const MOCK_CREATOR = {
  id: 1, name: 'Zara Ahmed', niche: 'Lifestyle', platform: 'Instagram',
  followers: '234K', engagement: '5.2%', avgLikes: '12.1K', avgViews: '89K',
  location: 'Dubai, UAE', verified: true, fit: 92, bio: 'Curating the intersection of luxury, wellness and authentic living. Partnered with 40+ global brands.',
  avatar: 'ZA', recentPosts: ['#ffffff10','#ffffff08','#ffffff10','#ffffff06','#ffffff10','#ffffff08'],
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
  const c = MOCK_CREATOR; // In production, fetch by id

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

      {/* CTA */}
      <div className={styles.ctaRow}>
        <Link to="/brand/shortlist">
          <Button variant="secondary">← Back to Search</Button>
        </Link>
        <Button variant="primary" size="lg">+ Add to Shortlist</Button>
      </div>
    </div>
  );
};

export default CreatorDetailPage;
