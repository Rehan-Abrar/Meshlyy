import { useEffect, useState } from 'react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import { apiClient, isApiError } from '../../utils/apiClient';
import styles from './VerificationQueue.module.css';

function formatFollowers(value) {
  const count = Number(value || 0);
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${Math.round(count / 1000)}K`;
  return String(count);
}

function formatEngagement(value) {
  const numeric = Number(value || 0);
  const percent = numeric <= 1 ? numeric * 100 : numeric;
  return `${percent.toFixed(1)}%`;
}

function formatSubmittedDate(creator) {
  const fallback = creator?.last_scraped_at || creator?.last_resubmitted_at;
  const date = fallback ? new Date(fallback) : null;
  if (!date || Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function mapQueueRow(row) {
  const handle = row.ig_handle ? `@${row.ig_handle}` : '@creator';
  const displayName = row.ig_handle || row.id.slice(0, 8);
  return {
    id: row.id,
    name: displayName,
    handle,
    platform: 'Instagram',
    followers: formatFollowers(row?.stats?.follower_count),
    engagement: formatEngagement(row?.stats?.engagement_rate),
    submitted: formatSubmittedDate(row),
    niche: row.niche_primary || 'General',
    status: row.verification_status || 'FLAGGED',
  };
}

const QueueItem = ({ creator, onApprove, onRequest, busy }) => (
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
      <Button variant="success" size="sm" onClick={onApprove} disabled={busy}>Approve</Button>
      <Button variant="secondary" size="sm" onClick={onRequest} disabled={busy}>Request Changes</Button>
    </div>
  </div>
);

const VerificationQueue = () => {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState({});
  const [notifications, setNotifications] = useState([]);

  const loadQueue = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.get('/admin/verification-queue');
      const rows = Array.isArray(response.data) ? response.data : [];
      setQueue(rows.map(mapQueueRow));
    } catch (err) {
      setError(isApiError(err) ? `${err.code}: ${err.message}` : 'Failed to load verification queue');
      setQueue([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const toast = (msg) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, msg }]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 3000);
  };

  const onApprove = async (id) => {
    setActionLoading((prev) => ({ ...prev, [id]: true }));
    try {
      await apiClient.post(`/admin/verify/${id}`, {});
      setQueue((q) => q.filter((c) => c.id !== id));
      toast('Creator approved.');
    } catch (err) {
      toast(isApiError(err) ? `${err.code}: ${err.message}` : 'Approval failed.');
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  const onRequest = async (id) => {
    const reason = window.prompt('Add optional feedback for the creator:', 'Please improve profile details and resubmit.');
    if (reason === null) return;

    setActionLoading((prev) => ({ ...prev, [id]: true }));
    try {
      await apiClient.post(`/admin/reject/${id}`, {
        rejection_reason_code: 'request_changes',
        reason: reason || 'Request changes from admin review',
      });
      setQueue((q) => q.filter((c) => c.id !== id));
      toast('Changes requested.');
    } catch (err) {
      toast(isApiError(err) ? `${err.code}: ${err.message}` : 'Request changes failed.');
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <span className="micro-label">Admin Panel</span>
          <h1 className={styles.title}>Verification Queue</h1>
          <p className={styles.sub}>{queue.length} creator{queue.length !== 1 ? 's' : ''} pending review</p>
        </div>
        <Badge variant="admin">{queue.length} Pending</Badge>
      </div>

      {error && (
        <div style={{ marginBottom: '1rem' }}>
          <Card variant="glass">{error}</Card>
        </div>
      )}

      <div style={{ marginBottom: '1rem' }}>
        <Button variant="ghost" size="sm" onClick={loadQueue} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh Queue'}
        </Button>
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
        {loading ? (
          <div className={styles.empty}>
            <p>Loading verification queue...</p>
          </div>
        ) : queue.length === 0 ? (
          <div className={styles.empty}>
            <span>✓</span>
            <p>All creators reviewed. Queue is empty.</p>
          </div>
        ) : (
          queue.map((c, i) => (
            <div key={c.id}>
              <QueueItem
                creator={c}
                busy={Boolean(actionLoading[c.id])}
                onApprove={() => !actionLoading[c.id] && onApprove(c.id)}
                onRequest={() => !actionLoading[c.id] && onRequest(c.id)}
              />
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
