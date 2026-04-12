import { Link } from 'react-router-dom';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import styles from './CampaignFeed.module.css';

const PUBLIC_CAMPAIGNS = [
  { id:101, brand:'Lumina',    logo:'LM', campaign:'Spring Creator Program',  brief:'We are looking for UGC creators to showcase our spring collection.', budget:'$500 - $1,500', deadline:'Open', isNew: true },
  { id:102, brand:'Vitalix',   logo:'VX', campaign:'Daily Vitamins Review',   brief:'Seeking health enthusiasts to review our 30-day vitamin pack.',      budget:'$300 + Product', deadline:'May 10', isNew: false },
  { id:103, brand:'GearUp',    logo:'GU', campaign:'Tech Setup Tour',         brief:'Show us your work-from-home setup featuring the new GearUp stand.',  budget:'$800', deadline:'May 15', isNew: true },
];

const CampaignItem = ({ campaign }) => (
  <div className={styles.card}>
    <div className={styles.glowBg}></div>
    <div className={styles.cardHeader}>
      <div className={styles.offerLogo} style={{ background: 'var(--color-primary-variant)' }}>{campaign.logo}</div>
      <div className={styles.offerInfo}>
        <h3 className={styles.offerCampaign}>{campaign.campaign}</h3>
        <span className={styles.offerBrand}>{campaign.brand}</span>
        <div className={styles.badges}>
          {campaign.isNew && <Badge variant="primary">New</Badge>}
        </div>
      </div>
    </div>
    
    <div className={styles.offerBudget}>{campaign.budget}</div>
    <p className={styles.offerBrief}>{campaign.brief}</p>
    
    <div className={styles.cardFooter}>
      <span className={styles.offerDeadline}>📅 Applying Ends: {campaign.deadline}</span>
      <Button variant="secondary" size="sm">Apply Now</Button>
    </div>
  </div>
);

const PublicCampaigns = () => (
  <div className={styles.page}>
    <div className={styles.header}>
      <div>
        <h1 className={styles.title}>Public Campaigns</h1>
        <p className={styles.sub}>Browse open campaigns from brands actively seeking creators like you.</p>
      </div>
    </div>
    <div className={styles.feedGrid}>
      {PUBLIC_CAMPAIGNS.map(c => (
        <CampaignItem key={c.id} campaign={c} />
      ))}
    </div>
  </div>
);

export default PublicCampaigns;
