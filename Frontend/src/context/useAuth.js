import { useContext } from 'react';
import AuthContext from './AuthContext';

/**
 * useAuth — typed convenience hook for consuming AuthContext.
 * Extracted to a dedicated file so AuthContext.jsx only exports the
 * Provider component, satisfying the react-refresh fast-refresh rule.
 */
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};

export default useAuth;
