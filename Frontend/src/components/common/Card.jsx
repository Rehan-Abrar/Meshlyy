import styles from './Card.module.css';

/**
 * Card — standard | container | premium
 */
const Card = ({
  variant = 'standard',
  children,
  className = '',
  padding = true,
  onClick,
  badge,
  ...props
}) => {
  const classNames = [
    styles.card,
    styles[`card--${variant}`],
    !padding ? styles['card--no-pad'] : '',
    onClick ? styles['card--clickable'] : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div
      className={classNames}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick(e) : undefined}
      {...props}
    >
      {badge && (
        <span className={styles.badge}>{badge}</span>
      )}
      {children}
    </div>
  );
};

export default Card;
