# Meshlyy — Current-State Architecture Analysis

**Scope:** Code-first, repo-grounded analysis of how Meshlyy actually works today.
**Method:** Every claim below was verified against source files (paths/lines cited). Where something
could not be confirmed from the repository, it is labeled **UNVERIFIED** rather than inferred.
Documentation/MD files were used only as supporting context and are called out where they diverge
from the code.

> No code was modified. This document intentionally contains **no recommendations** — only the
> verified current state.

---

## 0. TL;DR — what actually exists vs. what is documented

| Area | Verified in code? | Notes |
|------|-------------------|-------|
| React 19 + Vite frontend | Yes | `Frontend/package.json`, `Frontend/src/main.jsx` |
| Express + TypeScript backend | Yes | `Backend/src/app.ts`, `Backend/package.json` |
| Supabase Postgres (tables) | Yes (schema in migrations) | 18 tables |
| **RLS policies** | **NO** — none in repo | No `CREATE POLICY`/`ENABLE RLS` anywhere; no `supabase/` folder. **UNVERIFIED** whether enabled in the hosted DB. |
| Signup via backend `/v1/auth/signup` | **NO** — documented, not implemented | Signup is 100% client-side Supabase `signUp` (PLAN.md describes a backend endpoint that does not exist) |
| `/v1/admin/*` verify/reject/flags routes | **NO** — documented, not implemented | `app.ts` mounts no admin router; `VerificationQueue.jsx` calls endpoints that 404 |
| AI budget cap (`DAILY_AI_TOKEN_CAP`) | **Not enforced** | `budgetStore.incrementSpend` is never called |
| Apify spend cap (`DAILY_APIFY_SPEND_CAP`) | **Not enforced** | same in-memory store, never incremented |
| Subscription tiers / gating | **Inert** | tables + gate logic exist, but `subscriptionGuard` is never mounted and gated behind an unset env flag |
| `search_creators` RPC (discovery) | **UNVERIFIED** | Called in `CreatorService.discover`, not present in any repo migration |
| `waitlist` table | **Not in repo migrations** | `waitlist.ts` inserts to it; error is swallowed and returns 200 |
| Matching/recommendations stored | **NO** | AI fit-score is computed on-demand and not persisted; only telemetry logged |
| Email notifications | **Not wired** | `emailService.sendTransactionalEmail` is never called |
| Apify Instagram integration | Yes | `ApifyService.ts` |
| Gemini + Groq AI | Yes | `GeminiService`/`GroqService`/`AIProviderService` |
| Cloudinary media | Yes | `media.ts` + `useFileUpload.js` |

---

## 1. Frontend Architecture

**Verified:** `Frontend/package.json`, `Frontend/src/main.jsx`, `Frontend/src/App.jsx`.

### 1.1 Framework, build tooling, routing
- **React 19.2** + **Vite 8** + **react-router-dom 7** (`Frontend/package.json`). Plain JSX (no TypeScript on frontend).
- Entry: `main.jsx` → `BrowserRouter` → `AuthProvider` → `App`.
- **Routing** (`App.jsx`): routes are lazy-loaded. `ProtectedRoute` guards by `authReady`, login state,
  and `allowedRole` (brand/influencer/admin). Routes:
  - Public: `/`, `/login`, `/role-select`, `/signup/:role`
  - Brand: `/brand/dashboard`, `/brand/search`, `/brand/creator/:id`, `/brand/campaigns/new`, `/brand/shortlist`, `/brand/ai-assistant`
  - Influencer: `/influencer/dashboard`, `/influencer/ai-assistant`, `/influencer/invitations`, `/influencer/invitations/:id`, `/influencer/campaigns`, `/influencer/analytics` (`/influencer/analytics` reuses `InfluencerDashboard`)
  - Admin: `/admin/queue` (role `admin`)
- Layout: `AppLayout.jsx` renders `Header` + `Sidebar` + `<Outlet/>`; shown whenever `user` exists.

### 1.2 Component structure
- `components/common/*` — reusable UI (Button, Card, Input, Select, Badge, Toast, CircularProgress, AuroraBackground).
- `components/layout/*` — Header, Sidebar.
- `features/public/*` — Landing, RoleSelection, Login, Signup (delegates to Brand/Influencer signup forms).
- `features/brand/*` — BrandDashboard, DiscoverySearch, CreatorDetailPage, CampaignBuilder, Shortlist, BrandAIAssistant.
- `features/influencer/*` — InfluencerDashboard, AIContentAssistant, CampaignFeed, PublicCampaigns, InvitationDetail.
- `features/admin/*` — VerificationQueue (admin only).

### 1.3 State management
- **Single source of session/identity state:** React Context `AuthContext` (`context/AuthContext.jsx`).
- No Redux/Zustand. Local component state (`useState`) + `useEffect` for data fetching.
- `AuthContext` exposes `user`, `accessToken`, `login`, `signup`, `logout`, `updateUser`, `isLoading`, `authReady`.
- `apiClient` (`utils/apiClient.js`) holds an in-memory GET response cache keyed by `GET:<path>:token`. All
  non-GET requests clear the cache. It injects the Supabase JWT via a token getter wired in `AuthContext`.
- **Important:** The frontend performs **no direct Supabase table reads/writes**. All business data goes
  through the backend REST API (`apiClient`). The only direct Supabase usage is `supabase.auth.*`
  (signIn/signUp/getSession/onAuthStateChange) and `supabase.auth.signOut()` inside `apiClient` on 401.
  (Verified via grep: every `supabase.from`/`supabase.rpc` match in `Frontend/src` is in `AuthContext`/auth only.)

### 1.4 Authentication / session handling (client)
- `supabaseClient.js`: `createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)` — **anon key in the frontend bundle**.
- On load, `AuthContext` calls `supabase.auth.getSession()` then `hydrateUserFromSession`, which calls
  `GET /onboarding/status` to get role/onboarding state. If that 401/503s, it falls back to a
  session-derived user (`fallbackUserFromSession`) so the app stays usable.
