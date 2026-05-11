import { useEffect } from 'react';
import styles from './Toast.module.css';

/**
 * Lightweight Toast notification
 */
const Toast = ({ message, type = 'info', onClose, duration = 3000 }) => {
  useEffect(() => {
    if (duration && onClose) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  if (!message) return null;

  return (
    <div className={`${styles.toast} ${styles[type]}`} role="alert">
      <div className={styles.icon}>
        {type === 'success' && '✓'}
        {type === 'error' && '✕'}
        {type === 'info' && 'i'}
      </div>
      <div className={styles.message}>{message}</div>
      {onClose && (
        <button onClick={onClose} className={styles.closeBtn} aria-label="Close notification">
          ✕
        </button>
      )}
    </div>
  );
};

export default Toast;
