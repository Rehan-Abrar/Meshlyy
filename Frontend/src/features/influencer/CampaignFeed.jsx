import { Link } from 'react-router-dom';
import Card from '../../components/common/Card';
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
  <div className={styles.offerItem}>
    <div className={styles.offerLogo}>{offer.logo}</div>
    <div className={styles.offerInfo}>
      <div className={styles.offerTop}>
        <div>
          <h3 className={styles.offerCampaign}>{offer.campaign}</h3>
          <span className={styles.offerBrand}>{offer.brand}</span>
        </div>
        <div className={styles.offerMeta}>
          <Badge variant="verified">{offer.match}% match</Badge>
          <span className={styles.offerBudget}>{offer.budget}</span>
        </div>
      </div>
      <p className={styles.offerBrief}>{offer.brief}</p>
      <div className={styles.offerBottom}>
        <span className={styles.offerDeadline}>📅 Deadline: {offer.deadline}</span>
        <Link to={`/influencer/invitations/${offer.id}`}>
          <Button variant="primary" size="sm">Review Offer</Button>
        </Link>
      </div>
    </div>
  </div>
);

const CampaignFeed = () => (
  <div className={styles.page}>
    <div className={styles.header}>
      <div>
        <h1 className={styles.title}>Campaign Feed</h1>
        <p className={styles.sub}>Brand offers matched to your profile. No cold pitching needed.</p>
      </div>
    </div>
    <Card variant="container" padding={false} className={styles.feed}>
      {OFFERS.map((o, i) => (
        <div key={o.id}>
          <OfferItem offer={o} />
          {i < OFFERS.length - 1 && <div className={styles.divider} />}
        </div>
      ))}
    </Card>
  </div>
);

export default CampaignFeed;
