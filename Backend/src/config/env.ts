import 'dotenv/config';

export type Env = {
  nodeEnv: string;
  port: number;
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  dailyAiTokenCap: number;
};

function requireVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function validateEnv(): Env {
  return {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: Number(process.env.PORT ?? 4000),
    supabaseUrl: requireVar('SUPABASE_URL'),
    supabaseServiceRoleKey: requireVar('SUPABASE_SERVICE_ROLE_KEY'),
    dailyAiTokenCap: Number(process.env.DAILY_AI_TOKEN_CAP ?? 100000)
  };
}
