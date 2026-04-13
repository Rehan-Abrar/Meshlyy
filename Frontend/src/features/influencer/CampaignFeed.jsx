import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import { collaborationsApi } from '../../services/api';
import styles from './CampaignFeed.module.css';

const formatMoney = (budget, currency) => {
  if (!Number.isFinite(Number(budget))) return 'Budget not specified';
  return `${currency || 'USD'} ${Number(budget).toLocaleString()}`;
};

const OfferItem = ({ offer }) => (
  <div className={styles.card}>
    <div className={styles.glowBg}></div>
    <div className={styles.cardHeader}>
      <div className={styles.offerLogo}>{offer.logo}</div>
      <div className={styles.offerInfo}>
        <h3 className={styles.offerCampaign}>{offer.campaign}</h3>
        <span className={styles.offerBrand}>{offer.brand}</span>
        <div className={styles.badges}>
          <Badge variant="verified">{offer.match}% match</Badge>
        </div>
      </div>
    </div>
    
    <div className={styles.offerBudget}>{offer.budget}</div>
    <p className={styles.offerBrief}>{offer.brief}</p>
    
    <div className={styles.cardFooter}>
      <span className={styles.offerDeadline}>📅 Deadline: {offer.deadline}</span>
      <Link to={`/influencer/invitations/${offer.id}`} state={{ offer }}>
        <Button variant="primary" size="sm">Review Offer</Button>
      </Link>
    </div>
  </div>
);

const CampaignFeed = () => {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadOffers = async () => {
      setLoading(true);
      setError('');
      try {
        const result = await collaborationsApi.getIncoming();
        const mapped = (result?.data || []).map((item) => {
          const campaign = item.campaign || {};
          return {
            id: item.id,
            brand: 'Brand Invite',
            logo: 'BR',
            campaign: campaign.title || 'Campaign Invite',
            brief: campaign.brief_preview || item.message || 'You have received a collaboration invite.',
            budget: formatMoney(campaign.budget, campaign.currency),
            deadline: 'Open',
            match: 80,
            campaignId: campaign.id,
            status: item.status,
          };
        });
        setOffers(mapped);
      } catch (err) {
        setOffers([]);
        setError(err?.message || 'Unable to load invitations right now.');
      } finally {
        setLoading(false);
      }
    };

    loadOffers();
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Direct Invitations</h1>
          <p className={styles.sub}>Exclusive brand offers matched directly to your profile. No cold pitching needed.</p>
        </div>
      </div>
      {error && <p role="alert">{error}</p>}
      {loading ? (
        <div className={styles.feedGrid}><p>Loading invitations...</p></div>
      ) : (
        <div className={styles.feedGrid}>
          {offers.length === 0 ? (
            <div className={styles.card}><p>No invitations yet. Check back soon.</p></div>
          ) : offers.map(o => (
            <OfferItem key={o.id} offer={o} />
          ))}
        </div>
      )}
    </div>
  );
};

export default CampaignFeed;
