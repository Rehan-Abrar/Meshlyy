# Meshly Backend Engineering Plan v2.0

## Change Log

- v1.0: Full rewrite. Two-sided Instagram marketplace. Covers auth, roles, onboarding, subscriptions, discovery, campaigns, AI co-pilot, admin/trust layer, integrations, and infrastructure.
- v2.0: Auth source-of-truth unified to Supabase Auth (password_hash removed). JWT slimmed to identity-only claims; mutable state loaded from DB on every protected request. In-memory lock/cache/budget interfaces abstracted for Redis swap. Partial unique indexes replace plain UNIQUE on soft-deletable fields. Supabase session management replaces custom refresh token flow. Admin audit trail added (DB table + structured logs). AI response logging policy defined (redaction + 30-day retention). Subscription errors changed from 402 to 403 + SUBSCRIPTION_REQUIRED. OpenAI fallback deferred to post-MVP. Cloudinary upload URL scoping enforced. Resubmission throttle and handle-release flow added. ai_outputs table added to schema. Phase ordering conflict resolved.
- v2.1: Subscription monetization deferred to post-MVP. MVP keeps schema scaffolding only (subscriptions table + optional authContext fields), disables tier enforcement and feature gates, and opens AI co-pilot to all authenticated brands with budget caps still enforced.
- v2.2: Product positioning reframed as an AI-powered campaign intelligence platform with an influencer marketplace execution layer. AI co-pilot expanded from single brief generation to a multi-tool Campaign Intelligence Suite (`strategy`, `brief`, `fit_score`, `content_brief`). `ai_outputs` extended with `ai_tool_type` for observability and admin filtering.

---

## Purpose

Meshly is an AI-powered marketing platform for brands — combining campaign intelligence tools with an influencer marketplace. Brands plan, build, and refine campaigns with AI, then discover and connect with the right creators to execute them.

This document is the complete, build-ready backend specification for that workflow. It defines every service, data model, endpoint contract, middleware rule, and integration required to ship a functional MVP where influencer discovery is the execution layer of a broader AI marketing system.

---

## Architecture Overview

- **Pattern:** Modular Monolith (Service-Based) with a BFF (Backend-for-Frontend) layer.
- **Runtime:** Node.js + Express + TypeScript.
- **Database:** PostgreSQL via Supabase (service role on backend only). Frontend never queries Supabase directly.
- **Auth:** Supabase Auth is the sole credential store. JWTs are issued by Supabase and verified on the backend. The `users` table holds profile and authorization metadata only — no `password_hash`.
- **Session Management:** Supabase Auth handles refresh tokens, rotation, and revocation entirely. No custom refresh token flow.
- **Media:** Cloudinary (images and portfolio assets).
- **AI:** Gemini only for MVP. OpenAI fallback deferred to post-MVP.
- **Scraping:** Apify for Instagram handle verification and stats ingestion.
- **Email:** Resend for transactional notifications.
- **Monitoring:** Winston/Morgan for structured logging; Sentry for exception tracking.

---

## Priority Tiers

### Tier 1 — Must Have Before Any Feature Work

1. Request validation on every endpoint (Zod).
2. Auth middleware: JWT verification (Supabase), role extraction, mutable state loaded from DB, onboarding guard.
3. DB schema with all constraints, FKs, and indexes before any service is built.
4. Idempotent Apify ingest with explicit failure taxonomy.
5. Global request timeout middleware.
6. Lock, cache, and budget tracker behind abstracted interfaces (swap-ready for Redis).

### Tier 2 — Build During Feature Development

1. Subscription scaffolding only (schema and optional authContext fields). No tier enforcement in MVP.
2. Faceted search with `EXPLAIN ANALYZE` gate before Phase 4 ships.
3. Caching layer (in-process `node-cache` behind `CacheStore` interface for MVP).
4. Ingest concurrency lock (behind `LockStore` interface).
5. Budget middleware before AI co-pilot endpoint (behind `BudgetStore` interface).
6. Structured error response schema.
7. AI response logging with redaction and 30-day retention.

### Tier 3 — Post-MVP

1. Cursor-based pagination (offset acceptable up to ~10k records).
2. Redis swap for `LockStore`, `CacheStore`, and `BudgetStore` (needed if multi-instance).
3. Full analytics dashboard for Admin.
4. RLS hardening if any direct Supabase client access is introduced.
5. OpenAI fallback chain for Gemini.
6. Subscription monetization rollout: `subscriptionGuard` enforcement, `FEATURE_GATES` activation, and upgrade/downgrade lifecycle.

---

## Role & Auth Model

### Roles

| Role | Description |
|---|---|
| `BRAND` | Company or individual running influencer campaigns. |
| `INFLUENCER` | Creator with an Instagram Business/Creator account. |
| `ADMIN` | Meshly staff. Full platform access and moderation powers. |

### Role Assignment

Role is chosen by the user at signup. It is stored in the `users` table. It cannot be changed post-signup without Admin intervention. Role is embedded in the JWT for routing convenience only — authorization decisions always re-read from DB.

### Auth Source of Truth

Supabase Auth is the only credential store. The `users` table contains no `password_hash`. On signup, Supabase Auth creates the session; the backend creates the corresponding `users` row using the Supabase `user.id` as the primary key. Password reset, email verification, and session revocation are handled entirely by Supabase Auth.

### User Provisioning Contract (Supabase -> users)

To avoid auth race conditions, user provisioning follows a deterministic contract:

1. Signup path (synchronous): after successful Supabase signup, backend upserts the `users` row in the same request flow before returning success.
2. Login path safety: `loadAuthContext` retries one short window (for example 2 attempts over 500ms total) before returning `USER_NOT_FOUND`.
3. Optional webhook backfill: if signup provisioning fails after session issuance, a background repair job/webhook upserts missing `users` rows.
4. The `users.id` must always equal Supabase `auth.users.id`.

If provisioning cannot complete, return a deterministic `503` with `AUTH_CONTEXT_UNAVAILABLE` and do not proceed to protected feature routes.

### JWT Structure

The JWT is issued by Supabase Auth and contains identity claims only. Mutable authorization state is never stored in the token.

```json
{
  "sub": "user_uuid",
  "role": "BRAND",
  "iat": 1700000000,
  "exp": 1700086400
}
```

Fields intentionally omitted from JWT: `onboarding_completed`, `subscription_tier`, `brand_id`. In MVP, `loadAuthContext` resolves onboarding and ownership state from DB; subscription fields remain optional placeholders and are not populated until subscriptions launch post-MVP.

### authContext Shape

```typescript
interface AuthContext {
  userId: string;
  role: 'BRAND' | 'INFLUENCER' | 'ADMIN';
  brandId?: string;           // loaded from brand_profiles
  onboardingCompleted: boolean; // loaded from users
  subscriptionTier?: string;  // reserved for post-MVP subscriptions rollout
  subscriptionStatus?: string; // reserved for post-MVP subscriptions rollout
}
```

This object is the canonical source for all downstream authorization logic. Middleware and handlers must read from `req.authContext`, never from the raw JWT payload for anything beyond `sub` and `role`.

### Authorization Source Enforcement Rule

Enforcement is mandatory:

