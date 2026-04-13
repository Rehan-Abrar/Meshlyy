import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../utils/supabaseClient';
import { apiClient, setAccessTokenGetter, isApiError } from '../utils/apiClient';

const AuthContext = createContext(null);

const normalizeRole = (role) => {
  if (!role) return null;
  const upper = String(role).toUpperCase();
  if (upper === 'BRAND') return 'brand';
  if (upper === 'INFLUENCER') return 'influencer';
  if (upper === 'ADMIN') return 'admin';
  return String(role).toLowerCase();
};

const deriveDisplayName = (email, role) => {
  if (role === 'admin') return 'Admin';
  if (!email) return role === 'brand' ? 'Brand' : 'Creator';
  const prefix = email.split('@')[0] || '';
  if (!prefix) return role === 'brand' ? 'Brand' : 'Creator';
  return prefix.replace(/[._-]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
};

const fallbackUserFromSession = (session, explicitRole) => {
  const authUser = session?.user;
  const role = explicitRole
    || normalizeRole(authUser?.user_metadata?.role)
    || normalizeRole(authUser?.app_metadata?.role)
    || 'influencer';

  return {
    id: authUser?.id,
    email: authUser?.email,
    name: deriveDisplayName(authUser?.email, role),
    role,
    onboardingCompleted: false,
    onboardingStep: 0,
    verificationStatus: null,
  };
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const accessTokenRef = useRef(null);

  useEffect(() => {
    accessTokenRef.current = accessToken;
  }, [accessToken]);

  useEffect(() => {
    setAccessTokenGetter(() => accessTokenRef.current);
  }, []);

  const loadOnboardingStatus = useCallback(async () => {
    const status = await apiClient.get('/onboarding/status');
    return {
      userId: status.userId,
      role: normalizeRole(status.role),
      onboardingCompleted: Boolean(status.onboardingCompleted),
      onboardingStep: status.currentStep || 0,
      verificationStatus: status.verificationStatus || null,
    };
  }, []);

  const hydrateUserFromSession = useCallback(async (session) => {
    if (!session?.access_token) {
      setUser(null);
      setAccessToken(null);
      accessTokenRef.current = null;
      return;
    }

    // Keep ref in sync immediately so apiClient uses the token in this same tick.
    accessTokenRef.current = session.access_token;
    setAccessToken(session.access_token);

    const authUser = session.user;
    try {
      const onboarding = await loadOnboardingStatus();
      const role = onboarding.role || normalizeRole(authUser?.user_metadata?.role);
      setUser({
        id: onboarding.userId,
        email: authUser?.email,
        name: deriveDisplayName(authUser?.email, role),
        role,
        onboardingCompleted: onboarding.onboardingCompleted,
        onboardingStep: onboarding.onboardingStep,
        verificationStatus: onboarding.verificationStatus,
      });
    } catch (error) {
      if (isApiError(error) && (error.status === 401 || error.status === 503)) {
        // Keep user authenticated with session-derived role when backend status bootstrap is unavailable.
        setUser(fallbackUserFromSession(session));
        return;
      }
      throw error;
    }
  }, [loadOnboardingStatus]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (mounted) await hydrateUserFromSession(data.session);
      } catch {
        if (mounted) {
          setUser(null);
          setAccessToken(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
          setAuthReady(true);
        }
      }
    })();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        await hydrateUserFromSession(session);
      } catch {
        setUser(null);
        setAccessToken(null);
      }
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [hydrateUserFromSession]);

  const login = useCallback(async ({ email, password }) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        return { success: false, error: error.message };
      }

      await hydrateUserFromSession(data.session);
      const role = normalizeRole(data.user?.user_metadata?.role)
        || normalizeRole(data.user?.app_metadata?.role)
        || 'influencer';
      return { success: true, role: user?.role || role };
    } catch (error) {
      return { success: false, error: error.message || 'Login failed' };
    } finally {
      setLoading(false);
    }
  }, [hydrateUserFromSession, user?.role]);

  const signup = useCallback(async ({ role, email, password, onboardingPayload }) => {
    setLoading(true);
    try {
      const roleUpper = String(role || '').toUpperCase();
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { role: roleUpper } },
      });

      if (signUpError) {
        return { success: false, error: signUpError.message };
      }

      let session = signUpData.session;
      if (!session) {
        const signInResult = await supabase.auth.signInWithPassword({ email, password });
        if (signInResult.error) {
          return {
            success: false,
            error: 'Signup created. Please confirm email, then log in.',
          };
        }
        session = signInResult.data.session;
      }

      await hydrateUserFromSession(session);

      if (role === 'brand') {
        await apiClient.post('/onboarding/brand', onboardingPayload);
      }

      if (role === 'influencer') {
        await apiClient.post('/onboarding/influencer/step1', { igHandle: onboardingPayload.igHandle });
        await apiClient.post('/onboarding/influencer/step2', {
          nichePrimary: onboardingPayload.nichePrimary,
          nicheSecondary: onboardingPayload.nicheSecondary,
          bio: onboardingPayload.bio,
        });
        await apiClient.post('/onboarding/influencer/step3', {
          portfolioUrl: onboardingPayload.portfolioUrl,
          mediaKitUrl: onboardingPayload.mediaKitUrl,
        });
        await apiClient.post('/onboarding/influencer/step4', {
          rateCards: onboardingPayload.rateCards,
        });
        await apiClient.post('/onboarding/influencer/complete');
      }

      const refreshed = await loadOnboardingStatus();
      setUser((prev) => ({
        ...(prev || {}),
        role: refreshed.role,
        onboardingCompleted: refreshed.onboardingCompleted,
        onboardingStep: refreshed.onboardingStep,
        verificationStatus: refreshed.verificationStatus,
      }));

      return { success: true, role: refreshed.role };
    } catch (error) {
      return { success: false, error: error.message || 'Signup failed' };
    } finally {
      setLoading(false);
    }
  }, [hydrateUserFromSession, loadOnboardingStatus]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setAccessToken(null);
  }, []);

  const updateUser = useCallback((updates) => {
    setUser((prev) => (prev ? { ...prev, ...updates } : prev));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        login,
        signup,
        logout,
        updateUser,
        isLoading: loading,
        authReady,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};

export default AuthContext;
