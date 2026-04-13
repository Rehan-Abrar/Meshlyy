import { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import { collaborationsApi } from '../../services/api';
import styles from './InvitationDetail.module.css';

const InvitationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [offer, setOffer] = useState(location.state?.offer || null);
  const [loading, setLoading] = useState(!location.state?.offer);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadOffer = async () => {
      if (!id || offer) return;
      setLoading(true);
      setError('');
      try {
        const result = await collaborationsApi.getIncoming();
        const match = (result?.data || []).find((item) => item.id === id);
        if (!match) {
          setError('Offer not found.');
          return;
        }
        const campaign = match.campaign || {};
        setOffer({
          id: match.id,
          brand: 'Brand Invite',
          logo: 'BR',
          campaign: campaign.title || 'Campaign Invite',
          brief: campaign.brief_preview || match.message || 'No brief was provided.',
          budget: `${campaign.currency || 'USD'} ${Number(campaign.budget || 0).toLocaleString()}`,
          deadline: 'Open',
          match: 80,
          deliverables: ['Deliverables will be finalized after acceptance.'],
          timeline: 'TBD with brand',
          category: 'Collaboration',
        });
      } catch (err) {
        setError(err?.message || 'Unable to load invitation details.');
      } finally {
        setLoading(false);
      }
    };

    loadOffer();
  }, [id, offer]);

  const canRespond = useMemo(() => !!offer?.id, [offer]);

  const handleStatus = async (status) => {
    if (!canRespond) return;
    setSaving(true);
    setError('');
    try {
      await collaborationsApi.updateStatus(offer.id, status);
      navigate('/influencer/invitations');
    } catch (err) {
      setError(err?.message || 'Unable to update invitation status.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.notFound}>
        <p>Loading invitation...</p>
      </div>
    );
  }

  if (!offer) return (
    <div className={styles.notFound}>
      <p>{error || 'Offer not found.'}</p>
      <Link to="/influencer/invitations"><Button variant="secondary">← Back to Feed</Button></Link>
    </div>
  );

  return (
    <div className={styles.page}>
      <Link to="/influencer/invitations" className={styles.backLink}>← Back to Invitations</Link>

      {/* Header */}
      <div className={styles.offerHeader}>
        <div className={styles.brandLogo}>{offer.logo}</div>
        <div>
          <p className={styles.brandName}>{offer.brand}</p>
          <h1 className={styles.campaignTitle}>{offer.campaign}</h1>
          <div className={styles.tags}>
            <Badge variant="verified">{offer.match}% match</Badge>
            <Badge variant="primary">{offer.category}</Badge>
          </div>
        </div>
        <div className={styles.budgetBlock}>
          <span className={styles.budgetLabel}>Offer</span>
          <span className={styles.budgetValue}>{offer.budget}</span>
          <span className={styles.deadline}>Deadline: {offer.deadline}</span>
        </div>
      </div>

      <div className={styles.grid}>
        {/* Brief */}
        <section className={styles.card} aria-labelledby="brief-heading">
          <h2 id="brief-heading" className={styles.cardTitle}>Campaign Brief</h2>
          <p className={styles.briefText}>{offer.brief}</p>
        </section>

        {/* Deliverables */}
        <section className={styles.card} aria-labelledby="del-heading">
          <h2 id="del-heading" className={styles.cardTitle}>Deliverables</h2>
          <ul className={styles.deliverableList}>
            {offer.deliverables.map(d => (
              <li key={d} className={styles.deliverableItem}>
                <span className={styles.deliverableCheck}>✓</span>{d}
              </li>
            ))}
          </ul>
          <p className={styles.timeline}>⏱ Timeline: {offer.timeline}</p>
        </section>
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <Button variant="primary" size="lg" onClick={() => handleStatus('ACCEPTED')} disabled={saving}>
          Accept Offer
        </Button>
        <Button variant="secondary" size="lg" onClick={() => handleStatus('DECLINED')} disabled={saving}>
          Decline
        </Button>
      </div>
      {error && <p role="alert">{error}</p>}
    </div>
  );
};

export default InvitationDetail;
