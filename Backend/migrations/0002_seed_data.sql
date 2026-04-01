-- Seed Data for Testing
-- Creates fixture data for all tables to support testing
-- Date: 2026-04-01

-- Note: Run this AFTER 0001_init_schema.sql

-- Test users (matching Supabase Auth IDs would be required in production)
-- For testing, we'll use mock UUIDs

-- 1. ADMIN User
INSERT INTO users (id, email, role, onboarding_step, onboarding_completed, created_at)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'admin@meshly.com', 'ADMIN', 0, true, now());

-- 2. BRAND Users
INSERT INTO users (id, email, role, onboarding_step, onboarding_completed, created_at)
VALUES 
  ('10000000-0000-0000-0000-000000000001', 'brand1@example.com', 'BRAND', 5, true, now()),
  ('10000000-0000-0000-0000-000000000002', 'brand2@example.com', 'BRAND', 5, true, now()),
  ('10000000-0000-0000-0000-000000000003', 'newbrand@example.com', 'BRAND', 2, false, now());

-- 3. INFLUENCER Users
INSERT INTO users (id, email, role, onboarding_step, onboarding_completed, created_at)
VALUES 
  ('20000000-0000-0000-0000-000000000001', 'fashion.influencer@example.com', 'INFLUENCER', 5, true, now()),
  ('20000000-0000-0000-0000-000000000002', 'fitness.guru@example.com', 'INFLUENCER', 5, true, now()),
  ('20000000-0000-0000-0000-000000000003', 'tech.reviewer@example.com', 'INFLUENCER', 5, true, now()),
  ('20000000-0000-0000-0000-000000000004', 'food.blogger@example.com', 'INFLUENCER', 5, true, now()),
  ('20000000-0000-0000-0000-000000000005', 'travel.explorer@example.com', 'INFLUENCER', 5, true, now()),
  ('20000000-0000-0000-0000-000000000006', 'pending.influencer@example.com', 'INFLUENCER', 3, false, now());

