# O2Ring CSV Support

**Issue:** #296
**Tier:** Full spec (new parser in protected module)
**Priority:** P2

## Problem

Users with Wellue O2Ring S pulse oximeters submit feedback requesting support. The O2Ring CSV format differs from the existing Checkme O2 Max format. Two feedback submissions (Mar 20-21) with 24 files each were rejected as unsupported.

## O2Ring CSV Format

```
Time,SpO2(%),Pulse Rate(bpm),Motion,SpO2 Reminder,PR Reminder,
"08:48:26PM Nov 27, 2025",96,72,0,0,0,
```

Key differences from Checkme O2 Max:
- **Quoted datetime** with AM/PM: `"HH:MM:SSAM Mon DD, YYYY"` (note comma inside date)
- **4-second intervals** (vs Checkme 2s)
- **Motion column** present (same as Checkme)
- **Trailing comma** on each line
- Column headers include units in parentheses: `SpO2(%)`, `Pulse Rate(bpm)`

## Solution

Extend `lib/parsers/oximetry-csv-parser.ts` to auto-detect and parse both Checkme O2 Max and O2Ring formats. The existing `ParsedOximetry` interface and `OximetrySample` type remain unchanged -- both formats produce the same output structure.

## Implementation Steps

### Step 1: Add O2Ring format detection

**File:** `lib/parsers/oximetry-csv-parser.ts`

Add a `detectOximetryFormat()` function that examines the header line:
- Checkme: `Time, Oxygen Level, Pulse Rate, Motion, O2 Reminder, PR Reminder`
- O2Ring: `Time,SpO2(%),Pulse Rate(bpm),Motion,SpO2 Reminder,PR Reminder,`

Detection heuristic: if header contains `SpO2(%)` -> O2Ring format.

### Step 2: Add O2Ring time parser

**File:** `lib/parsers/oximetry-csv-parser.ts`

Parse the O2Ring datetime format: `"08:48:26PM Nov 27, 2025"`
- Strip surrounding quotes
- Parse AM/PM time + month name + day + year
- Handle the comma between day and year (inside the quoted string)

### Step 3: Add O2Ring CSV line parser

**File:** `lib/parsers/oximetry-csv-parser.ts`

O2Ring lines have quoted date fields containing commas. Use a quote-aware CSV split instead of simple `split(',')`:
- First field is quoted (the datetime) -- extract it whole
- Remaining fields are unquoted numbers
- Handle trailing comma

### Step 4: Refactor parseOximetryCSV to dispatch by format

**File:** `lib/parsers/oximetry-csv-parser.ts`

Modify `parseOximetryCSV()` to:
1. Detect format from header
2. Dispatch to format-specific line parser
3. Both paths produce the same `OximetrySample[]`
4. `detectInterval()` already handles variable intervals (tested with first 10 samples)

### Step 5: Update upload validation

**File:** `components/upload/` (upload validation)

Ensure the upload flow accepts O2Ring CSV files. The existing oximetry file detection should work if it checks for CSV extension + oximetry-like headers.

### Step 6: Tests

**File:** `__tests__/oximetry-csv-parser.test.ts`

Add test cases for:
- O2Ring format detection
- O2Ring time parsing (AM/PM, midnight edge cases)
- O2Ring CSV parsing with quoted fields
- Mixed format handling (only one format per file)
- Interval detection returning ~4s for O2Ring data
- Existing Checkme tests unchanged (regression)

## Scope boundaries

- Parser only. The 17-metric oximetry engine runs unchanged on the parsed samples.
- No UI changes needed (oximetry tab already handles variable intervals via `intervalSeconds`).
- No new dependencies.
- This touches a **protected module** (`lib/parsers/`). The parser logic change must be isolated in its own PR.

## Manual QA checklist

- [ ] Upload a Checkme O2 Max CSV -- results unchanged
- [ ] Upload an O2Ring CSV -- parsed correctly, all 17 metrics computed
- [ ] Upload multiple O2Ring nights -- night grouping works
- [ ] Oximetry tab renders O2Ring data correctly
- [ ] Cross-device matching works with O2Ring + ResMed EDF data
