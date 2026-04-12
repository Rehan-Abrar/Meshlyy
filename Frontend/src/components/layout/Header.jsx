import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import styles from './Header.module.css';
import Button from '../common/Button';
import logoImg from '../../assets/logo.png';

const Logo = () => (
  <Link to="/" className={styles.logo} aria-label="Meshlyy home">
    <img src={logoImg} alt="Meshlyy Logo" className={styles.headerLogo} />
    <span className={styles.logoText}>Meshlyy</span>
  </Link>
);

const Header = ({ toggleSidebar }) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isAuthPage = ['/login', '/signup', '/role-select'].some(
    (p) => location.pathname.startsWith(p)
  );

  return (
    <header className={styles.header} role="banner">
      <div className={styles.inner}>
        <div className={styles.leftGroup}>
          {user && (
            <button className={styles.hamburger} onClick={toggleSidebar} aria-label="Toggle Sidebar">
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="var(--color-primary-strong)">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}
          <Logo />
        </div>
        <nav className={styles.nav} aria-label="Main navigation">
          {!user && !isAuthPage && (
            <>
              <Link to="/login" className={styles.navLink}>Log in</Link>
              <Link to="/role-select">
                <Button variant="primary" size="sm">
                  Get Started
                </Button>
              </Link>
            </>
          )}
          {user && (
            <div className={styles.userArea}>
              <span className={styles.roleChip}>{user.role}</span>
              <span className={styles.userName}>{user.name}</span>
              <Button variant="ghost" size="sm" onClick={logout}>Sign out</Button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
