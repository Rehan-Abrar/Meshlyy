-- Migration: 0003_production_ingest_hardening
-- Adds production ingest/stats hardening fields and indexes
-- Date: 2026-04-13

-- 1) Ensure influencer_stats can persist 30-day views
ALTER TABLE influencer_stats
  ADD COLUMN IF NOT EXISTS total_views_30d INTEGER;

-- 2) Make influencer_stats upsert-safe on influencer_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'uq_influencer_stats_influencer_id'
  ) THEN
    ALTER TABLE influencer_stats
      ADD CONSTRAINT uq_influencer_stats_influencer_id UNIQUE (influencer_id);
  END IF;
END $$;

-- 3) Speed up worker scans and retry lookups
CREATE INDEX IF NOT EXISTS idx_ingest_jobs_status_started_at
  ON ingest_jobs(status, started_at);

CREATE INDEX IF NOT EXISTS idx_ingest_jobs_handle_status_started_at
  ON ingest_jobs(ig_handle, status, started_at DESC);
