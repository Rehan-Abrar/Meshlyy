import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import styles from './Sidebar.module.css';

const NAV_ITEMS = {
  brand: [
    { path: '/brand/dashboard',    label: 'Dashboard',    icon: '◈' },
    { path: '/brand/search',       label: 'Discover',     icon: '◎' },
    { path: '/brand/shortlist',    label: 'Shortlist',    icon: '◇' },
    { path: '/brand/ai-assistant', label: 'AI Assistant', icon: '✦' },
  ],
  influencer: [
    { path: '/influencer/dashboard',    label: 'Dashboard',    icon: '◈' },
    { path: '/influencer/campaigns',    label: 'Campaigns',    icon: '◎' },
    { path: '/influencer/invitations',  label: 'Invitations',  icon: '◉' },
    { path: '/influencer/ai-assistant', label: 'AI Assistant', icon: '✦' },
  ],
  admin: [
    { path: '/admin/queue',    label: 'Review Queue', icon: '◈' },
    { path: '/admin/users',    label: 'Users',        icon: '◎' },
    { path: '/admin/settings', label: 'Settings',     icon: '◇' },
  ],
};

const Sidebar = () => {
  const { user } = useAuth();
  if (!user) return null;

  const items = NAV_ITEMS[user.role] || [];

  return (
    <aside className={styles.sidebar} aria-label="Sidebar navigation">
      <div className={styles.inner}>
        <div className={styles.userCard}>
          <div className={styles.avatar}>
            {user.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className={styles.userInfo}>
            <p className={styles.userName}>{user.name}</p>
            <span className={styles.userRole}>{user.role}</span>
          </div>
        </div>

        <nav className={styles.nav}>
          <ul className={styles.navList}>
            {items.map(({ path, label, icon }) => (
              <li key={path}>
                <NavLink
                  to={path}
                  className={({ isActive }) =>
                    `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
                  }
                >
                  <span className={styles.navIcon} aria-hidden="true">{icon}</span>
                  <span className={styles.navLabel}>{label}</span>
                  <span className={styles.navIndicator} aria-hidden="true" />
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Decorative node mesh */}
        <div className={styles.nodeDecor} aria-hidden="true">
          <svg width="120" height="80" viewBox="0 0 120 80" fill="none">
            <circle cx="20" cy="20" r="2.5" fill="rgba(186,158,255,0.3)" />
            <circle cx="60" cy="15" r="2"   fill="rgba(186,158,255,0.2)" />
            <circle cx="100" cy="25" r="3"  fill="rgba(186,158,255,0.25)" />
            <circle cx="40" cy="50" r="2"   fill="rgba(186,158,255,0.2)" />
            <circle cx="80" cy="55" r="2.5" fill="rgba(186,158,255,0.3)" />
            <line x1="20" y1="20" x2="60" y2="15" stroke="rgba(186,158,255,0.12)" strokeWidth="0.75" />
            <line x1="60" y1="15" x2="100" y2="25" stroke="rgba(186,158,255,0.12)" strokeWidth="0.75" />
            <line x1="20" y1="20" x2="40" y2="50" stroke="rgba(186,158,255,0.1)" strokeWidth="0.75" />
            <line x1="60" y1="15" x2="80" y2="55" stroke="rgba(186,158,255,0.1)" strokeWidth="0.75" />
            <line x1="100" y1="25" x2="80" y2="55" stroke="rgba(186,158,255,0.12)" strokeWidth="0.75" />
            <line x1="40" y1="50" x2="80" y2="55" stroke="rgba(186,158,255,0.12)" strokeWidth="0.75" />
          </svg>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
