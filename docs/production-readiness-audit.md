# Meshly Production Readiness Audit

Date: 2026-04-14
Scope audited: Backend and Frontend code in repository root D:/Meshlyy
Method: Initial pass was read-only code/spec audit. This file includes confirmed remediation updates validated by source checks and targeted live verification.

Legend:
- PASS: Requirement is implemented and evidenced in current code
- WARN: Partially implemented, ambiguous, or operationally unverified
- FAIL: Missing, incorrect, or materially unsafe for production

## Section 1 - Security

| Item | Status | Finding | Recommended Fix |
|---|---|---|---|
| Hardcoded secrets, API keys, or credentials in source code (not .env) | PASS | Hardcoded mock-token bypass logic was removed from auth middleware. Confirmed in source and by live probe: `Bearer mock-brand-token` now returns `401 INVALID_TOKEN` on deployed backend. | N/A |
| .env in .gitignore and .env.local in .gitignore | PASS | Backend/.gitignore includes .env and .env.local. Frontend/.gitignore includes .env, .env.*, and *.local. | N/A |
| All admin routes protected by checkRole(['ADMIN']) | FAIL | Spec-defined admin routes are not implemented in backend route tree, while frontend calls admin endpoints. Evidence: no admin route files under Backend/src/routes and app router mounts. | Implement /v1/admin/* routes and enforce verifyToken + loadAuthContext + checkRole(['ADMIN']) at router level. |
| All brand routes protected by checkRole(['BRAND']) | WARN | Most brand route groups use checkRole('BRAND'), but brand-only collaboration actions use inline role checks instead of checkRole middleware consistency. | Standardize brand-only routes on middleware guard checkRole(['BRAND']) and keep inline checks only for edge-case branching. |
| All influencer routes protected by checkRole(['INFLUENCER']) | WARN | Influencer route group is middleware-protected, but influencer-only collaboration actions rely on inline role checks instead of uniform checkRole middleware. | Standardize influencer-only endpoints with checkRole(['INFLUENCER']) middleware on route groups. |
| Every protected route goes through verifyToken and loadAuthContext | PASS | Protected routers are mounted with corePlatformMiddleware in app.ts or apply verifyToken + loadAuthContext in router-level use. | N/A |
| SUPABASE_SERVICE_ROLE_KEY only used server-side, never in frontend | PASS | Frontend uses VITE_SUPABASE_ANON_KEY only; service role key appears in backend env/config only. | N/A |
| Cloudinary upload URLs scoped to authenticated user folder | PASS | Implemented authenticated media signing route `GET /v1/media/upload-url` with server-side scoped folder construction (`meshlyy/{role}/{userId}/{kind}`), upload-kind whitelist, resource-type allowlist, and expiring Cloudinary signed upload payload. Verified via authenticated smoke test returning scoped folder and signature. | N/A |
| CORS allows only Vercel frontend origin in production | WARN | CORS is env-driven and can be strict, but this cannot be verified from repo-only audit. Wildcard allowance is still possible if misconfigured. Evidence: Backend/src/app.ts. | Enforce startup validation that production CORS_ORIGIN must be non-empty, non-localhost, and not '*'. Add deployment guard in CI/CD. |
| Routes skipping auth middleware that should be protected | PASS | Implemented protected route groups are behind auth middleware; only health is public by design. | N/A |

## Section 2 - Error Handling

| Item | Status | Finding | Recommended Fix |
|---|---|---|---|
| All route handlers have try/catch blocks | PASS | Async handlers in active route files generally wrap logic with try/catch and call next(error). | N/A |
| Raw error messages or stack traces returned to clients | WARN | Global handler hides unknown stack traces, but some AppError messages can include provider/DB detail text. Evidence: Errors.DATABASE_ERROR(detail). | Sanitize upstream detail before user-facing messages. Emit detailed diagnostics only to structured logs/Sentry. |
| All errors conform to { error: { code, message, field? } } shape | PASS | Route-level manual errors and sendError/errorHandler follow the standard shape. | N/A |
| Global error handler in app.ts catches unhandled errors | PASS | app.ts mounts errorHandler last. | N/A |
| Zod validation errors returned as 400 VALIDATION_ERROR | PASS | errorHandler maps ZodError to 400 with VALIDATION_ERROR code. | N/A |
| Unhandled promise rejections handled at process level | WARN | `process.on('unhandledRejection')` is now present in app bootstrap. `uncaughtException` handling is still missing. | Add `process.on('uncaughtException')` with alerting and graceful shutdown policy. |

## Section 3 - Database

| Item | Status | Finding | Recommended Fix |
|---|---|---|---|
| Queries filter is_deleted = false where applicable | WARN | Most queries filter correctly, but not all reads are consistently scoped (for example, some profile and collaboration lookups). | Enforce repository-wide query policy and add tests/lint checks to require is_deleted filters on soft-deletable tables. |
| Partial unique indexes for users.email and influencer_profiles.ig_handle | PASS | Present in migration 0001_init_schema.sql. | N/A |
| Connection pool limit configured | WARN | Supabase client is used without explicit backend-side pool management controls in code. | Document pool behavior for Supabase transport and enforce DB-side connection limits/monitoring in deployment settings. |
| Raw SQL strings with potential injection vectors | PASS | Runtime code uses Supabase query builder/RPC calls; no obvious user-concatenated raw SQL in production handlers. | N/A |
| admin_audit_log append-only (no update/delete in code) | PASS | No update/delete usage of admin_audit_log in application code. | N/A |
| Brand-owned resources check brand_id ownership before mutation | PASS | Ownership helper and service-layer ownership checks are used in campaign/collaboration/shortlist mutation paths. | N/A |

## Section 4 - AI Pipeline

| Item | Status | Finding | Recommended Fix |
|---|---|---|---|
| Raw AI response content logged or stored | FAIL | Gemini and Groq services log snippets of raw model output on parse/structure errors. This violates redaction policy. | Remove raw content logging; log only metadata (length, hash, schema error type, tool, prompt version). |
| output_schema_valid=false always paired with non-null failure_reason | FAIL | ai_outputs insert writes output_schema_valid but does not populate failure_reason on failed outputs. | Populate failure_reason for every invalid output path and enforce DB constraint/check for consistency. |
| Every AI endpoint enforces timeout via AbortController | PASS | Gemini and Groq calls use AbortController timeout, and global timeout middleware is active. | N/A |
| Budget middleware runs before every AI endpoint | PASS | `/v1/ai` is now mounted with `aiBudgetMiddleware` before `aiRouter` in the app route chain. | N/A |
| Brand and influencer AI tools wired to correct prompt builders | FAIL | Brand tools are present; influencer toolset is incomplete (only influencer content-brief exists, required explain_brief/content_ideas/caption/script/rate_advisor missing). | Implement missing influencer AI endpoints and map each to explicit prompt builder + schema validator. |
| Zod schemas validated before AI response is persisted or returned | FAIL | ai_outputs persistence happens in provider service before route-level Zod schema validation, causing false positives in schema-valid telemetry. | Move persistence after tool-specific Zod validation, or pass validation outcome/failure_reason into persistence layer deterministically. |

## Section 5 - Performance

| Item | Status | Finding | Recommended Fix |
|---|---|---|---|
| Discovery endpoint uses search_creators RPC (not embedded join) | PASS | CreatorService.discover uses supabase.rpc('search_creators'). | N/A |
| CacheStore used for discovery and fit score responses | FAIL | Discovery is cached; fit score responses are not cached in backend service path. | Add fit-score cache keying by creator+campaign/context with TTL and invalidation on relevant data changes. |
| Global request timeout middleware active | PASS | timeoutMiddleware + haltOnTimeout mounted globally in app.ts. | N/A |
| N+1 query patterns in route handlers | PASS | No obvious N+1 pattern in HTTP route handlers; most heavy operations are batched or single-query joins. | N/A |
| Database indexes for common filter columns | PASS | Core indexes for discovery, campaigns, collab, and ai_outputs are present in migrations. | N/A |

## Section 6 - Frontend

| Item | Status | Finding | Recommended Fix |
|---|---|---|---|
| Hardcoded mock accounts or test credentials in deployed frontend code | PASS | No hardcoded username/password credential pairs found in Frontend/src runtime code. | N/A |
| Frontend uses only VITE_SUPABASE_ANON_KEY (not service role key) | PASS | supabaseClient uses anon key env vars only. | N/A |
| API calls go through apiClient.js (not raw fetch with hardcoded URLs) | PASS | Feature screens use apiClient for backend calls; no stray hardcoded backend fetch calls found outside apiClient. | N/A |
| Fallback UI exists for every loading state | WARN | Many screens show loading placeholders, but some flows (for example authReady wait) can render blank or non-informative states. | Add explicit loading shells/spinners for all guarded routes and async bootstrap stages. |
| Fallback UI exists for every error state | WARN | Several views show errors, but some flows swallow errors silently (for example InfluencerDashboard stats load). | Standardize error boundary/toast pattern and ensure each async branch has visible error state. |
| 503 AI_UNAVAILABLE and 429 BUDGET_EXCEEDED handled gracefully in AI assistant | WARN | Partial handling exists, but handling is not systematic per endpoint/tool and does not consistently branch by code for user guidance. | Add centralized AI error mapping for 429/503 with retry timing and action prompts in BrandAIAssistant and AIContentAssistant. |
| Auth token attached to every API call | PASS | apiClient injects Authorization via setAccessTokenGetter and AuthContext ref sync. | N/A |
| Session expiry (401) redirects to login | FAIL | No global 401 interceptor/logout redirect path exists; components mostly display local errors. | Add global apiClient 401 handler to clear auth state and navigate to login with session-expired message. |

## Section 7 - Deployment

| Item | Status | Finding | Recommended Fix |
|---|---|---|---|
| NODE_ENV=production set in Render environment | WARN | Cannot be verified from repository-only audit. | Add deployment validation script/checklist that fails release if NODE_ENV is not production. |
| CORS_ORIGIN set to Vercel URL in production env | WARN | Cannot be confirmed in repo; example env still includes localhost defaults. | Set and validate production CORS_ORIGIN to exact Vercel domain(s) only. |
| package.json has both build and start scripts | PASS | Backend package.json includes build and start scripts. | N/A |
| TypeScript build output targets dist and start points to dist | PASS | tsconfig outDir is dist and start script runs node dist/app.js. | N/A |
| .env.example documents required keys (without real secret values) | WARN | Backend .env.example exists, but includes operational defaults and no corresponding frontend env example file. | Keep placeholders only, split backend/frontend env examples, and document required vs optional keys clearly. |
| Console logs exposing sensitive backend data in production code | PASS | Runtime backend primarily uses structured logger; no obvious sensitive console.log in request paths. | N/A |
| Frontend .env.local is gitignored | PASS | Frontend .gitignore excludes .env.* and *.local. | N/A |

## Section 8 - Data Integrity

| Item | Status | Finding | Recommended Fix |
|---|---|---|---|
| Soft delete enforced everywhere (no hard deletes in app code) | WARN | Shortlist delete path was converted to soft-delete and validated live (`DELETE /v1/shortlists/:id` returned `204`, DB row retained with `is_deleted=true`). Full codebase-wide hard-delete re-audit was not rerun in this update. | Run a full hard-delete sweep to confirm no other mutation paths still hard-delete user-facing data. |
| Idempotency keys enforced on campaign create/invite/apply | FAIL | Keys are optional and request_hash mismatch protection is not enforced despite schema support. | Require Idempotency-Key on these mutations, validate format, and enforce hash mismatch as 409 IDEMPOTENCY_KEY_REUSED. |
| admin_audit_log written in same transaction as every admin mutation | FAIL | Admin mutation endpoints are not implemented, so transactional audit requirement is unmet. | Implement admin mutation routes with transactional state change + audit write atomicity. |
| ai_outputs rows written for every AI call including failures | FAIL | Persistence exists, but failure telemetry is incomplete/inaccurate (missing failure_reason and schema validation truth). | Refactor AI logging pipeline to guarantee one correct ai_outputs row per call outcome, including schema failures. |
| 30-day ai_outputs cleanup query present and scheduled | FAIL | Policy is documented, but no scheduled cleanup job or deploy hook is implemented in codebase. | Add scheduled SQL job or deploy task for DELETE FROM ai_outputs WHERE created_at < now() - interval '30 days'. |

## Section 9 - Rate Limiting

| Item | Status | Finding | Recommended Fix |
|---|---|---|---|
| Rate limiting configured on auth endpoints | FAIL | Auth endpoints are not implemented; no rate limiter middleware wiring exists. | Implement auth endpoints and apply express-rate-limit policy as specified. |
| Rate limiting configured on AI endpoints | FAIL | No request-rate limiter is mounted on AI routes; only budget-based caps exist. | Add per-brand/per-IP rate limiter middleware to /v1/ai endpoints. |
| Rate limiting configured on discovery endpoints | FAIL | No rate limiter is applied on /v1/creators. | Apply discovery rate limiter and test 429 behavior under burst traffic. |
| Retry-After header returned on all 429 responses | FAIL | Budget 429 responses include Retry-After, but AI provider 429 paths do not guarantee Retry-After. | Normalize 429 handling in global error middleware and set Retry-After for all throttling/rate-limit responses. |

## Section 10 - Known Gaps and Open Decisions

### 10.1 Unresolved items from spec Open Decisions table

Still unresolved based on code and config behavior:
- FX conversion strategy (static table vs live API) is not fully implemented end-to-end.
- Engagement anomaly threshold value is not operationalized consistently from configuration.
- Apify daily spend cap per environment exists in env schema but is not fully wired to route-level controls.
- Email provider decision is ambiguous (Resend implemented, provider switch config not consistently used).
- Redis swap trigger criteria remains undocumented in executable operational policy.

Resolved from open decisions table:
- Collaboration re-invite policy after DECLINED appears implemented as terminal per campaign in collaboration service logic.
- AI daily token cap middleware is now mounted in the `/v1/ai` route chain.

### 10.2 Spec endpoints not implemented (or not implemented as specified)

Not implemented:
- POST /v1/auth/signup
- POST /v1/auth/login
- GET /v1/media/upload-url
- GET /v1/admin/verification-queue
- POST /v1/admin/verify/:id
- POST /v1/admin/reject/:id
- GET /v1/admin/ai-outputs
- GET /v1/admin/flags
- POST /v1/admin/flags/:id/resolve
- GET /v1/admin/audit-log
- POST /v1/ingest/* (internal ingest route family)

Path/spec mismatches or partial implementation:
- Brand onboarding multi-step endpoints in spec are collapsed into POST /v1/onboarding/brand.
- Influencer onboarding named endpoints in spec differ from implemented step1..step4 naming.
- AI endpoint shapes/paths differ from spec for fit-score and content-brief parameterization.
- Influencer AI tool endpoints required by current product expectations are mostly absent.

### 10.3 Frontend screens still using mock data

Screens with significant mock/static behavior:
- Frontend/src/features/influencer/PublicCampaigns.jsx (static campaign array)
- Frontend/src/features/brand/BrandDashboard.jsx (static KPI cards, notifications, and campaign mini-cards)
- Frontend/src/features/influencer/InfluencerDashboard.jsx (multiple static sections and local-only post link persistence)
- Frontend/src/features/influencer/AIContentAssistant.jsx (local simulated AI fallback as primary behavior when no campaign selected)
- Frontend/src/features/public/InfluencerSignupForm.jsx (login call with profile payload instead of proper signup + onboarding flow)

### 10.4 Post-MVP items partially implemented (risk of confusion)

- Subscription gates exist as stubs but are intentionally inactive, which can be misread as complete monetization support.
- express-rate-limit dependency is installed but not wired to route middleware.
- Duplicate middleware/store implementations exist (legacy and active variants), increasing maintenance ambiguity.
- Docs and frontend admin screens imply admin/media/auth capabilities that backend does not currently expose.

## Overall readiness score

NOT READY - Multiple critical security, auth, AI governance, rate limiting, and endpoint completeness failures must be fixed before exposing this system to real users.

## Critical blockers (must-fix before real user exposure)

1. Missing admin route surface while frontend calls admin endpoints.
2. Incomplete influencer AI toolset and endpoint mismatch with expected product behavior.
3. Raw AI output snippets logged; failure_reason telemetry incomplete.
4. No route-level rate limiting on AI/discovery/auth classes.
5. No global session-expiry redirect behavior in frontend for 401 responses.
6. No implemented/scheduled ai_outputs retention cleanup job.

## Pre-NIC demo checklist (top 10)

1. Verify mock token bypass is removed and only valid Supabase JWTs are accepted.
2. Verify brand login/signup and onboarding status bootstrap works with real Supabase sessions.
3. Verify core brand flow: create campaign -> discovery -> shortlist -> fit score.
4. Verify AI brief/strategy/fit-score responses return valid schema and user-safe errors.
5. Verify AI 429/503 user messaging and retry behavior in assistant UIs.
6. Verify influencer flow: invitation list, invitation detail, accept/decline status updates.
7. Verify CORS in deployed environment accepts only intended frontend origin.
8. Verify no frontend screen used in demo depends on unimplemented admin endpoints.
9. Verify health endpoint and backend boot in production mode with correct env values.
10. Verify seeded/test data does not leak into demo account experience.

## Post-NIC backlog (all WARN and deferred items)

- Standardize role middleware usage (replace inline role branching with checkRole where applicable).
- Enforce strict production CORS validation and deployment-time env checks.
- Sanitize all user-facing and logged error payloads for DB/provider detail leakage.
- Add `uncaughtException` handler with graceful shutdown (unhandledRejection handler is now present).
- Complete is_deleted filter consistency audit and add automated checks.
- Define/document Supabase connection management and scaling constraints.
- Refactor AI logging to capture accurate schema validity and failure_reason.
- Add fit-score caching via CacheStore and invalidation policy.
- Normalize loading and error UI states across all frontend screens.
- Add global 401 handling with logout and redirect.
- Tighten .env.example docs and add frontend env example.
- Enforce mandatory idempotency keys + hash mismatch behavior.
- Implement transactional admin mutation + audit logging.
- Implement and schedule ai_outputs 30-day cleanup.
- Implement full endpoint-level rate limiting and uniform Retry-After behavior.
- Resolve open decisions: FX strategy, anomaly thresholds, budget caps, email provider policy, Redis trigger criteria.
