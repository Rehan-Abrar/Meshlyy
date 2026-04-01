# Phase 0 Sign-Off Checklist

## Quick Verification Commands

```bash
# Navigate to backend
cd D:\Meshlyy\Backend

# Install dependencies (if not already done)
npm install

# Run unit tests
npm test

# Start dev server
npm run dev
```

In another terminal:
```bash
# Test health endpoint
curl http://localhost:3000/v1/health
```

## Exit Criteria Verification

### ✅ Can Verify Now:

- [ ] **1. Service boots successfully**
  - Run `npm run dev`
  - Look for: `🚀 Meshly backend listening on port 3000`
  - No errors in console

- [ ] **2. Health endpoint responds**
  - `curl http://localhost:3000/v1/health`
  - Expect: `{"status":"ok","timestamp":"..."}`
  - Status code: 200

- [ ] **3. Store interface tests pass**
  - Run `npm test`
  - Expect: 12 tests pass
  - All InMemoryLockStore, InMemoryCacheStore, InMemoryBudgetStore tests green

### ⏳ Deferred to Post-Phase-1:

- [ ] **4. JWT verification works** (needs DB + protected route)
- [ ] **5. loadAuthContext populates from DB** (needs users table)
- [ ] **6. Onboarding guard blocks correctly** (needs DB + signup)
- [ ] **7. Provisioning contract works** (needs DB + signup endpoint)

### 🔧 Optional: Timeout Middleware Test

Add to `src/app.ts` before the error handler:
```typescript
app.get('/v1/test/slow', async (req, res) => {
  await new Promise(resolve => setTimeout(resolve, 10000));
  res.json({ message: 'done' });
});
```

Then test:
```bash
curl http://localhost:3000/v1/test/slow
```

Expected: After ~5 seconds, returns `{"error":{"code":"REQUEST_TIMEOUT",...}}`

## Issues to Fix Before Testing

### Critical:
1. **Update .env SUPABASE_JWT_SECRET**
   - Go to Supabase dashboard → Settings → API
   - Copy "JWT Secret"
   - Update in `.env` file

### Nice-to-Have:
- None blocking

## Phase 0 Sign-Off

```
Date: __________
Tester: __________

Exit Criteria Results:
- [ ] Service boots: PASS / FAIL
- [ ] Health endpoint: PASS / FAIL  
- [ ] Store tests: PASS / FAIL (__ / 12 passed)
- [ ] Timeout test: PASS / FAIL / SKIPPED

Issues Found:
__________________________________________________________
__________________________________________________________

Phase 0 Status: APPROVED / NEEDS FIXES

Approved by: __________
Date: __________

Ready to proceed to Phase 1: YES / NO
```

## Phase 1 Preview

Once Phase 0 is signed off, Phase 1 will implement:
- Database schema (15+ tables)
- Migrations with partial unique indexes
- Seed fixtures
- Query optimization validation

Do not proceed to Phase 1 until Phase 0 verification is complete.
