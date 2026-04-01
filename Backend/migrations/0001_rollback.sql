-- Rollback: 0001_init_schema
-- Drops all tables and enums created in 0001_init_schema.sql
-- Date: 2026-04-01

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS ai_outputs CASCADE;
DROP TABLE IF EXISTS admin_flags CASCADE;
DROP TABLE IF EXISTS admin_audit_log CASCADE;
DROP TABLE IF EXISTS idempotency_keys CASCADE;
DROP TABLE IF EXISTS ingest_jobs CASCADE;
DROP TABLE IF EXISTS collaboration_requests CASCADE;
DROP TABLE IF EXISTS shortlists CASCADE;
DROP TABLE IF EXISTS campaigns CASCADE;
DROP TABLE IF EXISTS rate_cards CASCADE;
DROP TABLE IF EXISTS influencer_stats CASCADE;
DROP TABLE IF EXISTS influencer_profiles CASCADE;
DROP TABLE IF EXISTS brand_profiles CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop ENUMs
DROP TYPE IF EXISTS ingest_status CASCADE;
DROP TYPE IF EXISTS collaboration_status CASCADE;
DROP TYPE IF EXISTS collaboration_type CASCADE;
DROP TYPE IF EXISTS subscription_status CASCADE;
DROP TYPE IF EXISTS subscription_tier CASCADE;
DROP TYPE IF EXISTS service_type CASCADE;
DROP TYPE IF EXISTS campaign_visibility CASCADE;
DROP TYPE IF EXISTS campaign_status CASCADE;
DROP TYPE IF EXISTS verification_status CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;