- `onAuthStateChange` re-hydrates on every auth event.

### 1.5 API/service layer
- `utils/apiClient.js` is the sole HTTP client. `BASE = VITE_API_URL` (`.env` = `https://meshlyy-backend.onrender.com/v1`;
  `.env.local` = `http://localhost:3000/v1`).
- Media: `utils/useFileUpload.js` fetches a signed Cloudinary upload from `/media/upload-url`, then uploads
  the file **directly to Cloudinary** via XHR (frontend holds `api_key` + signature returned by backend).

---

## 2. Backend Architecture

**Verified:** `Backend/src/app.ts`, all `Backend/src/routes/*`, `Backend/src/services/*`, `Backend/src/middleware/*`.

### 2.1 Server & middleware stack (`app.ts`)
- Express 4, CORS configured from `CORS_ORIGIN` (dev origins `localhost:5173` allowed; `*` allowed). `credentials: true`.
- Global middleware order: `cors` → `express.json()` → `requestLogger` → `timeoutMiddleware` + `haltOnTimeout`
  → route-specific stacks.
- **Background worker** started only when run directly (`if (require.main === module)`): `ingestService.startBackgroundWorker()`.
- Graceful shutdown on `SIGTERM`.

### 2.2 Routes / endpoints (all under `/v1`)
| Mount | Router file | Auth guard | Role |
|-------|-------------|-----------|------|
| `/health` | `health.ts` | public | — |
| `/waitlist` | `waitlist.ts` | public, rate-limited (5/15min/IP) | — |
| `/onboarding` | `onboarding.ts` | `verifyToken`+`loadAuthContext` | per-route `checkRole` |
| `/profile` | `profile.ts` | `verifyToken`+`loadAuthContext` | BRAND/INFLUENCER (in handler) |
| `/media` | `media.ts` | `verifyToken`+`loadAuthContext` | any authed |
| `/creators` | `creators.ts` | token+context+`checkRole('BRAND')` | BRAND |
| `/campaigns` | `campaigns.ts` | token+context+`checkRole('BRAND')` | BRAND |
| `/campaigns/matched` | `campaigns.ts` (exported `matchedCampaignsRouter`) | token+context+`checkRole('INFLUENCER')` | INFLUENCER |
| `/shortlists` | `shortlists.ts` | token+context+`checkRole('BRAND')` | BRAND |
| `/collaborations` | `collaborations.ts` | token+context | BRAND/INFLUENCER per-route |
| `/influencer` | `influencer.ts` | `checkRole('INFLUENCER')` | INFLUENCER |
| `/ai` | `ai.ts` | token+context + `aiBudgetMiddleware` | BRAND/INFLUENCER per-route |
| **`/admin/*`** | **(none)** | **(none)** | **Admin endpoints referenced by frontend do not exist** |

> Note: `app.ts` imports `./routes/influencer.js` but the file is `influencer.ts`. This resolves under
> `tsx` (dev) and via `tsc` output (`dist/routes/influencer.js`), so it is fine at runtime — but it is a
> fragile naming inconsistency.

### 2.3 Controllers / services / utilities
- Thin route handlers delegate to singleton services in `services/`:
  - `BrandService`, `InfluencerService`, `CreatorService`, `CampaignService`, `ShortlistService`,
    `CollaborationService`, `IngestService`, `ApifyService`, `GeminiService`, `GroqService`,
    `AIProviderService`, `emailService`.
- `lib/`: `errors.ts` (AppError + `Errors` factories), `ownership.ts` (`assertBrandOwnership`, `getBrandId`),
  `pagination.ts`, `ai-schemas.ts` (Zod output validation), `supabase.ts` (service-role client).
- `config/`: `env.ts` (Zod-validated env), `supabase.ts` (client + `verifySupabaseJWT` using `auth.getUser`),
  `featureGates.ts`.
- `stores/`: in-memory `lockStore`, `cacheStore`, `budgetStore` (see §9/§11).
- `prompts/`: `strategy-v1.0.0`, `brief-v1.0.0`, `fit-score-v1.0.0`, `content-brief-v1.0.0` (string builders).
- `types/`: `index.ts` (domain types), `auth.ts` (`AuthenticatedRequest`), `stores.ts`, `express.d.ts`.

### 2.4 Business logic highlights
- **Onboarding** (`onboarding.ts` + `InfluencerService`/`BrandService`): all-or-nothing per step; influencer
  complete triggers `ingestService.triggerIngest`.
- **Campaigns** (`CampaignService`): create/list/get/update/delete + `getMatchedForInfluencer` (niche-overlap
  filter in app-layer; see §4). Idempotency via `idempotency_keys` table.
- **Collaborations** (`CollaborationService`): INVITE (brand→influencer) and APPLY (influencer→campaign);
  state machine PENDING→ACCEPTED/DECLINED; DECLINED is terminal. Ownership enforced in service layer.
- **Ingest** (`IngestService`): background worker that polls `ingest_jobs`, calls Apify, stores stats, runs
  auto-approve/auto-flag rules, updates `verification_status`, handles retries/stale recovery.

### 2.5 Authentication / authorization (server)
- `middleware/auth.ts` is the real stack:
  - `verifyToken` → `verifySupabaseJWT` (calls `supabase.auth.getUser`, which validates the JWT against Supabase).
  - `loadAuthContext` → loads `users` row; **auto-provisions** a `users` row if missing (retry loop); for BRAND
    also loads `brand_id` and **self-heals legacy brand profiles** (creates a `brand_profiles` row if missing,
    marks onboarding complete). Loads latest `subscriptions` row into context (tier/status).
  - `checkRole(role|roles)` → 403 if mismatch.
  - `onboardingGuard` (in `auth.ts`) and `subscriptionGuard` (in `auth.ts`) also defined here.