1. Authorization checks must only read `req.authContext`.
2. Raw JWT payload is allowed only for identity bootstrap (`sub`) and coarse telemetry.
3. New route PRs are blocked if role/tier/onboarding checks use token claims directly.
4. Add a static guardrail (lint/custom rule or code-review checklist) to prevent regression.

### Middleware Stack (Applied in Order)

1. `verifyToken` — validates JWT signature using Supabase's public key. Returns `401` if invalid or expired.
2. `loadAuthContext` — queries `users` and `brand_profiles` (if BRAND) to populate `req.authContext`. Returns `401` if user row not found. This is where all MVP mutable state is resolved.
3. `checkRole(['BRAND'])` — asserts the required role from `req.authContext.role`. Returns `403` if mismatched.
4. `onboardingGuard` — if `req.authContext.onboardingCompleted === false`, blocks access to all core platform routes. Allows: public pages, auth endpoints, onboarding endpoints. Returns `403` with redirect hint to last saved onboarding step.
5. `subscriptionGuard` — MVP behavior is pass-through (no gating, always `next()`). Post-MVP behavior checks `req.authContext.subscriptionTier` against `FEATURE_GATES` and returns `403` with `{ code: "SUBSCRIPTION_REQUIRED" }` if tier is insufficient.
6. `budgetMiddleware` — runs before AI and ingest endpoints only. Checks daily spend via `BudgetStore`. Returns `429` with `Retry-After` header if cap is reached.

### Abstracted Store Interfaces

All stateful coordination that will move to Redis post-MVP must be behind typed interfaces from day one. Never call `node-cache` or an in-memory `Map` directly in business logic.

```typescript
interface LockStore {
  acquire(key: string, ttlMs: number): Promise<boolean>;
  release(key: string): Promise<void>;
}

interface CacheStore {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlMs: number): Promise<void>;
  delete(key: string): Promise<void>;
}

interface BudgetStore {
  getSpend(key: string): Promise<number>;
  incrementSpend(key: string, amount: number): Promise<number>;
  resetAtMidnightUTC(key: string): Promise<void>;
}
```

MVP implementations use `node-cache` and in-memory `Map`. Swapping to Redis requires only a new implementation of each interface — no business logic changes.

### Public vs Protected Endpoints

| Endpoint | Auth | Notes |
|---|---|---|
| `GET /v1/health` | No | Always public. |
| `POST /v1/auth/signup` | No | Role selected here. Supabase Auth creates session. |
| `POST /v1/auth/login` | No | Supabase Auth handles. Returns JWT + session. |
| `GET /v1/creators` | Yes (BRAND) | MVP: role-based access only. |
| `GET /v1/creators/:id` | Yes (BRAND) | MVP: role-based access only. |
| `GET /v1/campaigns/matched` | Yes (INFLUENCER) | Rate-limited. Brief data truncated. |
| `POST /v1/campaigns` | Yes (BRAND) | MVP: role-based access only. |
| `POST /v1/shortlists/*` | Yes (BRAND) | Scoped to `brand_id` from authContext. |
| `POST /v1/ai/strategy` | Yes (BRAND) | Role + budget gated (no subscription gate in MVP). |
| `POST /v1/ai/brief` | Yes (BRAND) | Role + budget gated (no subscription gate in MVP). |
| `POST /v1/ai/fit-score/:influencerId` | Yes (BRAND) | Role + budget gated (no subscription gate in MVP). |
| `POST /v1/ai/content-brief/:influencerId` | Yes (BRAND) | Role + budget gated (no subscription gate in MVP). |
| `GET /v1/media/upload-url` | Yes (any role) | URL scoped to `req.authContext.userId` only. |
| `POST /v1/onboarding/*` | Yes (any role) | No onboarding guard applied. |
| `GET /v1/admin/*` | Yes (ADMIN) | Admin role only. |
| `POST /v1/ingest/*` | Yes (ADMIN or service token) | Internal use. |

Any endpoint not listed defaults to requiring auth.

---

## Database Schema

### Design Rules

- All timestamps are `TIMESTAMPTZ`.
- All primary keys are `UUID` with `DEFAULT gen_random_uuid()`.
- Soft deletes via `is_deleted BOOLEAN DEFAULT false`. Hard deletes forbidden in application code.
- Uniqueness on soft-deletable fields uses **partial unique indexes** (`WHERE is_deleted = false`), not plain `UNIQUE` constraints. This allows reuse of emails and handles after soft delete.
- All brand-owned resources carry a non-nullable `brand_id` FK.
- All queries filter `is_deleted = false` by default.
- No `password_hash` column anywhere in the schema. Supabase Auth owns credentials.

---

### A. Identity Tables

**`users`**

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK — must match Supabase Auth `user.id` |
| `email` | TEXT | NOT NULL |
| `role` | ENUM('BRAND','INFLUENCER','ADMIN') | NOT NULL |
| `onboarding_step` | INT | DEFAULT 0 |
| `onboarding_completed` | BOOL | DEFAULT false |
| `is_deleted` | BOOL | DEFAULT false |
| `created_at` | TIMESTAMPTZ | DEFAULT now() |

```sql
-- Partial unique index: email reusable after soft delete
CREATE UNIQUE INDEX idx_users_email_active ON users(email) WHERE is_deleted = false;
```

Note: `id` is not `gen_random_uuid()` — it is set explicitly from Supabase Auth's `user.id` at row creation time to keep the two systems in sync.

**`brand_profiles`**

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `user_id` | UUID | FK → users.id, UNIQUE |
| `company_name` | TEXT | NOT NULL |
| `website` | TEXT | |
| `industry` | TEXT | |
| `target_demographics` | JSONB | |
| `budget_range_min` | INT | |
| `budget_range_max` | INT | |
| `tone_voice` | TEXT | |
| `campaign_goals` | JSONB | |
| `is_deleted` | BOOL | DEFAULT false |

**`influencer_profiles`**

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `user_id` | UUID | FK → users.id, UNIQUE |
| `ig_handle` | TEXT | NOT NULL |
| `niche_primary` | TEXT | NOT NULL |
| `niche_secondary` | TEXT | |
| `bio` | TEXT | |
| `portfolio_url` | TEXT | |
| `media_kit_url` | TEXT | |
| `is_verified` | BOOL | DEFAULT false |
| `verification_status` | ENUM('PENDING','APPROVED','REJECTED','FLAGGED') | DEFAULT 'PENDING' |
| `flag_reason` | TEXT | |
| `rejection_reason_code` | TEXT | |
| `resubmission_count` | INT | DEFAULT 0 |
| `last_resubmitted_at` | TIMESTAMPTZ | |
| `last_scraped_at` | TIMESTAMPTZ | |
| `is_deleted` | BOOL | DEFAULT false |

```sql
-- Partial unique index: handle reusable after soft delete, and admin handle-release works automatically
CREATE UNIQUE INDEX idx_influencer_handle_active ON influencer_profiles(ig_handle) WHERE is_deleted = false;
```

---

### B. Metrics & Stats Tables

