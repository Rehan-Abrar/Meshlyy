// Environment configuration with Zod validation

import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)).default('3000'),
  
  // Supabase
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_JWT_SECRET: z.string().min(1),
  
  // Cloudinary
  CLOUDINARY_CLOUD_NAME: z.string().min(1),
  CLOUDINARY_API_KEY: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),
  
  // Gemini
  GEMINI_API_KEY: z.string().min(1),
  
  // Apify
  APIFY_API_KEY: z.string().min(1),
  APIFY_ACTOR_ID: z.string().min(1),
  
  // Resend
  RESEND_API_KEY: z.string().min(1),
  
  // Budget Caps
  DAILY_AI_TOKEN_CAP: z.string().transform(Number).pipe(z.number().min(0)).default('100000'),
  DAILY_APIFY_SPEND_CAP: z.string().transform(Number).pipe(z.number().min(0)).default('50'),
  
  // Timeouts
  REQUEST_TIMEOUT_MS: z.string().transform(Number).pipe(z.number().min(0)).default('5000'),
  APIFY_TIMEOUT_MS: z.string().transform(Number).pipe(z.number().min(0)).default('30000'),
  GEMINI_TIMEOUT_MS: z.string().transform(Number).pipe(z.number().min(0)).default('10000'),
});

export type EnvConfig = z.infer<typeof envSchema>;

let config: EnvConfig;

try {
  config = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('❌ Environment validation failed:');
    error.errors.forEach((err) => {
      console.error(`  ${err.path.join('.')}: ${err.message}`);
    });
    process.exit(1);
  }
  throw error;
}

export default config;
