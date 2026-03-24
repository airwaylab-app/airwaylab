# Storage Upload Reliability

**Issue:** #297 (storage reliability subset)
**Tier:** Light spec
**Priority:** P2

## Problem

Sentry shows intermittent `StorageApiError: Bad Gateway` (8 events) on `POST /api/files/presign` and `cloud_upload_partial_failure` (10 events) on `/analyze`. These are transient Supabase Storage 502 errors that cause cloud backup uploads to fail silently or partially.

## Root cause

Supabase Storage proxies through Cloudflare, which occasionally returns 502/520 during brief upstream disruptions. The current upload flow has no retry logic for storage operations -- a single transient 502 fails the entire upload.

## Solution

Add retry-with-backoff for Supabase Storage operations (presign and upload). Partial failures should be surfaced to the user with a clear message about which files succeeded.

## Implementation Steps

### Step 1: Add retry utility for storage operations

**File:** `lib/storage/retry.ts` (new)

Create a simple retry wrapper:
- Max 3 attempts
- Exponential backoff: 500ms, 1000ms, 2000ms
- Only retry on transient errors (502, 503, 504, 520, network errors)
- Do not retry on auth errors (401, 403) or client errors (400)

### Step 2: Wrap presign calls with retry

**File:** `lib/storage/upload-orchestrator.ts`

Wrap the `fetch('/api/files/presign', ...)` call in the retry utility. The presign endpoint is idempotent (re-requesting a presigned URL is safe).

### Step 3: Wrap storage upload calls with retry

**File:** `lib/storage/upload-orchestrator.ts`

Wrap the actual file upload (PUT to presigned URL) in the retry utility. File uploads are idempotent (uploading the same file twice overwrites).

### Step 4: Surface partial failure to user

**File:** `components/upload/storage-progress-banner.tsx`

When some files upload successfully but others fail after retries:
- Show count of successful vs failed uploads
- Allow user to retry failed files
- Do not block analysis (browser-side analysis runs regardless of cloud upload status)

### Step 5: Downgrade Sentry level for transient storage errors

**File:** upload orchestrator

Transient storage errors that succeed on retry should not be sent to Sentry. Only final failures (after all retries exhausted) should be captured, at `warning` level instead of `error`.

## Tests

- Unit test for retry utility (mock fetch with failures then success)
- Unit test for partial failure tracking

## Manual QA checklist

- [ ] Cloud upload succeeds on stable connection
- [ ] Simulated 502 on first attempt retries and succeeds
- [ ] All retries exhausted shows user-facing error with retry button
- [ ] Partial failure shows accurate count
- [ ] Analysis still runs when cloud upload fails
