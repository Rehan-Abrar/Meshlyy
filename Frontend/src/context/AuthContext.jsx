import { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);

/**
 * Master credentials (dev/demo only — never rendered in UI).
 * brand@meshlyy.com   / masterbrand123
 * creator@meshlyy.com / mastercreator123
 * admin@meshlyy.com   / masteradmin123
 */
const MASTER_ACCOUNTS = {
  'brand@meshlyy.com': {
    password: 'masterbrand123',
    user: { name: 'Master Brand', email: 'brand@meshlyy.com', role: 'brand', company: 'Meshlyy Demo', industry: 'Technology' },
  },
  'creator@meshlyy.com': {
    password: 'mastercreator123',
    user: { name: 'Maya Sterling', email: 'creator@meshlyy.com', role: 'influencer', niche: 'Lifestyle & Tech', platform: 'Instagram', handle: '@mayasterling', audience: '1.2M' },
  },
  'admin@meshlyy.com': {
    password: 'masteradmin123',
    user: { name: 'Admin', email: 'admin@meshlyy.com', role: 'admin' },
  },
  'brand_test@meshlyy.com': {
    password: 'Password123!',
    user: { name: 'Rehan Abrar', email: 'brand_test@meshlyy.com', role: 'brand', company: 'Meshlyy Pro', industry: 'Technology' },
  },
  'creator_test@meshlyy.com': {
    password: 'Password123!',
    user: { name: 'Maya Sterling', email: 'creator_test@meshlyy.com', role: 'influencer', niche: 'Tech Reviews', platform: 'Instagram', handle: '@mayasterling_tech', audience: '50K – 250K (Mid-tier)' },
  },
};

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(false);

  const login = useCallback(async (credentials) => {
    const { email, password } = credentials;
    setLoading(true);

    await new Promise(r => setTimeout(r, 700)); // simulated latency

    // Master account check
    const master = MASTER_ACCOUNTS[email];
    if (master && master.password === password) {
      setUser(master.user);
      setLoading(false);
      return { success: true, role: master.user.role };
    }

    // Signup flow — credentials carry a role field set by SignupForm
    if (credentials.role) {
      setUser({ ...credentials });
      setLoading(false);
      return { success: true, role: credentials.role };
    }

    setLoading(false);
    return { success: false, error: 'Invalid email or password.' };
  }, []);

  const logout = useCallback(() => setUser(null), []);

  const updateUser = useCallback((updates) => {
    setUser(prev => ({ ...prev, ...updates }));
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, isLoading: loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};

export default AuthContext;
