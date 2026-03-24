# Truncated EDF Graceful Handling

**Issue:** #297 (truncated EDF subset)
**Tier:** Light spec
**Priority:** P3

## Problem

Sentry shows ~20 "Truncated EDF file" errors from a single user uploading incomplete BRP.edf files. These files were likely cut short during SD card copy (user ejected card before copy finished, or filesystem corruption). The current behavior: the parser throws an error, Sentry captures it as an error-level event, and the user sees a generic parse failure.

## Root cause

The EDF parser (`lib/parsers/edf-parser.ts`) validates that the file contains the expected number of data records based on the header. When the file is shorter than expected, it throws. This is correct behavior -- the data genuinely is incomplete. But the error handling doesn't distinguish between "file is corrupt" and "file is truncated but partially usable."

## Solution

1. Detect truncated files (header says N records, file has fewer)
2. Parse what's available instead of throwing
3. Mark the result as truncated so the UI can warn the user
4. Improve the error message for genuinely corrupt files (bad header)

## Implementation Steps

### Step 1: Detect and handle truncation in EDF parser

**File:** `lib/parsers/edf-parser.ts` (protected module -- logic change, needs discussion)

When the file is shorter than the header-declared record count:
- Calculate how many complete records ARE available
- Parse those records normally
- Return a `truncated: true` flag and `recordsParsed` / `recordsExpected` counts
- Only throw for files with an invalid/unreadable header (genuinely corrupt)

**Note:** This touches a protected module. The change is isolated to error handling, not analysis logic. The parsed flow data from complete records is identical whether the file was truncated or not.

### Step 2: Propagate truncation info through the pipeline

**File:** `workers/analysis-worker.ts`

When the worker encounters a truncated EDF file:
- Include it in analysis (partial data is better than no data)
- Add a warning to the worker's progress messages
- Track which files were truncated

### Step 3: Show truncation warning in UI

**File:** `components/upload/` (upload results area)

After analysis completes, if any files were truncated:
- Show a yellow warning banner: "X file(s) were partially uploaded from your SD card. Analysis used available data. For complete results, re-copy the SD card ensuring the copy finishes fully."
- List the truncated filenames
- Don't block the results -- show them with the warning

### Step 4: Downgrade Sentry level

Truncated files are a user-side data issue, not a bug. Change from `error` to `info` level with a `truncated_edf` tag for monitoring volume.

### Step 5: Tests

**File:** `__tests__/edf-parser.test.ts`

- Test parsing a truncated EDF (file shorter than header declares)
- Verify partial records are extracted correctly
- Verify `truncated` flag is set
- Verify genuinely corrupt files (bad header magic) still throw

## Scope boundaries

- Parser change is minimal: add a length check before throwing, parse available records
- No changes to analysis engine logic
- No changes to how flow data is processed once extracted
- Protected module change must be in its own PR

## Manual QA checklist

- [ ] Normal EDF files parse as before (no regression)
- [ ] Truncated EDF file parses available data + shows warning
- [ ] Genuinely corrupt file (bad header) shows clear error message
- [ ] Analysis results from truncated data display correctly on dashboard
- [ ] Sentry shows truncation as info, not error
