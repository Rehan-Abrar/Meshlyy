-- Phase 6: Convert shortlists to soft-delete semantics
-- Adds is_deleted column and updates uniqueness constraints to consider only active rows.

BEGIN;

ALTER TABLE shortlists
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;

DROP INDEX IF EXISTS idx_shortlists_brand_influencer_campaign;
DROP INDEX IF EXISTS idx_shortlists_brand_influencer_no_campaign;

CREATE UNIQUE INDEX IF NOT EXISTS idx_shortlists_brand_influencer_campaign
  ON shortlists(brand_id, influencer_id, campaign_id)
  WHERE campaign_id IS NOT NULL AND is_deleted = false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_shortlists_brand_influencer_no_campaign
  ON shortlists(brand_id, influencer_id)
  WHERE campaign_id IS NULL AND is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_shortlists_is_deleted ON shortlists(is_deleted);

COMMIT;
