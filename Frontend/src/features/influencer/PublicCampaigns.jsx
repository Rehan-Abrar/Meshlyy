import { Link } from 'react-router-dom';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import styles from './CampaignFeed.module.css';

const PUBLIC_CAMPAIGNS = [
  { id:101, brand:'Lumina',    logo:'LM', campaign:'Spring Creator Program',  brief:'We are looking for UGC creators to showcase our spring collection.', budget:'$500 - $1,500', deadline:'Open', isNew: true },
  { id:102, brand:'Vitalix',   logo:'VX', campaign:'Daily Vitamins Review',   brief:'Seeking health enthusiasts to review our 30-day vitamin pack.',      budget:'$300 + Product', deadline:'May 10', isNew: false },
  { id:103, brand:'GearUp',    logo:'GU', campaign:'Tech Setup Tour',         brief:'Show us your work-from-home setup featuring the new GearUp stand.',  budget:'$800', deadline:'May 15', isNew: true },
];

const CampaignItem = ({ campaign }) => (
  <div className={styles.offerItem}>
    <div className={styles.offerLogo} style={{ background: 'var(--color-primary-variant)' }}>{campaign.logo}</div>
    <div className={styles.offerInfo}>
      <div className={styles.offerTop}>
        <div>
          <h3 className={styles.offerCampaign}>{campaign.campaign}</h3>
          <span className={styles.offerBrand}>{campaign.brand}</span>
        </div>
        <div className={styles.offerMeta}>
          {campaign.isNew && <Badge variant="primary">New</Badge>}
          <span className={styles.offerBudget}>{campaign.budget}</span>
        </div>
      </div>
      <p className={styles.offerBrief}>{campaign.brief}</p>
      <div className={styles.offerBottom}>
        <span className={styles.offerDeadline}>📅 Applying Ends: {campaign.deadline}</span>
        <Button variant="secondary" size="sm">Apply Now</Button>
      </div>
    </div>
  </div>
);

const PublicCampaigns = () => (
  <div className={styles.page}>
    <div className={styles.header}>
      <div>
        <h1 className={styles.title}>Public Campaigns</h1>
        <p className={styles.sub}>Browse open campaigns from brands seeking creators like you.</p>
      </div>
    </div>
    <Card variant="container" padding={false} className={styles.feed}>
      {PUBLIC_CAMPAIGNS.map((c, i) => (
        <div key={c.id}>
          <CampaignItem campaign={c} />
          {i < PUBLIC_CAMPAIGNS.length - 1 && <div className={styles.divider} />}
        </div>
      ))}
    </Card>
  </div>
);

export default PublicCampaigns;