**`influencer_stats`**

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PK | |
| `influencer_id` | UUID | FK → influencer_profiles.id | |
| `follower_count` | INT | | |
| `following_count` | INT | | |
| `engagement_rate` | FLOAT | | |
| `avg_likes` | INT | | |
| `avg_comments` | INT | | |
| `top_countries` | JSONB | | Optional. Source-dependent. May be null. |
| `age_split` | JSONB | | Optional. Source-dependent. May be null. |
| `gender_split` | JSONB | | Optional. Source-dependent. May be null. |
| `last_updated_at` | TIMESTAMPTZ | | |

Demographic fields (`top_countries`, `age_split`, `gender_split`) are optional and source-dependent. Apify may not return them for all accounts. The API response always includes these fields; they are `null` when unavailable. Frontend must handle `null` gracefully and must not treat absence as an error. Staleness is computed at query time: `NOW() - last_updated_at > INTERVAL '30 days'` returns `is_stale: true` in the API response. No cron job required.

**`rate_cards`**

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `influencer_id` | UUID | FK → influencer_profiles.id |
| `service_type` | ENUM('STORY','POST','REEL','BUNDLE') | NOT NULL |
| `price` | NUMERIC(10,2) | NOT NULL |
| `currency` | TEXT | NOT NULL, DEFAULT 'USD' |
| `display_currency` | TEXT | |

`currency` is stored in the source currency submitted by the influencer. `display_currency` is the currency shown to brands. Display conversion uses a static exchange rate table (embedded in config, not a DB table) updated manually per release. Multi-currency billing is not implemented in MVP — only display conversion. Live FX API is post-MVP.

---

### C. Subscription Tables

**`subscriptions`**

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `user_id` | UUID | FK → users.id |
| `role` | ENUM('BRAND','INFLUENCER') | NOT NULL |
| `tier` | TEXT | NOT NULL — allowed values: 'trial', 'basic', 'pro', 'enterprise' |
| `status` | ENUM('ACTIVE','INACTIVE','TRIAL','CANCELLED') | DEFAULT 'TRIAL' |
| `current_period_start` | TIMESTAMPTZ | |
| `current_period_end` | TIMESTAMPTZ | |
| `created_at` | TIMESTAMPTZ | DEFAULT now() |

For MVP, this table is schema-only and future-ready. No subscription row is created at onboarding completion, and no runtime feature gating reads from this table until post-MVP rollout.

Tier lifecycle (post-MVP): `trial` → `basic` / `pro` / `enterprise` on payment. Downgrade sets tier to the new lower value and keeps `status = ACTIVE`. Cancellation sets `status = CANCELLED` and clears `current_period_end`. The `subscriptionGuard` reads `tier` and `status` directly; a CANCELLED subscription is treated as `trial` for feature gate purposes.

**Feature Gate Config (code stub, not DB)**

```typescript
const FEATURE_GATES: Record<string, Record<string, string[]>> = {
  BRAND: {
    discovery:       ['basic', 'pro', 'enterprise'],
    ai_copilot:      ['pro', 'enterprise'],
    shortlists:      ['basic', 'pro', 'enterprise'],
    campaign_create: ['basic', 'pro', 'enterprise'],
  },
  INFLUENCER: {
    campaign_feed:     ['basic', 'pro', 'enterprise'],
    portfolio_upload:  ['basic', 'pro', 'enterprise'],
  }
};
```

In MVP, this config is a stub and is not enforced by middleware. Keep it versioned in code so post-MVP rollout is wiring-only. When subscriptions launch, this config becomes canonical and `subscriptions.tier` values must exist in this mapping.

---

### D. Campaign & Collaboration Tables

**`campaigns`**

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `brand_id` | UUID | FK → brand_profiles.id, NOT NULL |
| `title` | TEXT | NOT NULL |
| `status` | ENUM('DRAFT','ACTIVE','PAUSED','COMPLETED') | DEFAULT 'DRAFT' |
| `brief_data` | JSONB | AI-generated or manually authored brief |
| `brief_preview` | TEXT | Truncated summary shown to influencers before invite. Max 280 chars. |
| `visibility` | ENUM('PRIVATE','MATCHED') | DEFAULT 'PRIVATE' |
| `budget` | NUMERIC(10,2) | |
| `currency` | TEXT | DEFAULT 'USD' |
| `niche_targets` | JSONB | Array of niches for matching |
| `is_deleted` | BOOL | DEFAULT false |
| `created_at` | TIMESTAMPTZ | DEFAULT now() |

**`shortlists`**

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `brand_id` | UUID | FK → brand_profiles.id, NOT NULL |
| `influencer_id` | UUID | FK → influencer_profiles.id, NOT NULL |
| `campaign_id` | UUID | FK → campaigns.id, NULLABLE |
| `label` | TEXT | |
| `created_at` | TIMESTAMPTZ | DEFAULT now() |
| UNIQUE | | `(brand_id, influencer_id, campaign_id)` |

**`collaboration_requests`**

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `campaign_id` | UUID | FK → campaigns.id, NOT NULL |
| `brand_id` | UUID | FK → brand_profiles.id, NOT NULL |
| `influencer_id` | UUID | FK → influencer_profiles.id, NOT NULL |
| `type` | ENUM('INVITE','APPLICATION') | NOT NULL |
| `status` | ENUM('PENDING','ACCEPTED','DECLINED','CLARIFICATION_REQUESTED') | DEFAULT 'PENDING' |
| `message` | TEXT | |
| `created_at` | TIMESTAMPTZ | DEFAULT now() |
| UNIQUE | | `(campaign_id, influencer_id, type)` |

Both invite and application flows write to this table. `type = 'INVITE'` is Brand-initiated. `type = 'APPLICATION'` is Influencer-initiated.

**Collaboration status state machine:** `PENDING` → `ACCEPTED`, `DECLINED`, or `CLARIFICATION_REQUESTED`. `DECLINED` is terminal — a brand cannot re-invite an influencer who has declined on the same campaign. A new campaign must be created for a fresh invite. `CLARIFICATION_REQUESTED` → `PENDING` is permitted (influencer asks a question, brand responds, status resets for influencer action). Document this in `docs/collaboration.md` before Phase 4 ships.

---

### E. Ingest & Admin Tables

**`ingest_jobs`**

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `influencer_id` | UUID | FK → influencer_profiles.id |
| `ig_handle` | TEXT | NOT NULL |
| `status` | ENUM('pending','running','success','partial_success','failed') | |
| `failure_class` | TEXT | See taxonomy below |
| `failure_detail` | TEXT | |
| `started_at` | TIMESTAMPTZ | |
| `completed_at` | TIMESTAMPTZ | |

**`idempotency_keys`**

Stores replay-safe mutation results for idempotent endpoints (campaign create, collaboration invite, collaboration apply).

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `key` | TEXT | NOT NULL |
| `scope` | TEXT | NOT NULL — endpoint scope (for example `campaign_create`) |
| `user_id` | UUID | FK -> users.id, NOT NULL |
| `request_hash` | TEXT | NOT NULL — hash of canonicalized request payload |
| `response_status` | INT | NOT NULL |
| `response_body` | JSONB | NOT NULL |
| `expires_at` | TIMESTAMPTZ | NOT NULL |
| `created_at` | TIMESTAMPTZ | DEFAULT now() |

Uniqueness: `(key, scope, user_id)` must be unique.

Replay rules:

