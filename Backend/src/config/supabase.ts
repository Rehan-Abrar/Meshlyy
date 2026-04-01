// Supabase client configuration

import { createClient } from '@supabase/supabase-js';
import config from './env';

// Service role client - never expose to frontend
export const supabase = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// JWT verification using Supabase's public key
export async function verifySupabaseJWT(token: string): Promise<any> {
  const { data, error } = await supabase.auth.getUser(token);
  
  if (error || !data.user) {
    throw new Error('Invalid token');
  }
  
  return data.user;
}
