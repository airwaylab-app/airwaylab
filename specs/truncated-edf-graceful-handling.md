# Truncated EDF Graceful Handling

**Issue:** #297 (truncated EDF subset)
**Tier:** Light spec
**Priority:** P3

## Problem

Sentry shows ~20 "Truncated EDF file" errors from a single user uploading incomplete BRP.edf files. These files were likely cut short during SD card copy (user ejected card before copy finished, or filesystem corruption). The current behavior: the parser throws an error, Sentry captures it as an error-level event, and the user sees a generic parse failure.

## Root cause

The EDF parser (`lib/parsers/edf-parser.ts`, lines 125-132) validates that the file buffer matches the expected byte count from the header. When the file is shorter, it throws `"Truncated EDF file: expected {N} bytes but got {M}"`. This is all-or-nothing -- the file is entirely skipped.

**Current pipeline behavior (from codebase exploration):**
- The analysis worker (`workers/analysis-worker.ts`, lines 157-170) catches per-file parse errors and posts a `WorkerWarning` message with `checkpoint: 'parse_file_failed'`
- **The worker already gracefully skips failed files and continues with others** -- partial analysis works
- The orchestrator (`lib/analysis-orchestrator.ts`, lines 331-336) receives `WorkerWarning` and sends to Sentry but **never surfaces it to the UI**
- If ALL files fail, the worker throws and the error UI shows

So the pipeline already handles the "skip and continue" part. The gaps are:
1. The parser throws on truncated files instead of parsing available records
2. The UI never tells the user which files were skipped or why

## Solution

1. In the EDF parser: parse available complete records from truncated files instead of throwing
2. Surface file warnings to the UI (the worker already posts `WorkerWarning` messages -- the UI just ignores them)
3. Downgrade Sentry level

## Implementation Steps

### Step 1: Parse available records from truncated EDF files

**File:** `lib/parsers/edf-parser.ts` (protected module, lines 125-132)

Replace the truncation throw with partial parsing:
- Calculate bytes per record from header (`numSignals * samplesPerRecord * 2`)
- Calculate how many **complete** records fit in the actual buffer
- If at least 1 complete record exists: parse those, set `truncated: true` on the result
- If zero complete records: throw as before (genuinely unusable)
- Add `truncated` and `recordsParsed`/`recordsExpected` to the return type

**Note:** This touches a protected module. The change only affects the buffer length check (error handling), not how records are parsed. Complete records from a truncated file contain identical flow data.

### Step 2: Surface file warnings in the UI

**File:** `lib/analysis-orchestrator.ts` (lines 331-336)

The orchestrator already receives `WorkerWarning` messages but only sends them to Sentry. Add:
- Accumulate warnings in an array on the orchestrator result
- Pass warnings through to the analysis page component

**File:** `app/analyze/page.tsx` (or relevant results component)

After analysis completes, if warnings exist:
- Show a yellow info banner: "X file(s) had incomplete data and were partially analyzed. For complete results, re-copy the SD card."
- Collapsible list of affected filenames + reason
- Do not block results

### Step 3: Downgrade Sentry level

**File:** `lib/analysis-orchestrator.ts`

Change `WorkerWarning` Sentry capture from implicit `error` to `info` level. Add `truncated_edf` tag. Truncated files are user-side data issues (incomplete SD card copy), not bugs.

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
