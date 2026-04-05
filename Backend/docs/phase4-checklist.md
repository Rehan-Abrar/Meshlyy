# Phase 4 Verification Checklist

Run through this checklist manually to verify Phase 4 is 100% complete.

## ✅ Files Created

- [ ] `src/services/CreatorService.ts` exists
- [ ] `src/services/CampaignService.ts` exists
- [ ] `src/services/ShortlistService.ts` exists
- [ ] `src/services/CollaborationService.ts` exists
- [ ] `src/routes/creators.ts` exists
- [ ] `src/routes/campaigns.ts` exists
- [ ] `src/routes/shortlists.ts` exists
- [ ] `src/routes/collaborations.ts` exists
- [ ] `src/lib/ownership.ts` exists
- [ ] `src/lib/pagination.ts` exists
- [ ] `src/phase4-integration.test.ts` exists
- [ ] `src/verify-phase4.ts` exists
- [ ] `docs/phase4-summary.md` exists

## ✅ Routes Mounted in app.ts

- [ ] `/v1/creators` routes mounted
- [ ] `/v1/campaigns/matched` routes mounted (before `/v1/campaigns`)
- [ ] `/v1/campaigns` routes mounted
- [ ] `/v1/shortlists` routes mounted
- [ ] `/v1/collaborations` routes mounted

## ✅ Service Methods Implemented

### CreatorService
- [ ] `discover()` - with filters (niche, follower_min/max, engagement_min/max)
- [ ] `getDetail()` - with stats and rate cards
- [ ] CacheStore integration with 5-min TTL
- [ ] Cache hit/miss logging

### CampaignService
- [ ] `create()` - with idempotency key support
- [ ] `getById()` - with ownership enforcement
- [ ] `list()` - with status filter and pagination
- [ ] `update()` - with ownership enforcement
- [ ] `updateStatus()` - DRAFT → ACTIVE → PAUSED → COMPLETED
- [ ] `delete()` - soft delete with ownership enforcement
- [ ] `getMatchedForInfluencer()` - returns brief_preview only

### ShortlistService
- [ ] `add()` - with duplicate prevention and ownership
- [ ] `remove()` - with ownership enforcement
- [ ] `list()` - with optional campaign filter

### CollaborationService
- [ ] `sendInvite()` - with idempotency key support
- [ ] `apply()` - with idempotency key support
- [ ] `updateStatus()` - enforces PENDING → ACCEPTED/DECLINED (terminal)
- [ ] `getIncoming()` - for influencers
- [ ] `listForCampaign()` - for brands with ownership enforcement
- [ ] DECLINED state is terminal (prevents re-invite/re-apply)

## ✅ Helper Utilities

- [ ] `assertBrandOwnership()` - throws FORBIDDEN on mismatch
- [ ] `getBrandId()` - extracts brand ID from auth context
- [ ] `parsePaginationParams()` - validates page/limit
- [ ] `buildPaginatedResponse()` - standard format

## ✅ API Endpoints Functional

### Discovery
- [ ] `GET /v1/creators` - returns filtered creators with pagination
- [ ] `GET /v1/creators/:id` - returns creator detail

### Campaigns (Brand)
- [ ] `POST /v1/campaigns` - creates campaign
- [ ] `GET /v1/campaigns` - lists brand campaigns
- [ ] `GET /v1/campaigns/:id` - gets campaign detail
- [ ] `PATCH /v1/campaigns/:id` - updates campaign
- [ ] `PATCH /v1/campaigns/:id/status` - updates status
- [ ] `DELETE /v1/campaigns/:id` - soft deletes

### Campaigns (Influencer)
- [ ] `GET /v1/campaigns/matched` - returns matched campaigns

### Shortlists
- [ ] `POST /v1/shortlists` - adds to shortlist
- [ ] `GET /v1/shortlists` - lists shortlists
- [ ] `DELETE /v1/shortlists/:id` - removes from shortlist

### Collaborations
- [ ] `POST /v1/collaborations/invite` - sends invite
- [ ] `POST /v1/collaborations/apply` - applies to campaign
- [ ] `PATCH /v1/collaborations/:id/status` - accepts/declines
- [ ] `GET /v1/collaborations/incoming` - lists incoming invites
- [ ] `GET /v1/collaborations/campaign/:id` - lists campaign collabs

## ✅ Exit Criteria Met

- [ ] Discovery filters work (niche, follower_min/max, engagement_min/max)
- [ ] CacheStore integration active (5-min TTL, cache hit/miss logged)
- [ ] Pagination contract consistent ({data, pagination: {page, limit, total, hasNext}})
- [ ] Ownership enforcement used consistently (assertBrandOwnership)
- [ ] Strategy-guided discovery supported (filters accept AI strategy outputs)
- [ ] Matched campaigns return brief_preview only (not brief_data)
- [ ] Collaboration state machine enforced (DECLINED is terminal)
- [ ] Idempotency keys accepted (campaign create, collab invite/apply)

## ✅ Database Ready

- [ ] Verified influencers exist in seed data
- [ ] Campaigns exist in seed data
- [ ] Influencer stats populated
- [ ] Discovery indexes exist:
  - `idx_influencer_profiles_search`
  - `idx_influencer_stats_join_filter`

## 🧪 Testing

To run integration tests:
```bash
npm run test:integration:phase4
```

To run verification script (if Node/TypeScript is available):
```bash
npx tsx src/verify-phase4.ts
```

## 📊 Status

Check off all items above. If all are checked, Phase 4 is 100% complete! ✅
