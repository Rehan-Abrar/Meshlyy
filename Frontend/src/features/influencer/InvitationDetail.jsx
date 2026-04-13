import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Card from '../../components/common/Card';
import { apiClient, isApiError } from '../../utils/apiClient';
import styles from './InvitationDetail.module.css';

const InvitationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [offer, setOffer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;

    (async () => {
      try {
        const data = await apiClient.get(`/collaborations/${id}`);
        if (!ignore) setOffer(data);
      } catch (err) {
        if (!ignore) {
          setError(isApiError(err) ? `${err.code}: ${err.message}` : 'Offer not found.');
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    })();

    return () => {
      ignore = true;
    };
  }, [id]);

  const updateStatus = async (status) => {
    setActionLoading(true);
    setError('');
    try {
      await apiClient.patch(`/collaborations/${id}/status`, { status });
      navigate('/influencer/invitations');
    } catch (err) {
      setError(isApiError(err) ? `${err.code}: ${err.message}` : 'Failed to update invitation status.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <Card variant="glass">Loading invitation...</Card>;
  }

  if (!offer) {
    return (
      <div className={styles.notFound}>
        <p>{error || 'Offer not found.'}</p>
        <Link to="/influencer/invitations"><Button variant="secondary">← Back to Feed</Button></Link>
      </div>
    );
  }

  const campaign = offer.campaign || {};
  const brand = offer.brand || {};
  const budgetValue = campaign.budget ? `${campaign.budget} ${campaign.currency || 'USD'}` : 'TBD';
  const title = campaign.title || 'Campaign invitation';
  const brief = campaign.brief_preview || offer.message || 'No campaign brief provided.';

  return (
    <div className={styles.page}>
      <Link to="/influencer/invitations" className={styles.backLink}>← Back to Invitations</Link>

      {error && (
        <div style={{ marginBottom: '1rem' }}>
          <Card variant="glass">{error}</Card>
        </div>
      )}

      <div className={styles.offerHeader}>
        <div className={styles.brandLogo}>{String(brand.company_name || 'BR').slice(0, 2).toUpperCase()}</div>
        <div>
          <p className={styles.brandName}>{brand.company_name || 'Brand Invite'}</p>
          <h1 className={styles.campaignTitle}>{title}</h1>
          <div className={styles.tags}>
            <Badge variant="verified">{offer.status || 'PENDING'}</Badge>
            <Badge variant="primary">Invite</Badge>
          </div>
        </div>
        <div className={styles.budgetBlock}>
          <span className={styles.budgetLabel}>Offer</span>
          <span className={styles.budgetValue}>{budgetValue}</span>
        </div>
      </div>

      <div className={styles.grid}>
        <section className={styles.card} aria-labelledby="brief-heading">
          <h2 id="brief-heading" className={styles.cardTitle}>Campaign Brief</h2>
          <p className={styles.briefText}>{brief}</p>
        </section>

        <section className={styles.card} aria-labelledby="del-heading">
          <h2 id="del-heading" className={styles.cardTitle}>Details</h2>
          <ul className={styles.deliverableList}>
            <li className={styles.deliverableItem}><span className={styles.deliverableCheck}>✓</span>Campaign ID: {campaign.id || 'N/A'}</li>
            <li className={styles.deliverableItem}><span className={styles.deliverableCheck}>✓</span>Collaboration Type: {offer.type || 'INVITE'}</li>
            <li className={styles.deliverableItem}><span className={styles.deliverableCheck}>✓</span>Current Status: {offer.status || 'PENDING'}</li>
          </ul>
        </section>
      </div>

      <div className={styles.actions}>
        <Button variant="primary" size="lg" onClick={() => updateStatus('ACCEPTED')} disabled={actionLoading}>
          {actionLoading ? 'Saving...' : 'Accept Offer'}
        </Button>
        <Button variant="secondary" size="lg" onClick={() => updateStatus('DECLINED')} disabled={actionLoading}>
          Decline
        </Button>
      </div>
    </div>
  );
};

export default InvitationDetail;
