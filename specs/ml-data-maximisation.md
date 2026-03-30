# ML Data Maximisation Pipeline

**Date:** 2026-03-30
**Status:** Draft
**Slug:** ml-data-maximisation

## Related Specs

- [o2ring-csv-support.md](o2ring-csv-support.md) — Companion spec. Wellue O2Ring parser increases oximetry data volume. Ship independently but prioritise together.
- [metrics-comprehension-framing.md](metrics-comprehension-framing.md) — UX framing for metrics. The symptom rating prompt in this spec should align with the comprehension improvements.

## User Story

As the AirwayLab platform, I want to capture the maximum amount of analysis data from every user session so that I can build ML models for personalised therapy insights, community benchmarking, and future medical device development.

As a user, I want my analysis data to automatically contribute to improving the platform for everyone, with clear consent at signup and zero friction afterward.

## Architecture Shift: Anonymous → Authenticated Contribution

**Current model:** Anonymous opt-in contribution with IP-based dedup. ~30% of users contribute.

**New model:** Contribution consent at signup. All authenticated users auto-contribute every analysis. User-based dedup. Non-authenticated users can still use the tool (Tier 1 browser-only) but don't contribute data.

**IMPORTANT: Data is pseudonymised, NOT anonymous.** Since contributions now carry `user_id`, internal storage is pseudonymised (reversible with the DB key). Only external ML exports are anonymous (via `SHA256(user_id + salt)` hashing). All user-facing copy MUST say "pseudonymised" not "pseudonymised." Privacy policy must reflect this distinction.

### Why This Works

- Cloud sync already requires auth + consent -- contribution is a natural extension
- User-based dedup eliminates IP collision/VPN issues
- Longitudinal user data becomes possible (same user, many nights)
- Per-breath + waveform + oximetry trace data can be linked across the same user
- GDPR-compliant: informed consent at signup, right to deletion via account deletion (cascade deletes user_id references)

## Implementation Phases

This spec is organised into 5 phases. Each phase is independently deployable and produces a PR. Phases 1-2 are the foundation; phases 3-5 build on them.

---

## Phase 1: Auth-Required Contribution Foundation

### 1.1 Signup Flow — Contribution Consent

Add a contribution consent checkbox to the signup/onboarding flow:

**Consent text:**
> "Help improve sleep analysis for everyone. Your pseudonymised analysis data (breathing scores, therapy settings, sleep quality) will be used to build better models. No raw waveforms or personal data are shared without additional consent. You can withdraw anytime via Account Settings."

- Checkbox is **pre-checked** (opt-out model -- maximises capture rate)
- Unchecking = account still works, just no auto-contribution
- Consent state stored in `profiles.contribution_consent` (new BOOLEAN column, default TRUE)
- **Existing users: NO nudge/banner.** Backfill `contribution_consent = TRUE` for all existing profiles in the migration. They already consented to an account -- contribution was always implied, just poorly integrated. Start auto-contributing immediately.

### 1.2 Migration: Add `user_id` to Contribution Tables

```sql
-- Add user_id to existing tables (nullable for legacy anonymous data)
ALTER TABLE data_contributions ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE symptom_contributions ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE waveform_contributions ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE oximetry_trace_contributions ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add contribution_consent to profiles (default TRUE, backfill all existing users)
ALTER TABLE profiles ADD COLUMN contribution_consent BOOLEAN DEFAULT TRUE;
UPDATE profiles SET contribution_consent = TRUE WHERE contribution_consent IS NULL;

-- Add engine_version to symptom_contributions (missing, needed for ML versioning)
ALTER TABLE symptom_contributions ADD COLUMN engine_version TEXT;

-- Index for user-based queries
CREATE INDEX idx_data_contributions_user ON data_contributions(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_symptom_contributions_user ON symptom_contributions(user_id) WHERE user_id IS NOT NULL;
```

### 1.3 Auto-Contribution on Analysis Completion

When analysis completes for an authenticated user with `contribution_consent = true`:

1. **Metrics contribution** → `data_contributions` (existing endpoint, now with `user_id`)
2. **Waveform contribution** → `waveform_contributions` (existing background pipeline)
3. **Analysis storage** → `analysis_data` + `user_nights` (existing endpoints)
4. **Per-breath contribution** → new endpoint (Phase 2)
5. **Oximetry trace contribution** → wire up existing client code to new endpoint (Phase 2)

