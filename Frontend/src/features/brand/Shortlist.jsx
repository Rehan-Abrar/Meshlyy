import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import { campaignsApi, collaborationsApi, shortlistsApi } from '../../services/api';
import styles from './Shortlist.module.css';

const Shortlist = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingId, setProcessingId] = useState(null);

  const loadShortlist = async (campaignId = '') => {
    setLoading(true);
    setError('');
    try {
      const [shortlistResult, campaignResult] = await Promise.all([
        shortlistsApi.list(campaignId || undefined),
        campaignsApi.list({ page: 1, limit: 50 }),
      ]);

      setCampaigns(campaignResult?.data || []);
      setItems(shortlistResult?.data || []);
    } catch (err) {
      setError(err?.message || 'Unable to load shortlist.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShortlist(selectedCampaign);
  }, [selectedCampaign]);

  const mappedItems = useMemo(() => {
    return items.map((item) => {
      const influencer = item.influencer || {};
      const stats = Array.isArray(influencer.influencer_stats)
        ? influencer.influencer_stats[0]
        : influencer.influencer_stats || {};
      const handle = `@${String(influencer.ig_handle || 'creator').replace(/^@/, '')}`;
      return {
        id: item.id,
        influencerId: influencer.id,
        shortlistCampaignId: item.campaign_id,
        name: handle,
        niche: influencer.niche_primary || 'General',
        platform: 'Instagram',
        followers: stats.follower_count || 0,
        avatar: handle.replace('@', '').slice(0, 2).toUpperCase() || 'CR',
      };
    });
  }, [items]);

  const handleRemove = async (id) => {
    setProcessingId(id);
    setError('');
    try {
      await shortlistsApi.remove(id);
      setItems((current) => current.filter((item) => item.id !== id));
    } catch (err) {
      setError(err?.message || 'Unable to remove shortlist item.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleInvite = async (item) => {
    if (!selectedCampaign) {
      setError('Please select a campaign before inviting creators.');
      return;
    }

    setProcessingId(item.id);
    setError('');
    try {
      await collaborationsApi.sendInvite({
        campaign_id: selectedCampaign,
        influencer_id: item.influencerId,
        message: `Invitation sent from shortlist on ${new Date().toLocaleDateString()}.`,
      });
    } catch (err) {
      setError(err?.message || 'Unable to send invite.');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>My Shortlist</h1>
        <p className={styles.subtitle}>Manage your selected creators for current campaigns.</p>
      </header>

      <div style={{ marginBottom: '1rem' }}>
        <label htmlFor="campaign-select" className="micro-label">Campaign for invite</label>
        <select
          id="campaign-select"
          value={selectedCampaign}
          onChange={(e) => setSelectedCampaign(e.target.value)}
          className={styles.statVal}
          style={{ width: '100%', marginTop: '0.5rem' }}
        >
          <option value="">All Shortlisted Creators</option>
          {campaigns.map((campaign) => (
            <option key={campaign.id} value={campaign.id}>{campaign.title}</option>
          ))}
        </select>
      </div>

      {error && <p role="alert">{error}</p>}

      <div className={styles.grid}>
        {loading ? (
          <div className={styles.emptyState}><p>Loading shortlist...</p></div>
        ) : mappedItems.length > 0 ? (
          mappedItems.map(creator => (
            <Card key={creator.id} variant="standard" className={styles.itemCard}>
              <div className={styles.cardInfo}>
                <div className={styles.avatar}>{creator.avatar}</div>
                <div className={styles.details}>
                  <h3 className={styles.name}>{creator.name}</h3>
                  <div className={styles.tags}>
                    <Badge variant="primary">{creator.niche}</Badge>
                    <Badge variant="secondary">{creator.platform}</Badge>
                  </div>
                </div>
              </div>
              <div className={styles.stats}>
                <span className="micro-label">Followers</span>
                <span className={styles.statVal}>{creator.followers}</span>
              </div>
              <div className={styles.actions}>
                <Button variant="ghost" size="sm" onClick={() => handleRemove(creator.id)} disabled={processingId === creator.id}>Remove</Button>
                <Button variant="primary" size="sm" onClick={() => handleInvite(creator)} disabled={processingId === creator.id}>
                  {processingId === creator.id ? 'Working...' : 'Invite →'}
                </Button>
              </div>
            </Card>
          ))
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
