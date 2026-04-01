# Phase 0 Exit Criteria Verification

This document guides you through verifying each Phase 0 exit criterion before proceeding to Phase 1.

## Prerequisites

1. Install dependencies:
   ```bash
   cd D:\Meshlyy\Backend
   npm install
   ```

2. Ensure your `.env` file is configured with valid Supabase credentials:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_JWT_SECRET` (get from Supabase project settings > API > JWT Secret)

## Exit Criterion 1: Service Boots

**Test:** Service boots in dev and hits `GET /v1/health`

```bash
npm run dev
```

Expected output:
```
🚀 Meshly backend listening on port 3000
📝 Environment: development
```

Then in another terminal:
```bash
curl http://localhost:3000/v1/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-03-31T..."
}
```

**✅ Pass Criteria:** Server starts without errors, health endpoint returns 200 OK

---

## Exit Criterion 2: Supabase Auth JWT Verified

**Test:** Send request with bad token, expect `401`

Before this test works, you need Phase 1 database schema. **Skip for now, revisit after Phase 1.**

---

## Exit Criterion 3: loadAuthContext Populates from DB

**Test:** Sign up user, login, hit protected route, verify authContext

Before this test works, you need:
- Phase 1 database schema (`users`, `brand_profiles` tables)
- Auth endpoints (Phase 2 onboarding)

**Skip for now, revisit after Phase 2.**

---

## Exit Criterion 4: Onboarding Guard Uses authContext

**Test:** Set `onboarding_completed = false` in DB, verify `403` with redirect

Before this test works, you need:
- Phase 1 database schema
- A protected endpoint

**Skip for now, revisit after Phase 2.**

---

## Exit Criterion 5: Provisioning Contract

**Test:** Sign up creates `users` row before other calls

Before this test works, you need:
- Phase 1 database schema
- Phase 2 signup endpoint

**Skip for now, revisit after Phase 2.**

---

## Exit Criterion 6: Global Timeout Middleware

**Test:** Verify slow route returns `503 REQUEST_TIMEOUT`

Create a test route:

```typescript
// Add to src/app.ts temporarily:
app.get('/v1/test/slow', async (req, res) => {
  await new Promise(resolve => setTimeout(resolve, 10000));
  res.json({ message: 'done' });
});
```

Then test:
```bash
curl http://localhost:3000/v1/test/slow
```

Expected: After 5 seconds, returns:
```json
{
  "error": {
    "code": "REQUEST_TIMEOUT",
    "message": "Request timed out."
  }
}
```

**✅ Pass Criteria:** Request times out at 5s with proper error response

---

## Exit Criterion 7: Store Interfaces Unit Tests

**Test:** Run Vitest, all green

```bash
npm test
```

Expected output:
```
✓ InMemoryLockStore > should acquire a lock successfully
✓ InMemoryLockStore > should fail to acquire same lock twice
✓ InMemoryLockStore > should release a lock
✓ InMemoryLockStore > should allow lock acquisition after TTL expires
✓ InMemoryCacheStore > should set and get a value
✓ InMemoryCacheStore > should return null for missing key
✓ InMemoryCacheStore > should delete a value
✓ InMemoryCacheStore > should expire values after TTL
✓ InMemoryBudgetStore > should start with zero spend
✓ InMemoryBudgetStore > should increment spend
✓ InMemoryBudgetStore > should accumulate spend
✓ InMemoryBudgetStore > should reset spend to zero

Test Files  1 passed (1)
     Tests  12 passed (12)
```

**✅ Pass Criteria:** All 12 store interface tests pass

---

## Phase 0 Status Summary

**Can Verify Now:**
- ✅ Criterion 1: Service boots and health endpoint works
- ✅ Criterion 6: Global timeout middleware (with test route)
- ✅ Criterion 7: Store interfaces unit tests

**Blocked Until Phase 1 (Database Schema):**
- ⏳ Criterion 2: JWT verification on protected routes
- ⏳ Criterion 3: loadAuthContext from DB
- ⏳ Criterion 4: Onboarding guard
- ⏳ Criterion 5: Provisioning contract

**Next Steps:**
1. Run the 3 verifiable tests above
2. If all pass, Phase 0 foundations are solid
3. Document any issues found
4. Proceed to Phase 1: Database Schema

---

## Known Issues to Fix Before Testing

### Issue 1: Missing SUPABASE_JWT_SECRET in .env
The `.env` file has a placeholder. Get the real value from:
1. Go to your Supabase project dashboard
2. Settings > API
3. Copy "JWT Secret" value
4. Update `.env`: `SUPABASE_JWT_SECRET=<your-actual-secret>`

### Issue 2: Store Test Imports
The test file imports are relative, needs fixing if tests fail.

---

## Phase 0 Sign-Off

Once all verifiable tests pass:

```
Phase 0 Complete: __________ (Date)
Verified by: __________
Issues found: __________
Ready for Phase 1: [ ] Yes [ ] No
```