- `middleware/onboardingGuard.ts` (standalone) is the one actually used by `app.ts`.
- `middleware/checkRole.ts` (standalone) and `middleware/verifyToken.ts`/`loadAuthContext.ts` (re-export shims)
  exist but are **not** the active implementations used by routes. Duplicate/divergent code (see §11).

### 2.6 Error handling
- `errorHandler.ts`: catches Zod errors (→ 400), `AppError` (→ statusCode + optional `Retry-After`), else 500.
- `Errors` factory (`lib/errors.ts`) standardizes codes (VALIDATION_ERROR, DATABASE_ERROR, FORBIDDEN,
  NOT_FOUND, CONFLICT, BUDGET_EXCEEDED, AI_UNAVAILABLE, etc.).
- Services throw `Errors.*`; routes `next(error)`.

### 2.7 Background jobs / scheduled processes
- Only one: `IngestService` background worker (in-process `setInterval`, `INGEST_WORKER_POLL_MS`, default 30s).
  - `runWorkerTick` does maintenance (recover stale `running` jobs, enqueue periodic refresh for
    `is_verified` profiles whose `last_scraped_at` is older than `INGEST_REFRESH_INTERVAL_HOURS`) then claims
    up to `maxJobsPerTick=2` pending jobs and processes them.
  - No external scheduler/cron. No queue system (DB table `ingest_jobs` is the queue; claims via conditional update).

---

## 3. Database Architecture (Supabase Postgres)

**Verified:** `Backend/migrations/0001_init_schema.sql`, `0002_seed_data.sql`, `0003_production_ingest_hardening.sql`,
`0004_shortlists_soft_delete.sql`, `0001_rollback.sql`.

### 3.1 Supabase configuration
- Backend uses **service-role** client (`config/supabase.ts`, `lib/supabase.ts`) — bypasses RLS entirely.
- Frontend uses **anon** client (`VITE_SUPABASE_ANON_KEY`).
- Project URL `https://fzpgxfbstdqvydkodgeu.supabase.co` (from `.env`/`.env.local`).

### 3.2 Tables (18), columns & relationships
All verified in `0001_init_schema.sql`:

1. **users** — `id UUID PK` (Supabase auth `user.id`), `email`, `role user_role`, `onboarding_step`,
   `onboarding_completed`, `is_deleted`. Partial unique index on `email WHERE NOT is_deleted`.
   No password column (Supabase Auth is the credential store).
2. **brand_profiles** — `id UUID PK`, `user_id UUID UNIQUE → users(id) ON DELETE CASCADE`, `company_name`,
   `website`, `industry`, `target_demographics JSONB`, `budget_range_min/max`, `tone_voice`,
   `campaign_goals JSONB`, `is_deleted`.
3. **influencer_profiles** — `id UUID PK`, `user_id UNIQUE → users`, `ig_handle` (partial-unique),
   `niche_primary/secondary`, `bio`, `portfolio_url`, `media_kit_url`, `is_verified`, `verification_status`,
   `flag_reason`, `rejection_reason_code`, `resubmission_count`, `last_resubmitted_at`, `last_scraped_at`,
   `is_deleted`.
4. **influencer_stats** — `id`, `influencer_id → influencer_profiles`, `follower_count`, `following_count`,
   `engagement_rate`, `avg_likes`, `avg_comments`, `top_countries`, `age_split`, `gender_split`,
   `total_views_30d` (added in 0003), `last_updated_at`. Unique on `influencer_id` (0003).
5. **rate_cards** — `id`, `influencer_id → influencer_profiles`, `service_type service_type`,
   `price NUMERIC(10,2)`, `currency`, `display_currency`.
6. **subscriptions** — `id`, `user_id → users`, `role`, `tier subscription_tier`, `status`, periods. **Schema-only; no enforcement logic in app.**
7. **campaigns** — `id`, `brand_id → brand_profiles`, `title`, `status campaign_status DEFAULT DRAFT`,
   `brief_data JSONB`, `brief_preview`, `visibility campaign_visibility DEFAULT PRIVATE`, `budget`, `currency`,
   `niche_targets JSONB`, `is_deleted`.
8. **shortlists** — `id`, `brand_id → brand_profiles`, `influencer_id → influencer_profiles`,
   `campaign_id → campaigns` (nullable), `label`, `is_deleted` (0004). Unique partial indexes per active rows.
9. **collaboration_requests** — `id`, `campaign_id`, `brand_id`, `influencer_id`, `type collaboration_type`,
   `status collaboration_status`, `message`. Unique `(campaign_id, influencer_id, type)`.
10. **ingest_jobs** — `id`, `influencer_id` (nullable), `ig_handle`, `status ingest_status`, `failure_class`,
    `failure_detail`, `started_at`, `completed_at`.
11. **idempotency_keys** — `id`, `key`, `scope`, `user_id`, `request_hash`, `response_status`, `response_body`,
    `expires_at`. Unique `(scope, user_id, key)`.
12. **admin_audit_log** — `id`, `actor_id → users RESTRICT`, `action`, `target_type`, `target_id`, `old/new_state`, `reason`.
13. **admin_flags** — `id`, `influencer_id → influencer_profiles`, `flag_type`, `flag_detail JSONB`, `resolved`, `resolved_by`.
14. **ai_outputs** — `id`, `brand_id`, `campaign_id`, `ai_tool_type`, `prompt_version`, `token_count`,
    `latency_ms`, `output_schema_valid`, `failure_reason`. (Telemetry only.)

Enums: `user_role`, `verification_status`, `campaign_status`, `campaign_visibility`, `service_type`,
`subscription_tier`, `subscription_status`, `collaboration_type`, `collaboration_status`, `ingest_status`.

