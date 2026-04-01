-- Migration: 0001_init_schema
-- Creates all base tables, enums, and partial unique indexes
-- Date: 2026-04-01

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Rollback instructions:
-- DROP TABLE IF EXISTS ai_outputs CASCADE;
-- DROP TABLE IF EXISTS admin_flags CASCADE;
-- DROP TABLE IF EXISTS admin_audit_log CASCADE;
-- DROP TABLE IF EXISTS idempotency_keys CASCADE;
-- DROP TABLE IF EXISTS ingest_jobs CASCADE;
-- DROP TABLE IF EXISTS collaboration_requests CASCADE;
-- DROP TABLE IF EXISTS shortlists CASCADE;
-- DROP TABLE IF EXISTS campaigns CASCADE;
-- DROP TABLE IF EXISTS rate_cards CASCADE;
-- DROP TABLE IF EXISTS influencer_stats CASCADE;
-- DROP TABLE IF EXISTS influencer_profiles CASCADE;
-- DROP TABLE IF EXISTS brand_profiles CASCADE;
-- DROP TABLE IF EXISTS subscriptions CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;
-- DROP TYPE IF EXISTS user_role CASCADE;
-- DROP TYPE IF EXISTS verification_status CASCADE;
-- DROP TYPE IF EXISTS campaign_status CASCADE;
-- DROP TYPE IF EXISTS campaign_visibility CASCADE;
-- DROP TYPE IF EXISTS service_type CASCADE;
-- DROP TYPE IF EXISTS subscription_tier CASCADE;
-- DROP TYPE IF EXISTS subscription_status CASCADE;
-- DROP TYPE IF EXISTS collaboration_type CASCADE;
-- DROP TYPE IF EXISTS collaboration_status CASCADE;
-- DROP TYPE IF EXISTS ingest_status CASCADE;

-- Create ENUMs
CREATE TYPE user_role AS ENUM ('BRAND', 'INFLUENCER', 'ADMIN');
CREATE TYPE verification_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'FLAGGED');
CREATE TYPE campaign_status AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED');
CREATE TYPE campaign_visibility AS ENUM ('PRIVATE', 'MATCHED');
CREATE TYPE service_type AS ENUM ('STORY', 'POST', 'REEL', 'BUNDLE');
CREATE TYPE subscription_tier AS ENUM ('trial', 'basic', 'pro', 'enterprise');
CREATE TYPE subscription_status AS ENUM ('ACTIVE', 'INACTIVE', 'TRIAL', 'CANCELLED');
CREATE TYPE collaboration_type AS ENUM ('INVITE', 'APPLICATION');
CREATE TYPE collaboration_status AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'CLARIFICATION_REQUESTED');
CREATE TYPE ingest_status AS ENUM ('pending', 'running', 'success', 'partial_success', 'failed');

-- A. Identity Tables

-- users table
CREATE TABLE users (
  id UUID PRIMARY KEY,  -- Set explicitly from Supabase Auth user.id, not gen_random_uuid()
  email TEXT NOT NULL,
  role user_role NOT NULL,
  onboarding_step INTEGER DEFAULT 0,
  onboarding_completed BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Partial unique index: email reusable after soft delete
CREATE UNIQUE INDEX idx_users_email_active ON users(email) WHERE is_deleted = false;

-- brand_profiles table
CREATE TABLE brand_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  website TEXT,
  industry TEXT,
  target_demographics JSONB,
  budget_range_min INTEGER,
  budget_range_max INTEGER,
  tone_voice TEXT,
  campaign_goals JSONB,
  is_deleted BOOLEAN DEFAULT false
);

-- influencer_profiles table
CREATE TABLE influencer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  ig_handle TEXT NOT NULL,
  niche_primary TEXT NOT NULL,
  niche_secondary TEXT,
  bio TEXT,
  portfolio_url TEXT,
  media_kit_url TEXT,
  is_verified BOOLEAN DEFAULT false,
  verification_status verification_status DEFAULT 'PENDING',
  flag_reason TEXT,
  rejection_reason_code TEXT,
  resubmission_count INTEGER DEFAULT 0,
  last_resubmitted_at TIMESTAMPTZ,
  last_scraped_at TIMESTAMPTZ,
  is_deleted BOOLEAN DEFAULT false
);

-- Partial unique index: handle reusable after soft delete
CREATE UNIQUE INDEX idx_influencer_handle_active ON influencer_profiles(ig_handle) WHERE is_deleted = false;

-- B. Metrics & Stats Tables

-- influencer_stats table
CREATE TABLE influencer_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  influencer_id UUID NOT NULL REFERENCES influencer_profiles(id) ON DELETE CASCADE,
  follower_count INTEGER,
  following_count INTEGER,
  engagement_rate FLOAT,
  avg_likes INTEGER,
  avg_comments INTEGER,
  top_countries JSONB,
  age_split JSONB,
  gender_split JSONB,
  last_updated_at TIMESTAMPTZ
);

-- rate_cards table
CREATE TABLE rate_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  influencer_id UUID NOT NULL REFERENCES influencer_profiles(id) ON DELETE CASCADE,
  service_type service_type NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  display_currency TEXT
);

-- C. Subscription Tables

-- subscriptions table (schema-only for MVP, no enforcement)
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  tier subscription_tier NOT NULL,
  status subscription_status DEFAULT 'TRIAL',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- D. Campaign & Collaboration Tables

