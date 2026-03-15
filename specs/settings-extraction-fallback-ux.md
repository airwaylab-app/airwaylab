# Spec: Settings Extraction Fallback UX

Created: 2026-03-15
Status: In Progress
Acceptance Criteria: When device settings can't be extracted, the user (and anyone viewing a shared report) sees a clear explanation instead of misleading zeros/dashes. Downstream consumers (insights, AI, exports) correctly distinguish "no data" from "valid zero."

## Problem

The settings extractor (`lib/parsers/settings-extractor.ts`) only supports ResMed AirCurve and AirSense devices. When it can't extract settings (unsupported device, missing STR.edf, partial signals), it silently falls back to `{ epap: 0, ipap: 0, papMode: 'Unknown' }`.

This causes:
1. **Shared reports show empty settings** — clinicians reviewing shared links see "Unknown" device, dashes for all pressures. Useless for therapy adjustment.
2. **Misleading insights** — `lib/insights.ts:427` compares detected EPAP vs prescribed EPAP. When prescribed = 0 (fallback), it fires a false "EPAP differs from prescribed" warning.
3. **AI gets bad context** — Claude Haiku receives `epap: 0, papMode: 'Unknown'` without knowing this means "no data" vs "actual zero."
4. **No user feedback** — the user never learns their device isn't fully supported. They see dashes and assume something is broken.

Triggered by: a user shared their report (207 nights) and the recipient couldn't see any device settings.

## Scope

**In scope:**
- Add extraction status flag to distinguish "no data" from "extracted"
- Clear UX messaging when settings unavailable
- Guard downstream consumers (insights, AI prompt, exports) against fallback zeros
- Diagnostic Sentry event when extraction fails (complements `unsupported-data-alerts` spec)

**Out of scope:**
- Adding support for non-ResMed devices (requires sample EDF files)
- Changing extraction logic for currently supported devices
- New device detection heuristics

## Scope Gate: Full spec (touches protected modules, multiple downstream consumers)

---

## Step 1 of 4: Add extraction status to MachineSettings type + worker fallback

### What
Add a `settingsSource` field to `MachineSettings` that tracks whether settings were actually extracted or are fallback defaults. Update the worker to set this field. This is the foundation that all other steps depend on.

### Acceptance Criteria
- When a user uploads data from a supported device, `settingsSource` is `'extracted'`
- When settings can't be extracted, `settingsSource` is `'unavailable'` and all numeric fields remain 0

### Files
- `lib/types.ts` — Add `settingsSource: 'extracted' | 'unavailable'` to `MachineSettings` interface
- `lib/parsers/settings-extractor.ts` — Add `settingsSource: 'extracted'` to every `dailySettings[dateStr]` assignment (line 180)
- `workers/analysis-worker.ts` — Add `settingsSource: 'unavailable'` to the fallback object (line 264-274). Add Sentry breadcrumb when extraction returns empty.
- `lib/persistence.ts` — Add migration guard: if loaded NightResult has `settings` without `settingsSource`, default to `'extracted'` (preserves existing behavior for stored data)
- `app/shared/[id]/page.ts` — Add `settingsSource` default in `rehydrateNight()` for old shared reports

### Protected Modules
- `lib/parsers/settings-extractor.ts` — Adding one field to output object per date entry. No logic change.
- `workers/analysis-worker.ts` — Adding one field to fallback object. No logic change.

### Data Migration
- **localStorage:** Existing saved results won't have `settingsSource`. Migration guard in `persistence.ts` defaults to `'extracted'` (safe assumption — if settings were already stored with real values, they were extracted).
- **Supabase shared reports:** Old shares won't have the field. `rehydrateNight()` defaults to `'extracted'`.
- **TypeScript:** Field is required on `MachineSettings`, so all consumers must handle it. Strict mode catches missing references.

### Tests Required
- [ ] NightResult with `settingsSource: 'extracted'` — settings values are used as-is
- [ ] NightResult with `settingsSource: 'unavailable'` — downstream code recognizes fallback
- [ ] Persistence round-trip: save night without `settingsSource`, load it, verify defaults to `'extracted'`
- [ ] `parseIdentification()` existing tests still pass (no regression)
- [ ] `getSettingsForDate()` existing tests still pass (no regression)

