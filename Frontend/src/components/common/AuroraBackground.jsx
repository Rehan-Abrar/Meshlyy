import styles from './AuroraBackground.module.css';

/**
 * AuroraBackground — animated violet aurora for landing page only.
 * No Tailwind. No TypeScript. Adapted to CSS Modules + dark palette.
 */
const AuroraBackground = ({ children, showMask = true }) => (
  <div className={styles.wrapper}>
    <div
      className={`${styles.aurora} ${showMask ? styles.masked : ''}`}
      aria-hidden="true"
    />
    <div className={styles.content}>
      {children}
    </div>
  </div>
);

export default AuroraBackground;
