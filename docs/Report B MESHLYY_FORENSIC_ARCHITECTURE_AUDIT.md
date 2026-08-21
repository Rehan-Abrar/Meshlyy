# MESHLY FORENSIC ARCHITECTURE AUDIT
**Repository:** D:\Meshlyy | **Date:** 2026-08-13 | **Scope:** Full codebase scan (Backend + Frontend + Migrations)

---

## 1. COMPLETE CURRENT-STATE ARCHITECTURE

### Frontend
- **What:** React 18 SPA with Vite, React Router v6, Supabase client
- **Where:** D:\Meshlyy\Frontend\src\
- **Entry:** main.jsx → AuthProvider → App.jsx (lazy-loaded routes)
- **State:** React Context (AuthContext.jsx) for auth/session; local component state for forms
- **API Client:** utils/apiClient.js - wrapper around fetch with token injection, caching, 401→logout redirect
- **Components:** Modular (components/common/, features/{brand,influencer,admin,public}/)
- **Active at Runtime:** Yes - builds to dist/, served via Vercel (inferred from VITE_API_URL default)
- **Status:** IMPLEMENTED - all routes mounted, auth flow functional

### Backend
- **What:** Express.js API (TypeScript) on Node.js
- **Where:** D:\Meshlyy\Backend\src/
- **Entry:** app.ts - mounts routes with middleware stack
- **Middleware Chain:** CORS → JSON → Request Logger → Timeout → Health/Waitlist (public) → Onboarding → Profile → Media → Core Platform Guard (verifyToken → loadAuthContext → onboardingGuard) → Creators/Campaigns/Shortlists/Collaborations/Influencer/AI/Profile
- **Services:** 10 services (Brand, Influencer, Creator, Campaign, Collaboration, Shortlist, Ingest, Apify, AIProvider, Email)
- **Background Worker:** IngestService.startBackgroundWorker() - runs in same process, polls ingest_jobs table
- **Active at Runtime:** Yes - require.main === module starts server + worker
- **Status:** IMPLEMENTED - all routes mounted, middleware stack correct

### Database
- **What:** PostgreSQL via Supabase (PostgREST + Realtime + Auth)
- **Migrations:** 4 files in Backend/migrations/
  - 0001_init_schema.sql - 12 tables, 9 enums, indexes, partial unique indexes
  - 0002_seed_data.sql - fixture data
  - 0003_production_ingest_hardening.sql - adds total_views_30d, unique constraint on influencer_stats.influencer_id, ingest job indexes
  - 0004_shortlists_soft_delete.sql - adds is_deleted to shortlists, updates unique indexes
- **RLS:** NOT ENABLED in any migration - no ENABLE ROW LEVEL SECURITY, no CREATE POLICY
- **Service Role:** Used exclusively by backend (config/supabase.ts creates client with SUPABASE_SERVICE_ROLE_KEY)
- **Status:** PARTIAL - schema exists, RLS missing, RPCs missing

### Authentication
- **What:** Supabase Auth (email/password) + JWT verification
- **Flow:**
  - Frontend: supabase.auth.signUp() / signInWithPassword() → gets session
  - AuthContext calls /v1/onboarding/status to hydrate user role/onboarding state
  - Backend: verifyToken middleware calls supabase.auth.getUser(token) to validate JWT
  - loadAuthContext queries users table, auto-provisions missing rows from JWT metadata
- **Token Storage:** Memory only (React state + ref), injected via apiClient Authorization header
- **Active at Runtime:** Yes - full signup/login/onboarding flow implemented
- **Status:** IMPLEMENTED - but auto-provisioning creates users without email confirmation check

### Authorization
- **What:** Role-based (BRAND/INFLUENCER/ADMIN) + Ownership checks + Feature gates
- **Implementation:**
  - checkRole('BRAND'|'INFLUENCER'|'ADMIN') middleware on routes
  - assertBrandOwnership(authContext, resourceBrandId) in services
  - subscriptionGuard middleware (feature-gated by SUBSCRIPTION_GATING_ACTIVE env)
- **Feature Gates:** Defined in config/featureGates.ts - BRAND: discovery, ai_copilot, shortlists, campaign_create; INFLUENCER: campaign_feed, portfolio_upload
- **Active at Runtime:** Yes - all routes guarded, ownership enforced in services
- **Status:** IMPLEMENTED - subscription gating defaults to OFF (isSubscriptionGatingActive = false)

