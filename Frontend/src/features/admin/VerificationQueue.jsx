import { useState } from 'react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import styles from './VerificationQueue.module.css';

const QUEUE = [
  { id:1, name:'Priya Sharma',  handle:'@priyasharma',  platform:'Instagram', followers:'45K', engagement:'6.1%', submitted:'Apr 8, 2025',  niche:'Beauty',   status:'pending' },
  { id:2, name:'Carlos Vega',   handle:'@carlos_vega',  platform:'YouTube',   followers:'120K',engagement:'3.8%', submitted:'Apr 7, 2025',  niche:'Fitness',  status:'pending' },
  { id:3, name:'Aisha Nakamura',handle:'@aisha.n',      platform:'TikTok',    followers:'89K', engagement:'9.2%', submitted:'Apr 6, 2025',  niche:'Lifestyle',status:'pending' },
  { id:4, name:'Jake Torres',   handle:'@jakebuilds',   platform:'YouTube',   followers:'210K',engagement:'4.5%', submitted:'Apr 5, 2025',  niche:'Tech',     status:'pending' },
];

const QueueItem = ({ creator, onApprove, onRequest }) => (
  <div className={styles.row}>
    <div className={styles.rowLeft}>
      <div className={styles.avatar}>{creator.name.charAt(0)}</div>
      <div className={styles.info}>
        <h3 className={styles.name}>{creator.name}</h3>
        <span className={styles.handle}>{creator.handle}</span>
      </div>
    </div>
    <div className={styles.rowMid}>
      <Badge variant="primary">{creator.niche}</Badge>
      <Badge variant="secondary">{creator.platform}</Badge>
    </div>
    <div className={styles.rowStats}>
      <div className={styles.stat}>
        <span className="micro-label">Followers</span>
        <strong>{creator.followers}</strong>
      </div>
      <div className={styles.stat}>
        <span className="micro-label">Eng. Rate</span>
        <strong>{creator.engagement}</strong>
      </div>
    </div>
    <div className={styles.rowDate}>
      <span className="micro-label">Submitted</span>
      <span>{creator.submitted}</span>
    </div>
    <div className={styles.rowActions}>
      <Button variant="success" size="sm" onClick={() => onApprove(creator.id)}>✓ Approve</Button>
      <Button variant="secondary" size="sm" onClick={() => onRequest(creator.id)}>Request Changes</Button>
    </div>
  </div>
);

const VerificationQueue = () => {
  const [queue, setQueue] = useState(QUEUE);
  const [notifications, setNotifications] = useState([]);

  const toast = (msg) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, msg }]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 3000);
  };

  const onApprove = (id) => {
    setQueue(q => q.filter(c => c.id !== id));
    toast('✓ Creator approved and notified.');
  };

  const onRequest = (id) => {
    setQueue(q => q.filter(c => c.id !== id));
    toast('Changes requested — creator notified.');
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <span className="micro-label">Admin Panel</span>
          <h1 className={styles.title}>Verification Queue</h1>
          <p className={styles.sub}>{queue.length} creator{queue.length !== 1 ? 's' : ''} pending review</p>
          <p className={styles.sub}>Backend moderation endpoints are pending; actions below run in local admin review mode.</p>
        </div>
        <Badge variant="admin">{queue.length} Pending</Badge>
      </div>

      {/* Column headers */}
      <div className={styles.colHeaders}>
        <span className="micro-label">Creator</span>
        <span className="micro-label">Category</span>
        <span className="micro-label">Stats</span>
        <span className="micro-label">Submitted</span>
        <span className="micro-label">Actions</span>
      </div>

      <Card variant="container" padding={false} className={styles.list}>
        {queue.length === 0 ? (
          <div className={styles.empty}>
            <span>✓</span>
            <p>All creators reviewed. Queue is empty.</p>
          </div>
        ) : (
          queue.map((c, i) => (
            <div key={c.id}>
              <QueueItem creator={c} onApprove={onApprove} onRequest={onRequest} />
              {i < queue.length - 1 && <div className={styles.divider} />}
            </div>
          ))
        )}
      </Card>

      {/* Toasts */}
      <div className={styles.toasts} aria-live="polite">
        {notifications.map(n => (
          <div key={n.id} className={styles.toast}>{n.msg}</div>
        ))}
      </div>
    </div>
  );
};

export default VerificationQueue;
