/**
 * Supabase client for frontend authentication.
 *
 * Uses VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from .env.
 * If Supabase is not configured (keys missing), the client is null
 * and the app falls back to mock authentication in AuthContext.
 */
import { createClient } from '@supabase/supabase-js';
import { clearStoredAuth, getStoredToken, setStoredAuth } from './authSession';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * supabase will be null if env vars are missing — this signals
 * "dev-only mock mode" to AuthContext.
 */
export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

/**
 * Get the current Supabase session JWT, or null if not logged in
 * or Supabase is not configured.
 */
export async function getAccessToken() {
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token ?? null;
    if (token) return token;
  }

  return getStoredToken();
}

export async function loginWithSupabase(email, password) {
  if (!supabase) {
    return { success: false, error: 'Supabase is not configured for this environment.' };
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.session || !data.user) {
    return { success: false, error: error?.message || 'Unable to login.' };
  }

  return {
    success: true,
    session: data.session,
    user: data.user,
  };
}

export async function signUpWithSupabase(email, password, metadata = {}) {
  if (!supabase) {
    return { success: false, error: 'Supabase is not configured for this environment.' };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    session: data.session,
    user: data.user,
  };
}

export async function logoutSupabase() {
  if (supabase) {
    await supabase.auth.signOut();
  }
  clearStoredAuth();
}

export function persistAuthSession(user, token) {
  setStoredAuth({ user, token });
}
