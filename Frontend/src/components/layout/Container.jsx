import styles from './Container.module.css';

/**
 * Container — 1440px max-width editorial wrapper
 */
const Container = ({ children, className = '', narrow = false, ...props }) => {
  return (
    <div
      className={`${styles.container} ${narrow ? styles.narrow : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default Container;
