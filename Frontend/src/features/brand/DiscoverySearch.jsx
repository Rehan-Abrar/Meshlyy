import { useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import CircularProgress from '../../components/common/CircularProgress';
import Badge from '../../components/common/Badge';
import styles from './DiscoverySearch.module.css';

const CREATORS = [
  { id:1, name:'Zara Ahmed',     niche:'Lifestyle', platform:'Instagram', followers:'234K', engagement:'5.2%', location:'Dubai',  fit:92, avatar:'ZA' },
  { id:2, name:'Leo Kim',        niche:'Tech',      platform:'YouTube',   followers:'890K', engagement:'3.8%', location:'Seoul',  fit:87, avatar:'LK' },
  { id:3, name:'Maya Rodriguez', niche:'Fitness',   platform:'TikTok',    followers:'1.2M', engagement:'8.1%', location:'Miami',  fit:84, avatar:'MR' },
  { id:4, name:'Dev Patel',      niche:'Finance',   platform:'Instagram', followers:'156K', engagement:'4.5%', location:'London', fit:79, avatar:'DP' },
  { id:5, name:'Sophie Laurent', niche:'Fashion',   platform:'Instagram', followers:'620K', engagement:'6.3%', location:'Paris',  fit:91, avatar:'SL' },
  { id:6, name:'Aiden Park',     niche:'Gaming',    platform:'YouTube',   followers:'2.1M', engagement:'5.7%', location:'LA',     fit:76, avatar:'AP' },
];

const NICHES = ['All', 'Lifestyle', 'Tech', 'Fitness', 'Finance', 'Fashion', 'Gaming', 'Beauty'];
const PLATFORMS = ['All', 'Instagram', 'YouTube', 'TikTok', 'Twitter', 'LinkedIn'];

const CreatorResultCard = ({ creator }) => (
  <Card variant="standard" className={styles.resultCard}>
    <div className={styles.resultHeader}>
      <div className={styles.avatar}>{creator.avatar}</div>
      <div className={styles.info}>
        <h3 className={styles.name}>{creator.name}</h3>
        <div className={styles.tags}>
          <Badge variant="primary">{creator.niche}</Badge>
          <Badge variant="secondary">{creator.platform}</Badge>
        </div>
      </div>
      <CircularProgress value={creator.fit} size={64} />
    </div>

    <div className={styles.stats}>
      {[
        { l: 'FOLLOWERS', v: creator.followers },
        { l: 'ENG. RATE', v: creator.engagement },
        { l: 'LOCATION',  v: creator.location },
      ].map(({ l, v }) => (
        <div key={l} className={styles.stat}>
          <span className="micro-label">{l}</span>
          <span className={styles.statVal}>{v}</span>
        </div>
      ))}
    </div>

    <div className={styles.actions}>
      <Link to={`/brand/creator/${creator.id}`} style={{ flex: 1 }}>
        <Button variant="secondary" size="sm" fullWidth>View Profile</Button>
      </Link>
      <Button variant="primary" size="sm" style={{ flex: 1 }}>+ Shortlist</Button>
    </div>
  </Card>
);

const DiscoverySearch = () => {
  const [search, setSearch]       = useState('');
  const [niche, setNiche]         = useState('All');
  const [platform, setPlatform]   = useState('All');

  const filtered = CREATORS.filter(c => {
    const matchName     = c.name.toLowerCase().includes(search.toLowerCase());
    const matchNiche    = niche === 'All'    || c.niche === niche;
    const matchPlatform = platform === 'All' || c.platform === platform;
    return matchName && matchNiche && matchPlatform;
  });

  return (
    <div className={styles.page}>
      <aside className={styles.sidebar} aria-label="Filter sidebar">
        <h2 className={styles.sidebarTitle}>Filters</h2>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Search</label>
          <Input
            id="search"
            type="text"
            placeholder="Creator name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Niche</label>
          <div className={styles.pillGroup}>
            {NICHES.map(n => (
              <button
                key={n}
                className={`${styles.filterPill} ${niche === n ? styles.filterPillActive : ''}`}
                onClick={() => setNiche(n)}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Platform</label>
          <div className={styles.pillGroup}>
            {PLATFORMS.map(p => (
              <button
                key={p}
                className={`${styles.filterPill} ${platform === p ? styles.filterPillActive : ''}`}
                onClick={() => setPlatform(p)}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => { setSearch(''); setNiche('All'); setPlatform('All'); }}
        >
          Clear filters
        </Button>
      </aside>

      <main className={styles.results}>
        <div className={styles.resultsHeader}>
          <h1 className={styles.resultsTitle}>
            Creator Discovery
            <span className={styles.resultsCount}>{filtered.length} creators</span>
          </h1>
        </div>
        <div className={styles.grid}>
          {filtered.length > 0
            ? filtered.map(c => <CreatorResultCard key={c.id} creator={c} />)
            : <p className={styles.empty}>No creators match your filters.</p>
          }
        </div>
      </main>
    </div>
  );
};

export default DiscoverySearch;
