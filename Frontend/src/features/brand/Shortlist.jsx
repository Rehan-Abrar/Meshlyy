import { useState } from 'react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import styles from './Shortlist.module.css';

const MOCK_SHORTLIST = [
  { id: 1, name: 'Zara Ahmed', niche: 'Lifestyle', platform: 'Instagram', followers: '234K', avatar: 'ZA' },
  { id: 5, name: 'Sophie Laurent', niche: 'Fashion', platform: 'Instagram', followers: '620K', avatar: 'SL' },
];

const Shortlist = () => {
  const [items, setItems] = useState(MOCK_SHORTLIST);

  const handleRemove = (id) => {
    setItems(items.filter(item => item.id !== id));
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>My Shortlist</h1>
        <p className={styles.subtitle}>Manage your selected creators for current campaigns.</p>
      </header>

      <div className={styles.grid}>
        {items.length > 0 ? (
          items.map(creator => (
            <Card key={creator.id} variant="standard" className={styles.itemCard}>
              <div className={styles.cardInfo}>
                <div className={styles.avatar}>{creator.avatar}</div>
                <div className={styles.details}>
                  <h3 className={styles.name}>{creator.name}</h3>
                  <div className={styles.tags}>
                    <Badge variant="primary">{creator.niche}</Badge>
                    <Badge variant="secondary">{creator.platform}</Badge>
                  </div>
                </div>
              </div>
              <div className={styles.stats}>
                <span className="micro-label">Followers</span>
                <span className={styles.statVal}>{creator.followers}</span>
              </div>
              <div className={styles.actions}>
                <Button variant="ghost" size="sm" onClick={() => handleRemove(creator.id)}>Remove</Button>
                <Button variant="primary" size="sm">Invite →</Button>
              </div>
            </Card>
          ))
        ) : (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>◇</span>
            <p>Your shortlist is empty.</p>
            <Button variant="primary" size="sm" onClick={() => window.location.href='/brand/search'}>Discover Creators</Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Shortlist;
