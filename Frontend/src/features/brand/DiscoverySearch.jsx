import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import CircularProgress from '../../components/common/CircularProgress';
import Select from '../../components/common/Select';
import Badge from '../../components/common/Badge';
import { apiClient, isApiError } from '../../utils/apiClient';
import styles from './DiscoverySearch.module.css';

const NICHES = ['All', 'Lifestyle', 'Tech', 'Fitness', 'Finance', 'Fashion', 'Gaming', 'Beauty'];
const SIZES = ['All', 'Nano', 'Micro', 'Mid-tier', 'Macro', 'Mega'];
const FOLLOWERS = ['All', 'Under 10K', '10K - 50K', '50K - 250K', '250K - 1M', '1M+'];
const ENGAGEMENTS = ['All', '> 2%', '> 5%', '> 10%'];

const formatNumber = (num) => {
  const value = Number(num || 0);
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${Math.round(value / 1000)}K`;
  return value.toString();
};

const normalizeEngagementPercent = (value) => {
  const numeric = Number(value || 0);
  return numeric <= 1 ? numeric * 100 : numeric;
};

const getAudienceSize = (followers) => {
  const count = Number(followers || 0);
  if (count < 10000) return 'Nano';
  if (count < 50000) return 'Micro';
  if (count < 250000) return 'Mid-tier';
  if (count < 1000000) return 'Macro';
  return 'Mega';
};

const getFollowerRange = (label) => {
  switch (label) {
    case 'Under 10K':
      return { min: 0, max: 9999 };
    case '10K - 50K':
      return { min: 10000, max: 49999 };
    case '50K - 250K':
      return { min: 50000, max: 249999 };
    case '250K - 1M':
      return { min: 250000, max: 999999 };
    case '1M+':
      return { min: 1000000, max: null };
    default:
      return { min: null, max: null };
  }
};

const CreatorResultCard = ({ creator, onShortlist, pendingShortlistId }) => {
  const followerCount = Number(creator.follower_count || 0);
  const engagement = normalizeEngagementPercent(creator.engagement_rate);
  const fit = Math.max(40, Math.min(98, Math.round(engagement * 12)));
  const handle = creator.ig_handle ? `@${creator.ig_handle}` : 'Unknown creator';
  const avatar = handle.replace('@', '').slice(0, 2).toUpperCase() || 'CR';

  return (
    <Card variant="standard" className={styles.resultCard}>
      <div className={styles.resultHeader}>
        <div className={styles.avatar}>{avatar}</div>
        <div className={styles.info}>
          <h3 className={styles.name}>{handle}</h3>
          <div className={styles.tags}>
            <Badge variant="primary">{creator.niche_primary || 'General'}</Badge>
            <Badge variant="secondary">{getAudienceSize(followerCount)}</Badge>
          </div>
        </div>
        <CircularProgress value={fit} size={64} />
      </div>

      <div className={styles.stats}>
        {[
          { l: 'FOLLOWERS', v: formatNumber(followerCount) },
          { l: 'ENG. RATE', v: `${engagement.toFixed(1)}%` },
          { l: 'PLATFORM', v: 'Instagram' },
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
        <Button
          variant="primary"
          size="sm"
          style={{ flex: 1 }}
          onClick={() => onShortlist(creator.id)}
          disabled={pendingShortlistId === creator.id}
        >
          {pendingShortlistId === creator.id ? 'Saving...' : '+ Shortlist'}
        </Button>
      </div>
    </Card>
  );
};

const DiscoverySearch = () => {
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
  const [actionMessage, setActionMessage] = useState('');
  const [pendingShortlistId, setPendingShortlistId] = useState(null);

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
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

  useEffect(() => {
    let ignore = false;

    const loadCreators = async () => {
      setLoading(true);
      setError('');

      try {
        const params = new URLSearchParams({ page: '1', limit: '100' });

        if (filters.niche !== 'All') {
          params.set('niche', filters.niche);
        }

        const followerRange = getFollowerRange(filters.followers);
        if (followerRange.min !== null) {
          params.set('follower_min', String(followerRange.min));
        }
        if (followerRange.max !== null) {
          params.set('follower_max', String(followerRange.max));
        }

        if (filters.engagement !== 'All') {
          params.set('engagement_min', filters.engagement.replace('> ', '').replace('%', ''));
        }

        const response = await apiClient.get(`/creators?${params.toString()}`);
        if (!ignore) {
          setCreators(Array.isArray(response.data) ? response.data : []);
        }
      } catch (err) {
        if (!ignore) {
          setError(isApiError(err) ? `${err.code}: ${err.message}` : 'Failed to load creators');
          setCreators([]);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadCreators();

    return () => {
      ignore = true;
    };
  }, [filters.niche, filters.followers, filters.engagement]);

  const filteredCreators = useMemo(() => {
    return creators.filter((creator) => {
      const handle = (creator.ig_handle || '').toLowerCase();
      if (filters.search && !handle.includes(filters.search.toLowerCase())) {
        return false;
      }

      if (filters.audienceSize !== 'All') {
        const size = getAudienceSize(creator.follower_count);
        if (size !== filters.audienceSize) {
          return false;
        }
      }

      return true;
    });
  }, [creators, filters.search, filters.audienceSize]);

  const hasActiveFilters = Object.values(filters).some((val) => val !== 'All' && val !== '');

  const handleShortlist = async (creatorId) => {
    setActionMessage('');
    setPendingShortlistId(creatorId);

    try {
      await apiClient.post('/shortlists', { influencer_id: creatorId });
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
      setPendingShortlistId(null);
    }
  };

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
              placeholder="Search by handle..."
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              className={styles.searchInput}
            />
          </div>

          <div className={styles.filtersRow} style={{ flexWrap: 'wrap' }}>
            <div className={styles.dropdownGroup} style={{ flex: '1 1 140px' }}>
              <Select
                id="niche-select"
                value={filters.niche}
                onChange={(e) => updateFilter('niche', e.target.value)}
                options={NICHES.map((niche) => ({ value: niche, label: niche === 'All' ? 'All Niches' : `${niche} Niche` }))}
              />
            </div>

            <div className={styles.dropdownGroup} style={{ flex: '1 1 140px' }}>
              <Select
                id="size-select"
                value={filters.audienceSize}
                onChange={(e) => updateFilter('audienceSize', e.target.value)}
                options={SIZES.map((size) => ({ value: size, label: size === 'All' ? 'All Sizes' : size }))}
              />
            </div>

            <div className={styles.dropdownGroup} style={{ flex: '1 1 140px' }}>
              <Select
                id="followers-select"
                value={filters.followers}
                onChange={(e) => updateFilter('followers', e.target.value)}
                options={FOLLOWERS.map((followers) => ({
                  value: followers,
                  label: followers === 'All' ? 'Any Follower Count' : followers,
                }))}
              />
            </div>

            <div className={styles.dropdownGroup} style={{ flex: '1 1 140px' }}>
              <Select
                id="eng-select"
                value={filters.engagement}
                onChange={(e) => updateFilter('engagement', e.target.value)}
                options={ENGAGEMENTS.map((engagement) => ({
                  value: engagement,
                  label: engagement === 'All' ? 'Any Engagement' : `Eng: ${engagement}`,
                }))}
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

      {actionMessage && <Card variant="glass">{actionMessage}</Card>}
      {error && <Card variant="glass">{error}</Card>}

      <main className={styles.results}>
        <div className={styles.grid}>
          {loading ? (
            <Card variant="glass">Loading creators...</Card>
          ) : filteredCreators.length > 0 ? (
            filteredCreators.map((creator) => (
              <CreatorResultCard
                key={creator.id}
                creator={creator}
                onShortlist={handleShortlist}
                pendingShortlistId={pendingShortlistId}
              />
            ))
          ) : (
            <div className={styles.emptyState}>
              <span className={styles.emptyIcon}>🔍</span>
              <p>No creators matched your detailed filtering criteria.</p>
              <Button variant="primary" size="sm" onClick={clearFilters}>Clear All Filters</Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default DiscoverySearch;
