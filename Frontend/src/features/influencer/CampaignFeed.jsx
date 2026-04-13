import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Card from '../../components/common/Card';
import { apiClient, isApiError } from '../../utils/apiClient';
import styles from './CampaignFeed.module.css';

const formatBudget = (budget, currency) => {
  const value = Number(budget || 0);
  if (!value) return 'TBD';
  return `${currency || 'USD'} ${value.toLocaleString()}`;
};

const OfferItem = ({ offer }) => {
  const campaign = offer.campaign || {};
  const brand = offer.brand || {};
  const brandName = brand.company_name || 'Brand Invite';
  const logo = brandName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'BR';
  const receivedAt = offer.created_at
    ? new Date(offer.created_at).toLocaleDateString()
    : 'Recently';

  return (
    <div className={styles.card}>
      <div className={styles.glowBg}></div>
      <div className={styles.cardHeader}>
        <div className={styles.offerLogo}>{logo}</div>
        <div className={styles.offerInfo}>
          <h3 className={styles.offerCampaign}>{campaign.title || 'Campaign invitation'}</h3>
          <span className={styles.offerBrand}>{brandName}</span>
          <div className={styles.badges}>
            <Badge variant="verified">{offer.status || 'PENDING'}</Badge>
          </div>
        </div>
      </div>

      <div className={styles.offerBudget}>{formatBudget(campaign.budget, campaign.currency)}</div>
      <p className={styles.offerBrief}>{campaign.brief_preview || offer.message || 'No brief provided yet.'}</p>

      <div className={styles.cardFooter}>
        <span className={styles.offerDeadline}>🕒 Received: {receivedAt}</span>
        <Link to={`/influencer/invitations/${offer.id}`}>
          <Button variant="primary" size="sm">Review Offer</Button>
        </Link>
      </div>
    </div>
  );
};

const CampaignFeed = () => {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;

    (async () => {
      try {
        const response = await apiClient.get('/collaborations/incoming');
        if (!ignore) {
          setOffers(Array.isArray(response.data) ? response.data : []);
        }
      } catch (err) {
        if (!ignore) {
          setError(isApiError(err) ? `${err.code}: ${err.message}` : 'Failed to load invitations');
          setOffers([]);
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

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Direct Invitations</h1>
          <p className={styles.sub}>Exclusive brand offers matched directly to your profile. No cold pitching needed.</p>
        </div>
      </div>

      {error && <Card variant="glass">{error}</Card>}

      <div className={styles.feedGrid}>
        {loading ? (
          <Card variant="glass">Loading invitations...</Card>
        ) : offers.length > 0 ? (
          offers.map((offer) => <OfferItem key={offer.id} offer={offer} />)
        ) : (
          <Card variant="glass">No invitations yet. Check back soon.</Card>
        )}
      </div>
    </div>
  );
};

export default CampaignFeed;
