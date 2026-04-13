# BACKEND GAP REPORT

Date: 2026-04-13
Project: Meshlyy MVP
Prepared by: Full-stack integration pass

## Scope Note
The requested folder `docs/backend flow` was not present in this workspace. This report is based on:
1. Backend route implementation in `Backend/src/routes`
2. Backend service contracts in `Backend/src/services`
3. Existing backend docs in `Backend/docs`
4. Frontend behavior in `Frontend/src`

## Gap Summary
- Critical gaps: 4
- High gaps: 5
- Medium gaps: 4
- Low gaps: 2

---

## Gap 1: Admin Verification Queue APIs Missing
- Feature name: Admin verification moderation
- Frontend location/route/component: `/admin/queue`, `Frontend/src/features/admin/VerificationQueue.jsx`
- Business purpose: Review influencer verification outcomes and approve/reject creators before marketplace visibility
- Current frontend behavior: Local mock queue and local-only approve/request-change actions
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
- Auth/role requirements: `ADMIN` only
- Validation requirements: Decision enum required; reason required for reject/request changes
- Edge cases:
  - Influencer already approved/rejected
  - Conflicting moderation actions by concurrent admins
  - Missing influencer profile
- Priority: critical

## Gap 2: Admin Audit Feed APIs Missing
- Feature name: Admin action traceability
- Frontend location/route/component: Admin section (future expansion from queue)
- Business purpose: Incubation/demo compliance, moderation accountability
- Current frontend behavior: No persistent audit data
- Missing backend dependency: No endpoint for `admin_audit_log`
- Required endpoint(s):
  - `GET /v1/admin/audit-log`
- Recommended HTTP method(s): `GET`
- Proposed request payload:
  - Query: `page`, `limit`, `actor_id?`, `action?`, `target_type?`
- Proposed response payload:
  - `{ data: Array<{ id, actor_id, action, target_type, target_id, old_state, new_state, reason, created_at }>, pagination }`
- Auth/role requirements: `ADMIN` only
- Validation requirements: Bounded page/limit
- Edge cases: Large JSON state payloads
- Priority: high

## Gap 3: User Profile Read/Update APIs Missing
- Feature name: Brand/Influencer profile management
- Frontend location/route/component:
  - `Frontend/src/features/brand/BrandDashboard.jsx`
  - `Frontend/src/features/influencer/InfluencerDashboard.jsx`
- Business purpose: Real account profile persistence beyond in-memory session data
- Current frontend behavior: Profile edits mutate frontend auth state only
- Missing backend dependency: No profile fetch/update route per role
- Required endpoint(s):
  - `GET /v1/profile/me`
  - `PATCH /v1/profile/me`
- Recommended HTTP method(s): `GET`, `PATCH`
- Proposed request payload:
  - PATCH brand: `{ name?, companyName?, industry?, website?, toneVoice? }`
  - PATCH influencer: `{ name?, bio?, nichePrimary?, nicheSecondary?, mediaKitUrl?, portfolioUrl? }`
- Proposed response payload:
  - `{ data: { user, role_profile } }`
- Auth/role requirements: Authenticated user; role-aware shape
- Validation requirements: Field length and URL validation; role-safe payload enforcement
- Edge cases:
  - Partial updates
  - Role mismatch payloads
- Priority: high

## Gap 4: Invitation Detail Endpoint Missing
- Feature name: Single invitation fetch by ID
- Frontend location/route/component: `/influencer/invitations/:id`, `Frontend/src/features/influencer/InvitationDetail.jsx`
- Business purpose: Reliable deep-link detail view for invitation review
- Current frontend behavior: Fetches incoming list and finds item by id client-side
- Missing backend dependency: No `GET /v1/collaborations/:id`
- Required endpoint(s):
  - `GET /v1/collaborations/:id`
- Recommended HTTP method(s): `GET`
- Proposed request payload: N/A
- Proposed response payload:
  - `{ id, campaign_id, brand_id, influencer_id, type, status, message, campaign: { title, brief_preview, budget, currency }, created_at }`
- Auth/role requirements: Authenticated owner only (invited influencer or owning brand)
- Validation requirements: UUID path validation
- Edge cases: Unauthorized lookup attempts
- Priority: high

