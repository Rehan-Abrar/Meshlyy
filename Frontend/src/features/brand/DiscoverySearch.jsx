import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import CircularProgress from '../../components/common/CircularProgress';
import Select from '../../components/common/Select';
import Badge from '../../components/common/Badge';
import styles from './DiscoverySearch.module.css';

// Using raw numbers for robust backend-ready sorting/filtering
const CREATORS = [
  { id:1, name:'Zara Ahmed',     niche:'Lifestyle', followers:234000,  engagement:5.2, location:'Dubai',  fit:92, avatar:'ZA', size:'Mid-tier' },
  { id:2, name:'Leo Kim',        niche:'Tech',      followers:890000,  engagement:3.8, location:'Seoul',  fit:87, avatar:'LK', size:'Macro' },
  { id:3, name:'Maya Rodriguez', niche:'Fitness',   followers:1200000, engagement:8.1, location:'Miami',  fit:84, avatar:'MR', size:'Mega' },
  { id:4, name:'Dev Patel',      niche:'Finance',   followers:156000,  engagement:4.5, location:'London', fit:79, avatar:'DP', size:'Mid-tier' },
  { id:5, name:'Sophie Laurent', niche:'Fashion',   followers:620000,  engagement:6.3, location:'Paris',  fit:91, avatar:'SL', size:'Macro' },
  { id:6, name:'Aiden Park',     niche:'Gaming',    followers:2100000, engagement:5.7, location:'LA',     fit:76, avatar:'AP', size:'Mega' },
  { id:7, name:'Ali Hassan',     niche:'Tech',      followers:45000,   engagement:11.2,location:'Lahore', fit:96, avatar:'AH', size:'Micro' },
  { id:8, name:'Elena Rust',     niche:'Beauty',    followers:8500,    engagement:14.5,location:'Berlin', fit:88, avatar:'ER', size:'Nano' },
];

const NICHES = ['All', 'Lifestyle', 'Tech', 'Fitness', 'Finance', 'Fashion', 'Gaming', 'Beauty'];
const SIZES = ['All', 'Nano', 'Micro', 'Mid-tier', 'Macro', 'Mega'];
const FOLLOWERS = ['All', 'Under 10K', '10K - 50K', '50K - 250K', '250K - 1M', '1M+'];
const ENGAGEMENTS = ['All', '> 2%', '> 5%', '> 10%'];

// Helper to format large numbers
const formatNumber = (num) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(0) + 'K';
  return num.toString();
};

