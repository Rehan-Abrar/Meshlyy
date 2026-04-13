import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import { campaignsApi } from '../../services/api';
import { isDemoAuthMode } from '../../services/demoData';
import { getDemoCampaigns, getVisibleDemoCampaigns } from '../../services/demoCampaigns';
import styles from './BrandCampaigns.module.css';

const formatBudget = (campaign) => {
  const budget = Number(campaign.budget || 0);
  const currency = campaign.currency || 'USD';
  return `${currency} ${budget.toLocaleString()}`;
};

const formatCreatedAt = (campaign) => {
  if (!campaign.created_at) return 'Recently';
  return new Date(campaign.created_at).toLocaleDateString();
};

const CampaignCard = ({ campaign }) => (
  <Card variant="standard" className={styles.card}>
    <div className={styles.cardHeader}>
      <div>
        <h3 className={styles.cardTitle}>{campaign.title}</h3>
        <p className={styles.cardMeta}>{campaign.brief_preview || 'No brief preview available.'}</p>
      </div>
      <Badge variant={campaign.status === 'ACTIVE' ? 'verified' : 'secondary'}>{campaign.status || 'DRAFT'}</Badge>
    </div>

    <div className={styles.metaRow}>
      <Badge variant={campaign.visibility === 'PUBLIC' ? 'primary' : 'secondary'}>
        {campaign.visibility || 'MATCHED'}
      </Badge>
      <Badge variant="secondary">Budget: {formatBudget(campaign)}</Badge>
      <Badge variant="secondary">Created {formatCreatedAt(campaign)}</Badge>
    </div>
  </Card>
);

const BrandCampaigns = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadCampaigns = async () => {
    setLoading(true);
    setError('');

    try {
      if (isDemoAuthMode()) {
        setCampaigns(getDemoCampaigns());
        return;
      }

      const result = await campaignsApi.list({ page: 1, limit: 50 });
      setCampaigns(result?.data || []);
    } catch (err) {
      if (isDemoAuthMode()) {
        setCampaigns(getVisibleDemoCampaigns());
      } else {
        setError(err?.message || 'Unable to load campaigns right now.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  const stats = useMemo(() => {
    const active = campaigns.filter((campaign) => campaign.status === 'ACTIVE').length;
    const publicCount = campaigns.filter((campaign) => campaign.visibility === 'PUBLIC').length;
    const matchedCount = campaigns.filter((campaign) => campaign.visibility !== 'PUBLIC').length;
    return { active, publicCount, matchedCount };
  }, [campaigns]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>My Campaigns</h1>
          <p className={styles.subtitle}>All campaigns launched by your brand.</p>
        </div>
        <Link to="/brand/campaigns/new">
          <Button variant="primary">+ New Campaign</Button>
        </Link>
      </div>

      <div className={styles.summaryGrid}>
        <Card variant="container" className={styles.summaryCard}>
          <p className={styles.summaryValue}>{stats.active}</p>
          <p className={styles.summaryLabel}>Active campaigns</p>
        </Card>
        <Card variant="container" className={styles.summaryCard}>
          <p className={styles.summaryValue}>{stats.publicCount}</p>
          <p className={styles.summaryLabel}>Public campaigns</p>
        </Card>
        <Card variant="container" className={styles.summaryCard}>
          <p className={styles.summaryValue}>{stats.matchedCount}</p>
          <p className={styles.summaryLabel}>Matched-only campaigns</p>
        </Card>
      </div>

      {error && <p role="alert">{error}</p>}

      <div className={styles.grid}>
        {loading ? (
          <div className={styles.emptyState}>Loading campaigns...</div>
        ) : campaigns.length === 0 ? (
          <div className={styles.emptyState}>
            No campaigns yet. Launch your first campaign to start discovery.
          </div>
        ) : (
          campaigns.map((campaign) => <CampaignCard key={campaign.id} campaign={campaign} />)
        )}
      </div>
    </div>
  );
};

export default BrandCampaigns;