**Dedup strategy change:** Replace IP-based `dedup_hash` on `symptom_contributions` with `UNIQUE(user_id, night_date, engine_version)`. Keep hash column for legacy anonymous rows.

### 1.4 Remove Anonymous Contribution Paths

- Keep existing anonymous `data_contributions` rows (historical data)
- New contributions require auth: return 401 from contribution endpoints if not authenticated
- Remove the `contributionId` UUID generation (user_id is the identifier now)
- Keep rate limiting as safety net but relax limits for authenticated users (100/hour vs 30/hour)

---

## Phase 2: Fill Pipeline Gaps

### 2.1 Oximetry Trace Contribution Endpoint

The client code (`lib/contribute-oximetry-trace.ts`) already exists. The API route directory exists but is empty. Wire it up:

**Create `app/api/contribute-oximetry-trace/route.ts`:**
- Accept gzip-compressed binary SpO2/HR timeseries
- Validate auth + contribution consent
- Store binary in `research-oximetry` bucket
- Insert metadata into `oximetry_trace_contributions` (with `user_id`)
- Rate limit: 20 requests/hour per user
- Max payload: 5MB compressed

**Trigger:** Auto-fires in background after analysis when oximetry data is present.

### 2.2 Per-Breath Temporal Data Contribution

New endpoint to capture breath-level NED/FI/timing data that currently lives only in IndexedDB.

**Create `app/api/contribute-breath-data/route.ts`:**
- Accept JSON payload: `{ nightDate, engineVersion, breathCount, sampleRate, breaths: BreathSummary[] }`
- Where `BreathSummary` = `{ ned, fi, mShape, tPeakTi, qPeak, duration, inspStartSec, expEndSec }`
- Compress and store as binary in `research-breath-data` bucket (new)
- Insert metadata row into new `breath_data_contributions` table
- Max 50,000 breaths per night (~2MB compressed)

**New migration:**
```sql
CREATE TABLE breath_data_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  night_date DATE NOT NULL,
  engine_version TEXT NOT NULL,
  breath_count INTEGER NOT NULL,
  sample_rate REAL,
  compressed_size_bytes INTEGER,
  storage_path TEXT NOT NULL,
  device_model TEXT,
  pap_mode TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, night_date, engine_version)
);

ALTER TABLE breath_data_contributions ENABLE ROW LEVEL SECURITY;
-- Service-role only (same pattern as other contribution tables)
```

**New storage bucket:** `research-breath-data` (private, service-role access)

**Trigger:** Auto-fires after analysis when per-breath data is available in IndexedDB. Reads from `breath-data` IDB store, compresses, uploads.

### 2.3 Populate `per_breath_storage_path` in `analysis_data`

The column exists but is unused. When per-breath data is contributed (2.2), also store the storage path reference in the user's `analysis_data` row. This links the user's analysis record to their contributed breath data.

### 2.4 Night Context in ML Export

Expand `export_ml_training_data()` RPC to include night context from `data_contributions.nights` JSONB:

```sql
CREATE OR REPLACE FUNCTION export_ml_training_data_v2()
RETURNS TABLE (
  -- existing columns
  symptom_rating SMALLINT, glasgow_overall NUMERIC, fl_score NUMERIC, ...
  -- new context columns
  caffeine TEXT, alcohol TEXT, congestion TEXT, position TEXT,
  stress TEXT, exercise TEXT,
  -- new linkage
  user_id UUID, night_date DATE, engine_version TEXT
) ...
```

This joins `symptom_contributions` with `data_contributions` on `(user_id, night_date)` to enrich the export with context fields.

---

## Phase 3: Auto-Sync Analysis Results for Authenticated Users

### 3.1 Auto-Store on Analysis Completion

When analysis completes for an authenticated user:

1. Upsert each night's aggregate metrics into `analysis_data` (existing table)
2. Upsert full NightResult into `user_nights` (existing table, stripped of per-breath arrays)
3. Fire background contribution jobs (metrics, waveforms, oximetry traces, breath data)

**This is largely wiring** — the endpoints exist, the tables exist, the client code exists. The gap is that `storeAnalysisData()` is called inconsistently. Make it automatic:

- In `app/analyze/page.tsx`, after analysis completes: if authenticated + consent, call `storeAnalysisData()` automatically
- Remove the separate "store" button / manual trigger
- Show a subtle "Synced" indicator (not a modal or banner)

