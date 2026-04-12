import { Link } from 'react-router-dom';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import styles from './CampaignFeed.module.css';

const OFFERS = [
  { id:1, brand:'NovaSkin',  logo:'NS', campaign:'Summer Glow Collection',  brief:'Share your summer skincare routine with our new SPF line.',     budget:'$2,400', deadline:'Apr 30, 2025', match:94 },
  { id:2, brand:'FitFuel',   logo:'FF', campaign:'Protein Launch Campaign', brief:'Create a post showcasing our new protein flavors post-workout.', budget:'$1,800', deadline:'May 15, 2025', match:88 },
  { id:3, brand:'TechTrend', logo:'TT', campaign:'Q3 Laptop Awareness',     brief:'YouTube review of the new Zenith Pro laptop (unit provided).',   budget:'$3,200', deadline:'May 1, 2025',  match:81 },
  { id:4, brand:'GrowthWell',logo:'GW', campaign:'Daily Wellness Series',   brief:'3-week micro-series on holistic wellness and our supplement.',    budget:'$4,800', deadline:'May 20, 2025', match:77 },
];

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
      <Link to={`/influencer/invitations/${offer.id}`}>
        <Button variant="primary" size="sm">Review Offer</Button>
      </Link>
    </div>
  </div>
);

const CampaignFeed = () => (
  <div className={styles.page}>
    <div className={styles.header}>
      <div>
        <h1 className={styles.title}>Direct Invitations</h1>
        <p className={styles.sub}>Exclusive brand offers matched directly to your profile. No cold pitching needed.</p>
      </div>
    </div>
    <div className={styles.feedGrid}>
      {OFFERS.map(o => (
        <OfferItem key={o.id} offer={o} />
      ))}
    </div>
  </div>
);

export default CampaignFeed;
