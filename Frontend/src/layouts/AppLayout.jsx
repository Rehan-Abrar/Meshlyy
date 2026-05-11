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
      {/* Global Background Watermark */}
      <img 
        src={elementImg}
        alt=""
        loading="lazy"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '50vw',
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