### 3.2 Backfill from Cloud-Synced Raw Files (MANDATORY -- do not defer)

Authenticated users with cloud sync enabled have raw EDF files in `user-files` bucket. Create a background job that:

1. Lists user files that don't have corresponding `analysis_data` rows
2. Downloads the EDF files
3. Runs analysis server-side (reuse the same engine code via a Vercel serverless function or Edge Function)
4. Stores results in `analysis_data` + contribution tables

**Note:** This is the most complex phase. Server-side analysis requires porting the Web Worker logic to a Node.js-compatible environment. The EDF parser and analysis engines are pure TypeScript with no browser dependencies (Float32Array is available in Node), but the worker orchestration needs adaptation.

**Implementation approach:**
- Create a Supabase Edge Function (`analyze-backfill`) that:
  - Accepts a user_id + list of file paths
  - Downloads EDF files from Storage
  - Runs the analysis pipeline (edf-parser → night-grouper → engines)
  - Stores results
- Trigger via cron (daily, process 10 users per run) or on-demand via admin endpoint
- Rate limit: 10 users/day to stay within Supabase Edge Function limits

### 3.3 Re-Analysis on Engine Update

When the analysis engine version changes, existing cloud-synced data can be re-analysed:
- Track `engine_version` in `analysis_data` rows
- Cron compares current engine version against stored version
- Re-analyse stale rows (oldest first, capped at N per day)
- This keeps the ML dataset consistent across engine versions

---

## Phase 4: Enhanced ML Export + Feature Extraction

### 4.1 Unified ML Export View

Create a materialised view (or RPC) that joins all contribution tables into a single ML-ready dataset:

```sql
CREATE OR REPLACE FUNCTION export_unified_ml_dataset()
RETURNS TABLE (
  -- Identity (pseudonymised in export, but enables longitudinal grouping)
  user_hash TEXT,  -- SHA256(user_id + salt) for pseudonymisation
  night_date DATE,
  engine_version TEXT,

  -- Engine metrics (from data_contributions or analysis_data)
  glasgow_overall REAL, glasgow_skew REAL, glasgow_spike REAL, glasgow_flat_top REAL,
  glasgow_top_heavy REAL, glasgow_multi_peak REAL, glasgow_no_pause REAL,
  glasgow_inspir_rate REAL, glasgow_multi_breath REAL, glasgow_variable_amp REAL,
  fl_score REAL, regularity REAL, periodicity REAL,
  ned_mean REAL, ned_median REAL, ned_p95 REAL, ned_clear_fl_pct REAL,
  fi_mean REAL, tpeak_mean REAL, m_shape_pct REAL,
  rera_index REAL, rera_count INTEGER, eai REAL,
  h1_ned_mean REAL, h2_ned_mean REAL, combined_fl_pct REAL,
  hypopnea_index REAL, brief_obstruction_index REAL,
  amplitude_cv REAL, unstable_epoch_pct REAL,

  -- Oximetry (nullable)
  odi3 REAL, odi4 REAL, t_below_90 REAL, t_below_94 REAL,
  spo2_mean REAL, spo2_min REAL, hr_mean REAL, hr_sd REAL,
  coupled_3_10 REAL,

  -- Machine summary (nullable)
  machine_ahi REAL, leak_95 REAL, resp_rate_50 REAL, tidal_vol_50 REAL,

  -- Settings
  device_model TEXT, pap_mode TEXT, epap REAL, ipap REAL, pressure_support REAL,

  -- Context (nullable)
  caffeine TEXT, alcohol TEXT, congestion TEXT, position TEXT,
  stress TEXT, exercise TEXT, symptom_rating SMALLINT,

  -- Data availability flags
  has_oximetry BOOLEAN, has_waveform BOOLEAN, has_breath_data BOOLEAN,
  has_oximetry_trace BOOLEAN, has_context BOOLEAN,

  -- Duration
  duration_hours REAL, session_count INTEGER
) ...
```

### 4.2 Waveform Feature Extraction Cron

Create a daily cron that processes contributed waveforms to extract features:

- Read binary waveform from `research-waveforms` bucket
- Extract: epoch-level statistics, spectral features, envelope statistics
- Store as a new `waveform_features` table (one row per night, ~50 numeric columns)
- This pre-computes features so ML training doesn't need to decompress binaries

