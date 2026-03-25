# Storage Upload Reliability

**Issue:** #297 (storage reliability subset)
**Tier:** Light spec
**Priority:** P2

## Problem

Sentry shows intermittent `StorageApiError: Bad Gateway` (8 events) on `POST /api/files/presign` and `cloud_upload_partial_failure` (10 events) on `/analyze`. These are transient Supabase Storage 502 errors that cause cloud backup uploads to fail silently or partially.

## Root cause

Supabase Storage proxies through Cloudflare, which occasionally returns 502/520 during brief upstream disruptions. The upload orchestrator (`lib/storage/upload-orchestrator.ts`) has retry logic, but it treats 502 as a generic error with a single flat 2s retry -- while 429 rate limits correctly get exponential backoff. The 3-step flow (presign -> PUT to storage -> confirm) means a 502 at any step fails the file.

**Current retry behavior:**
- **429 rate limit:** Exponential backoff (5s, 10s, 20s, 40s) with jitter -- correct
- **502/503/504:** Single retry after flat 2s delay -- insufficient for multi-second Supabase blips
- **Fail-fast:** 3 consecutive identical errors aborts entire batch (`FAIL_FAST_THRESHOLD`)

**Additional issues found:**
- Presign creates a `user_files` metadata row with `upload_confirmed: false` BEFORE the PUT. If PUT fails, orphaned rows remain until 1h cleanup timeout.
- `StorageProgressBanner` already shows partial failure counts but has no manual retry button.
- `cloud_upload_partial_failure` Sentry events don't distinguish transient vs persistent errors.

## Solution

Extend existing retry logic in `upload-orchestrator.ts` to treat 5xx errors like rate limits (exponential backoff). No new retry utility needed -- the orchestrator already has the retry infrastructure.

## Implementation Steps

### Step 1: Treat 5xx as transient in upload orchestrator

**File:** `lib/storage/upload-orchestrator.ts` (lines 440-506)

In the error handler for `uploadSingleFile`, detect 5xx status codes and route them through the exponential backoff path (currently only used for 429):
- Check if error message contains status 502/503/504/520
- Use the same `RATE_LIMIT_BASE_DELAY_MS * Math.pow(2, attempt) + jitter` pattern
- Cap at 3 retries for 5xx (vs 4 for rate limits)
- Do NOT count 5xx toward `consecutiveErrors` fail-fast counter (transient, not systemic)

### Step 2: Add jitter to flat-delay retry

**File:** `lib/storage/upload-orchestrator.ts`

The current flat 2s retry for non-rate-limit errors lacks jitter. Add `Math.random() * 500` to prevent thundering herd when multiple files retry simultaneously.

### Step 3: Improve presign orphan handling

**File:** `app/api/files/presign/route.ts` (lines 88-120)

Reduce orphan timeout from 1 hour to 10 minutes. A legitimate upload should complete within seconds; 1 hour is far too generous and leaves broken state lingering.

### Step 4: Tag transient vs persistent in Sentry

**File:** `lib/storage/upload-orchestrator.ts` (reportFailures method, lines 227-254)

Add a `transient` tag to `cloud_upload_partial_failure` events. If all failures were 5xx that exhausted retries, tag as `transient: true`. This enables Sentry alerting to distinguish "Supabase had a blip" from "something is systematically broken."

### Step 5: Downgrade Sentry level for retried-then-succeeded uploads

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