## Gap 5: Influencer AI Assistant Backend Flow Missing
- Feature name: Influencer AI content copilot
- Frontend location/route/component: `/influencer/ai-assistant`, `Frontend/src/features/influencer/AIContentAssistant.jsx`
- Business purpose: Give creators campaign-specific content guidance
- Current frontend behavior: Graceful local guidance mode (non-API)
- Missing backend dependency: `POST /v1/ai/content-brief` currently brand-only (`checkRole('BRAND')`)
- Required endpoint(s):
  - Option A: `POST /v1/ai/influencer/content-brief`
  - Option B: expand existing `POST /v1/ai/content-brief` to support `INFLUENCER` with ownership checks
- Recommended HTTP method(s): `POST`
- Proposed request payload:
  - `{ collaboration_id | campaign_id, content_format: 'reel' | 'post' | 'story' | 'carousel' }`
- Proposed response payload:
  - `{ briefingPoints, contentIdeas, dos, donts, _meta }`
- Auth/role requirements: `INFLUENCER` with collaboration/campaign access checks
- Validation requirements: Input enum validation and campaign ownership relation
- Edge cases:
  - Creator requesting brief for unrelated campaign
  - Campaign without sufficient brief context
- Priority: critical

## Gap 6: Onboarding Asset Upload APIs Missing
- Feature name: Upload media kit/logo for onboarding
- Frontend location/route/component:
  - `Frontend/src/features/public/BrandSignupForm.jsx`
  - `Frontend/src/features/public/InfluencerSignupForm.jsx`
- Business purpose: Verification quality and richer profile quality
- Current frontend behavior: Upload UI placeholders only, no upload transport
- Missing backend dependency: Upload URL/signature and attachment fields
- Required endpoint(s):
  - `POST /v1/uploads/presign`
  - `POST /v1/onboarding/assets`
- Recommended HTTP method(s): `POST`
- Proposed request payload:
  - Presign: `{ fileName, mimeType, purpose: 'brand_logo' | 'media_kit' | 'portfolio' }`
  - Assets attach: `{ purpose, assetUrl, checksum? }`
- Proposed response payload:
  - Presign: `{ uploadUrl, assetUrl, expiresAt }`
  - Attach: `{ success: true, assetId, purpose }`
- Auth/role requirements: Authenticated user
- Validation requirements: Mime/size restrictions, anti-virus hook if available
- Edge cases: Expired upload URL, oversized file
- Priority: medium

## Gap 7: Influencer Dashboard Stats Endpoint Missing
- Feature name: Creator KPI dashboard data
- Frontend location/route/component: `/influencer/dashboard`, `Frontend/src/features/influencer/InfluencerDashboard.jsx`
- Business purpose: Show performance and engagement data in dashboard
- Current frontend behavior: Placeholder stats
- Missing backend dependency: No endpoint returning influencer KPI summary
- Required endpoint(s):
  - `GET /v1/influencer/dashboard`
- Recommended HTTP method(s): `GET`
- Proposed request payload: N/A
- Proposed response payload:
  - `{ data: { followerCount, avgLikes, totalViews30d, engagementRate, pendingInvites, acceptedCollaborations } }`
- Auth/role requirements: `INFLUENCER`
- Validation requirements: Numeric fallback to zero
- Edge cases: No stats ingested yet
- Priority: high

## Gap 8: Brand Notifications Feed Endpoint Missing
- Feature name: Brand dashboard notifications
- Frontend location/route/component: `/brand/dashboard`, notifications section
- Business purpose: Alert brands about invite/application lifecycle
- Current frontend behavior: Static cards
- Missing backend dependency: No notifications endpoint
- Required endpoint(s):
  - `GET /v1/notifications`
  - `PATCH /v1/notifications/:id/read`
- Recommended HTTP method(s): `GET`, `PATCH`
- Proposed request payload:
  - PATCH: `{ read: true }`
- Proposed response payload:
  - GET: `{ data: Array<{ id, type, title, body, actor, created_at, read }> }`
- Auth/role requirements: Authenticated user
- Validation requirements: Ownership of notification
- Edge cases: Notification fan-out volume
- Priority: medium

