import styles from './Badge.module.css';

/**
 * Badge — role | verified | premium | status
 */
const Badge = ({ variant = 'default', children, className = '', icon, ...props }) => {
  const classNames = [
    styles.badge,
    styles[`badge--${variant}`],
    className,
  ].filter(Boolean).join(' ');

  return (
    <span className={classNames} {...props}>
      {icon && <span className={styles.icon}>{icon}</span>}
      {children}
    </span>
  );
};

export default Badge;