-- Brand Profiles
INSERT INTO brand_profiles (id, user_id, company_name, website, industry, budget_range_min, budget_range_max, tone_voice)
VALUES 
  ('b0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'FashionCo', 'https://fashionco.com', 'Fashion', 5000, 50000, 'Modern and trendy'),
  ('b0000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'TechStart', 'https://techstart.io', 'Technology', 10000, 100000, 'Professional and innovative');

-- Influencer Profiles
INSERT INTO influencer_profiles (id, user_id, ig_handle, niche_primary, niche_secondary, bio, is_verified, verification_status, last_scraped_at)
VALUES 
  ('a0000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'fashion_maven', 'Fashion', 'Beauty', 'Fashion influencer based in NYC', true, 'APPROVED', now()),
  ('a0000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'fit_lifestyle', 'Fitness', 'Health', 'Personal trainer and wellness coach', true, 'APPROVED', now()),
  ('a0000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', 'tech_reviews_pro', 'Technology', 'Gaming', 'Gadget reviewer and tech enthusiast', true, 'APPROVED', now()),
  ('a0000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000004', 'foodie_adventures', 'Food', 'Travel', 'Food blogger exploring local cuisines', true, 'APPROVED', now()),
  ('a0000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000005', 'travel_diaries', 'Travel', 'Photography', 'Travel photographer and storyteller', true, 'APPROVED', now()),
  ('a0000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000006', 'pending_creator', 'Lifestyle', NULL, 'New creator on the platform', false, 'PENDING', NULL);

-- Influencer Stats
INSERT INTO influencer_stats (influencer_id, follower_count, following_count, engagement_rate, avg_likes, avg_comments, last_updated_at)
VALUES 
  ('a0000000-0000-0000-0000-000000000001', 250000, 1200, 4.5, 11250, 450, now()),
  ('a0000000-0000-0000-0000-000000000002', 150000, 800, 5.2, 7800, 390, now()),
  ('a0000000-0000-0000-0000-000000000003', 180000, 950, 4.8, 8640, 360, now()),
  ('a0000000-0000-0000-0000-000000000004', 120000, 600, 6.1, 7320, 366, now()),
  ('a0000000-0000-0000-0000-000000000005', 300000, 1500, 3.9, 11700, 585, now());

-- Rate Cards
INSERT INTO rate_cards (influencer_id, service_type, price, currency)
VALUES 
  ('a0000000-0000-0000-0000-000000000001', 'POST', 2500.00, 'USD'),
  ('a0000000-0000-0000-0000-000000000001', 'STORY', 800.00, 'USD'),
  ('a0000000-0000-0000-0000-000000000001', 'REEL', 3000.00, 'USD'),
  ('a0000000-0000-0000-0000-000000000002', 'POST', 1800.00, 'USD'),
  ('a0000000-0000-0000-0000-000000000002', 'STORY', 600.00, 'USD'),
  ('a0000000-0000-0000-0000-000000000003', 'POST', 2200.00, 'USD'),
  ('a0000000-0000-0000-0000-000000000003', 'REEL', 2800.00, 'USD'),
  ('a0000000-0000-0000-0000-000000000004', 'POST', 1500.00, 'USD'),
  ('a0000000-0000-0000-0000-000000000004', 'STORY', 500.00, 'USD'),
  ('a0000000-0000-0000-0000-000000000005', 'POST', 3500.00, 'USD'),
  ('a0000000-0000-0000-0000-000000000005', 'REEL', 4200.00, 'USD');

-- Campaigns
INSERT INTO campaigns (id, brand_id, title, status, brief_preview, budget, currency, niche_targets, created_at)
VALUES 
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Summer Collection Launch', 'ACTIVE', 'Promote our new summer collection with authentic lifestyle content featuring our sustainable fashion line.', 25000.00, 'USD', '["Fashion", "Lifestyle"]'::jsonb, now()),
  ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'Tech Product Review Campaign', 'ACTIVE', 'Looking for tech reviewers to test and review our new AI-powered productivity tool.', 15000.00, 'USD', '["Technology", "Productivity"]'::jsonb, now()),
  ('c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'Fall Campaign Draft', 'DRAFT', 'Planning phase for fall collection', 30000.00, 'USD', '["Fashion"]'::jsonb, now());

-- Shortlists
INSERT INTO shortlists (brand_id, influencer_id, campaign_id, label)
VALUES 
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Top Choice'),
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000001', 'Backup'),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000002', 'Perfect Fit');

-- Collaboration Requests
INSERT INTO collaboration_requests (campaign_id, brand_id, influencer_id, type, status, message, created_at)
VALUES 
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'INVITE', 'ACCEPTED', 'We love your aesthetic and think you would be perfect for our summer campaign!', now()),
  ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003', 'INVITE', 'PENDING', 'Your tech reviews are amazing. Would love to collaborate on our new product launch.', now()),
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 'APPLICATION', 'PENDING', 'I am interested in your summer campaign and would love to be part of it.', now());

-- Ingest Jobs
INSERT INTO ingest_jobs (influencer_id, ig_handle, status, started_at, completed_at)
VALUES 
  ('a0000000-0000-0000-0000-000000000001', 'fashion_maven', 'success', now() - interval '1 hour', now() - interval '55 minutes'),
  ('a0000000-0000-0000-0000-000000000002', 'fit_lifestyle', 'success', now() - interval '2 hours', now() - interval '1 hour 55 minutes'),
  ('a0000000-0000-0000-0000-000000000006', 'pending_creator', 'pending', now(), NULL);

-- Admin Flags
INSERT INTO admin_flags (influencer_id, flag_type, flag_detail, resolved)
VALUES 
  ('a0000000-0000-0000-0000-000000000006', 'SUSPICIOUS_METRICS', '{"reason": "Engagement rate anomaly detected"}'::jsonb, false);

-- AI Outputs (sample logs)
INSERT INTO ai_outputs (brand_id, campaign_id, ai_tool_type, prompt_version, token_count, latency_ms, output_schema_valid, created_at)
VALUES 
  ('b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'brief', 'brief-v1.0.0', 1200, 2800, true, now() - interval '2 days'),
  ('b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'strategy', 'strategy-v1.0.0', 1800, 3200, true, now() - interval '2 days'),
  ('b0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', 'brief', 'brief-v1.0.0', 1100, 2600, true, now() - interval '1 day'),
  ('b0000000-0000-0000-0000-000000000001', NULL, 'fit_score', 'fit_score-v1.0.0', 800, 1500, true, now() - interval '12 hours');

-- Admin Audit Log
INSERT INTO admin_audit_log (actor_id, action, target_type, target_id, old_state, new_state, reason, created_at)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'VERIFY_APPROVE', 'influencer_profile', 'a0000000-0000-0000-0000-000000000001', '{"verification_status": "PENDING"}'::jsonb, '{"verification_status": "APPROVED", "is_verified": true}'::jsonb, 'Profile verified successfully', now() - interval '5 days'),
  ('00000000-0000-0000-0000-000000000001', 'VERIFY_APPROVE', 'influencer_profile', 'a0000000-0000-0000-0000-000000000002', '{"verification_status": "PENDING"}'::jsonb, '{"verification_status": "APPROVED", "is_verified": true}'::jsonb, 'Profile verified successfully', now() - interval '4 days');