1. Same key + same request hash within TTL -> return stored response (status + body).
2. Same key + different request hash -> return `409` with `IDEMPOTENCY_KEY_REUSED`.
3. Expired key -> treated as new request.

**`admin_audit_log`**

Append-only. No updates or deletes permitted in application code.

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `actor_id` | UUID | FK → users.id — the Admin who performed the action |
| `action` | TEXT | NOT NULL — e.g. 'VERIFY_APPROVE', 'VERIFY_REJECT', 'FLAG_RESOLVE' |
| `target_type` | TEXT | NOT NULL — e.g. 'influencer_profile', 'admin_flag' |
| `target_id` | UUID | NOT NULL |
| `old_state` | JSONB | Snapshot of relevant fields before action |
| `new_state` | JSONB | Snapshot of relevant fields after action |
| `reason` | TEXT | Required for REJECT and FLAG_RESOLVE actions |
| `created_at` | TIMESTAMPTZ | DEFAULT now() |

Every admin action that mutates trust state (approve, reject, flag resolve) must write a row here in the same DB transaction as the mutation. A structured log event must also be emitted (Winston) with `action`, `actor_id`, `target_id`, and `created_at` for Sentry alerting. If the DB write fails, the mutation must be rolled back.

**`admin_flags`**

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `influencer_id` | UUID | FK → influencer_profiles.id |
| `flag_type` | TEXT | NOT NULL |
| `flag_detail` | JSONB | |
| `resolved` | BOOL | DEFAULT false |
| `resolved_by` | UUID | FK → users.id, NULLABLE |
| `created_at` | TIMESTAMPTZ | DEFAULT now() |

**`ai_outputs`**

Stores redacted AI co-pilot outputs for admin review. Raw prompt and response content is not stored. Rows are hard-deleted after 30 days by a scheduled job or a cleanup query run at deploy time.

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `brand_id` | UUID | FK → brand_profiles.id |
| `campaign_id` | UUID | FK → campaigns.id, NULLABLE |
| `ai_tool_type` | TEXT | NOT NULL — allowed values: 'brief', 'strategy', 'fit_score', 'content_brief' |
| `prompt_version` | TEXT | NOT NULL — e.g. 'brief-v1.0.0' |
| `token_count` | INT | |
| `latency_ms` | INT | |
| `output_schema_valid` | BOOL | NOT NULL |
| `failure_reason` | TEXT | Populated on parse failure; null on success |
| `created_at` | TIMESTAMPTZ | DEFAULT now() |

`GET /v1/admin/ai-outputs` reads from this table. No raw AI content is stored or surfaced. Admins can see volume, latency, schema validity rate, failure reasons, and per-tool usage trends. Endpoint supports optional filter `?tool_type=`.

---

### Indexes

```sql
CREATE INDEX idx_influencer_profiles_niche ON influencer_profiles(niche_primary);
CREATE INDEX idx_influencer_stats_follower ON influencer_stats(follower_count);
CREATE INDEX idx_influencer_stats_engagement ON influencer_stats(engagement_rate);
CREATE INDEX idx_campaigns_brand ON campaigns(brand_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_shortlists_brand ON shortlists(brand_id);
CREATE INDEX idx_collaboration_requests_influencer ON collaboration_requests(influencer_id);
CREATE INDEX idx_ingest_jobs_handle ON ingest_jobs(ig_handle);
CREATE UNIQUE INDEX idx_idempotency_keys_scope_user_key ON idempotency_keys(scope, user_id, key);
CREATE INDEX idx_idempotency_keys_expires_at ON idempotency_keys(expires_at);
CREATE INDEX idx_ai_outputs_created ON ai_outputs(created_at);
CREATE INDEX idx_admin_audit_log_target ON admin_audit_log(target_type, target_id);
```

All search queries must be validated with `EXPLAIN ANALYZE` before Phase 4 ships. No sequential scans permitted on `influencer_profiles` or `influencer_stats` for standard filter combinations. Run `EXPLAIN ANALYZE` in staging against a seed dataset of 200+ influencers and record the output in `docs/query-analysis.md`.

---

## Ingest Failure Taxonomy

Every ingest job records a `failure_class` before closing.

| Class | Description | Counts Against SLA | Retry? |
|---|---|---|---|
| `rate_limited` | Apify or Instagram returned 429 | No | Yes, with backoff |
| `platform_unavailable` | Apify 5xx or timeout | No | Yes, up to 3x |
| `handle_not_found` | Handle does not exist or is not Business/Creator | Yes | No |
| `handle_private` | Account is private | Yes | No |
| `parse_error` | Response received, schema mapping failed | Yes | No — escalate to Sentry |
| `partial_success` | Profile saved, some stats failed | Yes (partial) | Partial retry allowed |
| `budget_exceeded` | Daily Apify cap hit | No | Queue for next window |
| `duplicate_handle` | Handle already registered to another active user | Yes | No — return 409 |

The 95% ingest success rate target applies to `handle_not_found`, `handle_private`, `parse_error`, and `duplicate_handle` only.

---

## Ingest & Verification Service

### Concurrency Lock

Before calling Apify, acquire a per-handle lock via `LockStore`.

```typescript
const acquired = await lockStore.acquire(`ingest:${igHandle}`, 60_000);
if (!acquired) return res.status(409).json({ error: { code: 'INGEST_IN_PROGRESS' } });

try {
  // run ingest
} finally {
  await lockStore.release(`ingest:${igHandle}`);
}
```

MVP implementation: in-memory `Map<string, number>` keyed by handle, value is lock expiry timestamp. Must be replaced with Redis `SET NX PX` when multi-instance deployment is needed — swap the `LockStore` implementation only, no other code changes.

### Transaction Strategy

- Creator upsert is atomic. Failure aborts the entire job.
- Stats insert is best-effort. Individual row failures do not roll back the creator record.
- `partial_success` is recorded if stats fail but creator succeeds.
- Failed stat rows are logged with enough detail for manual or automated retry.

### Auto-Verification Logic

After Apify scrape:

1. All checks pass → `is_verified = true`, `verification_status = 'APPROVED'`. No admin action needed.
2. Any of the following → `verification_status = 'FLAGGED'`, queued for Admin review:
   - Handle is invalid, private, or not a Business/Creator account.
   - Follower count, engagement rate, or niche is inconsistent with submitted data.
   - Portfolio, rate cards, or audience details are missing.
   - Engagement-to-follower ratio is anomalous (configurable threshold, stored in env config).
   - Handle has been flagged before on the platform.

Admin reviews flagged profiles only. Approved profiles never enter the queue.

### Re-submission Flow

When an Influencer edits and resubmits a rejected or flagged profile:

1. Check `last_resubmitted_at` — if less than 24 hours ago, return `429` with `Retry-After` header. Do not trigger ingest.
2. Check `resubmission_count` — if 5 or more, set `verification_status = 'FLAGGED'`, create an `admin_flags` row with `flag_type = 'max_resubmissions_reached'`, and return `403` instructing the user to contact support.
3. Otherwise: increment `resubmission_count`, set `last_resubmitted_at = now()`, reset `verification_status = 'PENDING'`, trigger new ingest job.
4. Auto-verification logic runs again from scratch.

