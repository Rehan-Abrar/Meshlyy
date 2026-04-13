import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import CircularProgress from '../../components/common/CircularProgress';
import Select from '../../components/common/Select';
import Badge from '../../components/common/Badge';
import { creatorsApi, shortlistsApi } from '../../services/api';
import { addDemoShortlistId, isDemoAuthMode } from '../../services/demoData';
import styles from './DiscoverySearch.module.css';

const NICHES = ['All', 'Lifestyle', 'Tech', 'Fitness', 'Finance', 'Fashion', 'Gaming', 'Beauty'];
const SIZES = ['All', 'Nano', 'Micro', 'Mid-tier', 'Macro', 'Mega'];
const FOLLOWERS = ['All', 'Under 10K', '10K - 50K', '50K - 250K', '250K - 1M', '1M+'];
const ENGAGEMENTS = ['All', '> 2%', '> 5%', '> 10%'];

// Helper to format large numbers
const formatNumber = (num) => {
  if (!Number.isFinite(num)) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(0) + 'K';
  return num.toString();
};

const CreatorResultCard = ({ creator, onShortlist, shortlisting }) => (
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
        { l: 'VERIFIED',  v: creator.verified ? 'Yes' : 'No' },
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
      <Button variant="primary" size="sm" style={{ flex: 1 }} onClick={() => onShortlist(creator.id)} disabled={shortlisting}>
        {shortlisting ? 'Saving...' : '+ Shortlist'}
      </Button>
    </div>
  </Card>
);

const sizeFromFollowers = (followers) => {
  if (followers < 10000) return 'Nano';
  if (followers < 50000) return 'Micro';
  if (followers < 250000) return 'Mid-tier';
  if (followers < 1000000) return 'Macro';
  return 'Mega';
};

const followerRangeToQuery = (value) => {
  switch (value) {
    case 'Under 10K': return { follower_min: 0, follower_max: 9999 };
    case '10K - 50K': return { follower_min: 10000, follower_max: 49999 };
    case '50K - 250K': return { follower_min: 50000, follower_max: 249999 };
    case '250K - 1M': return { follower_min: 250000, follower_max: 999999 };
    case '1M+': return { follower_min: 1000000 };
    default: return {};
  }
};

const engagementToQuery = (value) => {
  if (value === 'All') return {};
  const numeric = Number(value.replace('> ', '').replace('%', ''));
  return Number.isFinite(numeric) ? { engagement_min: numeric } : {};
};

const mapCreator = (creator) => {
  const handle = creator.ig_handle ? `@${creator.ig_handle.replace(/^@/, '')}` : 'Creator';
  const followers = creator.follower_count || 0;
  const engagement = creator.engagement_rate || 0;

  return {
    id: creator.id,
    name: handle,
    niche: creator.niche_primary || 'General',
    followers,
    engagement,
    fit: Math.max(50, Math.min(99, Math.round((engagement * 10) + 40))),
    avatar: handle.replace('@', '').slice(0, 2).toUpperCase() || 'CR',
    size: sizeFromFollowers(followers),
    verified: !!creator.is_verified,
  };
};

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
  const [creators, setCreators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [shortlistingId, setShortlistingId] = useState(null);

  const loadCreators = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const query = {
        ...(filters.niche !== 'All' ? { niche: filters.niche } : {}),
        ...followerRangeToQuery(filters.followers),
        ...engagementToQuery(filters.engagement),
        page: 1,
        limit: 50,
      };

      const result = await creatorsApi.discover(query);
      setCreators((result?.data || []).map(mapCreator));
    } catch (err) {
      setCreators([]);
      setError(err?.message || 'Unable to load creators right now.');
    } finally {
      setLoading(false);
    }
  }, [filters.niche, filters.followers, filters.engagement]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadCreators();
    }, 200);

    return () => clearTimeout(timeout);
  }, [loadCreators]);

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

  const filteredCreators = useMemo(() => {
    return creators.filter(c => {
      if (filters.search && !c.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
      if (filters.niche !== 'All' && c.niche !== filters.niche) return false;
      if (filters.audienceSize !== 'All' && c.size !== filters.audienceSize) return false;
      return true;
    });
  }, [creators, filters]);

  const handleShortlist = async (creatorId) => {
    setShortlistingId(creatorId);
    try {
      if (isDemoAuthMode()) {
        addDemoShortlistId(creatorId);
        return;
      }

      await shortlistsApi.add({ influencer_id: creatorId });
      await loadCreators();
    } catch (err) {
      setError(err?.message || 'Unable to add creator to shortlist.');
    } finally {
      setShortlistingId(null);
    }
  };

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
        {error && (
          <div className={styles.emptyState} role="alert">
            <p>{error}</p>
            <Button variant="secondary" size="sm" onClick={loadCreators}>Retry</Button>
          </div>
        )}
        <div className={styles.grid}>
          {loading
            ? <div className={styles.emptyState}><p>Loading creators...</p></div>
            : filteredCreators.length > 0
            ? filteredCreators.map(c => (
                <CreatorResultCard
                  key={c.id}
                  creator={c}
                  onShortlist={handleShortlist}
                  shortlisting={shortlistingId === c.id}
                />
              ))
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
