# BACKEND GAP REPORT

Date: 2026-04-13
Project: Meshlyy MVP
Prepared by: Full-stack integration pass (docs-reviewed update)

## Source of Truth Used in This Update
1. Backend docs folder: `Backend/docs`
2. Backend implementation: `Backend/src/routes`, `Backend/src/services`
3. Frontend implementation: `Frontend/src`

## Scope Note
This update re-checks gaps against the attached backend docs (`auth.md`, `collaboration.md`, `phase2-summary.md`, `phase4-summary.md`, `gemini-request.md`, etc.) and reconciles docs vs current backend code vs frontend behavior.

## Gap Summary (Updated)
- Critical: 4
- High: 6
- Medium: 5
- Low: 3

---

## A) Product-Critical Backend Gaps

### Gap 1: Admin Verification Queue APIs Missing
- Feature name: Admin verification moderation
- Frontend location/route/component: `/admin/queue`, `Frontend/src/features/admin/VerificationQueue.jsx`
- Business purpose: Review influencer verification outcomes and approve/reject creators before marketplace visibility
- Current frontend behavior: Local queue with non-persistent actions
- Missing backend dependency: No admin moderation routes
- Required endpoint(s):
  - `GET /v1/admin/verification-queue`
  - `PATCH /v1/admin/verification-queue/:influencerId`
- Recommended HTTP method(s): `GET`, `PATCH`
- Proposed request payload:
  - PATCH: `{ decision: 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES', reason?: string }`
- Proposed response payload:
  - GET: `{ data: Array<{ influencer_id, ig_handle, niche_primary, follower_count, engagement_rate, verification_status, submitted_at, flags: string[] }>, pagination }`
  - PATCH: `{ success: true, influencer_id, new_status, updated_at }`
- Auth/role requirements: `ADMIN`
- Validation requirements: Decision enum; reason required for reject/request changes
- Edge cases: Duplicate moderation actions, stale queue item
- Priority: critical

### Gap 2: Influencer AI Assistant Backend Flow Missing
- Feature name: Influencer AI content copilot
- Frontend location/route/component: `/influencer/ai-assistant`, `Frontend/src/features/influencer/AIContentAssistant.jsx`
- Business purpose: Campaign-specific content planning for creators
- Current frontend behavior: Local fallback-only assistant
- Missing backend dependency: `POST /v1/ai/content-brief` is currently `BRAND`-only
- Required endpoint(s):
  - Option A: `POST /v1/ai/influencer/content-brief`
  - Option B: Expand `POST /v1/ai/content-brief` for `INFLUENCER` with strict ownership checks
- Recommended HTTP method(s): `POST`
- Proposed request payload:
  - `{ collaboration_id | campaign_id, content_format: 'reel' | 'post' | 'story' | 'carousel' }`
- Proposed response payload:
  - `{ briefingPoints, contentIdeas, dos, donts, _meta }`
- Auth/role requirements: `INFLUENCER`
- Validation requirements: Campaign-access validation
- Edge cases: Creator requests brief for unauthorized campaign
- Priority: critical

### Gap 3: Admin Audit Feed APIs Missing
- Feature name: Admin audit traceability
- Frontend location/route/component: Admin area expansion
- Business purpose: Compliance and moderation accountability
- Current frontend behavior: No persistence/audit retrieval
- Missing backend dependency: No `admin_audit_log` API surface
- Required endpoint(s):
  - `GET /v1/admin/audit-log`
- Recommended HTTP method(s): `GET`
- Proposed request payload:
  - Query: `page`, `limit`, `actor_id?`, `action?`, `target_type?`
- Proposed response payload:
  - `{ data: Array<{ id, actor_id, action, target_type, target_id, old_state, new_state, reason, created_at }>, pagination }`
- Auth/role requirements: `ADMIN`
- Validation requirements: Bounded page/limit
- Edge cases: Large JSON old/new state payloads
- Priority: high

### Gap 4: Invitation Detail Endpoint Missing
- Feature name: Single invitation deep-link fetch
- Frontend location/route/component: `/influencer/invitations/:id`, `Frontend/src/features/influencer/InvitationDetail.jsx`
- Business purpose: Stable deep-linked invitation pages
- Current frontend behavior: Loads incoming list and finds id client-side
- Missing backend dependency: No `GET /v1/collaborations/:id`
- Required endpoint(s):
  - `GET /v1/collaborations/:id`