**New table:** `waveform_features` with extracted signal processing features.

**Cron schedule:** Daily 2:00 AM, process 100 unprocessed waveforms per run.

### 4.3 Dataset Stats Dashboard (Admin-Only)

Expand `ml_dataset_stats()` to return:
- Total contributions by type (metrics, symptoms, waveforms, breath data, oximetry traces)
- Feature completeness matrix (% of rows with each optional field)
- User contribution distribution (how many nights per user, median/p95)
- Weekly growth rate
- Engine version distribution

Expose via `/api/admin/ml-stats` (admin-only endpoint).

---

## Phase 5: UX — Symptom Rating + Context Prompt

### 5.1 Post-Analysis Prompt

After analysis completes, show a lightweight prompt asking for sleep quality:

**Design:**
- Appears inline below the analysis results (not a modal — no friction)
- 5-star rating: "How did you feel this morning?" with emoji labels (1=Terrible, 5=Great)
- Expandable "Add context" section with **structured enums only** (no free text -- enables grouping and variable isolation in ML):
  - Caffeine: none / before noon / afternoon / evening
  - Alcohol: none / 1-2 drinks / 3+
  - Congestion: none / mild / severe
  - Position: back / side / stomach / mixed
  - Stress: low / moderate / high
  - Exercise: none / light / intense
- **No free-text input.** All context must be selectable options for clean ML features.
- Auto-saves on selection (no submit button)
- Shows for each night the first time it's viewed
- Persists to `night_notes` in localStorage + auto-contributes to server

### 5.2 Night Notes Auto-Contribution

When night notes are saved (rating or context), automatically:
1. Update `symptom_contributions` with the rating + context
2. Update `data_contributions` night JSONB with the context
3. No separate user action needed

### 5.3 Contribution Status Indicator

Replace the current contribution banner with a subtle status indicator:
- Small icon in the night selector or header: "Data synced" / "Syncing..." / "Sync failed (retry)"
- No dismissible banners, no calls to action
- Contribution is the default, not something to be promoted

---

## Post-Deploy: One-Time Backfill

After all 5 phases are deployed, run a one-time backfill:

1. **Re-contribute existing analysis data:** All `user_nights` / `analysis_data` rows get re-contributed into `data_contributions` and `symptom_contributions` with `user_id` set.
2. **Process cloud-synced files:** All `user_files` entries that lack corresponding `analysis_data` rows get processed via the server-side Edge Function (Phase 3.2).
3. **Client-side breath data backfill:** On next user login, if `breath-data` IDB store has entries without server-side contribution, auto-contribute them. Triggered transparently on analysis page load.

**Upload policy:** Always upload. No WiFi-only gating. Users are at a desktop with an SD card reader -- they are on broadband. No bandwidth-gating logic anywhere in the pipeline.

---

## Acceptance Criteria

### Phase 1
- [ ] Signup flow includes pre-checked contribution consent checkbox
- [ ] `profiles.contribution_consent` column exists and defaults to TRUE
- [ ] Existing users have `contribution_consent = TRUE` backfilled (no nudge/banner)
- [ ] `user_id` column added to all 4 contribution tables
- [ ] Contribution endpoints return 401 for unauthenticated requests
- [ ] Dedup uses `(user_id, night_date)` instead of IP hash for new rows

### Phase 2
- [ ] `/api/contribute-oximetry-trace` endpoint is functional and stores binary + metadata
- [ ] `/api/contribute-breath-data` endpoint stores per-breath temporal data
- [ ] `research-breath-data` storage bucket created
- [ ] `breath_data_contributions` table created with RLS
- [ ] `per_breath_storage_path` populated in `analysis_data` when breath data contributed
- [ ] `export_ml_training_data_v2()` includes night context fields

### Phase 3
- [ ] Analysis results auto-stored to `analysis_data` on completion (authenticated + consented)
- [ ] Full NightResult auto-stored to `user_nights` on completion
- [ ] Background contribution jobs fire automatically (metrics, waveforms, oximetry, breath data)
- [ ] Backfill Edge Function processes cloud-synced files for users without analysis_data rows
- [ ] Re-analysis triggers when engine version changes (capped daily throughput)

