import { useEffect, useState } from 'react';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import { campaignsApi, collaborationsApi } from '../../services/api';
import styles from './CampaignFeed.module.css';

const CampaignItem = ({ campaign, onApply, applying }) => (
  <div className={styles.card}>
    <div className={styles.glowBg}></div>
    <div className={styles.cardHeader}>
      <div className={styles.offerLogo} style={{ background: 'var(--color-primary-variant)' }}>{campaign.logo}</div>
      <div className={styles.offerInfo}>
        <h3 className={styles.offerCampaign}>{campaign.campaign}</h3>
        <span className={styles.offerBrand}>{campaign.brand}</span>
        <div className={styles.badges}>
          {campaign.isNew && <Badge variant="primary">New</Badge>}
        </div>
      </div>
    </div>
    
    <div className={styles.offerBudget}>{campaign.budget}</div>
    <p className={styles.offerBrief}>{campaign.brief}</p>
    
    <div className={styles.cardFooter}>
      <span className={styles.offerDeadline}>📅 Applying Ends: {campaign.deadline}</span>
      <Button variant="secondary" size="sm" onClick={() => onApply(campaign.id)} disabled={applying}>
        {applying ? 'Applying...' : 'Apply Now'}
      </Button>
    </div>
  </div>
);

const PublicCampaigns = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [applyingId, setApplyingId] = useState(null);

  useEffect(() => {
    const loadCampaigns = async () => {
      setLoading(true);
      setError('');
      try {
        const result = await campaignsApi.getMatched({ page: 1, limit: 25 });
        const mapped = (result?.data || []).map((item) => ({
          id: item.id,
          brand: 'Brand Campaign',
          logo: 'BR',
          campaign: item.title,
          brief: item.brief_preview || 'No brief preview available.',
          budget: `${item.currency || 'USD'} ${Number(item.budget || 0).toLocaleString()}`,
          deadline: 'Open',
          isNew: item.status === 'ACTIVE',
        }));
        setCampaigns(mapped);
      } catch (err) {
        setError(err?.message || 'Unable to load campaigns right now.');
      } finally {
        setLoading(false);
      }
    };

    loadCampaigns();
  }, []);

  const handleApply = async (campaignId) => {
    setApplyingId(campaignId);
    setError('');
    try {
      await collaborationsApi.apply({ campaign_id: campaignId, message: 'Interested in this campaign.' });
    } catch (err) {
      setError(err?.message || 'Unable to apply for campaign.');
    } finally {
      setApplyingId(null);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Public Campaigns</h1>
          <p className={styles.sub}>Browse open campaigns from brands actively seeking creators like you.</p>
        </div>
      </div>
      {error && <p role="alert">{error}</p>}
      <div className={styles.feedGrid}>
        {loading ? (
          <div className={styles.card}><p>Loading campaigns...</p></div>
        ) : campaigns.length === 0 ? (
          <div className={styles.card}><p>No matched campaigns available right now.</p></div>
        ) : campaigns.map(c => (
          <CampaignItem key={c.id} campaign={c} onApply={handleApply} applying={applyingId === c.id} />
        ))}
      </div>
    </div>
  );
};

export default PublicCampaigns;
