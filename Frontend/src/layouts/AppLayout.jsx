import { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from '../components/layout/Header';
import Sidebar from '../components/layout/Sidebar';
import { useAuth } from '../context/AuthContext';
import { useBreakpoint } from '../hooks/useBreakpoint';
import styles from './AppLayout.module.css';
import elementImg from '../assets/element.png';

/**
 * AppLayout — authenticated layout with sidebar + header
 */
const AppLayout = () => {
  const { user } = useAuth();
  const { isMobile } = useBreakpoint();
  const location = useLocation();

  // Sidebar is open by default on desktop, closed on mobile
  const [isSidebarOpen, setIsSidebarOpen] = useState(!isMobile);

  // Track the previous isMobile value via ref to detect breakpoint crossings
  // without calling setState directly inside an effect body.
  const prevIsMobileRef = useRef(isMobile);

  useEffect(() => {
    const crossedBreakpoint = prevIsMobileRef.current !== isMobile;
    prevIsMobileRef.current = isMobile;

    if (crossedBreakpoint) {
      // Intentional: sync sidebar state across breakpoint boundary
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsSidebarOpen(!isMobile);
    } else if (isMobile) {
      // Route changed while on mobile — close the drawer
      setIsSidebarOpen(false);
    }
  }, [isMobile, location.pathname]);

  const toggleSidebar = () => setIsSidebarOpen(prev => !prev);
  const closeSidebar  = () => setIsSidebarOpen(false);

  return (
    <div className={styles.layout}>
      {/* Global Background Watermark */}
      <div 
        className={styles.watermark}
        style={{ backgroundImage: `url(${elementImg})` }} 
      />
      
      <div className={styles.inner}>
        <Header toggleSidebar={toggleSidebar} />
        <div className={styles.body}>
          {user && (
            <Sidebar 
              isOpen={isSidebarOpen} 
              onClose={closeSidebar} 
            />
          )}
          <main className={styles.main} id="main-content">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

export default AppLayout;