## Gap 9: Public Brand Identity in Invitation Feed
- Feature name: Invitation list brand attribution
- Frontend location/route/component: `Frontend/src/features/influencer/CampaignFeed.jsx`
- Business purpose: Creators need clear brand identity before accepting
- Current frontend behavior: Fallback "Brand Invite" label due missing joined brand profile info
- Missing backend dependency: `GET /v1/collaborations/incoming` response lacks joined `brand_profiles` fields
- Required endpoint(s):
  - Enhance existing `GET /v1/collaborations/incoming`
- Recommended HTTP method(s): `GET`
- Proposed request payload: N/A
- Proposed response payload:
  - Each item includes `brand: { id, company_name, logo_url? }`
- Auth/role requirements: `INFLUENCER`
- Validation requirements: Hide deleted brands
- Edge cases: Missing brand profile record
- Priority: medium

## Gap 10: Auth Bootstrap Endpoint (Optional but Recommended)
- Feature name: Unified frontend role/session bootstrap
- Frontend location/route/component: `Frontend/src/context/AuthContext.jsx`
- Business purpose: Avoid role inference from frontend metadata in mixed Supabase/demo mode
- Current frontend behavior: Uses metadata/master-account mapping and backend token enforcement
- Missing backend dependency: No single endpoint to resolve user role/profile from JWT
- Required endpoint(s):
  - `GET /v1/auth/me`
- Recommended HTTP method(s): `GET`
- Proposed request payload: N/A
- Proposed response payload:
  - `{ userId, email, role, onboardingCompleted, onboardingStep, profile: {...} }`
- Auth/role requirements: Any authenticated user
- Validation requirements: JWT required
- Edge cases: Partially provisioned user row
- Priority: high

## Gap 11: Collaboration Clarification State Support (Doc/Impl Mismatch)
- Feature name: Clarification request status handling
- Frontend location/route/component: Invitation workflows and future admin tooling
- Business purpose: Keep collaboration negotiation stateful
- Current frontend behavior: Handles `PENDING | ACCEPTED | DECLINED`
- Missing backend dependency: Docs mention `CLARIFICATION_REQUESTED` but route schema currently only allows `ACCEPTED | DECLINED`
- Required endpoint(s):
  - Expand `PATCH /v1/collaborations/:id/status` enum
- Recommended HTTP method(s): `PATCH`
- Proposed request payload:
  - `{ status: 'ACCEPTED' | 'DECLINED' | 'CLARIFICATION_REQUESTED', message?: string }`
- Proposed response payload:
  - Updated collaboration object
- Auth/role requirements: Participant-only
- Validation requirements: State machine transitions
- Edge cases: Terminal state transitions
- Priority: low

## Gap 12: Route Contract Documentation Consistency
- Feature name: API contract discoverability
- Frontend location/route/component: Entire SPA integration layer
- Business purpose: Reduce contract drift across teams
- Current frontend behavior: Integrated against route code because `docs/backend flow` folder not present
- Missing backend dependency: Missing canonical API flow doc path requested by product task
- Required endpoint(s): N/A (documentation gap)
- Recommended HTTP method(s): N/A
- Proposed request payload: N/A
- Proposed response payload: N/A
- Auth/role requirements: N/A
- Validation requirements: N/A
- Edge cases: Future route drift without synced docs
- Priority: low

---

## Admin-Specific Backend Requirements

### Required Entities and Relations
- `users` (role `ADMIN`) must be linked to moderation actions in `admin_audit_log`
- `influencer_profiles` relation to `admin_flags` should include unresolved flags in queue response
- Queue should include latest `ingest_jobs` status and confidence metrics if available

### Required Status/Enum Fields
- `verification_status`: `PENDING | APPROVED | REJECTED | NEEDS_CHANGES`
- `admin_decision`: `APPROVE | REJECT | REQUEST_CHANGES`
- `collaboration_status` should align docs and implementation if clarification flow remains required

### Admin Upload/Media Requirements
- Optional support for admin evidence attachments:
  - moderation screenshots
  - supporting notes/documents
- If added, reuse signed-upload flow and store references in `admin_audit_log`

---

## Recommended Delivery Order (Backend)
1. Admin verification queue + decision endpoints
2. `GET /v1/collaborations/:id` and enrich incoming collaborations with brand profile data
3. Influencer AI content brief authorization path
4. Profile read/update endpoints
5. Optional auth bootstrap endpoint and notifications
