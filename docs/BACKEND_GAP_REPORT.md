# BACKEND GAP REPORT

Date: 2026-04-13
Project: Meshlyy MVP
Prepared by: Integration batch status refresh

## Source of Truth Used in This Refresh
1. Backend implementation: `Backend/src/routes`, `Backend/src/services`
2. Frontend implementation: `Frontend/src`
3. Backend docs: `Backend/docs`

## Scope Note
This update supersedes prior gap counts and marks items that are now implemented in code after the latest integration batch.

## Gap Summary (Current)
- Critical: 0
- High: 2
- Medium: 4
- Low: 0

---

## A) Resolved Since Previous Report

### Resolved 1: Influencer AI endpoint
- Implemented: `POST /v1/ai/influencer/content-brief`
- Includes influencer ownership validation for collaboration/campaign scope.

### Resolved 2: Collaboration detail endpoint
- Implemented: `GET /v1/collaborations/:id`
- Ownership enforced in service layer.

### Resolved 3: Incoming collaboration feed enrichment
- Implemented enhancement: `GET /v1/collaborations/incoming` now includes joined brand metadata (`brand.id`, `brand.company_name`).

### Resolved 4: Profile read/update endpoints
- Implemented:
  - `GET /v1/profile/me`
  - `PATCH /v1/profile/me`

### Resolved 5: Influencer dashboard aggregate endpoint
- Implemented: `GET /v1/influencer/dashboard`
- Frontend KPI cards now consume live backend metrics.

### Resolved 6: Ingest durability and retry behavior
- Implemented in `IngestService`:
  - background worker polling,
  - stale-running recovery,
  - transient-failure retry scheduling with exponential backoff,
  - periodic refresh enqueue for stale verified profiles.

### Resolved 7: `totalViews30d` pipeline hardening
- Implemented in `ApifyService` + ingest persistence path:
  - derives metrics from post-level data when aggregate fields are missing,
  - computes and stores `total_views_30d`,
  - returns nullable value to dashboard instead of hardcoded zero.

---

## B) Active Backend Gaps

### Gap 1: Notifications API missing
- Feature: Brand/influencer notifications feed
- Current impact: Dashboard notifications remain static.
- Missing endpoints:
  - `GET /v1/notifications`
  - `PATCH /v1/notifications/:id/read`
- Priority: high

### Gap 2: Admin moderation API surface not mounted in current backend app
- Feature: Admin verification workflow
- Current impact: Admin frontend calls cannot resolve in this branch because `/v1/admin/*` routes are not mounted.
- Required if admin is in MVP scope:
  - Mount and support admin routes in `Backend/src/app.ts`, or
  - Explicitly defer admin workflows to post-MVP and hide/disable admin UI paths.
- Priority: high

### Gap 3: Onboarding asset attachment contract is partial
- Current backend state:
  - No mounted `/v1/media/*` API in current backend app branch.
- Missing piece:
  - No persisted asset-attachment API linked to onboarding/profile records.
- Priority: medium

### Gap 4: Unified auth bootstrap endpoint absent (recommended)
- Current frontend behavior: Hydrates from Supabase session + `/v1/onboarding/status`.
- Recommended endpoint:
  - `GET /v1/auth/me` returning user, role, onboarding state, and role profile in one response.
- Priority: medium

### Gap 5: Admin queue decision contract inconsistency with typical REST shape
- Applies only if admin API is retained in MVP scope.
- Suggested optional improvement:
  - Add `PATCH /v1/admin/verification-queue/:id` with `{ decision, reason? }` while retaining existing action endpoints.
- Priority: medium

### Gap 6: Production migration rollout dependency (operational)
- New backend behavior expects migration `Backend/migrations/0003_production_ingest_hardening.sql` to be applied for full effectiveness.
- Current code includes partial backward compatibility for reads, but without migration:
  - `total_views_30d` cannot be persisted,
  - ingest-job indexes are missing.
- Priority: medium

---

## C) Documentation vs Implementation Drift (Still Open)

### Drift 1: Collaboration status enum mismatch
- Docs (`Backend/docs/collaboration.md`) include `CLARIFICATION_REQUESTED`.
- Route validation currently allows only `ACCEPTED | DECLINED`.
- Priority: high

### Drift 2: Influencer onboarding step-4 semantics mismatch
- Docs (`Backend/docs/phase2-summary.md`) imply step 4 triggers ingest completion.
- Implementation requires explicit `POST /v1/onboarding/influencer/complete` after step 4.
- Priority: high

### Drift 3: Resubmission cooldown/limit mismatch
- Docs (`Backend/docs/phase2-summary.md`) state 7-day cooldown, max 3 attempts.
- Implementation (`InfluencerService`) uses 24-hour cooldown, max 5 attempts.
- Priority: high

---

## D) Recommended Delivery Order
1. Implement notifications API.
2. Decide admin MVP scope (mount admin routes or defer/hide admin UI).
3. Add onboarding media/asset persistence contract if onboarding attachments are in MVP scope.
4. Resolve docs/implementation drifts listed above.
5. Optionally add unified `GET /v1/auth/me` bootstrap endpoint.
