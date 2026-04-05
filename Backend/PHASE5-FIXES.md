# Phase 5 Gemini Implementation Fixes

## Issues Found and Fixed

### ❌ Issue 1: Wrong Model Name
**Before:** `gemini-1.5-flash`  
**After:** `gemini-2.5-flash-lite` (from env: `GEMINI_MODEL`)  
**Impact:** Model not available or different behavior

### ❌ Issue 2: Wrong SDK Approach  
**Before:** Using `@google/generative-ai` Node.js SDK  
**After:** Direct HTTP POST to `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`  
**Impact:** SDK might not support latest models or have different request/response handling

### ❌ Issue 3: Missing Environment Variable
**Before:** No `GEMINI_MODEL` support  
**After:** Added `GEMINI_MODEL=gemini-2.5-flash-lite` to `.env` and config  
**Impact:** Couldn't override model without code changes

### ❌ Issue 4: Wrong Default Timeout
**Before:** 10000ms (10s)  
**After:** 30000ms (30s)  
**Impact:** AI calls timing out prematurely

## Changes Made

### 1. `src/config/env.ts`
- Added `GEMINI_MODEL` with default `'gemini-2.5-flash-lite'`
- Changed `GEMINI_TIMEOUT_MS` default from `'10000'` to `'30000'`

### 2. `src/services/GeminiService.ts`
- **Removed:** `@google/generative-ai` SDK dependency
- **Added:** Direct HTTP fetch to Gemini REST API (v1beta)
- **Request structure now matches reference:**
  ```typescript
  {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048
    }
  }
  ```
- **Response parsing:** Extracts `data.candidates[0].content.parts[0].text`
- **Error handling:** Proper 429 (rate limit) and 403 (access denied) detection
- Uses `AbortController` for timeout (more reliable than Promise.race)

### 3. `.env`
- Added `GEMINI_MODEL=gemini-2.5-flash-lite`
- Updated `GEMINI_TIMEOUT_MS=30000`

## Next Steps

1. **Restart the server** to pick up new environment variables:
   ```powershell
   # Kill existing server process
   # Then restart:
   cd Backend
   npm run dev
   ```

2. **Test all four endpoints** again:
   ```powershell
   # 1. Strategy
   curl.exe -X POST "http://localhost:3000/v1/ai/strategy" `
     -H "Authorization: Bearer mock-brand-token" `
     -H "Content-Type: application/json" `
     -d "{\"creator_id\":\"a0000000-0000-0000-0000-000000000001\"}"

   # 2. Brief
   curl.exe -X POST "http://localhost:3000/v1/ai/brief" `
     -H "Authorization: Bearer mock-brand-token" `
     -H "Content-Type: application/json" `
     -d "{\"campaign_goal\":\"Launch sustainable fashion line for Gen Z\"}"

   # 3 & 4: Create campaign, then test fit-score and content-brief
   ```

3. **Expected behavior:**
   - ✅ No more connection closed errors
   - ✅ No more 500s from AI endpoints
   - ✅ Responses should match fixture structure
   - ✅ Response time under 30s

## Why These Changes Matter

The reference documentation (`gemini-request.md`) specifies the **official Gemini REST API contract**. Using the Node.js SDK was abstracting away critical details:
- SDK might not support newest models
- SDK has its own timeout/retry logic that conflicts with ours
- Direct HTTP gives us full control over request/response

Now the implementation **exactly matches** the PowerShell reference, just in TypeScript.