### Handle Release

When an influencer profile is soft-deleted, its `ig_handle` becomes available for re-registration automatically due to the partial unique index (`WHERE is_deleted = false`). No admin action is required for the handle itself. If an admin needs to force-release a handle while the profile still exists (e.g. verified fraud), they set `is_deleted = true` via the admin panel and record the action in `admin_audit_log`.

---

## Onboarding Engine

### State Persistence

Every `POST` to an onboarding endpoint updates `users.onboarding_step` and `users.onboarding_completed`. On login, if `onboarding_completed = false`, `loadAuthContext` sets `req.authContext.onboardingCompleted = false` and `onboardingGuard` includes `{ redirect: "/onboarding/step/{onboarding_step}" }` in the `403` response body.

### Brand Onboarding Steps

| Step | Endpoint | Data Collected |
|---|---|---|
| 1 | `POST /v1/onboarding/brand/identity` | Company name, website, industry |
| 2 | `POST /v1/onboarding/brand/goals` | Campaign goals (JSONB) |
| 3 | `POST /v1/onboarding/brand/audience` | Target demographics (JSONB) |
| 4 | `POST /v1/onboarding/brand/budget` | Budget range min/max |
| 5 | `POST /v1/onboarding/brand/tone` | Tone/voice preferences |
| 6 | `POST /v1/onboarding/brand/complete` | Sets `onboarding_completed = true`. |

### Influencer Onboarding Steps

| Step | Endpoint | Data Collected |
|---|---|---|
| 1 | `POST /v1/onboarding/influencer/handle` | IG handle — triggers Apify light scrape + uniqueness check |
| 2 | `POST /v1/onboarding/influencer/niche` | Primary niche, secondary niche |
| 3 | `POST /v1/onboarding/influencer/portfolio` | Cloudinary upload URLs, media kit URL |
| 4 | `POST /v1/onboarding/influencer/rate-cards` | Service types + prices + currency |
| 5 | `POST /v1/onboarding/influencer/complete` | Sets `onboarding_completed = true`. Triggers full verification. |

### Handle Validation (Step 1)

1. Check `ig_handle` against partial unique index on active profiles → `409` if duplicate.
2. Trigger Apify light scrape (account type check only, not full stats).
3. If valid Business/Creator account → proceed to Step 2.
4. If invalid → return `422` with reason code. Do not advance step.

---

## Discovery Engine

### Who Can Search What

| Actor | Can Search | Can View |
|---|---|---|
| BRAND (authenticated) | Influencer profiles by facets | Full profile: stats, portfolio, rate cards |
| INFLUENCER (authenticated) | Cannot search | Matched campaign opportunities only (brief truncated) |
| ADMIN | Everything | Everything |

### Endpoint

`GET /v1/creators`

### Supported Filters

| Filter | Type | Notes |
|---|---|---|
| `niche` | TEXT | Matches `niche_primary` or `niche_secondary` |
| `follower_min` | INT | Inclusive lower bound |
| `follower_max` | INT | Inclusive upper bound |
| `engagement_min` | FLOAT | Minimum engagement rate |
| `country` | TEXT | Matches against `top_countries` JSONB |
| `is_verified` | BOOL | Default `true` for brand-facing queries |
| `is_stale` | BOOL | Computed: `NOW() - last_updated_at > 30 days` |

