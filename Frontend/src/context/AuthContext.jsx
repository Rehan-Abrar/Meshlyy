import { createContext, useState, useCallback, useEffect } from 'react';
import {
  loginWithSupabase,
  logoutSupabase,
  persistAuthSession,
  signUpWithSupabase,
  supabase,
} from '../services/supabase';
import { clearStoredAuth, getStoredAuth } from '../services/authSession';

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
    token: 'mock-brand-token',
    user: { name: 'Master Brand', email: 'brand@meshlyy.com', role: 'brand', company: 'Meshlyy Demo', industry: 'Technology' },
  },
  'creator@meshlyy.com': {
    password: 'mastercreator123',
    token: 'mock-influencer-token',
    user: { name: 'Maya Sterling', email: 'creator@meshlyy.com', role: 'influencer', niche: 'Lifestyle & Tech', platform: 'Instagram', handle: '@mayasterling', audience: '1.2M' },
  },
  'admin@meshlyy.com': {
    password: 'masteradmin123',
    token: null,
    user: { name: 'Admin', email: 'admin@meshlyy.com', role: 'admin' },
  },
  'brand_test@meshlyy.com': {
    password: 'Password123!',
    token: 'mock-brand-token-2',
    user: { name: 'Rehan Abrar', email: 'brand_test@meshlyy.com', role: 'brand', company: 'Meshlyy Pro', industry: 'Technology' },
  },
  'creator_test@meshlyy.com': {
    password: 'Password123!',
    token: 'mock-influencer-token',
    user: { name: 'Maya Sterling', email: 'creator_test@meshlyy.com', role: 'influencer', niche: 'Tech Reviews', platform: 'Instagram', handle: '@mayasterling_tech', audience: '50K – 250K (Mid-tier)' },
  },
};

const DEMO_ROLE_TOKENS = {
  brand: 'mock-brand-token',
  influencer: 'mock-influencer-token',
  admin: null,
};

const normalizeRole = (role) => {
  if (!role) return null;
  const value = String(role).toLowerCase();
  if (value === 'creator') return 'influencer';
  return value;
};

const inferRoleFromMetadata = (meta = {}) => {
  const raw = meta.role || meta.user_role || meta.account_type;
  return normalizeRole(raw) || 'brand';
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => getStoredAuth()?.user || null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const onUnauthorized = () => {
      clearStoredAuth();
      setUser(null);
    };

    window.addEventListener('meshlyy:unauthorized', onUnauthorized);
    return () => window.removeEventListener('meshlyy:unauthorized', onUnauthorized);
  }, []);

  useEffect(() => {
    if (!supabase) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        clearStoredAuth();
        setUser(null);
        return;
      }

      const role = inferRoleFromMetadata(session.user.user_metadata);
      const nextUser = {
        id: session.user.id,
        email: session.user.email,
        name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
        role,
      };
      persistAuthSession(nextUser, session.access_token);
      setUser(nextUser);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = useCallback(async (credentials) => {
    const { email, password } = credentials;
    setLoading(true);

    // Master account check
    const master = MASTER_ACCOUNTS[email];
    if (master && master.password === password) {
      setUser(master.user);
      persistAuthSession(master.user, master.token);
      setLoading(false);
      return { success: true, role: master.user.role };
    }

    if (email && password && supabase) {
      const result = await loginWithSupabase(email, password);
      if (result.success) {
        const role = inferRoleFromMetadata(result.user.user_metadata);
        const nextUser = {
          id: result.user.id,
          email: result.user.email,
          name: result.user.user_metadata?.name || result.user.email?.split('@')[0] || 'User',
          role,
        };
        setUser(nextUser);
        persistAuthSession(nextUser, result.session.access_token);
        setLoading(false);
        return { success: true, role };
      }
    }

    // Signup flow — credentials carry a role field set by SignupForm
    if (credentials.role) {
      const role = normalizeRole(credentials.role);
      const nextUser = {
        ...credentials,
        role,
        name: credentials.name || credentials.fullName || credentials.email?.split('@')[0] || 'User',
      };

      if (supabase && credentials.email && credentials.password) {
        const signUpResult = await signUpWithSupabase(credentials.email, credentials.password, {
          role,
          name: nextUser.name,
        });

        if (!signUpResult.success) {
          setLoading(false);
          return { success: false, error: signUpResult.error };
        }

        if (signUpResult.session?.access_token) {
          persistAuthSession(nextUser, signUpResult.session.access_token);
        } else {
          persistAuthSession(nextUser, DEMO_ROLE_TOKENS[role] || null);
        }
      } else {
        persistAuthSession(nextUser, DEMO_ROLE_TOKENS[role] || null);
      }

      setUser(nextUser);
      setLoading(false);
      return { success: true, role };
    }

    setLoading(false);
    return { success: false, error: 'Invalid email or password.' };
  }, []);

  const logout = useCallback(async () => {
    await logoutSupabase();
    clearStoredAuth();
    setUser(null);
  }, []);

  const updateUser = useCallback((updates) => {
    setUser(prev => {
      const next = { ...prev, ...updates };
      const current = getStoredAuth();
      persistAuthSession(next, current?.token ?? null);
      return next;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, isLoading: loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// useAuth is defined in ./useAuth.js; re-exported here for backward-compat.
// eslint-disable-next-line react-refresh/only-export-components
export { useAuth } from './useAuth';

export default AuthContext;