### 3.3 Foreign keys & cascades
- `brand_profiles/influencer_profiles → users` (CASCADE).
- `influencer_stats/rate_cards → influencer_profiles` (CASCADE).
- `campaigns → brand_profiles` (CASCADE); `shortlists/collaboration_requests → campaigns` (CASCADE).
- `ingest_jobs.influencer_id` (SET NULL), `admin_audit_log.actor_id` (RESTRICT), `admin_flags.resolved_by` (SET NULL).

### 3.4 RLS status and policies — **CRITICAL**
- **There are ZERO RLS policies and ZERO `ENABLE ROW LEVEL SECURITY` statements anywhere in the repository**
  (grep for `ROW LEVEL SECURITY`/`CREATE POLICY` returned none; no `supabase/` directory exists).
- The service-role backend client bypasses RLS by design.
- The **anon key is shipped in the frontend** (`.env`/`.env.local`). If RLS is disabled in the hosted DB,
  any holder of that key can read/write every table directly.
- **Status: UNVERIFIED.** Whether RLS is enabled/populated in the live Supabase project cannot be determined
  from the repo. The migrations provide no policy baseline, so any RLS present is maintained manually in the
  Supabase dashboard (not version-controlled). This is a major governance/security gap (see §9).

### 3.5 Views / functions / triggers
- **No triggers** in any migration.
- **One RPC function** `search_creators(p_niche, p_follower_min, p_follower_max, p_engagement_min, p_is_verified, p_limit, p_offset)`
  is **called** by `CreatorService.discover` (`Backend/src/services/CreatorService.ts:70`) but its `CREATE FUNCTION`
  is **not present in any repo migration** → **UNVERIFIED** (must exist in the DB, likely created manually in
  the dashboard). If missing, creator discovery breaks entirely.

### 3.6 How each table is read/written
- **Frontend:** never touches tables directly (API only).
- **Backend service-role writes:** `users` (provision/heal in `loadAuthContext`), `brand_profiles`,
  `influencer_profiles`, `influencer_stats`, `rate_cards`, `campaigns`, `shortlists`, `collaboration_requests`,
  `ingest_jobs`, `admin_flags`, `ai_outputs`, `idempotency_keys`, `waitlist` (target table not in repo).
- **`subscriptions`:** read only (context load). Never inserted/updated by app → tiers always default to `TRIAL`.
- **`admin_audit_log`:** created by seed data only; **never written by running code** (admin routes absent).

---

## 4. AI Architecture

**Verified:** `Backend/src/routes/ai.ts`, `Backend/src/services/{AIProviderService,GeminiService,GroqService}.ts`,
`Backend/src/lib/ai-schemas.ts`, `Backend/src/prompts/*`.

### 4.1 Providers
- **Primary:** Gemini (`GeminiService.ts`) via **direct REST** `generativelanguage.googleapis.com/v1beta/...:generateContent`
  with `responseMimeType: application/json`. Model `gemini-2.5-flash-lite` (config).
- **Fallback:** Groq (`GroqService.ts`) via `api.groq.com/openai/v1/chat/completions` (model `llama-3.3-70b-versatile`).
- **Routing:** `AIProviderService.callAI` tries providers in order from `AI_PROVIDER` (default gemini), falls back
  on AI-recoverable errors (rate limit/timeout/unavailable). Provider order: `[primary, secondary]`.
- **Note:** `@google/generative-ai` is a dependency (`Backend/package.json`) but **unused** — Gemini is called over raw `fetch`. Dead dependency.

### 4.2 AI-powered features (4 tools, all in `ai.ts`)
1. `POST /ai/brief` (BRAND) — campaign brief from goal. `BriefOutputSchema`.
2. `POST /ai/strategy` (BRAND) — brand↔creator strategy. `StrategyOutputSchema`.
3. `POST /ai/fit-score` (BRAND) — fit score for campaign+creator. `FitScoreOutputSchema`.
4. `POST /ai/fit-score/:creatorId` (BRAND) — fit score from in-conversation context only.
5. `POST /ai/content-brief` (BRAND) — creator content brief. `ContentBriefOutputSchema`.
6. `POST /ai/influencer/content-brief` (INFLUENCER) — creator-side brief for an invited campaign.

### 4.3 Prompts
- Live in `Backend/src/prompts/*.ts` as versioned string builders (`*-v1.0.0`). Each exports a `VERSION` constant
  passed to `callAI` and stored in `ai_outputs.prompt_version`.
- Inputs are assembled from DB reads (brand profile, creator profile+stats, rate cards, campaign) — see `ai.ts`.
- Outputs are **Zod-validated** against `lib/ai-schemas.ts` before returning.

### 4.4 Inputs / outputs / storage
- Inputs: DB rows + client-supplied params (creator_id, campaign_id, brief text, content_format, context JSON).
- Outputs: validated JSON returned to client; **not persisted** to any domain table.
- Only **telemetry** is stored: every AI call appends a row to `ai_outputs` (tool type, prompt version, token count,
  latency, schema-valid flag) via `incrementAiBudget` in `GeminiService`/`GroqService`.

### 4.5 Matching / recommendation architecture
- **Influencer → campaign matching** (`CampaignService.getMatchedForInfluencer`): simple **niche-overlap filter**
  in app-layer over `campaigns` where `status='ACTIVE'` and `visibility='MATCHED'`; no AI, no scoring, no storage.
  (`campaigns.ts:249-303`)
- **Brand → creator fit:** AI `fit-score` computed **on demand** and returned to the client; result is **not saved**.
  The dashboard "Avg Fit Score" KPI is a **fake local heuristic** (`engagementRate * 12`, clamped 40–98) in
  `BrandDashboard.jsx:25-28` — not the AI score.
- **BrandAIAssistant** (`BrandAIAssistant.jsx`): chat UI that calls discovery + `/ai/fit-score` on demand; no persistent
  recommendations.
