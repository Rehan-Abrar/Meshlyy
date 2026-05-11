import { useEffect, useState } from 'react';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Card from '../../components/common/Card';
import { apiClient, isApiError } from '../../utils/apiClient';
import styles from './CampaignFeed.module.css';

const formatBudget = (budget, currency) => {
  const amount = Number(budget || 0);
  if (!amount) return 'Budget TBD';
  return `${currency || 'USD'} ${amount.toLocaleString()}`;
};

const formatOpenedDate = (createdAt) => {
  if (!createdAt) return 'Open now';
  return `Opened ${new Date(createdAt).toLocaleDateString()}`;
};

const CampaignItem = ({ campaign, applyingCampaignId, onApply }) => {
  const isApplying = applyingCampaignId === campaign.id;
  const isApplied = Boolean(campaign._applied);

  return (
    <div className={styles.card}>
      <div className={styles.glowBg}></div>
      <div className={styles.cardHeader}>
        <div className={styles.offerLogo} style={{ background: 'var(--color-primary-variant)' }}>CP</div>
        <div className={styles.offerInfo}>
          <h3 className={styles.offerCampaign}>{campaign.title || 'Campaign'}</h3>
          <span className={styles.offerBrand}>{campaign.visibility || 'MATCHED'}</span>
          <div className={styles.badges}>
            <Badge variant="verified">{campaign.status || 'ACTIVE'}</Badge>
            {isApplied && <Badge variant="primary">Applied</Badge>}
          </div>
        </div>
      </div>

      <div className={styles.offerBudget}>{formatBudget(campaign.budget, campaign.currency)}</div>
      <p className={styles.offerBrief}>{campaign.brief_preview || 'No campaign brief provided yet.'}</p>

      <div className={styles.cardFooter}>
        <span className={styles.offerDeadline}>📅 {formatOpenedDate(campaign.created_at)}</span>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onApply(campaign.id)}
          disabled={isApplying || isApplied}
        >
          {isApplied ? 'Applied' : (isApplying ? 'Applying...' : 'Apply Now')}
        </Button>
      </div>
    </div>
  );
};

const PublicCampaigns = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [applyingCampaignId, setApplyingCampaignId] = useState('');

  useEffect(() => {
    let ignore = false;

    (async () => {
      try {
        const response = await apiClient.get('/campaigns/matched?page=1&limit=20');
        if (!ignore) {
          setCampaigns(Array.isArray(response.data) ? response.data : []);
        }
      } catch (loadError) {
        if (!ignore) {
          setError(isApiError(loadError) ? `${loadError.code}: ${loadError.message}` : 'Failed to load matched campaigns.');
          setCampaigns([]);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    })();

    return () => {
      ignore = true;
    };
  }, []);

  const handleApply = async (campaignId) => {
    setApplyingCampaignId(campaignId);
    setError('');
    setActionMessage('');

    try {
      await apiClient.post('/collaborations/apply', { campaign_id: campaignId });
      setCampaigns((prev) => prev.map((campaign) => (
        campaign.id === campaignId ? { ...campaign, _applied: true } : campaign
      )));
      setActionMessage('Application sent successfully.');
    } catch (applyError) {
      if (isApiError(applyError) && applyError.code === 'CONFLICT') {
        setCampaigns((prev) => prev.map((campaign) => (
          campaign.id === campaignId ? { ...campaign, _applied: true } : campaign
        )));
        setActionMessage('You already applied to this campaign.');
      } else {
        setError(isApiError(applyError) ? `${applyError.code}: ${applyError.message}` : 'Failed to apply to campaign.');
      }
    } finally {
      setApplyingCampaignId('');
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Public Campaigns</h1>
          <p className={styles.sub}>Browse active matched campaigns and apply directly.</p>
        </div>
      </div>

      {error && <Card variant="glass">{error}</Card>}
      {actionMessage && <Card variant="glass">{actionMessage}</Card>}

      <div className={styles.feedGrid}>
        {loading ? (
          <Card variant="glass">Loading matched campaigns...</Card>
        ) : campaigns.length > 0 ? (
          campaigns.map((campaign) => (
            <CampaignItem
              key={campaign.id}
              campaign={campaign}
              applyingCampaignId={applyingCampaignId}
              onApply={handleApply}
            />
          ))
        ) : (
          <Card variant="glass">No matched campaigns are available right now.</Card>
        )}
      </div>
    </div>
  );
};

export default PublicCampaigns;
