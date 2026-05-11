import { useEffect, useRef, useState } from 'react';
import styles from './AuroraBackground.module.css';

/**
 * AuroraBackground — animated violet aurora for landing page only.
 * Uses IntersectionObserver to pause animation when off-screen.
 */
const AuroraBackground = ({ children, showMask = true }) => {
  const wrapperRef = useRef(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.05 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <div
        className={`${styles.aurora} ${showMask ? styles.masked : ''} ${!isVisible ? styles.paused : ''}`}
        aria-hidden="true"
      />
      <div className={styles.content}>
        {children}
      </div>
    </div>
  );
};

export default AuroraBackground;