- **Conclusion:** there is **no stored match/recommendation/score table**. All matching is either a live niche filter
  or ephemeral AI inference.

### 4.6 Fallbacks / failure handling
- Provider fallback (gemini→groq) as above; JSON extraction is defensive (strips ``` fences, trailing commas).
- On AI failure: `Errors.AI_UNAVAILABLE` / `AI_RATE_LIMIT` / `REQUEST_TIMEOUT` → 503/429.
- If AI output fails Zod validation → `Errors.INTERNAL_ERROR('AI returned invalid JSON')`.
- Discovery cache: `CreatorService` caches RPC results in in-memory `cacheStore` for 300s.

---

## 5. Social / API Integrations

### 5.1 Instagram data (Apify)
**Verified:** `Backend/src/services/ApifyService.ts`, `Backend/src/services/IngestService.ts`.
- No Meta/Instagram **Graph API** or OAuth used. Instagram data is collected via **Apify actor** (`APIFY_ACTOR_ID`)
  run synchronously: `POST /v2/acts/{actorId}/runs` → poll `actor-runs/{id}` → fetch `datasets/{id}/items`.
- Triggered by influencer onboarding complete (`onboarding.ts` → `ingestService.triggerIngest`) and by the
  background refresh sweep.
- Collected: follower/following counts, posts, avg likes/comments, 30d views, top countries, age/gender split,
  engagement rate. Engagement rate derived from `(likes+comments)/followers` or taken from payload if present.
- **No OAuth/token refresh flow.** Apify auth is a single API key (`APIFY_API_KEY`). If the actor fails or the
  handle is private/invalid, the job is marked `failed` and `verification_status` may become `REJECTED`
  (invalid/private) or stay `PENDING` (transient, with retry).
- Failure taxonomy in `IngestFailureClass`. Transient failures retried with exponential backoff up to
  `INGEST_MAX_RETRIES` (default 3); stale `running` jobs recovered after `INGEST_STALE_RUNNING_MINUTES`.

### 5.2 Cloudinary (media)
**Verified:** `Backend/src/routes/media.ts`, `Frontend/src/utils/useFileUpload.js`.
- Backend `/media/upload-url` returns a **signed upload** (timestamp + HMAC signature using `CLOUDINARY_API_SECRET`)
  plus the anon `api_key`. Frontend uploads directly to Cloudinary.
- Per-kind policies: avatar/logo (image), portfolio (image/video), media-kit (raw pdf/ppt/doc). Max sizes enforced
  both in signature (`allowed_formats`) and client-side (`useFileUpload` checks constraints).

### 5.3 Resend (email)
**Verified:** `Backend/src/services/emailService.ts`.
- `sendTransactionalEmail` exists and supports Resend. **It is never called by any running code** (grep: only
  definition + a README reference). So approval/rejection/welcome emails are **not sent**.
- Env also references `EMAIL_PROVIDER=resend|gmail` and Gmail creds, but only Resend is implemented and unused.

### 5.4 Other third-party
- Supabase Auth (sign-in/sign-up/session) — client-side.
- No Stripe/billing, no analytics SDK, no webhooks.

---

## 6. Authentication and User Flows

**Verified:** `Frontend/src/context/AuthContext.jsx`, `Frontend/src/features/public/*`, `Backend/src/middleware/auth.ts`,
`Backend/src/routes/onboarding.ts`, `Backend/src/routes/profile.ts`.

### 6.1 Signup / login
- **Signup is entirely client-side**: `AuthContext.signup` → `supabase.auth.signUp({ email, password, options:{data:{role}} })`.
  Then, depending on role, it POSTs onboarding payloads to the backend (`/onboarding/brand` or
  `/onboarding/influencer/step1..4` + `/complete`). There is **no backend `/v1/auth/signup`** (PLAN.md's
  described endpoint does not exist).
- **Login**: `supabase.auth.signInWithPassword` → hydrate → load onboarding status.
- Role is stored in `users.role` and carried in the JWT (`user_metadata.role`). `loadAuthContext` re-reads role
  from DB (authoritative), per PLAN.md intent.

### 6.2 Creator onboarding
- `InfluencerSignupForm` → `signup({role:'influencer', igHandle, nichePrimary, ...})` → backend steps:
  step1 saves `ig_handle` (validates format, uniqueness, resubmission limits); step2 niche+bio; step3
  portfolio/media-kit; step4 rate cards; complete → `onboarding_completed=true` + **triggers ingest job**.
- After ingest, `verification_status` is set by `IngestService` rules (APPROVED/FLAGGED/PENDING/REJECTED).

### 6.3 Brand onboarding
- `BrandSignupForm` → `signup({role:'brand', ...})` → `POST /onboarding/brand` creates `brand_profiles`,
  sets `onboarding_completed=true`.

### 6.4 Profile creation / roles
- `users` row is **auto-provisioned** in `loadAuthContext` if a valid JWT has no `users` row (handles race where
  Supabase signup succeeds but backend write hadn't happened). BRAND profiles are also self-healed there.
- Role cannot be changed post-signup except by admin (no admin UI exists).

### 6.5 Session / token flow
- Supabase JWT in `Authorization: Bearer` → backend `verifySupabaseJWT` (validates via `auth.getUser`) →
  `loadAuthContext` builds `req.authContext` → routes use it for role/ownership.
- Client caches token in a ref; `apiClient` attaches it; on 401 it signs out and redirects to `/login`.

### 6.6 Authorization boundaries
- `checkRole` enforces BRAND/INFLUENCER at route level; `assertBrandOwnership`/`getBrandId` enforce ownership in
  services; collaboration routes additionally check "you can only act on your own" rows.
- `onboardingGuard` blocks non-onboarded users from core platform routes (allowed: onboarding/health/waitlist).
- **Subscription tiers are read but never enforced** (see §2.5/§9).

---

## 7. Core Business Flows (end-to-end)

1. **Creator signup → profile → social connection → stats**
   Frontend `signup` → Supabase `signUp` → backend `/onboarding/influencer/step1..4` + `/complete`
   (writes `influencer_profiles`, `rate_cards`, `users.onboarding_completed`) → `/complete` calls
   `ingestService.triggerIngest` → background worker (or immediate tick) → Apify run → `influencer_stats` upsert
   → auto-approve/flag rules → `verification_status`.

2. **Brand signup → profile → campaign creation**
   Frontend `signup(role:brand)` → Supabase `signUp` → `/onboarding/brand` (creates `brand_profiles`) →
   `CampaignBuilder` → `POST /campaigns` (status DRAFT) → `PATCH /campaigns/:id/status {ACTIVE}`.

3. **Creator discovering/applying to campaigns**
   Influencer `PublicCampaigns` → `GET /campaigns/matched` (niche-overlap filter) → `POST /collaborations/apply`
   (creates `collaboration_requests` type=APPLICATION, PENDING).

4. **AI creator matching/recommendations**
   Brand `DiscoverySearch`/`BrandAIAssistant` → `GET /creators` (RPC `search_creators`) or `POST /ai/fit-score`
   (on-demand Gemini/Groq score, not stored). No persistent matching.

5. **Brand reviewing creators/applications**
   Brand `Shortlist` (GET/POST/DELETE `/shortlists`), `CreatorDetailPage`, `CampaignFeed`/collaboration list
   (`GET /collaborations/campaign/:id`), accept/decline via `PATCH /collaborations/:id/status`.

6. **Campaign collaboration/management**
   Invites: brand `POST /collaborations/invite` → influencer `GET /collaborations/incoming` + `PATCH /:id/status`
   (ACCEPT/DECLINE). State machine enforced; DECLINED terminal.

7. **Analytics**
   Influencer dashboard: `GET /influencer/dashboard` aggregates `influencer_stats` + collaboration counts.
   Brand dashboard: KPIs from `/creators`, `/campaigns`, `/shortlists` + **fake local fit heuristic**. No dedicated
   analytics tables/events; "Notifications" on brand dashboard are **hardcoded demo content** (`BrandDashboard.jsx`).

---

## 8. Infrastructure & Deployment

**Verified:** `vercel.json`, `package.json` (root + Frontend + Backend), `Frontend/.env*`, `Backend/.env.example`,
`Backend/src/app.ts`.

- **Monorepo** (`meshlyy-monorepo`) with `Frontend/` and `Backend/` workspaces. Root scripts only run the frontend.
- **Frontend → Vercel**: `vercel.json` rewrites `/(.*)` → `/Frontend/$1` and redirects `/` → `/Frontend`. Build = `vite build`.
- **Backend → Render**: `Frontend/.env` `VITE_API_URL=https://meshlyy-backend.onrender.com/v1`. Backend is an
  Express server (`npm run dev` = `tsx watch src/app.ts`; `build` = `tsc`; `start` = `node dist/app.js`).
- **Supabase** is the database + auth, hosted separately.
- **Env vars** (Zod-validated in `Backend/src/config/env.ts`): Supabase URL + service role + JWT secret, Cloudinary
  (name/key/secret), Gemini (key/model), Groq (key/model, optional), Apify (key/actor), Resend, budget/spend caps,
  timeouts, ingest-worker knobs. **Note:** `SUBSCRIPTION_GATING_ACTIVE` is read by `featureGates.ts` but is **not**
  in the Zod env schema → always falsy → gating off.
- **Prod vs dev:** dev uses `localhost:5173` CORS + local backend; prod uses onrender backend. Frontend anon key is
  the same in both `.env` and `.env.local` (a single shared Supabase project).
- **Build/deploy process:** no CI config present in repo (no GitHub Actions / vercel build hooks file beyond
  `vercel.json`). UNVERIFIED how deploys are triggered.

---

## 9. Security

### 9.1 RLS — highest risk
- No RLS in repo; anon key in frontend. **If RLS is off in the DB, every table is world-readable/writable by
  anyone with the shipped anon key.** Status UNVERIFIED (cannot see hosted DB config). Even if RLS is on, it is
  unversioned (dashboard-only) and thus unauditable from the repo.

### 9.2 Secrets handling
- Server secrets (service role, Cloudinary secret, Gemini/Groq/Apify/Resend keys) live in `Backend/.env` and are
  used only server-side — correct. `@google/generative-ai`/service-role never reach the client.
- Client exposes only `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (intended for Supabase) and `VITE_API_URL`.
- `media.ts` returns `CLOUDINARY_API_KEY` + signature to the client (required for direct upload) — standard, but
  the anon key + signature grants time-boxed upload rights only.

### 9.3 Authorization weaknesses
- `subscriptionGuard` + feature gates are **dead** (never mounted; env flag unset) → tier-based limits are unenforced.
- `loadAuthContext` **self-heals legacy brand profiles** by auto-creating `brand_profiles` and marking onboarding
  complete — convenient but means a brand can reach core flows without an explicit onboarding write.
- Auto-provisioning of `users` rows from any valid Supabase JWT widens the trust boundary (any authenticated identity
  becomes a row). Acceptable given Supabase is the IdP, but note it bypasses the "provision only via signup" contract.
- `CreatorService.discover` depends on `search_creators` RPC that isn't in the repo → if absent, discovery errors.

### 9.4 CORS / public endpoints
- CORS allows dev origins + any origin in `CORS_ORIGIN` (supports `*`). With credentials, `*` is rejected by the
  handler logic, but explicit origins are trusted.
- Public endpoints: `/health`, `/waitlist` (rate-limited), and Supabase Auth itself. Everything else requires a valid JWT.

### 9.5 Other risks
- In-memory `budgetStore`/`cacheStore`/`lockStore` are **per instance**. On multi-instance Render, caches/budgets/
  locks are not shared → duplicate ingest work, stale discovery caches, and budget caps effectively per-instance.
- `waitlist` insert targets a table not in migrations; error swallowed → endpoint returns 200 even when it did nothing.
- `admin_flags` can be written by the ingest auto-flag path, but there is **no admin UI/API to resolve them**
  (`VerificationQueue` calls non-existent `/admin/*` routes → 404).

---

## 10. Data Flow (per major feature)

- **Signup:** Browser → Supabase Auth (`signUp`) → JWT → Browser → `POST /onboarding/*` → Backend (service-role) →
  `users`/`brand_profiles`/`influencer_profiles`/`rate_cards` (Supabase).
- **Creator stats ingest:** Backend worker → Apify API → `ingest_jobs` (status) → `influencer_stats` +
  `influencer_profiles.verification_status` + `admin_flags` (Supabase). Not user-facing in real time.
- **Discovery:** Browser → `GET /creators` → Backend → `search_creators` RPC (Supabase) → cache (in-memory) → JSON → Browser.
- **Campaign create:** Browser → `POST /campaigns` → Backend → `campaigns` insert + `idempotency_keys` (Supabase) → JSON.
- **Apply to campaign:** Browser → `POST /collaborations/apply` → Backend → `collaboration_requests` (Supabase) → JSON.
- **AI fit-score:** Browser → `POST /ai/fit-score` → Backend reads brand/creator/campaign (Supabase) → builds prompt →
  Gemini/Groq → validates (Zod) → `ai_outputs` telemetry (Supabase) → JSON to Browser (not persisted as a match).
- **Media upload:** Browser → `GET /media/upload-url` → Backend signs (Cloudinary secret) → JSON → Browser → direct
  POST to Cloudinary → secure_url (stored later in profile via `PATCH /profile/me`).

---

## 11. Architecture Problems (verified)

### Duplicated / divergent logic
- Two `onboardingGuard` implementations (`middleware/onboardingGuard.ts` active; `auth.ts` duplicate).
- Two `checkRole` implementations (`middleware/checkRole.ts` standalone, incompatible signature, **unused**; `auth.ts` active).
- Two `budget` middleware files (`budget.ts` active with `aiBudgetMiddleware`+`apifyBudgetMiddleware`; `budgetMiddleware.ts`
  generic factory, **unused**).
- `GeminiService` and `GroqService` are near-identical (~300 lines each) — large copy-paste surface.

### Tight coupling
- Routes import services that import `config/supabase` (service-role) directly; no repository abstraction. Every
  service talks to Supabase PostgREST directly.
- Background worker lives inside the Express process (`app.ts`); cannot scale/run independently.

### Dead / unused code
- `@google/generative-ai` dependency (unused; raw fetch used).
- `emailService.sendTransactionalEmail` (never called) → no emails sent.
- `subscriptionGuard` + `featureGates` + `subscriptions` enforcement (never mounted/enforced).
- `admin_audit_log` writes (no admin routes) — table effectively append-only-by-seed only.
- Standalone `checkRole.ts`, `budgetMiddleware.ts`, `onboardingGuard.ts`(duplicate), `verifyToken.ts`/`loadAuthContext.ts` shims.
- `campaign_visibility` enum is `PRIVATE|MATCHED`, but route schema + frontend allow/check `PUBLIC` (invalid against DB;
  "Public Campaigns" page actually shows MATCHED campaigns).

### Inconsistent patterns / bugs
- **Frontend brand profile edit bug:** `BrandDashboard` PATCHes `/profile/me` with `{name, company, industry}`; backend
  brand update schema is `.strict()` and only accepts `companyName/website/industry/...` → `company`/`name` rejected → 400,
  so brand profile edits silently fail. `user.company`/`user.industry` also don't exist on the `AuthContext` user object.
- **Fake fit score:** dashboard KPI uses `engagement*12` heuristic, not the AI score.
- **Admin panel non-functional:** `VerificationQueue` calls `/admin/verification-queue`, `/admin/verify/:id`,
  `/admin/reject/:id` — none exist in `app.ts` → all 404.
- **`waitlist` table missing from migrations**; endpoint swallows the DB error and returns success.
- **`search_creators` RPC not in repo**; discovery depends on an unversioned DB object.
- `app.ts` imports `./routes/influencer.js` while the file is `influencer.ts` (works under tsx/tsc but fragile).

### Technical debt / scalability / reliability
- In-memory stores (`cacheStore`/`lockStore`/`budgetStore`) are per-instance → wrong on multi-replica; discovery cache
  can serve stale data; ingest locks don't prevent cross-instance duplicates.
- **Budget caps not enforced:** `budgetStore.incrementSpend` is never called; AI/Apify spend is never counted →
  `DAILY_AI_TOKEN_CAP` / `DAILY_APIFY_SPEND_CAP` are no-ops.
- No RLS baseline in repo (§9.1).
- No tests in the running app beyond `*.integration.test.ts` and `verify-phase4.ts` (present but not part of default `npm test` which runs `vitest` with no test files matched by default config — verify if needed).
- Matching is ephemeral/non-persistent → no historical recommendations, no offline scoring, recomputed every request
  (cost + latency; AI calls are synchronous within request, capped by `aiBudgetMiddleware` timeout logic).

### Where future changes will be hard
- Any move to stored/learned matching requires adding tables + replacing `getMatchedForInfluencer` + `fit-score` call sites.
- Adding admin operations requires building the entire `/admin/*` surface (routes, ownership, audit transaction) that
  PLAN.md assumes exists.
- RLS must be authored from scratch (no repo baseline) before the anon-key exposure can be closed.
- Replacing Apify or adding Meta Graph API means touching `ApifyService` + `IngestService` + the auto-approve rules together.

---

## 12. Architecture Map

### 12.1 Component / service map
```
Browser (React 19 + Vite)
 ├─ AuthContext (session + identity)
 ├─ apiClient (REST to Backend, GET cache, JWT)
 ├─ supabaseClient (anon key → Supabase Auth ONLY)
 ├─ features/{public,brand,influencer,admin}
 └─ useFileUpload (signed Cloudinary upload)

Backend (Express + TS, Render)
 ├─ app.ts (mounts routers + bg worker)
 ├─ middleware: auth(verifyToken,loadAuthContext,checkRole,onboardingGuard,subscriptionGuard),
 │            budget, timeout, errorHandler, logging
 ├─ routes: health, waitlist, onboarding, profile, media, creators, campaigns(+matched),
 │          shortlists, collaborations, influencer, ai   (NO admin)
 ├─ services: Brand/Influencer/Creator/Campaign/Shortlist/Collaboration/Ingest/Apify/
 │            Gemini/Groq/AIProvider/email
 ├─ lib: errors, ownership, pagination, ai-schemas, supabase(svc-role)
 ├─ stores (in-memory): lock, cache, budget
 └─ prompts: strategy/brief/fit-score/content-brief (v1.0.0)

External: Supabase (DB+Auth), Apify (Instagram), Cloudinary (media), Gemini + Groq (AI), Resend (unused)
```

### 12.2 Database relationship overview
```
users 1—1 brand_profiles
users 1—1 influencer_profiles 1—∞ influencer_stats (unique)
                              1—∞ rate_cards
                              1—∞ ingest_jobs
                              1—∞ admin_flags
brand_profiles 1—∞ campaigns 1—∞ shortlists (∞ influencers)
                        1—∞ collaboration_requests (brand+influencer)
users 1—∞ subscriptions (read-only, no enforcement)
users 1—∞ idempotency_keys
users 1—∞ admin_audit_log (written by seed only)
```
FK cascades: profiles→users; stats/rate_cards→influencer; campaigns→brand; shortlists/collab→campaigns.

### 12.3 External integration map
| External | Direction | Triggered by | Data |
|----------|-----------|--------------|------|
| Supabase Auth | Client ↔ | signup/login/session | identity, JWT |
| Supabase DB | Backend (svc-role) ↔ | all routes + worker | all business data |
| Apify | Backend → | ingest (onboard + refresh) | IG stats/audience |
| Cloudinary | Browser → (signed) | media upload | avatars/logos/portfolio/media-kit |
| Gemini | Backend → | `/ai/*` primary | LLM JSON |
| Groq | Backend → | `/ai/*` fallback | LLM JSON |
| Resend | Backend → (never called) | (none) | (no emails) |

### 12.4 Major data flows
- Auth: Client → Supabase Auth → JWT → Backend verify → DB `users` (provision/heal) → context.
- Ingest (async): Backend worker → Apify → `ingest_jobs`/`influencer_stats`/`influencer_profiles`/`admin_flags`.
- Discovery: Client → `/creators` → `search_creators` RPC → cache → Client.
- Campaign/collab: Client → Backend → `campaigns`/`collaboration_requests`/`shortlists` (svc-role).
- AI: Client → `/ai/*` → DB reads → Gemini/Groq → Zod validate → `ai_outputs` telemetry → Client.

### 12.5 Frontend / backend / database boundaries
- **Frontend ↔ Backend:** REST only (`apiClient`); no direct table access. Auth is the only direct Supabase call.
- **Backend ↔ Database:** service-role Supabase (bypasses RLS). Background worker same process.
- **Frontend ↔ Supabase:** anon key for Auth only; if RLS off, this is an unintended direct DB channel (§9.1).
- **Backend ↔ External AI/Media/Scraper:** server-side secrets; frontend only receives signed URLs / AI JSON.

---

## Appendix — verification index (file:line)
- Monorepo/root: `package.json`, `vercel.json`.
- Frontend: `Frontend/package.json`, `src/main.jsx`, `src/App.jsx`, `src/context/AuthContext.jsx`,
  `src/utils/apiClient.js`, `src/utils/supabaseClient.js`, `src/utils/useFileUpload.js`,
  `src/features/brand/BrandDashboard.jsx` (`calculateFitScore` L25-28, profile PATCH L217-233),
  `src/features/brand/DiscoverySearch.jsx`, `src/features/brand/CampaignBuilder.jsx`,
  `src/features/brand/BrandAIAssistant.jsx`, `src/features/influencer/InfluencerDashboard.jsx`,
  `src/features/influencer/PublicCampaigns.jsx`, `src/features/admin/VerificationQueue.jsx`.
- Backend entry/config: `src/app.ts`, `src/config/env.ts`, `src/config/supabase.ts`, `src/config/featureGates.ts`,
  `src/lib/supabase.ts`.
- Backend routes: `routes/{health,waitlist,onboarding,profile,media,creators,campaigns,shortlists,collaborations,influencer,ai}.ts`.
- Backend services: `services/{Brand,Influencer,Creator,Campaign,Shortlist,Collaboration,Ingest,Apify,Gemini,Groq,AIProvider,email}Service.ts`.
- Backend middleware: `middleware/{auth,onboardingGuard,checkRole,budget,budgetMiddleware,timeout,errorHandler,logging}.ts`.
- Backend lib/stores: `lib/{errors,ownership,pagination,ai-schemas}.ts`, `stores/{index,interfaces}.ts`,
  `stores/memory/{budgetStore,cacheStore,lockStore}.ts`.
- DB: `migrations/0001_init_schema.sql`, `0002_seed_data.sql`, `0003_production_ingest_hardening.sql`,
  `0004_shortlists_soft_delete.sql`.

**UNVERIFIED items (cannot confirm from repo):** RLS enablement/policies in hosted Supabase; existence of
`search_creators` RPC in DB; existence of `waitlist` table in DB; CI/deploy triggers; live values of secrets/flags.