- Recommended HTTP method(s): `GET`
- Proposed response payload:
  - `{ id, campaign_id, brand_id, influencer_id, type, status, message, campaign: { title, brief_preview, budget, currency }, created_at }`
- Auth/role requirements: Requesting user must own/participate in collaboration
- Validation requirements: UUID path validation
- Edge cases: Unauthorized ID probing
- Priority: high

### Gap 5: User Profile Read/Update APIs Missing
- Feature name: Brand/Influencer profile persistence
- Frontend location/route/component:
  - `Frontend/src/features/brand/BrandDashboard.jsx`
  - `Frontend/src/features/influencer/InfluencerDashboard.jsx`
- Business purpose: Persist profile edits server-side
- Current frontend behavior: In-memory/profile cache updates only
- Missing backend dependency: No role-aware profile endpoint contract exposed
- Required endpoint(s):
  - `GET /v1/profile/me`
  - `PATCH /v1/profile/me`
- Recommended HTTP method(s): `GET`, `PATCH`
- Proposed request payload:
  - Brand: `{ name?, companyName?, industry?, website?, toneVoice? }`
  - Influencer: `{ name?, bio?, nichePrimary?, nicheSecondary?, mediaKitUrl?, portfolioUrl? }`
- Proposed response payload:
  - `{ data: { user, role_profile } }`
- Auth/role requirements: Authenticated user
- Validation requirements: Role-safe field validation
- Edge cases: Partial updates, role mismatch
- Priority: high

### Gap 6: Influencer Dashboard KPI Endpoint Missing
- Feature name: Influencer KPI dashboard
- Frontend location/route/component: `/influencer/dashboard`, `Frontend/src/features/influencer/InfluencerDashboard.jsx`
- Business purpose: Real metrics for creator health and collaboration status
- Current frontend behavior: Placeholder KPI stats
- Missing backend dependency: No dedicated dashboard aggregate endpoint
- Required endpoint(s):
  - `GET /v1/influencer/dashboard`
- Recommended HTTP method(s): `GET`
- Proposed response payload:
  - `{ data: { followerCount, avgLikes, totalViews30d, engagementRate, pendingInvites, acceptedCollaborations } }`
- Auth/role requirements: `INFLUENCER`
- Validation requirements: Numeric defaults/fallbacks
- Edge cases: No stats ingested yet
- Priority: high

### Gap 7: Brand Notifications API Missing
- Feature name: Brand notifications feed
- Frontend location/route/component: `/brand/dashboard` notifications panel
- Business purpose: Surface campaign/invite lifecycle updates
- Current frontend behavior: Static notification cards
- Missing backend dependency: No notifications endpoints
- Required endpoint(s):
  - `GET /v1/notifications`
  - `PATCH /v1/notifications/:id/read`
- Recommended HTTP method(s): `GET`, `PATCH`
- Proposed request payload:
  - PATCH: `{ read: true }`
- Proposed response payload:
  - GET: `{ data: Array<{ id, type, title, body, actor, created_at, read }> }`
- Auth/role requirements: Authenticated user
- Validation requirements: Ownership checks
- Edge cases: Notification fan-out volume
- Priority: medium

### Gap 8: Invitation Feed Missing Brand Identity Join
- Feature name: Brand identity in incoming collaboration list
- Frontend location/route/component: `Frontend/src/features/influencer/CampaignFeed.jsx`
- Business purpose: Creator trust before acceptance
- Current frontend behavior: Fallback label (`Brand Invite`) where brand details are unavailable
- Missing backend dependency: `GET /v1/collaborations/incoming` lacks joined brand profile metadata
- Required endpoint(s):
  - Enhance `GET /v1/collaborations/incoming`
- Recommended HTTP method(s): `GET`
- Proposed response payload:
  - Include `brand: { id, company_name, logo_url? }`
- Auth/role requirements: `INFLUENCER`
- Validation requirements: Exclude deleted brand profiles
- Edge cases: Missing brand profile row
- Priority: medium

### Gap 9: Onboarding Asset Upload APIs Missing
- Feature name: Upload media kit/logo
- Frontend location/route/component:
  - `Frontend/src/features/public/BrandSignupForm.jsx`
  - `Frontend/src/features/public/InfluencerSignupForm.jsx`
- Business purpose: Better onboarding quality and verification support
- Current frontend behavior: Upload UI placeholders, no upload transport
- Missing backend dependency: Presign/attach API not exposed
- Required endpoint(s):
  - `POST /v1/uploads/presign`
  - `POST /v1/onboarding/assets`
