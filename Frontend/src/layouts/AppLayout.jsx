import { Outlet } from 'react-router-dom';
import Header from '../components/layout/Header';
import Sidebar from '../components/layout/Sidebar';
import { useAuth } from '../context/AuthContext';
import styles from './AppLayout.module.css';

/**
 * AppLayout — authenticated layout with sidebar + header
 */
const AppLayout = () => {
  const { user } = useAuth();

  return (
    <div className={styles.layout}>
      <Header />
      <div className={styles.body}>
        {user && <Sidebar />}
        <main className={styles.main} id="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
