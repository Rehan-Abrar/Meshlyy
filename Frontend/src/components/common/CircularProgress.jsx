import styles from './CircularProgress.module.css';

/**
 * CircularProgress — Fit Score ring
 * SVG-based with animated stroke dashoffset
 */
const CircularProgress = ({
  value = 0,
  size = 72,
  strokeWidth = 8,
  variant = 'primary',  // primary | gold
  label,
  showValue = true,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedValue = Math.min(100, Math.max(0, value));
  const offset = circumference - (clampedValue / 100) * circumference;

  const trackColor  = 'rgba(186, 158, 255, 0.15)';
  const fillColor   = variant === 'gold' ? 'url(#gold-gradient)' : 'url(#primary-gradient)';

  const fontSize = size < 60 ? '0.75rem' : size < 90 ? '0.9375rem' : '1.125rem';
  const labelSize = size < 60 ? '0.45rem' : '0.55rem';

  return (
    <div className={styles.container} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        fill="none"
        aria-label={label || `${value}% fit score`}
        role="img"
      >
        <defs>
          <linearGradient id="primary-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="#6a37d4" />
            <stop offset="100%" stopColor="#ae8dff" />
          </linearGradient>
          <linearGradient id="gold-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="#D9B38C" />
            <stop offset="100%" stopColor="#e8c9a8" />
          </linearGradient>
        </defs>
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={fillColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
        />
      </svg>
      {showValue && (
        <div className={styles.text}>
          <span className={styles.value} style={{ fontSize }}>
            {clampedValue}
          </span>
          <span className={styles.unit} style={{ fontSize: labelSize }}>%</span>
        </div>
      )}
    </div>
  );
};

export default CircularProgress;
