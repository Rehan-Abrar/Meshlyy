import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from '../components/layout/Header';
import Sidebar from '../components/layout/Sidebar';
import { useAuth } from '../context/AuthContext';
import styles from './AppLayout.module.css';
import elementImg from '../assets/element.png';

/**
 * AppLayout — authenticated layout with sidebar + header
 */
const AppLayout = () => {
  const { user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 900);
  const location = useLocation();

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  // Close sidebar on route change (for mobile)
  useEffect(() => {
    if (window.innerWidth <= 900) {
      const timer = window.setTimeout(() => {
        setIsSidebarOpen(false);
      }, 0);

      return () => {
        window.clearTimeout(timer);
      };
    }

    return undefined;
  }, [location.pathname]);

  return (
    <div className={styles.layout}>
      {/* Global Background Watermark */}
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `url(${elementImg})`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center center',
          backgroundSize: '50vw',
          opacity: 0.05,
          pointerEvents: 'none',
          zIndex: 0
        }}
      />
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Header toggleSidebar={toggleSidebar} />
        <div className={styles.body}>
          {user && <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />}
          <main className={styles.main} id="main-content">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

export default AppLayout;