const CreatorResultCard = ({ creator }) => (
  <Card variant="standard" className={styles.resultCard}>
    <div className={styles.resultHeader}>
      <div className={styles.avatar}>{creator.avatar}</div>
      <div className={styles.info}>
        <h3 className={styles.name}>{creator.name}</h3>
        <div className={styles.tags}>
          <Badge variant="primary">{creator.niche}</Badge>
          <Badge variant="secondary">{creator.size}</Badge>
        </div>
      </div>
      <CircularProgress value={creator.fit} size={64} />
    </div>

    <div className={styles.stats}>
      {[
        { l: 'FOLLOWERS', v: formatNumber(creator.followers) },
        { l: 'ENG. RATE', v: `${creator.engagement}%` },
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
  // Unified robust state object for future backend payload mapping
  const [filters, setFilters] = useState({
    search: '',
    niche: 'All',
    audienceSize: 'All',
    followers: 'All',
    engagement: 'All',
  });
  const [showFilters, setShowFilters] = useState(false);

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      niche: 'All',
      audienceSize: 'All',
      followers: 'All',
      engagement: 'All',
    });
    setShowFilters(false);
  };

  // Robust client-side filtering mirroring backend logic
  const filteredCreators = useMemo(() => {
    return CREATORS.filter(c => {
      // 1. Name Match
      if (filters.search && !c.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
      
      // 2. Niche Match
      if (filters.niche !== 'All' && c.niche !== filters.niche) return false;

      // 3. Audience Size Class Match
      if (filters.audienceSize !== 'All' && c.size !== filters.audienceSize) return false;

      // 4. Followers Count Match
      if (filters.followers !== 'All') {
        const rules = {
          'Under 10K':  c.followers < 10000,
          '10K - 50K':  c.followers >= 10000 && c.followers < 50000,
          '50K - 250K': c.followers >= 50000 && c.followers < 250000,
          '250K - 1M':  c.followers >= 250000 && c.followers < 1000000,
          '1M+':        c.followers >= 1000000,
        };
        if (!rules[filters.followers]) return false;
      }

      // 5. Engagement Match
      if (filters.engagement !== 'All') {
        const engValue = parseFloat(filters.engagement.replace('> ', '').replace('%', ''));
        if (c.engagement <= engValue) return false;
      }

      return true;
    });
  }, [filters]);

  const hasActiveFilters = Object.values(filters).some(val => val !== 'All' && val !== '');

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.titleArea}>
          <h1 className={styles.resultsTitle}>
            Instagram Creators
            <span className={styles.resultsCount}>{filteredCreators.length} results</span>
          </h1>
          <Button 
            variant="secondary" 
            size="sm" 
            className={styles.mobileFilterToggle}
            onClick={() => setShowFilters(!showFilters)}
          >
            {showFilters ? '✕ Close Filters' : '🔍 Filter & Search'}
          </Button>
        </div>

        <div className={`${styles.filterBar} ${showFilters ? styles.filterBarActive : ''}`}>
          <div className={styles.searchGroup}>
            <Input
              id="search"
              type="text"
              placeholder="Search by name..."
              value={filters.search}
              onChange={e => updateFilter('search', e.target.value)}
              className={styles.searchInput}
            />
          </div>

          <div className={styles.filtersRow} style={{ flexWrap: 'wrap' }}>
            <div className={styles.dropdownGroup} style={{ flex: '1 1 140px' }}>
              <Select
                id="niche-select"
                value={filters.niche}
                onChange={e => updateFilter('niche', e.target.value)}
                options={NICHES.map(n => ({ value: n, label: n + (n === 'All' ? '' : ' Niche') }))}
              />
            </div>

            <div className={styles.dropdownGroup} style={{ flex: '1 1 140px' }}>
              <Select
                id="size-select"
                value={filters.audienceSize}
                onChange={e => updateFilter('audienceSize', e.target.value)}
                options={SIZES.map(s => ({ value: s, label: s === 'All' ? 'All Sizes' : s }))}
              />
            </div>
            
            <div className={styles.dropdownGroup} style={{ flex: '1 1 140px' }}>
              <Select
                id="followers-select"
                value={filters.followers}
                onChange={e => updateFilter('followers', e.target.value)}
                options={FOLLOWERS.map(f => ({ value: f, label: f === 'All' ? 'Any Follower Count' : f }))}
              />
            </div>

            <div className={styles.dropdownGroup} style={{ flex: '1 1 140px' }}>
              <Select
                id="eng-select"
                value={filters.engagement}
                onChange={e => updateFilter('engagement', e.target.value)}
                options={ENGAGEMENTS.map(e => ({ value: e, label: e === 'All' ? 'Any Engagement' : `Eng: ${e}` }))}
              />
            </div>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} style={{ minWidth: '100px' }}>
                Clear All
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className={styles.results}>
        <div className={styles.grid}>
          {filteredCreators.length > 0
            ? filteredCreators.map(c => <CreatorResultCard key={c.id} creator={c} />)
            : <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>🔍</span>
                <p>No creators matched your detailed filtering criteria.</p>
                <Button variant="primary" size="sm" onClick={clearFilters}>Clear All Filters</Button>
              </div>
          }
        </div>
      </main>
    </div>
  );
};

export default DiscoverySearch;