- Recommended HTTP method(s): `POST`
- Proposed request payload:
  - Presign: `{ fileName, mimeType, purpose: 'brand_logo' | 'media_kit' | 'portfolio' }`
  - Attach: `{ purpose, assetUrl, checksum? }`
- Proposed response payload:
  - Presign: `{ uploadUrl, assetUrl, expiresAt }`
  - Attach: `{ success: true, assetId, purpose }`
- Auth/role requirements: Authenticated user
- Validation requirements: MIME/size constraints
- Edge cases: Expired pre-signed URL
- Priority: medium

### Gap 10: Auth Bootstrap Endpoint Missing (Recommended)
- Feature name: Unified role/session bootstrap
- Frontend location/route/component: `Frontend/src/context/AuthContext.jsx`
- Business purpose: Avoid role inference drift in hybrid auth mode
- Current frontend behavior: Metadata/master-account fallback logic
- Missing backend dependency: No `GET /v1/auth/me` contract
- Required endpoint(s):
  - `GET /v1/auth/me`
- Recommended HTTP method(s): `GET`
- Proposed response payload:
  - `{ userId, email, role, onboardingCompleted, onboardingStep, profile }`
- Auth/role requirements: Any authenticated user
- Validation requirements: JWT required
- Edge cases: Partially provisioned user rows
- Priority: high

---

## B) Documentation vs Implementation Drift (Needs Correction)

### Drift 1: Collaboration state machine docs vs route validation
- Docs source: `Backend/docs/collaboration.md`
- Docs states: `PENDING -> ACCEPTED | DECLINED | CLARIFICATION_REQUESTED`
- Current route implementation: `PATCH /v1/collaborations/:id/status` only accepts `ACCEPTED | DECLINED`
- Impact: Frontend cannot safely implement clarification workflow
- Recommendation:
  - Either implement `CLARIFICATION_REQUESTED` end-to-end
  - Or update docs to current accepted enum
- Priority: medium

### Drift 2: Influencer onboarding step 4 contract
- Docs source: `Backend/docs/phase2-summary.md`
- Docs states: Step 4 returns job id/message and triggers ingest
- Current implementation:
  - Step 4 stores rate cards only
  - `POST /v1/onboarding/influencer/complete` triggers ingest
- Frontend status: Adapted to support current implementation and tolerate doc-style completion behavior
- Recommendation: Update docs to reflect `step4 + complete` flow, or update route behavior
- Priority: high

### Drift 3: Resubmission limits in docs vs service logic
- Docs source: `Backend/docs/phase2-summary.md`
- Docs states: 7-day cooldown, max 3 attempts
- Current service logic (`InfluencerService`): 24-hour cooldown, max 5 attempts
- Impact: Incorrect product expectations and QA criteria
- Recommendation: Align docs with service logic or revert service to documented policy
- Priority: high

### Drift 4: Phase 0 health response examples vs actual endpoint
- Docs source: `Backend/docs/PHASE_0_VERIFICATION.md`
- Docs example response: `{ status: 'ok', timestamp }`
- Current route implementation: `{ ok: true }`
- Impact: Low, but confusing for testing and API consumers
- Recommendation: Update verification docs to current health payload
- Priority: low

### Drift 5: Requested backend-flow folder path missing
- Docs expectation in product task: `docs/backend flow`
- Actual docs location: `Backend/docs`
- Impact: Contract discovery friction across teams
- Recommendation: Create canonical backend API flow doc and stable path alias
- Priority: low

---

## C) Admin-Specific Backend Requirements (Consolidated)

### Required entities/relations
- `users` (`ADMIN`) linked to moderation actions in `admin_audit_log`
- `influencer_profiles` joined with unresolved `admin_flags`
- Queue items enriched with latest `ingest_jobs` status/confidence where available

### Required enums/status fields
- `verification_status`: `PENDING | APPROVED | REJECTED | NEEDS_CHANGES`
- `admin_decision`: `APPROVE | REJECT | REQUEST_CHANGES`
- `collaboration_status`: finalize/align clarification support decision

### Optional admin upload/media support
- Moderation evidence attachments (screenshots/docs)
- Reuse signed upload flow and reference assets from `admin_audit_log`

---

## Recommended Backend Delivery Order
1. Admin verification queue + decision endpoints
2. Collaboration detail endpoint + invitation feed brand join enrichment
3. Influencer AI content-brief authorization path
4. Profile read/update endpoints
5. Resolve onboarding and collaboration docs/implementation drift
6. Optional auth bootstrap and notifications