### Manual QA Checklist
- [ ] Upload a known-good ResMed SD card → Device Settings shows real values, no regression
- [ ] Check localStorage: saved result has `settingsSource: 'extracted'`
- [ ] Load previously saved results (clear cache NOT needed) → no crash, settings still display
- [ ] Console check: no new errors or warnings
- [ ] TypeScript: `npx tsc --noEmit` passes

### Risks
- Old persisted data missing the field → Mitigated by migration guard defaulting to `'extracted'`
- Old shared reports in Supabase → Mitigated by rehydration default

### Depends On
None

### Max PR Size
~80 lines

---

## Step 2 of 4: Guard downstream consumers against fallback settings

### What
Update insights generator, AI insights prompt, and exports to check `settingsSource` before using pressure values. Prevents false warnings ("EPAP differs from prescribed 0") and misleading AI context.

### Acceptance Criteria
- When settings are unavailable, no pressure-comparison insights are generated
- AI insights prompt tells Haiku that settings data is unavailable (not zero)
- CSV/PDF/forum exports show "N/A" instead of "0" for unavailable pressure fields

### Files
- `lib/insights.ts` — Guard EPAP delta insight (line ~427) with `n.settings.settingsSource === 'extracted'` check. Guard any other insights that reference `settings.epap`, `settings.ipap`, or `settings.pressureSupport`.
- `app/api/ai-insights/route.ts` — When `settingsSource === 'unavailable'`, replace settings in prompt context with `{ note: 'Device settings could not be extracted from this SD card. Do not reference pressure values.' }` instead of zero values.
- `lib/export.ts` — When `settingsSource === 'unavailable'`, export "N/A" for Mode, EPAP, IPAP, PS columns instead of "Unknown" / "0".
- `lib/forum-export.ts` — Same treatment: "Settings: not available" instead of "Unknown 0/0".
- `lib/pdf-report.ts` — Same treatment in PDF output.

### Protected Modules
None

### Data Migration
None (consumers only, read-only changes)

### Tests Required
- [ ] Insight generator: night with `settingsSource: 'unavailable'` produces no pressure-related insights
- [ ] Insight generator: night with `settingsSource: 'extracted'` still produces pressure insights (regression check)
- [ ] Export CSV: unavailable settings → "N/A" in Mode/EPAP/IPAP/PS columns
- [ ] Export CSV: extracted settings → real values (regression check)
- [ ] Forum export: unavailable settings → "Settings: not available" section

### Manual QA Checklist
- [ ] Upload data with working settings → Overview insights include pressure comparisons as before
- [ ] Check AI insights on a night with real settings → no regression in insight quality
- [ ] Export CSV from a night with settings → verify real values in device columns
- [ ] Console check: no new errors

### Risks
- Missing a consumer that still uses raw zero values → Mitigated by TypeScript strict mode + grep for `settings.epap`, `settings.ipap`
- AI prompt change could degrade insight quality for unavailable-settings nights → Acceptable: better to say nothing than give wrong info

### Depends On
Step 1 must be merged and verified first

### Max PR Size
~120 lines

---

## Step 3 of 4: Dashboard UX for unavailable settings

### What
Replace the misleading "Unknown" / dashes / zeros with a clear message explaining why settings aren't available and what the user can do about it. Applies to both the regular dashboard and shared report view.

### Acceptance Criteria
- When settings are unavailable, the Device Settings collapsible in Overview shows an explanatory message instead of dashes
- The shared report header shows "Settings not available" instead of "Unknown · Unknown"
- The message explains this is a device compatibility issue, not a bug

### Files
- `components/dashboard/overview-tab.tsx` — Wrap the Device Settings `<details>` content (lines 136-175) in a conditional: if `settingsSource === 'unavailable'`, show explanatory message instead of the settings grid. Keep the collapsible header (shows duration + session count, which IS available).
- `components/share/shared-view-client.tsx` — Update header banner (lines 99-111): when `machineInfo?.settingsSource === 'unavailable'` OR `machineInfo` is null, show "Device settings not available" instead of "Unknown · Unknown".
- `components/dashboard/device-tab.tsx` — When `selectedNight.settings.settingsSource === 'unavailable'`, show info card explaining no STR.edf settings data. Pressure/leak charts can still render if waveform data exists (they come from BRP.edf, independent of settings).

### Protected Modules
None