### Phase 4
- [ ] `export_unified_ml_dataset()` RPC returns joined dataset with all features
- [ ] Waveform feature extraction cron runs daily, processes 100 waveforms/run
- [ ] `waveform_features` table populated with extracted signal features
- [ ] `ml_dataset_stats()` returns comprehensive dataset health metrics

### Phase 5
- [ ] Post-analysis prompt shows inline after each analysis
- [ ] 5-point rating + expandable context fields auto-save on selection
- [ ] Night notes auto-contribute to server (no manual action)
- [ ] Subtle "Data synced" indicator replaces contribution banner

## Edge Cases

- **User revokes consent after contributing:** Analysis continues to work. Contribution stops. Existing contributed data is NOT deleted (pseudonymised, no PII). Account deletion triggers cascade delete of user_id references.
- **Analysis fails mid-contribution:** Each contribution job is independent. Partial contribution is fine — whatever succeeds, persists. Failures logged to Sentry.
- **User has 500+ nights:** Chunking already exists (1000 nights/request). Auto-contribution processes only new nights (dedup on user_id + night_date).
- **Offline / network failure:** Contributions queued in-memory and retried on next page load. Falls back to localStorage tracking of un-contributed dates.
- **Engine version mismatch:** Existing contributed data is NOT deleted. New analysis creates new rows with new engine_version. ML export can filter by version.
- **Mobile viewport:** Symptom rating prompt is compact — single row of 5 stars. Context fields stack vertically.
- **Demo mode:** No contribution (no auth). Rating prompt hidden.
- **Multiple sessions per night:** Contribution uses the combined night result (duration-weighted), not per-session.

## Scope Boundary

This spec does NOT include:
- Wellue O2Ring parser support (separate spec: `o2ring-csv-support.md`)
- Admin dashboard UI for ML dataset management (admin uses RPCs directly)
- ML model training infrastructure (this spec captures data; training is a separate initiative)
- GDPR data export (DSAR) endpoint (existing account deletion covers right to erasure)
- Federated learning or differential privacy (future consideration)
- Real-time contribution streaming (batch is sufficient at current scale)

## Architecture

### Options Considered

| Option | Approach | Pro | Con |
|--------|----------|-----|-----|
| A. Keep anonymous + expand | Add endpoints but keep opt-in anonymous model | No auth requirement, lower friction | IP dedup broken, no longitudinal data, low capture rate |
| B. Auth-required + auto-contribute | Require auth for contribution, auto-contribute on consent | Maximum capture rate, clean dedup, longitudinal data | Requires auth, migration for existing users |
| C. Server-side analysis only | Process all data server-side from uploaded EDF files | Single source of truth, version-consistent | High compute cost, complex server-side pipeline |

**Recommended:** B with elements of C (backfill) — Auth-required auto-contribution captures data at the point of analysis (fast, no compute cost), with server-side backfill as a secondary pipeline for completeness.

### Key Decisions
- **Pre-checked consent:** Maximises opt-in rate. Users who care will uncheck. GDPR allows pre-checked for non-marketing consent if clearly disclosed.
- **user_id on contribution tables:** Nullable to preserve legacy anonymous data. Enables longitudinal analysis without breaking existing rows.
- **Separate per-breath endpoint:** Decoupled from waveform pipeline for independent capture. Breath data is useful even without raw waveforms.
- **Edge Function for backfill:** Avoids running analysis in Vercel serverless functions (which have shorter timeouts). Supabase Edge Functions have 150s timeout.

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `supabase/migrations/037_ml_data_maximisation.sql` | Create | Add user_id columns, contribution_consent, breath_data_contributions table, indexes |
| `app/api/contribute-oximetry-trace/route.ts` | Create | Wire up oximetry trace contribution endpoint |
| `app/api/contribute-breath-data/route.ts` | Create | New per-breath temporal data endpoint |
| `lib/contribute-breath-data.ts` | Create | Client-side breath data extraction + compression + upload |
| `app/api/contribute-data/route.ts` | Modify | Add user_id to contributions, require auth |
| `app/api/contribute-waveforms/route.ts` | Modify | Add user_id, require auth |
| `app/api/contribute-symptoms/route.ts` | Modify | Switch dedup to user_id + night_date, add engine_version |
| `app/api/store-analysis-data/route.ts` | Modify | Auto-trigger on analysis completion, store per_breath_storage_path |
| `lib/contribute.ts` | Modify | Pass user_id, remove anonymous contribution_id generation |
| `lib/contribute-waveforms.ts` | Modify | Pass user_id |
| `lib/contribute-symptoms.ts` | Modify | Switch dedup strategy, add engine_version |
| `lib/auth/auth-context.tsx` | Modify | Add contribution_consent to user profile context |
| `components/auth/auth-modal.tsx` | Modify | Add contribution consent checkbox to signup flow |
| `components/dashboard/data-contribution.tsx` | Modify | Replace banner with auto-sync indicator |
| `components/dashboard/symptom-rating-prompt.tsx` | Create | Post-analysis rating + context prompt |
| `components/upload/contribution-consent-utils.ts` | Modify | Switch from localStorage to profile-based consent |
| `app/analyze/page.tsx` | Modify | Auto-trigger contribution + analysis storage on completion |
| `supabase/functions/analyze-backfill/index.ts` | Create | Edge Function for server-side re-analysis of cloud-synced files |