### Pagination Contract

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 340,
    "hasNext": true
  }
}
```

- `page` is 1-indexed. Default `1`.
- `limit` default `20`, maximum `100`. Above cap → `400`.
- `total` is pre-pagination count. Required for frontend page controls.
- `hasNext` is derived server-side as `page * limit < total`.
- Empty results → `data: []`, `total: 0`. Never a `404`.

Offset pagination degrades beyond ~10k records. Plan cursor-based migration when dataset approaches that threshold.

### Caching

All cache operations go through `CacheStore`. Direct calls to `node-cache` are forbidden in business logic.

- Search results TTL: 90 seconds.
- Creator detail TTL: 300 seconds.
- Cache key: `sha256(sorted_query_params)`.
- Creator detail cache invalidated by key on ingest completion. Search cache relies on TTL only.
- Cache read errors fall through to DB silently. Never throw to client.

---

## Campaign & Collaboration Service

### Brand Campaign Flow

1. Brand creates a campaign (`POST /v1/campaigns`) — status `DRAFT`.
2. Brand generates campaign strategy (`POST /v1/ai/strategy`) to define angles, cadence, KPIs, and recommended creator profile.
3. Brand generates campaign brief (`POST /v1/ai/brief`) → `brief_data` and `brief_preview` saved to campaign.
4. Brand activates campaign (`PATCH /v1/campaigns/:id/status`) → status `ACTIVE`.
5. Brand searches discovery, adds influencers to shortlist (`POST /v1/shortlists`).
6. Brand evaluates shortlisted creators with AI fit scoring (`POST /v1/ai/fit-score/:influencerId`).
7. Brand generates per-influencer content brief (`POST /v1/ai/content-brief/:influencerId`) before invite.
8. Brand sends collaboration invites from shortlist (`POST /v1/collaborations/invite`).

### Influencer Engagement Flow

1. Influencer views matched campaigns (`GET /v1/campaigns/matched`).
   - Matching logic: `niche_targets` overlaps with influencer's `niche_primary` or `niche_secondary`, and `visibility = 'MATCHED'`.
   - Response includes `brief_preview` only (max 280 chars). Full `brief_data` is not exposed until a collaboration request is accepted.
2. Influencer applies (`POST /v1/collaborations/apply`) → `collaboration_requests` row, `type = 'APPLICATION'`.
3. Influencer receives incoming invites (`GET /v1/collaborations/incoming`).
4. Influencer accepts, declines, or requests clarification (`PATCH /v1/collaborations/:id/status`).

### Ownership Enforcement

All campaign and shortlist mutations enforce `req.authContext.brandId === resource.brand_id`. A brand cannot read or mutate another brand's campaigns, shortlists, or collaboration requests. Returns `403` with `{ code: "FORBIDDEN" }` on violation. This check runs in a shared `assertBrandOwnership(req, resourceBrandId)` helper — not duplicated per handler.

---

## AI Campaign Co-Pilot

### Access

Brands only (all authenticated brands in MVP). Budget middleware runs before every call via `BudgetStore`.

### Campaign Intelligence Suite Tools

| Tool | Endpoint | Output |
|---|---|---|
| Campaign Strategy | `POST /v1/ai/strategy` | Strategy with content angles, cadence, KPI targets, and recommended creator profile |
| Campaign Brief | `POST /v1/ai/brief` | Structured `brief_data` and `brief_preview` |
| Influencer Fit Score | `POST /v1/ai/fit-score/:influencerId` | Fit score (0–100) plus natural language rationale, strengths, and risks |
| Influencer Content Brief | `POST /v1/ai/content-brief/:influencerId` | Influencer-specific talking points, tone guidance, dos/don'ts, and CTA |

Recommended brand flow: `strategy -> brief -> discovery -> fit_score -> content_brief -> invite`.

Strategy output should pre-populate discovery filters (`niche`, follower range, `engagement_min`) to turn creator search into a guided execution step.

### Request Pipeline

1. Backend fetches required DB context (`brand_profile`, active `campaign`, and when needed `influencer_profile`, `influencer_stats`, `rate_cards`) — never trusts client-supplied profile data.
2. Merges context + endpoint-specific user input into a tool-specific prompt.
3. Prompt is versioned in `prompts/` with semver (for example `strategy-v1.0.0`, `brief-v1.0.0`, `fit-score-v1.0.0`, `content-brief-v1.0.0`).
4. Sends to Gemini with instruction to return JSON only. No markdown, no preamble.
5. Parses and validates response against the corresponding Zod schema.
6. On parse failure -> returns structured fallback, logs failure metadata to `ai_outputs`, emits Sentry event with `prompt_version` and raw response length (not raw content). Raw response discarded.
7. On success -> returns validated payload; persistence behavior depends on tool:
  - `strategy`: may be attached to campaign planning metadata.
  - `brief`: saves `brief_data` and `brief_preview` to `campaigns`.
  - `fit_score`: derived on demand; not persisted as business data.
  - `content_brief`: may be attached to campaign-influencer collaboration context.
8. Every tool call writes one `ai_outputs` row with `ai_tool_type` and shared telemetry fields.

### AI Response Logging Policy

Raw prompt content and raw AI response text are never stored in the database and never emitted to logs. The following metadata is stored in `ai_outputs` and emitted to structured logs:

- `prompt_version`
- `ai_tool_type`
- `token_count`
- `latency_ms`
- `output_schema_valid`
- `failure_reason` (schema error type, not raw content)

Rows in `ai_outputs` are hard-deleted after 30 days. A cleanup query (`DELETE FROM ai_outputs WHERE created_at < NOW() - INTERVAL '30 days'`) runs as part of the deploy script or a weekly scheduled job. The 30-day window is the retention boundary — no exceptions.

### Prompt Versioning Rules

- Active prompt version is logged with every AI request.
- Schema-breaking prompt change = major version bump.
- Stub fixture must be updated to match new output shape before merge.
- Admin can review AI output metadata via `GET /v1/admin/ai-outputs`, including optional `tool_type` filtering.

### Budget Controls

Daily token budget configured per environment via env vars. All spend tracking goes through `BudgetStore`.

```typescript
const spend = await budgetStore.getSpend(`ai:brand:${brandId}`);
if (spend >= DAILY_TOKEN_CAP) {
  return res.status(429).json({
    error: { code: 'BUDGET_EXCEEDED', message: 'Daily AI budget reached.' }
  }).set('Retry-After', secondsUntilMidnightUTC());
}
```

Budget resets at midnight UTC. MVP uses in-memory counter. Swap `BudgetStore` implementation to Redis when multi-instance.

### Timeout & Fallback

- Gemini call timeout: 10 seconds (enforced via `AbortController`).
- On timeout → return `{ status: "degraded", message: "AI unavailable, try again shortly" }`. Campaign flow continues unblocked.
- `fit_score` responses should be cached via `CacheStore` for 300 seconds with key `sha256(influencerId + campaignId)` and invalidated on ingest completion for that influencer.

---

## Admin & Trust Layer

### Access

`ADMIN` role only. Enforced via `checkRole(['ADMIN'])` on all `/v1/admin/*` routes.

### Verification Queue

`GET /v1/admin/verification-queue`

Returns all influencer profiles with `verification_status = 'FLAGGED'`, joined with `influencer_stats` and `admin_flags`. Sorted by `resubmission_count` descending, then by submission time ascending.

### Admin Actions

| Endpoint | Action |
|---|---|
| `POST /v1/admin/verify/:id` | Sets `is_verified = true`, `verification_status = 'APPROVED'`. Writes to `admin_audit_log`. Emits structured log. Sends approval email. |
| `POST /v1/admin/reject/:id` | Sets `verification_status = 'REJECTED'`, stores `rejection_reason_code`. Writes to `admin_audit_log`. Emits structured log. Sends rejection email with reason. |
| `GET /v1/admin/ai-outputs` | Lists recent `ai_outputs` rows. Metadata only — no raw content. Supports optional `tool_type` filter. |
| `GET /v1/admin/flags` | Lists all open `admin_flags` records. |
| `POST /v1/admin/flags/:id/resolve` | Marks flag resolved. Writes to `admin_audit_log`. Emits structured log. |
| `GET /v1/admin/audit-log` | Lists `admin_audit_log` rows. Filterable by `actor_id`, `target_type`, `action`. |

All mutating admin actions must write to `admin_audit_log` in the same DB transaction as the state change. If the audit log write fails, the mutation rolls back.

### Automated Flagging Rules (triggered at ingest)

| Condition | Flag Type |
|---|---|
| Engagement rate / follower ratio below threshold | `low_engagement_ratio` |
| Follower count differs >30% from submitted estimate | `follower_count_mismatch` |
| Handle previously flagged on platform | `repeat_flag` |
| Required fields missing (portfolio, rate cards, audience) | `incomplete_profile` |
| Handle not a Business/Creator account | `invalid_account_type` |
| Resubmission count reached maximum | `max_resubmissions_reached` |

---

## Rate Limiting

| Endpoint Group | Limit | Window |
|---|---|---|
| Auth (`/v1/auth/*`) | 5 req | per minute per IP |
| Onboarding | 20 req | per minute per user |
| Discovery (`/v1/creators`) | 30 req | per minute per brand |
| Creator detail | 60 req | per minute per brand |
| Campaign matched feed | 20 req | per minute per influencer |
| Ingest | 5 req | per minute (admin/service only) |
| AI co-pilot | 10 req | per minute per brand + daily budget check |
| Campaign mutations | 20 req | per minute per brand |
| Collaboration actions | 30 req | per minute per user |

These are starting values. Tune after observing real staging traffic.

---

## Global Request Timeout

- Standard endpoints: 5 second wall enforced via middleware (`connect-timeout`).
- Ingest and AI endpoints: exempt from 5s wall but must enforce their own inner dependency timeouts using `AbortController`. Apify: 30s. Gemini: 10s.
- Downstream operations (DB queries, external HTTP calls) must be cancellable. A timed-out request must not leave orphaned DB transactions or pending Apify calls.
- Timed-out requests return `503 { error: { code: "REQUEST_TIMEOUT" } }`. Never a silent connection drop.
- Mutation endpoints that may be retried must accept an idempotency key header (`Idempotency-Key: <uuid>`). The backend persists key state in `idempotency_keys` for 24h and replays the prior response on duplicate submission. Scope: campaign create, collaboration invite, collaboration apply.

Idempotency processing order:

1. Validate `Idempotency-Key` format.
2. Compute canonical `request_hash`.
3. Lookup `(scope, user_id, key)`.
4. If found and hash matches, replay stored response.
5. If found and hash mismatches, return `409 IDEMPOTENCY_KEY_REUSED`.
6. If not found, execute mutation and store response atomically.

---

## Error Response Schema

All errors conform to:

```json
{
  "error": {
    "code": "HANDLE_NOT_FOUND",
    "message": "The Instagram handle does not exist or is not a Business/Creator account.",
    "field": "ig_handle"
  }
}
```

- `code` is a machine-readable constant. Frontend uses this, not `message`.
- `message` is human-readable. May be surfaced in UI.
- `field` is present only for validation errors (400s).

### HTTP Status Code Reference

| Status | Usage |
|---|---|
| `400` | Validation error |
| `401` | Unauthenticated |
| `403` | Forbidden, role mismatch, onboarding incomplete; `SUBSCRIPTION_REQUIRED` reserved and inactive in MVP |
| `404` | Resource not found |
| `409` | Conflict (duplicate handle, ingest in progress) |
| `422` | Unprocessable (handle invalid, business rule violation) |
| `429` | Rate limited or budget exceeded |
| `503` | Timeout or upstream unavailable |

Note: `402` is not used. `SUBSCRIPTION_REQUIRED` remains defined for proxy/client compatibility but is inactive until post-MVP subscription launch.

### Global Error Codes

| Code | Status | Description |
|---|---|---|
| `INVALID_TOKEN` | 401 | JWT missing, expired, or invalid |
| `USER_NOT_FOUND` | 401 | Supabase user exists but no `users` row found |
| `FORBIDDEN` | 403 | Role mismatch or ownership violation |
| `SUBSCRIPTION_REQUIRED` | 403 | Reserved for post-MVP subscription launch (inactive in MVP) |
| `ONBOARDING_INCOMPLETE` | 403 | User has not completed onboarding |
| `HANDLE_NOT_FOUND` | 422 | IG handle does not exist or is not Business/Creator |
| `HANDLE_PRIVATE` | 422 | IG account is private |
| `HANDLE_DUPLICATE` | 409 | Handle already registered to another active user |
| `INGEST_IN_PROGRESS` | 409 | Ingest already running for this handle |
| `IDEMPOTENCY_KEY_REUSED` | 409 | Same idempotency key used with different payload |
| `RESUBMISSION_COOLDOWN` | 429 | Resubmission attempted within 24h window |
| `RESUBMISSION_LIMIT` | 403 | Max resubmission count reached, contact support |
| `BUDGET_EXCEEDED` | 429 | Daily AI or Apify budget cap reached |
| `REQUEST_TIMEOUT` | 503 | Request exceeded wall timeout |
| `AI_UNAVAILABLE` | 503 | Gemini call timed out or failed |
| `VALIDATION_ERROR` | 400 | Request body failed Zod schema validation |

---

## Sentry Event Context

Sentry events must include structured context for all critical error classes. Use `Sentry.setContext()` or `Sentry.captureException()` with extras. Never include raw AI content, user passwords, or full request bodies.

| Event | Required Context |
|---|---|
| Ingest `parse_error` | `influencer_id`, `ig_handle`, `prompt_version` (n/a), `failure_class`, `apify_actor_id` |
| AI `output_schema_invalid` | `brand_id`, `campaign_id`, `prompt_version`, `latency_ms`, `token_count` |
| `budget_exceeded` (AI) | `brand_id`, `daily_spend`, `cap`, `reset_at` |
| `budget_exceeded` (Apify) | `daily_spend`, `cap`, `reset_at` |
| Admin action failed | `actor_id`, `action`, `target_id`, error message |
| Auth `USER_NOT_FOUND` | `supabase_user_id` |

---

## Integrations

### Apify

- Used for: IG handle verification (light scrape during onboarding) and full stats ingestion.
- Wrapper: timeout (30s via `AbortController`), retry with exponential backoff (up to 3x for `platform_unavailable`), failure classification on every error.
- Cost: tracked daily via `BudgetStore` keyed `apify:daily`. Hard cap enforced by `budgetMiddleware`.

### Cloudinary

- Used for: influencer portfolio images, media kit assets, brand logo uploads.
- Upload flow: client requests a signed upload URL (`GET /v1/media/upload-url`). Backend generates the URL scoped strictly to `meshly/{role}/{req.authContext.userId}/{asset_type}/`. Client uploads directly to Cloudinary. Backend stores the returned URL.
- Backend never proxies file data. Signed URL expires in 10 minutes.
- A brand cannot generate an upload URL for another user's folder. The path is constructed server-side from `req.authContext.userId` — client-provided paths are ignored.

### Gemini

- Primary and only AI provider for MVP.
- All prompts versioned in `prompts/` directory.
- Responses must pass Zod schema validation before being persisted or returned.
- Raw responses logged to neither DB nor log files. Metadata only (see AI Response Logging Policy).

### Resend

Transactional emails triggered by:

| Event | Recipient | Template |
|---|---|---|
| Signup | Any | Welcome + onboarding link |
| Influencer approved | Influencer | Approval confirmation |
| Influencer rejected | Influencer | Rejection with reason code |
| Collaboration invite received | Influencer | Invite notification |
| Application received | Brand | Interest notification |
| Subscription activated (post-MVP only) | Any | Billing confirmation |

Emails are fire-and-forget (async). Failures are logged with recipient, template name, and a payload hash sufficient to reconstruct and re-send manually. Email delivery failures are invisible to the end user — ensure log retention is sufficient to recover.

---

## Testing Strategy

### Tiers

**Unit tests** — scoring functions, validation schemas, failure classification, matching logic, FX conversion, `assertBrandOwnership`. No network calls. 80%+ coverage on business logic modules. Tooling: Vitest.

**Integration tests** — endpoint contracts, DB constraints, auth enforcement, ownership checks, idempotent upsert. Real DB (ephemeral Supabase). Apify and Gemini replaced with deterministic stubs. Every endpoint has: happy path, invalid input (`400`), unauthorized (`401`/`403`). Subscription-blocked cases (`403` + `SUBSCRIPTION_REQUIRED`) are deferred to post-MVP test suite. Tooling: Supertest.

**Contract tests** — all brand-facing and influencer-facing response shapes validated. Frontend defines expected shape. Backend asserts it. Blocks frontend handoff if failing.

**Smoke tests** — health check, one ingest with a fixture handle, one search, one AI co-pilot call, one collaboration invite. Run after every staging deploy. Failure blocks release.

**AI schema regression tests** — when a new prompt version ships, run the stub fixture through the Zod validator and assert it passes. Run the old prompt version's fixture through the new validator and assert it fails (verifies the version bump was intentional). This runs in CI on every PR touching `prompts/`.

### Stubs

- Apify stub: returns fixture data for known handles; `handle_not_found` for unknown ones.
- Gemini stub: returns hardcoded valid JSON payloads for each tool type matching their current prompt version schemas.
- Stubs live in `fixtures/`. Shape changes require a PR and a version bump.

### LockStore / CacheStore / BudgetStore in Tests

Tests inject mock implementations of all three interfaces. This ensures test isolation and prevents flaky timing-based failures. Never use the real in-memory implementations in tests — inject a synchronous mock.

---

## Phase Plan

Note: Phase numbering is intentionally preserved for traceability with earlier versions of this spec; historical Phase 3 has been collapsed into the post-MVP subscription rollout section.

### Phase 0 — Foundations

Bootstrap, middleware, auth, env validation, error model, test runner. Supabase Auth integration. `loadAuthContext` middleware. Store interfaces defined (LockStore, CacheStore, BudgetStore) with in-memory implementations.

Exit criteria:
- Service boots in dev and staging.
- Supabase Auth JWT verified on protected routes.
- `loadAuthContext` populates `req.authContext` correctly from DB.
- Onboarding guard blocks access correctly using `authContext`, not JWT claims.
- Provisioning contract tested: signup creates/upserts `users` row before protected routes are reachable.
- Global timeout middleware active with `AbortController` pattern documented.
- Store interfaces written and in-memory implementations passing unit tests.
- `docs/auth.md` written and signed off.

### Phase 1 — Schema & Data Model

All tables, constraints, partial unique indexes, migrations, and seed fixtures.

Exit criteria:
- Schema created from scratch via migrations. Includes `admin_audit_log`, `ai_outputs`.
- Partial unique indexes in place for `users.email` and `influencer_profiles.ig_handle`.
- All constraints enforced (tested).
- `EXPLAIN ANALYZE` validated on primary search query. Output recorded in `docs/query-analysis.md`.
- Soft delete and staleness logic confirmed working.
- Rollback scripts tested on clean DB.

### Phase 2 — Onboarding & Ingest

Both onboarding flows and the ingest/verification pipeline. Subscription schema remains inactive during MVP.

Exit criteria:
- Brand and Influencer can complete onboarding end-to-end.
- Handle validation uses partial unique index correctly.
- Auto-approval and auto-flagging logic correct on fixture batch.
- Ingest success rate ≥ 95% (excl. rate-limit and platform-unavailable).
- Duplicate ingest = 0 duplicates in DB.
- Resubmission cooldown and max count enforced.
- Concurrency lock tested via LockStore mock.

### Post-MVP — Subscription Rollout (Deferred from Phase 3)

Subscription upgrade/downgrade flows, `subscriptionGuard` enforcement, and `FEATURE_GATES` activation.

Exit criteria:
- Feature-gated endpoints return `403` + `SUBSCRIPTION_REQUIRED` for users below required tier.
- `subscriptionGuard` reads from DB via `authContext`, not from JWT.
- Subscription status changes propagate correctly.
- Tier cancellation treated as trial for gate purposes.
- Integration tests for gating pass.

### Phase 4 — Discovery & Campaign APIs

Discovery search, creator detail, campaign CRUD, shortlist, collaboration requests.

Exit criteria:
- Discovery filters all work with correct results.
- Caching active via `CacheStore` and verified (cache hit/miss logged).
- Pagination contract tests pass.
- Ownership enforcement tests pass (`assertBrandOwnership` helper used consistently).
- Strategy-guided discovery flow supported: discovery filters can be pre-filled from `POST /v1/ai/strategy` output.
- Influencer matched campaign feed returns truncated `brief_preview` only.
- Collaboration state machine enforced (DECLINED is terminal per campaign).
- Idempotency keys accepted on campaign create, collaboration invite, collaboration apply.

### Phase 5 — AI Co-Pilot

Gemini integration, prompt versioning, campaign intelligence tools (`strategy`, `brief`, `fit_score`, `content_brief`), budget controls.

Exit criteria:
- All AI tool endpoints return valid structured payloads.
- `brief_preview` (280 char truncation) generated alongside `brief_data`.
- Strategy output includes recommended creator profile block for discovery prefill.
- Fit score endpoint returns score + rationale and is cached through `CacheStore`.
- Malformed responses never reach client.
- Budget cap logic validated via `BudgetStore` mock.
- Prompt version and `ai_tool_type` logged per request in `ai_outputs`.
- Fallback response verified on timeout and parse failure.
- AI schema regression tests pass in CI.
- Raw AI content confirmed absent from all logs and DB rows.

### Phase 6 — Admin Layer

Verification queue, approve/reject actions, flag management, AI output review, audit log.

Exit criteria:
- Admin can review flagged queue.
- Approve and reject actions write to `admin_audit_log` in same transaction as state change.
- Structured log emitted for every admin action.
- `GET /v1/admin/audit-log` returns correct records.
- Non-admin cannot access any `/v1/admin/*` endpoint.
- `GET /v1/admin/ai-outputs` returns metadata only — no raw content — and supports `tool_type` filtering.
- `ai_outputs` cleanup query tested against a seeded dataset with old rows.

### Phase 7 — Production Readiness

CI/CD, monitoring, runbooks, secrets validation, staging seed.

Exit criteria:
- All tests pass in CI.
- Sentry error tracking active with structured context on all critical events.
- Structured logs shipping. Log retention confirmed sufficient for email failure recovery.
- Seed: 100–200 influencers across 5+ niches for search validation.
- Smoke tests pass on staging.
- Single-instance deployment confirmed (hard-pin until Redis swap is executed).
- Release checklist signed.

---

## Metrics Targets (MVP)

| Metric | Target |
|---|---|
| Discovery API p95 latency | ≤ 300ms |
| Creator detail p95 latency | ≤ 400ms |
| AI co-pilot p95 latency | ≤ 4s (within 10s timeout) |
| Ingest success rate (excl. infra failures) | ≥ 95% |
| Duplicate creator/post insertion | 0 |
| AI timeout rate | ≤ 3% with fallback path |
| Auth ownership violation rate | 0 |
| Cross-brand data leakage incidents | 0 |
| Admin action without audit log entry | 0 |

---

## Schema Reference Summary

| Column | Table(s) | Type | Purpose |
|---|---|---|---|
| `is_deleted` | most tables | `BOOL DEFAULT false` | Soft delete. Hard deletes forbidden. |
| `last_scraped_at` / `last_updated_at` | creators, stats | `TIMESTAMPTZ` | Staleness derived at query time. No cron needed. |
| `verification_status` | influencer_profiles | ENUM | Auto-approved or flagged. Drives admin queue. |
| `brand_id` | campaigns, shortlists, collab_requests | UUID FK | All brand-owned resources carry this. Ownership enforced via `assertBrandOwnership`. |
| `resubmission_count` | influencer_profiles | INT | Throttle and cap re-verification attempts. |
| `last_resubmitted_at` | influencer_profiles | TIMESTAMPTZ | Enforces 24h resubmission cooldown. |
| `brief_preview` | campaigns | TEXT | 280-char truncated brief shown to influencers before invite. |
| `actor_id` | admin_audit_log | UUID FK | Admin who performed the action. Append-only. |
| `ai_tool_type` | ai_outputs | TEXT | AI tool used for the run (`brief`, `strategy`, `fit_score`, `content_brief`). |
| `prompt_version` | ai_outputs | TEXT | Tracks which prompt version generated each output. |
| `output_schema_valid` | ai_outputs | BOOL | Schema validity rate tracked without storing raw content. |

## Open Decisions (Carry Forward)

These items were explicitly deferred and must be resolved before the relevant phase ships:

| Decision | Owner | Must Resolve Before |
|---|---|---|
| FX conversion: static table vs live API | Product | Phase 4 |
| Collaboration re-invite policy after DECLINED | Product | Phase 4 |
| Engagement anomaly threshold value | Data/Product | Phase 2 |
| AI daily token budget cap per environment | Engineering | Phase 5 |
| Apify daily spend cap per environment | Engineering | Phase 2 |
| Email provider (Resend) | Engineering | Phase 2 |
| Redis swap trigger criteria (instance count, error rate) | Engineering | Phase 7 |