### Data Migration
None (display-only changes)

### Tests Required
- [ ] Overview tab renders settings grid when `settingsSource: 'extracted'` (regression)
- [ ] Overview tab renders explanatory message when `settingsSource: 'unavailable'`
- [ ] Shared view header shows device info when available, "not available" message when not

### Manual QA Checklist
- [ ] Upload known-good SD card → Device Settings collapsible shows real values (regression)
- [ ] View the problematic shared report (3b967bc9...) → header no longer shows "Unknown · Unknown", shows clear message
- [ ] Expand Device Settings on shared report → explanatory text, not dashes
- [ ] Mobile viewport: explanatory message wraps properly
- [ ] Visual check: message styling consistent with other info states in the app
- [ ] Console check: no new errors

### Risks
- Shared reports created before Step 1 won't have `settingsSource` → Mitigated by Step 1's rehydration default (`'extracted'`). For reports with actual zeros/Unknown (created with fallback), the field defaults to `'extracted'`, so they'll still show dashes. Acceptable: we can't retroactively fix old data.

### Depends On
Step 1 must be merged and verified first. Step 2 is independent (can be parallel).

### Max PR Size
~100 lines

---

## Step 4 of 4: Sentry diagnostic event on extraction failure

### What
Fire a Sentry event when settings extraction fails, capturing which signals were found in STR.edf. This gives us visibility into which devices users have, so we can prioritize adding support.

### Acceptance Criteria
- When `extractSettings()` returns an empty map AND STR.edf was present, a Sentry breadcrumb is logged with the signal labels found
- When STR.edf is missing entirely, a different Sentry breadcrumb is logged
- No PII is included (no user ID, no file paths, no dates)

### Files
- `workers/analysis-worker.ts` — After `extractSettings()` call (line ~115), check if result is empty. If so, post a message to main thread with diagnostic info (signal labels, device model). Worker can't call Sentry directly (no DOM).
- `app/analyze/page.tsx` or `hooks/use-analysis.ts` (wherever worker messages are handled) — On receiving diagnostic message, call `Sentry.captureMessage('settings_extraction_failed', { level: 'info', tags: { deviceModel }, extra: { signalLabels } })`.

### Protected Modules
- `workers/analysis-worker.ts` — Adding a diagnostic message post. No logic change to extraction or analysis.

### Data Migration
None

### Tests Required
- [ ] Worker posts diagnostic message when `extractSettings()` returns empty map
- [ ] Worker posts diagnostic message when no STR.edf found
- [ ] Worker does NOT post diagnostic message when extraction succeeds
- [ ] Diagnostic message does not include PII (no file paths with user directories, no dates)

### Manual QA Checklist
- [ ] Upload known-good SD card → no Sentry event (check Sentry dashboard)
- [ ] If possible: upload data that triggers extraction failure → verify Sentry event with signal labels
- [ ] Console check: diagnostic info logged at info level, not error
- [ ] No impact on analysis speed (message posting is async, non-blocking)

### Risks
- Sentry volume: if many users have unsupported devices, could generate noise → Mitigated by using `info` level (won't trigger alerts by default). Can add sampling later.
- Worker message schema change → Low risk, additive only.

### Depends On
Step 1 must be merged first (uses `settingsSource` field)

### Max PR Size
~60 lines

---

## Microcopy

**Overview tab (unavailable settings):**
> Your device settings couldn't be read from the SD card. This usually means the device type isn't supported yet, or the settings file (STR.edf) wasn't included in the upload. Analysis of your breathing data is unaffected.

**Shared view header (unavailable settings):**
> Device settings not available

**Shared view (expanded, unavailable):**
> Device settings couldn't be extracted from this SD card. The breathing analysis above is complete — only the prescribed pressure and comfort settings are missing. If you know your settings, compare them manually with the metrics above.

**Forum/CSV export (unavailable):**
> Settings: Not available (device type not supported or STR.edf missing)

---

## Dependency Graph

```
Step 1 (type + worker) ──→ Step 2 (guard consumers)
         │
         ├──→ Step 3 (dashboard UX)  [parallel with Step 2]
         │
         └──→ Step 4 (Sentry diagnostic)
```

Steps 2 and 3 can be built in parallel after Step 1 is merged.
Step 4 depends on Step 1 only.
