import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import { apiClient, isApiError } from '../../utils/apiClient';
import styles from './Shortlist.module.css';

function formatFollowers(value) {
  const count = Number(value || 0);
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${Math.round(count / 1000)}K`;
  return String(count);
}

const Shortlist = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  const loadShortlist = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.get('/shortlists');
      setItems(response.data || []);
    } catch (err) {
      setError(isApiError(err) ? `${err.code}: ${err.message}` : 'Failed to load shortlist');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShortlist();
  }, []);

  const handleRemove = async (id) => {
    setActionMessage('');
    try {
      await apiClient.delete(`/shortlists/${id}`);
      setItems((prev) => prev.filter((item) => item.id !== id));
      setActionMessage('Removed from shortlist.');
    } catch (err) {
      if (isApiError(err)) {
        setActionMessage(`${err.code}: ${err.message}`);
      } else {
        setActionMessage('Failed to remove shortlist item.');
      }
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>My Shortlist</h1>
        <p className={styles.subtitle}>Manage your selected creators for current campaigns.</p>
      </header>

      {actionMessage && (
        <div style={{ marginBottom: '1rem' }}>
          <Card variant="glass">{actionMessage}</Card>
        </div>
      )}

      {error && (
        <div style={{ marginBottom: '1rem' }}>
          <Card variant="glass">{error}</Card>
        </div>
      )}

      <div className={styles.grid}>
        {loading ? (
          <Card variant="glass">Loading shortlist...</Card>
        ) : items.length > 0 ? (
          items.map((item) => {
            const creator = item.influencer || {};
            const stats = Array.isArray(creator.influencer_stats)
              ? creator.influencer_stats[0]
              : creator.influencer_stats || {};
            const creatorName = creator.ig_handle ? `@${creator.ig_handle}` : 'Unknown creator';
            const avatar = creatorName.replace('@', '').slice(0, 2).toUpperCase() || 'CR';

            return (
              <Card key={item.id} variant="standard" className={styles.itemCard}>
                <div className={styles.cardInfo}>
                  <div className={styles.avatar}>{avatar}</div>
                  <div className={styles.details}>
                    <h3 className={styles.name}>{creatorName}</h3>
                    <div className={styles.tags}>
                      <Badge variant="primary">{creator.niche_primary || 'General'}</Badge>
                      <Badge variant="secondary">Instagram</Badge>
                    </div>
                  </div>
                </div>
                <div className={styles.stats}>
                  <span className="micro-label">Followers</span>
                  <span className={styles.statVal}>{formatFollowers(stats.follower_count)}</span>
                </div>
                <div className={styles.actions}>
                  <Button variant="ghost" size="sm" onClick={() => handleRemove(item.id)}>Remove</Button>
                  <Button variant="primary" size="sm" disabled>Invite →</Button>
                </div>
              </Card>
            );
          })
        ) : (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>◇</span>
            <p>Your shortlist is empty.</p>
            <Button variant="primary" size="sm" onClick={() => navigate('/brand/search')}>Discover Creators</Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Shortlist;