-- campaigns table
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brand_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status campaign_status DEFAULT 'DRAFT',
  brief_data JSONB,
  brief_preview TEXT,
  visibility campaign_visibility DEFAULT 'PRIVATE',
  budget NUMERIC(10,2),
  currency TEXT DEFAULT 'USD',
  niche_targets JSONB,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- shortlists table
CREATE TABLE shortlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brand_profiles(id) ON DELETE CASCADE,
  influencer_id UUID NOT NULL REFERENCES influencer_profiles(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  label TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Partial unique index to handle NULL campaign_id (Postgres treats NULL != NULL)
-- With campaign: unique per (brand, influencer, campaign)
CREATE UNIQUE INDEX idx_shortlists_brand_influencer_campaign 
  ON shortlists(brand_id, influencer_id, campaign_id) 
  WHERE campaign_id IS NOT NULL;

-- Without campaign: unique per (brand, influencer) when campaign is NULL
CREATE UNIQUE INDEX idx_shortlists_brand_influencer_no_campaign 
  ON shortlists(brand_id, influencer_id) 
  WHERE campaign_id IS NULL;

-- collaboration_requests table
CREATE TABLE collaboration_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES brand_profiles(id) ON DELETE CASCADE,
  influencer_id UUID NOT NULL REFERENCES influencer_profiles(id) ON DELETE CASCADE,
  type collaboration_type NOT NULL,
  status collaboration_status DEFAULT 'PENDING',
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (campaign_id, influencer_id, type)
);

-- E. Ingest & Admin Tables

-- ingest_jobs table
CREATE TABLE ingest_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  influencer_id UUID REFERENCES influencer_profiles(id) ON DELETE SET NULL,
  ig_handle TEXT NOT NULL,
  status ingest_status,
  failure_class TEXT,
  failure_detail TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- idempotency_keys table
CREATE TABLE idempotency_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  scope TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_hash TEXT NOT NULL,
  response_status INTEGER NOT NULL,
  response_body JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX idx_idempotency_keys_scope_user_key ON idempotency_keys(scope, user_id, key);
CREATE INDEX idx_idempotency_keys_expires_at ON idempotency_keys(expires_at);

-- admin_audit_log table (append-only)
CREATE TABLE admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  old_state JSONB,
  new_state JSONB,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- admin_flags table
CREATE TABLE admin_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  influencer_id UUID NOT NULL REFERENCES influencer_profiles(id) ON DELETE CASCADE,
  flag_type TEXT NOT NULL,
  flag_detail JSONB,
  resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ai_outputs table
CREATE TABLE ai_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES brand_profiles(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  ai_tool_type TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  token_count INTEGER,
  latency_ms INTEGER,
  output_schema_valid BOOLEAN NOT NULL,
  failure_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance

-- Identity indexes
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_deleted ON users(is_deleted);

-- Influencer indexes
CREATE INDEX idx_influencer_profiles_niche ON influencer_profiles(niche_primary);
CREATE INDEX idx_influencer_profiles_verification ON influencer_profiles(verification_status);
CREATE INDEX idx_influencer_profiles_is_deleted ON influencer_profiles(is_deleted);

-- Optimized discovery search index (replaces plain niche index for filtered queries)
CREATE INDEX idx_influencer_profiles_search
  ON influencer_profiles(niche_primary)
  WHERE is_deleted = false AND is_verified = true;

CREATE INDEX idx_influencer_stats_follower ON influencer_stats(follower_count);
CREATE INDEX idx_influencer_stats_engagement ON influencer_stats(engagement_rate);
CREATE INDEX idx_influencer_stats_influencer_id ON influencer_stats(influencer_id);

-- Supports filter + sort in one pass on stats (optimized for discovery join)
CREATE INDEX idx_influencer_stats_join_filter
  ON influencer_stats(influencer_id, follower_count DESC, engagement_rate);

-- Campaign indexes
CREATE INDEX idx_campaigns_brand ON campaigns(brand_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_is_deleted ON campaigns(is_deleted);
CREATE INDEX idx_shortlists_brand ON shortlists(brand_id);
CREATE INDEX idx_shortlists_influencer ON shortlists(influencer_id);
CREATE INDEX idx_collaboration_requests_campaign ON collaboration_requests(campaign_id);
CREATE INDEX idx_collaboration_requests_brand ON collaboration_requests(brand_id);
CREATE INDEX idx_collaboration_requests_influencer ON collaboration_requests(influencer_id);
CREATE INDEX idx_collaboration_requests_status ON collaboration_requests(status);

-- Ingest indexes
CREATE INDEX idx_ingest_jobs_handle ON ingest_jobs(ig_handle);
CREATE INDEX idx_ingest_jobs_status ON ingest_jobs(status);

-- Admin indexes
CREATE INDEX idx_admin_flags_influencer ON admin_flags(influencer_id);
CREATE INDEX idx_admin_flags_resolved ON admin_flags(resolved);
CREATE INDEX idx_admin_audit_log_actor ON admin_audit_log(actor_id);
CREATE INDEX idx_admin_audit_log_target ON admin_audit_log(target_type, target_id);
CREATE INDEX idx_admin_audit_log_created_at ON admin_audit_log(created_at);

-- AI outputs indexes
CREATE INDEX idx_ai_outputs_brand ON ai_outputs(brand_id);
CREATE INDEX idx_ai_outputs_tool_type ON ai_outputs(ai_tool_type);
CREATE INDEX idx_ai_outputs_created_at ON ai_outputs(created_at);