### AI
- **What:** 4 AI tools via /v1/ai/* routes: Strategy, Brief, Fit Score, Content Brief
- **Providers:** Gemini (primary) + Groq (fallback) - configured via AI_PROVIDER env
- **Implementation:**
  - Prompts in prompts/*.ts (versioned: strategy-v1.0.0, brief-v1.0.0, fit-score-v1.0.0, content-brief-v1.0.0)
  - Schemas in lib/ai-schemas.ts (Zod validation of AI output)
  - AIProviderService.callAI() handles provider routing + automatic fallback
  - GeminiService / GroqService make direct HTTP calls to REST APIs
  - Telemetry logged to ai_outputs table (tokens, latency, validity, provider, fallback)
- **Budget:** Daily token cap via aiBudgetMiddleware + InMemoryBudgetStore (per-brand or per-user)
- **Active at Runtime:** Yes - all 4 endpoints mounted, brand + influencer content-brief
- **Status:** IMPLEMENTED - but budget store is in-memory (not persistent across restarts)

### Creator Discovery
- **What:** Brand-facing search with filters (niche, followers, engagement, verification)
- **Backend:** CreatorService.discover() calls supabase.rpc('search_creators', ...)
- **Caching:** 5-min TTL in InMemoryCacheStore
- **Frontend:** DiscoverySearch.jsx - client-side additional filtering (search, audience size)
- **RPC search_creators:** NOT IN MIGRATIONS - DATABASE OBJECT NOT VERSION-CONTROLLED
- **Active at Runtime:** Yes - but will fail if RPC doesn't exist in production DB
- **Status:** PARTIAL - frontend/backend wired, but critical RPC missing from repo

### Matching/Recommendations
- **What:**
  - Campaign→Influencer matching: CampaignService.getMatchedForInfluencer() - filters by niche overlap in app layer
  - AI Fit Score: /v1/ai/fit-score - LLM evaluates creator against campaign
  - Brand AI Assistant: Strategy→Discovery→Fit Score chaining
- **Implementation:**
  - Matched campaigns: niche_targets (JSONB) vs influencer niches - filtered in JS (line 290-299 CampaignService)
  - AI Fit Score: builds prompt with campaign + creator stats → calls LLM → validates schema
- **Active at Runtime:** Yes - both paths implemented
- **Status:** IMPLEMENTED - but niche matching is basic string equality (case-insensitive)

### Instagram/Social Data
- **What:** Apify-based Instagram profile scraping for verification + periodic refresh
- **Flow:**
  - Influencer onboarding step 1 submits handle
  - On complete → IngestService.triggerIngest() creates ingest_jobs row
  - Background worker polls → claims pending → calls ApifyService.fetchProfileData()
  - Apify actor runs → worker waits → fetches dataset → parses → stores in influencer_stats
  - Auto-approval rules: followers≥10k, engagement 2-15%, no suspicious signals
  - Periodic refresh: every 24h for verified profiles
- **Failure Handling:** Retry with exponential backoff (max 3), failure classification (RATE_LIMIT, TIMEOUT, INVALID_HANDLE, PRIVATE_ACCOUNT, PARSE_ERROR)
- **Active at Runtime:** Yes - worker starts in app.ts, processes jobs
- **Status:** IMPLEMENTED - robust pipeline with retry/recovery logic

### Background Jobs
- **What:** Single in-process worker (IngestService) for Instagram verification + periodic refresh
- **Implementation:** setInterval polling ingest_jobs table every 30s (configurable)
- **Limitations:**
  - In-memory (no persistence across restarts)
  - Single process (no horizontal scaling)
  - No dead letter queue visibility beyond ingest_jobs.failure_class
- **Active at Runtime:** Yes - starts with server
- **Status:** PARTIAL - works for low volume, not production-grade

### Media Storage
- **What:** Cloudinary signed upload URLs
- **Flow:** Frontend calls /v1/media/upload-url with kind (avatar/logo/portfolio/media-kit) → Backend returns signed policy + Cloudinary credentials → Frontend uploads directly to Cloudinary → URL saved to profile
- **Policies:** Per-kind constraints (file types, size limits) in routes/media.ts
- **Active at Runtime:** Yes - endpoint mounted, Cloudinary config from env
- **Status:** IMPLEMENTED

### Email
- **What:** Resend transactional emails
- **Implementation:** emailService.ts - thin wrapper around Resend SDK
- **Usage:** NOT CALLED ANYWHERE in codebase (searched all services/routes)
- **Active at Runtime:** No - dead code
- **Status:** DEAD/UNUSED IMPLEMENTATION

### External APIs

| API | Purpose | Client | Status |
|-----|---------|--------|--------|
| Supabase | Auth, DB, Storage | @supabase/supabase-js (service role + anon) | Active |
| Apify | Instagram scraping | Direct HTTP in ApifyService | Active |
| Google Gemini | AI primary | Direct HTTP in GeminiService | Active |
| Groq | AI fallback | Direct HTTP in GroqService | Active |
| Cloudinary | Media upload signing | cloudinary SDK v2 | Active |
| Resend | Email | resend SDK | Unused |

### Deployment/Infrastructure
- **Frontend:** Vercel (inferred from VITE_API_URL default: https://meshlyy-backend.onrender.com)
- **Backend:** Render (inferred from same URL)
- **Database:** Supabase (managed Postgres)
- **Build:** Vite (frontend), tsc (backend - inferred)
- **Start:** node dist/app.js (inferred)
- **Env Config:** Zod-validated in config/env.ts - 37 required/optional vars
- **CI/CD:** NOT IN REPO - no GitHub Actions, no render.yaml, no vercel.json
- **Status:** REPOSITORY CONFIG ONLY - live config UNVERIFIED

### Environment/Configuration
- **Backend:** config/env.ts - Zod schema with defaults, fails fast on missing required
- **Frontend:** import.meta.env.VITE_* - 3 vars (SUPABASE_URL, SUPABASE_ANON_KEY, API_URL)
- **Secrets:** All in env vars - none in repo
- **Feature Flags:** SUBSCRIPTION_GATING_ACTIVE (defaults false), AI_PROVIDER (gemini/groq)

### Security
- **Auth:** JWT verified via Supabase getUser() (server-side)
- **CORS:** Dynamic origins from CORS_ORIGIN env + localhost in dev
- **Rate Limiting:** Express-rate-limit on waitlist only (5/15min/IP)
- **API Abuse:** Daily AI token cap + Apify spend cap (in-memory)
- **Signed Uploads:** Cloudinary signed URLs with timestamp + folder scoping
- **RLS:** NONE - all DB access via service role (bypasses RLS)
- **Secrets:** No exposure in repo
- **Ownership:** Enforced in service layer (assertBrandOwnership)
- **Status:** MIXED - AuthZ implemented in app layer, but no DB-level RLS

### Data Flows
- **Signup:** Browser → Supabase Auth → JWT → Backend /onboarding → users/brand_profiles|influencer_profiles → Ingest Job → Apify → influencer_stats → Verification
- **Login:** Browser → Supabase Auth → Session → Backend /onboarding/status → AuthContext → Frontend State
- **Creator Discovery:** Frontend → /v1/creators → CreatorService → search_creators RPC → Cache → Response
- **AI Fit Score:** Frontend → /v1/ai/fit-score → AIProviderService → Gemini/Groq → Schema Validation → Telemetry → Response
- **Campaign Create:** Frontend → /v1/campaigns → CampaignService → campaigns table → Idempotency key
- **Media Upload:** Frontend → /v1/media/upload-url → Cloudinary Signed URL → Direct Upload → Profile Update

### Error Handling
- **Backend:** errorHandler middleware → standardized AppError with code/message/field
- **Frontend:** ApiError class with status/code/field/retryAfter; 401→auto logout+redirect
- **Validation:** Zod schemas on all route inputs
- **Logging:** logger middleware (request/response), service-level error logging

### Caching
- **Backend:** InMemoryCacheStore (TTL-based) - used only for Creator discovery (5 min)
- **Frontend:** apiClient in-memory Map with deduplication for in-flight GETs
- **Redis/External:** NONE

### Rate Limiting
- **Waitlist:** 5 req/15min/IP (express-rate-limit)
- **AI:** Daily token cap per brand/user (in-memory budget store)
- **Apify:** Daily spend cap (in-memory budget store)
- **General API:** NONE

### Budget Controls
- **AI Tokens:** DAILY_AI_TOKEN_CAP (default 100k) - tracked in InMemoryBudgetStore + ai_outputs table
- **Apify Spend:** DAILY_APIFY_SPEND_CAP (default $50) - tracked in InMemoryBudgetStore
- **Persistence:** In-memory only - resets on restart

### Feature Flags
- SUBSCRIPTION_GATING_ACTIVE (env, default false) - gates discovery, AI, shortlists, campaigns
- AI_PROVIDER (env, default gemini) - primary AI provider selection

### Logging/Monitoring
- **Backend:** Console logger with levels (info/warn/error), request logging middleware
- **Frontend:** Console errors only
- **APM/Tracing:** NONE
- **Health Check:** /v1/health (public, no auth)

### Testing
- **Backend:** phase2-onboarding.integration.test.ts, phase4-integration.test.ts, verify-phase4.ts - integration tests against real Supabase
- **Frontend:** NONE - no test files in Frontend/src/
- **E2E:** NONE

---

## 2. REAL EXECUTION FLOWS (Exact Files/Functions)

### A. Signup
```
Browser: SignupForm.jsx (BrandSignupForm/InfluencerSignupForm)
  → AuthContext.signup() 
    → supabase.auth.signUp({email, password, data:{role}})
    → signInWithPassword if no session
    → hydrateUserFromSession() → apiClient.get('/onboarding/status')
Backend: POST /v1/onboarding/brand (routes/onboarding.ts:35)
  → BrandService.completeOnboarding() (services/BrandService.ts:22)
    → INSERT brand_profiles, UPDATE users.onboarding_completed=true
Influencer: POST /v1/onboarding/influencer/step1→2→3→4→complete
  → InfluencerService.submitStep1-4() (services/InfluencerService.ts)
  → completeOnboarding() → IngestService.triggerIngest() (services/IngestService.ts:93)
    → INSERT ingest_jobs (pending) → Worker picks up
```

### B. Login/Session
```
Browser: LoginForm.jsx → AuthContext.login() → supabase.auth.signInWithPassword()
  → onAuthStateChange → hydrateUserFromSession()
    → apiClient.get('/onboarding/status') → GET /v1/onboarding/status
Backend: routes/onboarding.ts:176 → loadAuthContext (middleware/auth.ts:117)
  → verifySupabaseJWT() → SELECT users → auto-provision if missing
  → SELECT brand_profiles (if BRAND) → SELECT subscriptions (latest)
  → Build AuthContext → attach to req
```

### C. Creator Onboarding
```
Frontend: InfluencerSignupForm.jsx → onboardingPayload (handle, niche, bio, rateCards)
  → AuthContext.signup(role='influencer', onboardingPayload)
    → Sequential POSTs: /step1, /step2, /step3, /step4, /complete
Backend: routes/onboarding.ts:81,96,111,133,148
  → InfluencerService.submitStep1-4() → UPDATE influencer_profiles, users.onboarding_step
  → completeOnboarding() → UPDATE users.onboarding_completed=true
    → IngestService.triggerIngest(profileId, igHandle)
      → INSERT ingest_jobs (pending) → lockStore.acquire()
Background: IngestService.runWorkerTick() (app.ts:112)
  → claimPendingJobs() → processClaimedJob()
    → ApifyService.fetchProfileData(igHandle)
      → POST Apify actor → waitForRun() → fetchDataset()
      → parse → storeStats() → evaluateProfile() → updateVerificationStatus()
        → UPDATE influencer_profiles (verification_status, is_verified)
        → INSERT admin_flags (if FLAGGED)
```

### D. Brand Onboarding
```
Frontend: BrandSignupForm.jsx → onboardingPayload (companyName, website, industry, budget, goals)
  → AuthContext.signup(role='brand', onboardingPayload)
    → POST /v1/onboarding/brand
Backend: routes/onboarding.ts:35 → BrandService.completeOnboarding()
  → INSERT brand_profiles → UPDATE users.onboarding_completed=true, step=5
```

### E. Creator Discovery
```
Frontend: DiscoverySearch.jsx → apiClient.get('/creators?filters')
Backend: routes/creators.ts:31 → CreatorService.discover(filters)
  → cacheStore.get(cacheKey) → HIT: return cached
  → MISS: supabase.rpc('search_creators', {p_niche, p_follower_min, ...})
    → Transform rows → buildPaginatedResponse → cacheStore.set(300s)
```

### F. AI Fit Scoring
```
Frontend: BrandAIAssistant.jsx → apiClient.post('/ai/fit-score', {campaign_id, creator_id})
  OR /ai/fit-score/:creatorId with context
Backend: routes/ai.ts:289 → checkRole('BRAND')
  → Fetch campaign, brand, creator + stats + rate_cards
  → buildFitScorePrompt() (prompts/fit-score-v1.0.0.ts)
  → AIProviderService.callAI('fit_score', ...)
    → callGemini() or callGroq() → parse JSON → validate FitScoreOutputSchema
    → INSERT ai_outputs (telemetry)
  → Return validated output + _meta
```

### G. Campaign Creation
```
Frontend: CampaignBuilder.jsx → buildPayload() → apiClient.post('/campaigns')
Backend: routes/campaigns.ts:50 → CampaignService.create(authContext, input)
  → Idempotency check (idempotency_keys)
  → INSERT campaigns (status=DRAFT) → INSERT idempotency_keys
  → Return campaign
```

### H. Creator Application
```
Frontend: PublicCampaigns.jsx → apiClient.post('/collaborations/apply', {campaign_id})
Backend: routes/collaborations.ts:76 → CollaborationService.apply()
  → Verify campaign ACTIVE, no existing collab
  → INSERT collaboration_requests (type=APPLICATION, status=PENDING)
```

### I. Brand Invitation
```
Frontend: DiscoverySearch/CreatorDetailPage → apiClient.post('/collaborations/invite', {campaign_id, influencer_id})
Backend: routes/collaborations.ts:44 → CollaborationService.sendInvite()
  → Verify campaign ACTIVE, brand owns, influencer verified
  → INSERT collaboration_requests (type=INVITE, status=PENDING)
```

### J. Media Upload
```
Frontend: FileUpload.jsx → apiClient.get('/media/upload-url', {kind})
Backend: routes/media.ts:64 → Cloudinary api_sign_request()
  → Return {uploadUrl, params, constraints}
Frontend: Direct POST to Cloudinary uploadUrl with params
  → On success → apiClient.patch('/profile/me', {portfolioUrl: cloudinaryUrl})
```

---

## 3. DATABASE FORENSICS

### Tables (from migrations)

| Table | PK | FKs | Notable Columns | Indexes |
|-------|----|-----|-----------------|---------|
| users | id (UUID) | - | email, role, onboarding_step, onboarding_completed, is_deleted | email (partial unique), role, is_deleted |
| brand_profiles | id | user_id→users | company_name, website, industry, target_demographics(JSONB), budget_range_min/max, tone_voice, campaign_goals(JSONB), is_deleted | user_id (unique) |
| influencer_profiles | id | user_id→users | ig_handle, niche_primary/secondary, bio, portfolio_url, media_kit_url, is_verified, verification_status, flag_reason, rejection_reason_code, resubmission_count, last_resubmitted_at, last_scraped_at, is_deleted | user_id (unique), ig_handle (partial unique), niche_primary, verification_status, is_deleted, search (partial: verified+not deleted) |
| influencer_stats | id | influencer_id→influencer_profiles | follower_count, following_count, engagement_rate, avg_likes, avg_comments, top_countries, age_split, gender_split, total_views_30d, last_updated_at | influencer_id (unique, added in 0003), follower_count, engagement_rate, join_filter (influencer_id, follower_count DESC, engagement_rate) |
| rate_cards | id | influencer_id→influencer_profiles | service_type (enum), price, currency, display_currency | - |
| subscriptions | id | user_id→users | role, tier, status, period_start/end | - |
| campaigns | id | brand_id→brand_profiles | title, status, brief_data, brief_preview, visibility, budget, currency, niche_targets(JSONB), is_deleted | brand_id, status, is_deleted |
| shortlists | id | brand_id→brand_profiles, influencer_id→influencer_profiles, campaign_id→campaigns | label, is_deleted (added 0004) | brand_id, influencer_id, (brand,influencer,campaign) partial unique, (brand,influencer) no campaign partial unique, is_deleted |
| collaboration_requests | id | campaign_id→campaigns, brand_id→brand_profiles, influencer_id→influencer_profiles | type (enum), status (enum), message | (campaign,influencer,type) unique, campaign_id, brand_id, influencer_id, status |
| ingest_jobs | id | influencer_id→influencer_profiles | ig_handle, status (enum), failure_class, failure_detail, started_at, completed_at | ig_handle, status, (status,started_at), (ig_handle,status,started_at) |
| idempotency_keys | id | user_id→users | key, scope, request_hash, response_status, response_body, expires_at | (scope,user_id,key) unique, expires_at |
| admin_audit_log | id | actor_id→users | action, target_type, target_id, old_state, new_state, reason | actor_id, (target_type,target_id), created_at |
| admin_flags | id | influencer_id→influencer_profiles | flag_type, flag_detail, resolved, resolved_by | influencer_id, resolved |
| ai_outputs | id | brand_id→brand_profiles, campaign_id→campaigns | ai_tool_type, prompt_version, token_count, latency_ms, output_schema_valid, failure_reason | brand_id, ai_tool_type, created_at |

### Enums (9 total)
- **user_role:** BRAND, INFLUENCER, ADMIN
- **verification_status:** PENDING, APPROVED, REJECTED, FLAGGED
- **campaign_status:** DRAFT, ACTIVE, PAUSED, COMPLETED
- **campaign_visibility:** PRIVATE, MATCHED
- **service_type:** STORY, POST, REEL, BUNDLE
- **subscription_tier:** trial, basic, pro, enterprise
- **subscription_status:** ACTIVE, INACTIVE, TRIAL, CANCELLED
- **collaboration_type:** INVITE, APPLICATION
- **collaboration_status:** PENDING, ACCEPTED, DECLINED, CLARIFICATION_REQUESTED
- **ingest_status:** pending, running, success, partial_success, failed

### RPCs Called But NOT In Migrations

| RPC | Called From | Status |
|-----|------------|--------|
| search_creators | CreatorService.discover() (services/CreatorService.ts:70) | DATABASE OBJECT NOT VERSION-CONTROLLED |
| exec_sql | verify-phase4.ts:116 (test only) | DATABASE OBJECT NOT VERSION-CONTROLLED |

### Tables Referenced But NOT In Migrations

| Table | Referenced From | Status |
|-------|----------------|--------|
| waitlist | routes/waitlist.ts:39 | DATABASE OBJECT NOT VERSION-CONTROLLED |

### RLS Status
- NO RLS ENABLED on any table
- NO POLICIES created
- All backend access uses service_role key (bypasses RLS entirely)
- Frontend uses anon key but only calls backend API, never direct DB

### Triggers/Functions/Views
NONE in migrations

---

## 4. DOCUMENTATION VS REALITY AUDIT

| Feature | Documentation Claim | Actual Implementation | Status | Evidence |
|---------|--------------------|-----------------------|--------|----------|
| User Authentication | Supabase Auth email/password | Implemented: signup, login, session restore, logout | DOCUMENTED + IMPLEMENTED | AuthContext.jsx:141, LoginForm.jsx, SignupForm.jsx |
| Brand Onboarding | Single-step form | Implemented: 6-section form → POST /onboarding/brand | DOCUMENTED + IMPLEMENTED | BrandSignupForm.jsx, routes/onboarding.ts:35 |
| Influencer Onboarding | 5-step with Instagram verification | Implemented: 5 steps + Apify ingest worker | DOCUMENTED + IMPLEMENTED | InfluencerSignupForm.jsx, routes/onboarding.ts:81-170 |
| Creator Discovery | Filtered search with pagination | Implemented: niche, followers, engagement, verified filters + cache | DOCUMENTED + IMPLEMENTED | DiscoverySearch.jsx, CreatorService.discover() |
| AI Campaign Strategy | Generate strategy for creator | Implemented: /ai/strategy with versioned prompt + schema | DOCUMENTED + IMPLEMENTED | routes/ai.ts:90, prompts/strategy-v1.0.0.ts |
| AI Campaign Brief | Generate brief from goals | Implemented: /ai/brief with budget breakdown rules | DOCUMENTED + IMPLEMENTED | routes/ai.ts:189, prompts/brief-v1.0.0.ts |
| AI Fit Scoring | Score creator for campaign | Implemented: /ai/fit-score + contextual /ai/fit-score/:id | DOCUMENTED + IMPLEMENTED | routes/ai.ts:289, prompts/fit-score-v1.0.0.ts |
| AI Content Brief | Creator-side content brief | Implemented: /ai/content-brief (brand) + /ai/influencer/content-brief | DOCUMENTED + IMPLEMENTED | routes/ai.ts:640, 768 |
| Campaign Management | CRUD + status transitions | Implemented: create, list, get, update, status, delete | DOCUMENTED + IMPLEMENTED | routes/campaigns.ts, CampaignService |
| Collaboration/Invites | Brand invites + influencer applies | Implemented: state machine PENDING→ACCEPTED/DECLINED | DOCUMENTED + IMPLEMENTED | routes/collaborations.ts, CollaborationService |
| Shortlists | Brand saves creators | Implemented: campaign-specific + general, soft delete | DOCUMENTED + IMPLEMENTED | routes/shortlists.ts, ShortlistService |
| Instagram Verification | Apify scraping + auto-approve | Implemented: full pipeline with retry/recovery | DOCUMENTED + IMPLEMENTED | IngestService, ApifyService |
| Subscription Gating | Tier-based feature access | Implemented: featureGates.ts + subscriptionGuard middleware | DOCUMENTED + IMPLEMENTED | config/featureGates.ts, middleware/auth.ts:311 |
| Email Notifications | Resend integration | Code exists but NEVER CALLED | DOCUMENTED + NOT IMPLEMENTED | emailService.ts (no callers found) |
| Admin Verification Queue | Review pending creators | Implemented: /admin/verification-queue, approve/reject | DOCUMENTED + IMPLEMENTED | VerificationQueue.jsx, routes/admin (missing - see below) |
| Public Campaigns | Influencer browses matched | Implemented: /campaigns/matched → PublicCampaigns.jsx | DOCUMENTED + IMPLEMENTED | routes/campaigns.ts:147, PublicCampaigns.jsx |
| Rate Cards | Influencer sets pricing | Implemented: step 4 onboarding, stored in rate_cards | DOCUMENTED + IMPLEMENTED | InfluencerService.submitStep4() |
| Media Upload | Cloudinary signed URLs | Implemented: /media/upload-url per kind | DOCUMENTED + IMPLEMENTED | routes/media.ts, FileUpload.jsx |
| Budget Controls | Daily AI/Apify caps | Implemented: in-memory budget store + middleware | DOCUMENTED + PARTIALLY IMPLEMENTED | budget.ts, budgetStore (in-memory only) |
| RLS/Security | Database-level security | NONE - no RLS, no policies | DOCUMENTED + NOT IMPLEMENTED | Migrations show no ENABLE RLS |
| Background Workers | Async job processing | Implemented: IngestService in-process worker | DOCUMENTED + IMPLEMENTED | IngestService.startBackgroundWorker() |
| Search RPC | Database function for discovery | CALLED BUT NOT IN MIGRATIONS | IMPLEMENTED + NOT DOCUMENTED | CreatorService.discover() calls search_creators |

---

## 5. DEAD CODE / ORPHANED ARCHITECTURE

| Item | Location | Status | Reason |
|------|---------|--------|--------|
| emailService.ts | Backend/services/ | DEAD | Exported but zero callers in codebase |
| budgetMiddleware.ts | Backend/middleware/ | ORPHANED | Exported but not used (app.ts uses aiBudgetMiddleware from budget.ts) |
| verifyToken duplicate | middleware/auth.ts:81 + middleware/verifyToken.ts | DUPLICATE | verifyToken.ts re-exports from auth.ts; auth.ts has full implementation |
| loadAuthContext duplicate | middleware/loadAuthContext.ts:1 | DUPLICATE | Single-line re-export from auth.ts |
| onboardingGuard duplicate | middleware/onboardingGuard.ts:1 | DUPLICATE | Simplified version; auth.ts has full version with redirects |
| subscriptionGuard | middleware/auth.ts:311 | UNUSED | Not mounted on any route (subscription gating is OFF by default) |
| waitlist table | routes/waitlist.ts | UNVERSIONED | Table referenced but not in any migration |
| search_creators RPC | CreatorService.discover() | UNVERSIONED | RPC called but not created in migrations |
| exec_sql RPC | verify-phase4.ts | UNVERSIONED | Test-only RPC, not in migrations |
| stores/memory/* | Backend/stores/memory/ | LIMITED | In-memory only - not production-ready for scaling |
| phase2-onboarding.integration.test.ts | Backend/src/ | TEST ONLY | Integration tests, not production code |
| phase4-integration.test.ts | Backend/src/ | TEST ONLY | Integration tests |
| verify-phase4.ts | Backend/src/ | TEST ONLY | Verification script |

---

## 6. FRONTEND ↔ BACKEND CONTRACT AUDIT

| Frontend Call | Backend Route | Contract Match? | Problem |
|--------------|--------------|-----------------|---------|
| POST /onboarding/brand | POST /v1/onboarding/brand | ✅ | - |
| POST /onboarding/influencer/step1 | POST /v1/onboarding/influencer/step1 | ✅ | - |
| POST /onboarding/influencer/step2 | POST /v1/onboarding/influencer/step2 | ✅ | - |
| POST /onboarding/influencer/step3 | POST /v1/onboarding/influencer/step3 | ✅ | - |
| POST /onboarding/influencer/step4 | POST /v1/onboarding/influencer/step4 | ✅ | - |
| POST /onboarding/influencer/complete | POST /v1/onboarding/influencer/complete | ✅ | - |
| GET /onboarding/status | GET /v1/onboarding/status | ✅ | - |
| GET /profile/me | GET /v1/profile/me | ✅ | - |
| PATCH /profile/me | PATCH /v1/profile/me | ✅ | - |
| GET /creators?filters | GET /v1/creators | ✅ | - |
| GET /creators/:id | GET /v1/creators/:id | ✅ | - |
| POST /campaigns | POST /v1/campaigns | ✅ | - |
| GET /campaigns | GET /v1/campaigns | ✅ | - |
| GET /campaigns/:id | GET /v1/campaigns/:id | ✅ | - |
| PATCH /campaigns/:id | PATCH /v1/campaigns/:id | ✅ | - |
| PATCH /campaigns/:id/status | PATCH /v1/campaigns/:id/status | ✅ | - |
| DELETE /campaigns/:id | DELETE /v1/campaigns/:id | ✅ | - |
| GET /campaigns/matched | GET /v1/campaigns/matched | ✅ | - |
| POST /collaborations/invite | POST /v1/collaborations/invite | ✅ | snake_case body mapped |
| POST /collaborations/apply | POST /v1/collaborations/apply | ✅ | snake_case body mapped |
| PATCH /collaborations/:id/status | PATCH /v1/collaborations/:id/status | ✅ | - |
| GET /collaborations/incoming | GET /v1/collaborations/incoming | ✅ | - |
| GET /collaborations/campaign/:id | GET /v1/collaborations/campaign/:id | ✅ | - |
| GET /collaborations/:id | GET /v1/collaborations/:id | ✅ | - |
| POST /shortlists | POST /v1/shortlists | ✅ | snake_case body mapped |
| GET /shortlists | GET /v1/shortlists | ✅ | - |
| DELETE /shortlists/:id | DELETE /v1/shortlists/:id | ✅ | - |
| POST /ai/strategy | POST /v1/ai/strategy | ✅ | - |
| POST /ai/brief | POST /v1/ai/brief | ✅ | - |
| POST /ai/fit-score | POST /v1/ai/fit-score | ✅ | - |
| POST /ai/fit-score/:id | POST /v1/ai/fit-score/:id | ✅ | - |
| POST /ai/content-brief | POST /v1/ai/content-brief | ✅ | - |
| POST /ai/influencer/content-brief | POST /v1/ai/influencer/content-brief | ✅ | - |
| GET /media/upload-url | GET /v1/media/upload-url | ✅ | - |
| GET /influencer/dashboard | GET /v1/influencer/dashboard | ✅ | - |
| POST /waitlist | POST /v1/waitlist | ✅ | - |
| GET /admin/verification-queue | NO BACKEND ROUTE | ❌ | Frontend calls non-existent endpoint |
| POST /admin/verify/:id | NO BACKEND ROUTE | ❌ | Frontend calls non-existent endpoint |
| POST /admin/reject/:id | NO BACKEND ROUTE | ❌ | Frontend calls non-existent endpoint |

**Critical Finding:** Admin verification queue frontend (VerificationQueue.jsx) calls 3 endpoints that DO NOT EXIST in backend routes:
- GET /admin/verification-queue
- POST /admin/verify/:id
- POST /admin/reject/:id

No routes/admin.ts file exists. Admin feature is FRONTEND ONLY.

---

## 7. SECURITY FORENSICS

| Area | Repository Verified | Live Environment Verified | Notes |
|------|--------------------|-----------------------------|-------|
| RLS Enabled | ❌ NO | UNVERIFIED | No ENABLE ROW LEVEL SECURITY in any migration |
| RLS Policies | ❌ NO | UNVERIFIED | No CREATE POLICY statements |
| Service Role Usage | ✅ YES | UNVERIFIED | Backend exclusively uses service_role (config/supabase.ts:7) |
| Anon Key Exposure | ✅ YES | UNVERIFIED | Frontend uses anon key (supabaseClient.js:4-5) but only calls backend API |
| JWT Verification | ✅ YES | UNVERIFIED | verifyToken calls supabase.auth.getUser() (middleware/auth.ts:92) |
| Ownership Checks | ✅ YES | UNVERIFIED | assertBrandOwnership in all brand services |
| Role Checks | ✅ YES | UNVERIFIED | checkRole middleware on all protected routes |
| Admin Access | ⚠️ PARTIAL | UNVERIFIED | Admin role exists but no admin routes; frontend calls missing endpoints |
| CORS | ✅ YES | UNVERIFIED | Dynamic origins from env + localhost dev (app.ts:25-49) |
| Rate Limits | ⚠️ MINIMAL | UNVERIFIED | Only waitlist (5/15min/IP); no general API rate limiting |
| Public Endpoints | ✅ VERIFIED | UNVERIFIED | /v1/health, /v1/waitlist, /v1/onboarding (auth but no onboarding gate) |
| Signed Uploads | ✅ YES | UNVERIFIED | Cloudinary signed URLs with timestamp + folder scoping (routes/media.ts) |
| DB Access Control | ❌ NONE | UNVERIFIED | Service role bypasses all RLS; no row-level security |
| RPC Security | ⚠️ MISSING RPCs | UNVERIFIED | search_creators RPC called but not defined in repo |
| Env Config | ✅ YES | UNVERIFIED | Zod validation, fails fast, no secrets in repo |
| Secret Exposure | ✅ NONE | UNVERIFIED | No secrets in codebase |

**Critical Security Gap:** Zero database-level security (RLS). All protection is in application layer only. If service role key is compromised, full database access.

---

## 8. RUNTIME / DEPLOYMENT ARCHITECTURE

| Component | Repository Config | Live Environment | Verifiable |
|-----------|------------------|-----------------|------------|
| Frontend Host | VITE_API_URL default: https://meshlyy-backend.onrender.com | Inferred: Vercel | UNVERIFIED |
| Backend Host | Same URL implies Render | Inferred: Render | UNVERIFIED |
| Database | Supabase (SUPABASE_URL env) | Supabase managed | UNVERIFIED |
| Build Command | Not in repo | Unknown | MISSING |
| Start Command | Not in repo | Unknown | MISSING |
| Workers | In-process (IngestService) | Unknown | UNVERIFIED |
| CI/CD | No GitHub Actions, no render.yaml, no vercel.json | Unknown | MISSING |
| Env Vars | 37 backend, 3 frontend (Zod validated) | Unknown | UNVERIFIED |
| Production/Dev Diffs | CORS allows localhost in dev only | Unknown | PARTIAL |
| Background Processes | IngestService worker starts with server | Unknown | UNVERIFIED |

**Key Gap:** No deployment configuration in repository. All infrastructure config is external/unknown.

---

## 9. ARCHITECTURAL INCONSISTENCIES

| Contradiction | Evidence |
|--------------|---------|
| Admin routes documented but not implemented | VerificationQueue.jsx calls 3 admin endpoints; no routes/admin.ts exists |
| RLS documented as security feature but not implemented | No ENABLE RLS in any migration; service role used everywhere |
| search_creators RPC called but not in migrations | CreatorService.ts:70 calls it; 0001_init_schema.sql has no CREATE FUNCTION |
| waitlist table used but not in migrations | routes/waitlist.ts:39 references 'waitlist'; no CREATE TABLE waitlist |
| Subscription gating code exists but default OFF | featureGates.ts:22 isSubscriptionGatingActive = false; subscriptionGuard not mounted |
| Email service implemented but never called | emailService.ts exported; zero callers in grep |
| In-memory stores used for production features | BudgetStore, CacheStore, LockStore all in-memory; reset on restart |
| Frontend uses snake_case for API but backend expects camelCase in services | routes/collaborations.ts:57-62, shortlists.ts:31-35 manually map snake_case→camelCase |
| Campaign visibility enum mismatch | Migration: campaign_visibility = PRIVATE/MATCHED; Code uses 'PUBLIC' |
| Ingest worker single-process but no horizontal scaling | app.ts:112 starts worker; no lock coordination for multi-instance |
| AI budget tracked in-memory + DB but middleware only checks memory | aiBudgetMiddleware uses budgetStore (memory); ai_outputs table has telemetry but not used for enforcement |
| Partial unique indexes for soft delete but some queries don't filter is_deleted | Most queries filter .eq('is_deleted', false) but some may miss it |

---

## 10. CURRENT ARCHITECTURE MAP

### A. Component/Service Map

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                         │
├─────────────────────────────────────────────────────────────────┤
│  AuthContext ──→ apiClient ──→ Backend API (/v1/*)             │
│       │                                                          │
│  ┌────┴────┬────────┬────────┬────────┬────────┐               │
│  │ Public  │ Brand  │Influen-│ Admin  │ Layout │               │
│  │(Landing,│(Dash,  │cer(Dash,│(Queue) │(Header,│               │
│  │ Login,  │Search, │Invites, │         │Sidebar)│               │
│  │ Signup) │Campaign,│ AI,    │         │         │               │
│  │         │Shortlist,│Campaigns)│        │         │               │
│  └─────────┴────────┴────────┴────────┴────────┘               │
└─────────────────────────────────────────────────────────────────┘
                              │ HTTPS + JWT
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND (Express)                          │
├─────────────────────────────────────────────────────────────────┤
│  Middleware: CORS → Logger → Timeout → Auth Stack              │
│       │                                                         │
│  ┌────┴────┬────────┬────────┬────────┬────────┬────────┐      │
│  │Health/  │Onboard │Profile │ Media  │ Core   │ Admin  │      │
│  │Waitlist │        │        │        │ Platform│ (MISSING)     │
│  └─────────┴────────┴────────┴────────┴────────┴────────┘      │
│       │                                                         │
│  Core Platform Routes (verifyToken→loadAuthContext→onboarding)  │
│  ┌────────┬─────────┬─────────┬───────────┬────────┬────────┐  │
│  │Creators│Campaigns│Shortlists│Collabora- │Influenc│ AI     │  │
│  │        │         │         │tions      │er      │        │  │
│  └────────┴─────────┴─────────┴───────────┴────────┴────────┘  │
│       │                                                         │
│  Services: Brand, Influencer, Creator, Campaign, Collaboration,│
│            Shortlist, Ingest, Apify, AIProvider, Email(DEAD)   │
│       │                                                         │
│  Background: IngestService (setInterval worker)                │
└─────────────────────────────────────────────────────────────────┘
                              │ Service Role
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SUPABASE (PostgreSQL)                        │
├─────────────────────────────────────────────────────────────────┤
│  Tables: users, brand_profiles, influencer_profiles,           │
│          influencer_stats, rate_cards, subscriptions,          │
│          campaigns, shortlists, collaboration_requests,        │
│          ingest_jobs, idempotency_keys, admin_audit_log,       │
│          admin_flags, ai_outputs, (waitlist MISSING)           │
│  RPCs: search_creators (MISSING), exec_sql (MISSING)           │
│  RLS: NONE                                                      │
│  Auth: Supabase Auth (separate from public schema)             │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        ┌──────────┐  ┌────────────┐  ┌─────────────┐
        │  Apify   │  │  Gemini/   │  │ Cloudinary  │
        │ (Instagram│  │  Groq      │  │ (Media      │
        │  Scrape) │  │  (AI)      │  │  Upload)    │
        └──────────┘  └────────────┘  └─────────────┘
```

### B. Database Relationship Map

```
users (1) ─────┬───── (1) brand_profiles
               │
               └───── (1) influencer_profiles ──┬──── (1) influencer_stats
                                                │
                                                ├──── (N) rate_cards
                                                │
                                                └──── (N) ingest_jobs

brand_profiles (1) ──── (N) campaigns ──┬──── (N) collaboration_requests
                                       │                │
                                       │                └─── (N) influencer_profiles (via influencer_id)
                                       │
                                       └──── (N) shortlists ── (N) influencer_profiles
                                       
campaigns ── (N) collaboration_requests ── (1) brand_profiles (via brand_id)
```

### C. External Integration Map

```
Frontend ──→ Supabase Auth (anon) ──→ JWT
     │
     └──→ Backend API ──→ Supabase DB (service_role)
                    │
                    ├──→ Apify (Instagram scrape)
                    ├──→ Gemini API (AI primary)
                    ├──→ Groq API (AI fallback)
                    ├──→ Cloudinary (signed upload)
                    └──→ Resend (email - UNUSED)
```

### D. Authentication Flow

```
Browser: supabase.auth.signUp/signIn → Session (access_token, refresh_token)
    │
    ├─→ AuthContext: hydrateUserFromSession()
    │       │
    │       └─→ GET /v1/onboarding/status → Backend loadAuthContext()
    │                     │                      │
    │                     │                      ├─→ verifySupabaseJWT(token)
    │                     │                      ├─→ SELECT users (auto-provision)
    │                     │                      ├─→ SELECT brand_profiles (if BRAND)
    │                     │                      └─→ SELECT subscriptions (latest)
    │                     │
    │                     └─→ Build user object {role, onboardingCompleted, ...}
    │
    └─→ apiClient: Authorization: Bearer <access_token> on all requests
```

### E. Creator Lifecycle

```
1. SIGNUP: POST /onboarding/influencer/step1 (handle)
   → Validate format, uniqueness (partial unique index)
   → INSERT influencer_profiles (ig_handle, niche_primary='')
   → UPDATE users.onboarding_step=1

2. STEP 2: POST /step2 (niche, bio)
   → UPDATE influencer_profiles (niche_primary, niche_secondary, bio)
   → UPDATE users.onboarding_step=2

3. STEP 3: POST /step3 (portfolio, media kit URLs)
   → UPDATE influencer_profiles
   → UPDATE users.onboarding_step=3

4. STEP 4: POST /step4 (rate cards)
   → INSERT rate_cards (service_type, price, currency)
   → UPDATE users.onboarding_step=4

5. COMPLETE: POST /complete
   → UPDATE users.onboarding_completed=true, step=5
   → IngestService.triggerIngest() → INSERT ingest_jobs (pending)

6. BACKGROUND WORKER:
   → Claim job → Apify fetch → Parse → Store stats
   → Evaluate: Auto-approve (followers≥10k, engagement 2-15%, no flags)
   → UPDATE influencer_profiles (verification_status, is_verified)
   → If FLAGGED: INSERT admin_flags

7. PERIODIC REFRESH: Every 24h for verified profiles
   → Enqueue new ingest_jobs for stale last_scraped_at
```

### F. Brand Lifecycle

```
1. SIGNUP: POST /onboarding/brand (company, industry, budget, goals)
   → INSERT brand_profiles
   → UPDATE users.onboarding_completed=true, step=5

2. DASHBOARD: GET /profile/me → brand profile + user
   → Edit: PATCH /profile/me

3. CAMPAIGNS: POST /campaigns (DRAFT) → PATCH /status (ACTIVE)
   → niche_targets (JSONB) used for matching

4. DISCOVERY: GET /creators?filters → search_creators RPC
   → Cache 5 min → Shortlist via POST /shortlists

5. COLLABORATION: POST /collaborations/invite (INVITE)
   → Or influencer POST /apply (APPLICATION)
   → State: PENDING → ACCEPTED/DECLINED (terminal)
```

### G. Campaign Lifecycle

```
DRAFT → (Brand launches) → ACTIVE → (Brand pauses) → PAUSED
  │                                    │
  │                                    └→ (Brand resumes) → ACTIVE
  │
  └→ (Brand completes) → COMPLETED (terminal)

Visibility: MATCHED (default, niche-matched) | PUBLIC (not used in backend enum)
```

### H. AI Flow

```
User Prompt → Detect Intent (strategy|brief|fit_score|content_brief|discover)
    │
    ├─→ Strategy: GET brand + creator → buildStrategyPrompt → callAI → validate StrategyOutputSchema
    │
    ├─→ Brief: GET brand → buildBriefPrompt → callAI → validate BriefOutputSchema
    │
    ├─→ Fit Score: GET campaign + brand + creator + stats + rate_cards
    │       → buildFitScorePrompt → callAI → validate FitScoreOutputSchema
    │
    ├─→ Content Brief: GET campaign + brand + creator
    │       → buildContentBriefPrompt → callAI → validate ContentBriefOutputSchema
    │
    └─→ Discover: Strategy → extract filters → GET /creators → return matches

callAI: Try primary provider (Gemini/Groq) → on failure (rate limit, timeout, 5xx) → fallback
    → Log to ai_outputs (tokens, latency, validity, provider, fallback_used)
    → Track budget in InMemoryBudgetStore (per brand/user daily cap)
```

### I. Data Flow Diagram

```
┌─────────┐     ┌──────────────┐     ┌─────────────┐     ┌────────────┐
│ Browser │────▶│ Supabase Auth │────▶│ JWT + User  │────▶│ Frontend   │
└─────────┘     └──────────────┘     │   Context   │     │   State    │
                                     └─────────────┘     └────────────┘
                                            │
                                            ▼
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌────────────┐
│   Apify     │◀───│ IngestWorker │◀───│  Ingest Job │◀───│  Onboard   │
│ (Instagram) │     │  (30s poll)  │     │  (pending)  │     │  Complete  │
└─────────────┘     └──────────────┘     └─────────────┘     └────────────┘
       │                   │                    │
       ▼                   ▼                    ▼
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Dataset    │     │  Stats +     │     │  Verification│
│  (JSON)     │────▶│  Evaluation  │────▶│   Status     │
└─────────────┘     └──────────────┘     └─────────────┘
                                            │
                                            ▼
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Discovery  │◀───│  Search RPC  │◀───│  Filtered    │
│  (Brands)   │     │ (search_     │     │  Creators    │
│             │     │  _creators)  │     │  (verified)  │
└─────────────┘     └──────────────┘     └─────────────┘
       │
       ▼
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Campaign   │────▶│  Matching    │────▶│ Collaboration│
│  Creation   │     │  (niche/     │     │  (Invite/    │
│             │     │   AI score)  │     │   Apply)    │
└─────────────┘     └──────────────┘     └─────────────┘
```

---

## 11. ARCHITECTURE RISK INVENTORY

| # | Problem | Severity | Why It Exists | Evidence | Affected Components | Runtime Impact | Verified |
|---|---------|----------|--------------|---------|--------------------|--------------|----|
| 1 | Zero RLS / Database Security | CRITICAL | No RLS in any migration; service_role bypasses all | Migrations: no ENABLE RLS, no CREATE POLICY | All DB access | Full data exposure if service key leaked | REPOSITORY VERIFIED |
| 2 | Admin endpoints missing | CRITICAL | Frontend calls 3 admin routes; no backend implementation | VerificationQueue.jsx:93,117,133; no routes/admin.ts | Admin verification queue | Admin cannot approve/reject creators | REPOSITORY VERIFIED |
| 3 | search_creators RPC not in migrations | CRITICAL | CreatorService calls RPC that doesn't exist in repo | CreatorService.ts:70; migrations grep: no matches | Creator discovery | Discovery fails in production if RPC missing | REPOSITORY VERIFIED |
| 4 | waitlist table not in migrations | CRITICAL | Route references table not created | routes/waitlist.ts:39; migrations grep: no matches | Waitlist signup | Silent failure (logged but returns success) | REPOSITORY VERIFIED |
| 5 | In-memory budget/cache/lock stores | HIGH | Stores reset on restart; no persistence | stores/memory/*.ts; budget.ts uses budgetStore | AI budget, Apify budget, discovery cache, ingest locks | Budget caps reset; cache lost; duplicate ingest possible | REPOSITORY VERIFIED |
| 6 | Email service dead code | HIGH | Implemented but zero callers | emailService.ts; grep: no callers | Email notifications | No emails sent for any event | REPOSITORY VERIFIED |
| 7 | Single-process ingest worker | HIGH | setInterval in app.ts; no horizontal scaling | app.ts:112; IngestService.startBackgroundWorker() | Instagram verification | Bottleneck/failure at scale; no HA | REPOSITORY VERIFIED |
| 8 | Campaign visibility enum mismatch | MEDIUM | Migration: PRIVATE/MATCHED; Code uses 'PUBLIC' | 0001_init_schema.sql:38; CampaignFeed.jsx:30 | Campaign feed, public campaigns | 'PUBLIC' campaigns not queryable by enum | REPOSITORY VERIFIED |
| 9 | No general API rate limiting | MEDIUM | Only waitlist has rate limit | app.ts: no rate limit middleware; waitlist.ts:10 | All public APIs | Abuse/DDoS vulnerability | REPOSITORY VERIFIED |
| 10 | Auto-provisioning users without email confirm | MEDIUM | loadAuthContext upserts users from JWT metadata | auth.ts:148-156 | Auth, user management | Unconfirmed users get database rows | REPOSITORY VERIFIED |
| 11 | Subscription gating default OFF | MEDIUM | isSubscriptionGatingActive = false | featureGates.ts:22 | Feature access control | All features free regardless of tier | REPOSITORY VERIFIED |
| 12 | No deployment config in repo | MEDIUM | No CI/CD, no render.yaml, vercel.json | Repo root: no deployment files | Deployment | Unknown production config | REPOSITORY VERIFIED |
| 13 | Snake_case/camelCase manual mapping | LOW | Frontend sends snake_case; backend maps manually | routes/collaborations.ts:57-62; shortlists.ts:31-35 | API contracts | Maintenance burden; error-prone | REPOSITORY VERIFIED |
| 14 | No frontend tests | LOW | Zero test files in Frontend/src | Frontend/src/ glob: no .test. | Frontend quality | Regression risk | REPOSITORY VERIFIED |
| 15 | exec_sql RPC in test only | INFORMATIONAL | verify-phase4.ts calls exec_sql | verify-phase4.ts:116 | Test infrastructure | Test-only; not production | REPOSITORY VERIFIED |

---

## 12. FINAL VERIFICATION INDEX

| Claim | Evidence | Confidence |
|-------|---------|------------|
| Frontend does not directly access DB | apiClient.js only calls /v1/*; supabaseClient.js only used for auth | HIGH |
| Backend uses service_role exclusively | config/supabase.ts:7-16 creates client with SERVICE_ROLE_KEY | HIGH |
| No RLS policies in migrations | grep of 0001-0004: no ENABLE ROW LEVEL SECURITY, no CREATE POLICY | HIGH |
| search_creators RPC called but not in migrations | CreatorService.ts:70 calls it; migrations grep: no matches | HIGH |
| waitlist table referenced but not created | routes/waitlist.ts:39; migrations grep: no CREATE TABLE waitlist | HIGH |
| Admin endpoints missing | VerificationQueue.jsx calls 3 admin routes; no routes/admin.ts exists | HIGH |
| Email service never called | emailService.ts exported; grep across src: zero callers | HIGH |
| In-memory stores for production features | stores/memory/*.ts implement interfaces; budget.ts uses budgetStore | HIGH |
| Single-process ingest worker | app.ts:112 calls ingestService.startBackgroundWorker() | HIGH |
| Campaign visibility enum mismatch | Migration: PRIVATE/MATCHED; Code uses 'PUBLIC' string | HIGH |
| Subscription gating default OFF | featureGates.ts:22 isSubscriptionGatingActive = false | HIGH |
| No deployment config in repo | Repo root: no .github/, render.yaml, vercel.json, Dockerfile | HIGH |
| Auto-provisioning without email confirm | auth.ts:148-156 upserts users from JWT metadata | HIGH |
| Snake_case/camelCase manual mapping | routes/collaborations.ts:57-62, shortlists.ts:31-35 | HIGH |
| No frontend tests | Frontend/src/ glob: no test files | HIGH |
| Ingest worker no HA | InMemoryLockStore used; no distributed lock | HIGH |
| AI budget tracked in memory only | budgetStore is InMemoryBudgetStore; resets on restart | HIGH |
| Frontend calls non-existent admin routes | VerificationQueue.jsx:93,117,133 | HIGH |
| Supabase Auth used for authentication | AuthContext.jsx:110,144 uses supabase.auth.* | HIGH |
| Cloudinary signed uploads implemented | routes/media.ts:95 cloudinary.utils.api_sign_request | HIGH |
| Apify ingestion pipeline implemented | IngestService.ts + ApifyService.ts full implementation | HIGH |
| 4 AI tools with versioned prompts | routes/ai.ts 4 endpoints; prompts/*.ts with versions | HIGH |
| Zod validation on all route inputs | Every route uses z.object() schemas | HIGH |
| Ownership checks in services | assertBrandOwnership called in all brand services | HIGH |
| Feature gates defined but gating OFF | featureGates.ts defines gates; subscriptionGuard not mounted | HIGH |
| Partial unique indexes for soft delete | 0001_init_schema.sql:60,98; 0004_shortlists_soft_delete.sql | HIGH |
| No CI/CD configuration | Repo root file listing: no deployment files | HIGH |
| Background worker starts with server | app.ts:112 in require.main === module block | HIGH |
| CORS allows localhost in dev only | app.ts:30-34 defaultDevOrigins only in development | HIGH |
| Health check public no auth | app.ts:61 app.use('/v1/health', healthRouter) before auth | HIGH |
| Waitlist has rate limiting | waitlist.ts:10-21 express-rate-limit 5/15min | HIGH |
| Frontend 401→logout redirect | apiClient.js:84-94 clears cache, signs out, redirects | HIGH |
| AI telemetry logged to ai_outputs | GeminiService.ts:313, GroqService.ts:288 INSERT ai_outputs | HIGH |
| Idempotency keys for mutations | CampaignService.ts:57, CollaborationService.ts:70,174 | HIGH |
| Collaboration state machine | CollaborationService.ts:33-37 documents PENDING→ACCEPTED/DECLINED | HIGH |
| Rate cards stored per influencer | InfluencerService.submitStep4() INSERT rate_cards | HIGH |
| Periodic ingest refresh every 24h | IngestService.enqueuePeriodicRefreshJobsIfDue() | HIGH |
| Ingest retry with exponential backoff | IngestService.handleIngestFailure() maxRetries=3, base=60s | HIGH |
| Discovery cached 5 minutes | CreatorService.discover() cacheStore.set(300) | HIGH |
| Frontend API deduplication | apiClient.js inFlightGetRequests Map | HIGH |
| Supabase anon key only for auth | supabaseClient.js:4-5 only used in AuthContext for signUp/signIn | HIGH |
| No secrets in repository | grep for API keys/passwords: none found | HIGH |

---

## SUMMARY

Meshlyy Current State: A feature-complete MVP with solid application-layer architecture (auth, onboarding, discovery, AI, campaigns, collaborations, verification pipeline) but critical infrastructure gaps:

- Zero database-level security (RLS) - all protection in app layer
- Missing admin backend - frontend calls 3 non-existent endpoints
- Two critical DB objects not version-controlled (search_creators RPC, waitlist table)
- In-memory state for production features (budget, cache, locks) - not production-ready
- No deployment configuration - infrastructure entirely external
- Dead code (email service) and orphaned middleware (budgetMiddleware.ts)

**Readiness for Architecture Redesign:** The codebase is a reliable baseline for understanding current behavior, but any redesign must address the security and infrastructure gaps before production scaling.
