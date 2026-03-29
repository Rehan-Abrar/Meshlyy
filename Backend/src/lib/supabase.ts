import { createClient } from '@supabase/supabase-js';
import { validateEnv } from '../config/env';

const env = validateEnv();

export const supabaseAdmin = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
  auth: { persistSession: false }
});
