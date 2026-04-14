# Phase 1 Migration Guide

## Overview
This directory contains SQL migrations for the Meshly backend database schema.

## Migration Files

1. **0001_init_schema.sql** - Creates all tables, enums, indexes, and constraints
2. **0001_rollback.sql** - Rollback script for init schema  
3. **0002_seed_data.sql** - Test fixture data for development and testing
4. **0003_production_ingest_hardening.sql** - Adds production ingest/stat hardening fields and indexes
5. **0004_shortlists_soft_delete.sql** - Adds shortlist soft-delete column and active-row unique indexes

## How to Run Migrations

### Option 1: Supabase SQL Editor (Recommended)

1. Go to your Supabase project dashboard:
   https://app.supabase.com/project/fzpgxfbstdqvydkodgeu/sql

2. Open a new query

3. Copy and paste the contents of `0001_init_schema.sql`

4. Click "Run" to execute

5. After success, run `0002_seed_data.sql` the same way

6. For production-ready ingest/stats behavior, run `0003_production_ingest_hardening.sql`

7. For shortlist soft-delete support, run `0004_shortlists_soft_delete.sql`

### Option 2: Using psql

```bash
# Get your database connection string from Supabase dashboard
# Settings > Database > Connection string > URI

psql "postgresql://postgres:[YOUR-PASSWORD]@db.fzpgxfbstdqvydkodgeu.supabase.co:5432/postgres" -f migrations/0001_init_schema.sql

psql "postgresql://postgres:[YOUR-PASSWORD]@db.fzpgxfbstdqvydkodgeu.supabase.co:5432/postgres" -f migrations/0002_seed_data.sql

psql "postgresql://postgres:[YOUR-PASSWORD]@db.fzpgxfbstdqvydkodgeu.supabase.co:5432/postgres" -f migrations/0003_production_ingest_hardening.sql

psql "postgresql://postgres:[YOUR-PASSWORD]@db.fzpgxfbstdqvydkodgeu.supabase.co:5432/postgres" -f migrations/0004_shortlists_soft_delete.sql
```

## Rolling Back

To rollback the schema (⚠️ **destroys all data**):

```bash
psql "postgresql://[connection-string]" -f migrations/0001_rollback.sql
```

Or via Supabase SQL Editor, copy and run `0001_rollback.sql`.

## Key Features

### Partial Unique Indexes
- `users.email` - unique only where `is_deleted = false`
- `influencer_profiles.ig_handle` - unique only where `is_deleted = false`

This allows email and handle reuse after soft delete.

### Soft Delete Pattern
All tables with user-facing data use `is_deleted` boolean flag. Hard deletes are forbidden in application code.

### Admin Audit Trail
The `admin_audit_log` table is append-only. Every admin action that mutates verification state writes a row here in the same transaction.

### AI Outputs
The `ai_outputs` table logs metadata only (no raw content). Rows are hard-deleted after 30 days.

## Verification Checklist

After running migrations:

- [ ] All tables created successfully
- [ ] Partial unique indexes active (`\d users` and `\d influencer_profiles` to verify)
- [ ] Seed data inserted without constraint violations
- [ ] Soft delete works: update a user with `is_deleted = true`, verify email can be reused
- [ ] Rollback script tested on a fresh database

## Query Performance

After seeding, run discovery search query with `EXPLAIN ANALYZE` and save output to `docs/query-analysis.md` (see Phase 1 exit criteria).