## Test Cases

| # | Test | Maps to Criteria |
|---|------|-----------------|
| 1 | New signup has `contribution_consent = true` by default | Phase 1 |
| 2 | Unchecking consent at signup sets `contribution_consent = false` | Phase 1 |
| 3 | Unauthenticated POST to `/api/contribute-data` returns 401 | Phase 1 |
| 4 | Authenticated + consented user auto-contributes on analysis completion | Phase 1 |
| 5 | `data_contributions` row has `user_id` set for authenticated users | Phase 1 |
| 6 | Duplicate contribution (same user + night_date) upserts, not duplicates | Phase 1 |
| 7 | Oximetry trace endpoint stores binary + metadata correctly | Phase 2 |
| 8 | Per-breath endpoint stores compressed breath data + metadata | Phase 2 |
| 9 | `per_breath_storage_path` populated after breath data contribution | Phase 2 |
| 10 | `export_ml_training_data_v2()` returns night context fields | Phase 2 |
| 11 | Analysis completion auto-stores to `analysis_data` for authenticated user | Phase 3 |
| 12 | Backfill Edge Function processes cloud-synced files and creates analysis_data rows | Phase 3 |
| 13 | `export_unified_ml_dataset()` returns joined dataset with all feature columns | Phase 4 |
| 14 | Waveform feature extraction cron processes unprocessed waveforms | Phase 4 |
| 15 | Symptom rating prompt appears after analysis, auto-saves on selection | Phase 5 |
| 16 | Night context auto-contributes to server without user action | Phase 5 |
| 17 | Revoking consent stops future contributions but preserves existing data | Edge case |
| 18 | Legacy anonymous contributions (no user_id) still present in ML export | Edge case |

## Microcopy

| Element | Text |
|---------|------|
| Signup consent checkbox | Help improve sleep analysis for everyone |
| Signup consent detail | Your pseudonymised analysis data (breathing scores, therapy settings, sleep quality) will be used to build better models. No raw waveforms or personal data are shared without additional consent. You can withdraw anytime via Account Settings. |
| Symptom rating label | How did you feel this morning? |
| Rating 1 | Terrible |
| Rating 2 | Poor |
| Rating 3 | OK |
| Rating 4 | Good |
| Rating 5 | Great |
| Context expand label | Add context (caffeine, sleep position, stress...) |
| Sync indicator — synced | Data synced |
| Sync indicator — syncing | Syncing... |
| Sync indicator — failed | Sync failed — tap to retry |
| Consent revocation (Account Settings) | Stop contributing data |
| Consent revocation confirmation | Future analyses won't be contributed. Your existing contributions remain in the pseudonymised dataset. |

## Dependencies

None -- implemented with existing dependencies. The Supabase Edge Function uses the Deno runtime (built into Supabase) with no additional packages.

## Depth Review

### R1: What's missing?
- **Data retention policy**: Indefinite for pseudonymised contributions. Cascade delete on account deletion for user_id references.
- **Privacy policy update**: Must update privacy policy to reflect pseudonymised (not anonymous) data storage.

### R2: All user pushback points addressed.
- No WiFi gating -- always upload (SD card = desktop = broadband).
- No consent nudge -- backfill consent TRUE for all existing users.
- Backfill is mandatory -- do not defer Phase 3.2-3.3.
- Pseudonymised, not anonymous -- corrected throughout spec.
- Night context: structured enums only, no free text.

### R3: Converged.
