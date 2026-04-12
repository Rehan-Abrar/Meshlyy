import { useParams, Link, useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import styles from './InvitationDetail.module.css';

// Mock data — replace with `GET /api/v1/campaigns/:id`
const OFFERS = {
  1: { id:1, brand:'NovaSkin',  logo:'NS', campaign:'Summer Glow Collection',  brief:'Share your summer skincare routine with our new SPF line. We are looking for authentic, lifestyle-driven content that integrates the product naturally into your daily routine.', budget:'$2,400', deadline:'Apr 30, 2025', match:94, deliverables:['1× Instagram Reel (30–60s)','2× Story sets with swipe-up','Usage rights: 6 months'], timeline:'3 weeks', category:'Beauty & Skincare' },
  2: { id:2, brand:'FitFuel',   logo:'FF', campaign:'Protein Launch Campaign', brief:'Create a post showcasing our new protein flavors post-workout. Authentic gym footage preferred.', budget:'$1,800', deadline:'May 15, 2025', match:88, deliverables:['1× Feed post','1× Story × 3 frames'], timeline:'2 weeks', category:'Fitness & Health' },
  3: { id:3, brand:'TechTrend', logo:'TT', campaign:'Q3 Laptop Awareness',     brief:'YouTube review of the new Zenith Pro laptop. Unit provided upon contract signing.', budget:'$3,200', deadline:'May 1, 2025',  match:81, deliverables:['1× Full review post','Mention in bio for 30 days'], timeline:'4 weeks', category:'Technology' },
  4: { id:4, brand:'GrowthWell',logo:'GW', campaign:'Daily Wellness Series',   brief:'3-week micro-series on holistic wellness featuring our supplement line.', budget:'$4,800', deadline:'May 20, 2025', match:77, deliverables:['3× Reels over 3 weeks','1× Feed post','Bio link 30 days'], timeline:'3 weeks', category:'Wellness' },
};

const InvitationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const offer = OFFERS[id];

  if (!offer) return (
    <div className={styles.notFound}>
      <p>Offer not found.</p>
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
        <Button variant="primary" size="lg" onClick={() => { alert('Accepted! Brand will be notified.'); navigate('/influencer/invitations'); }}>
          Accept Offer
        </Button>
        <Button variant="secondary" size="lg" onClick={() => navigate('/influencer/invitations')}>
          Decline
        </Button>
      </div>
    </div>
  );
};

export default InvitationDetail;
