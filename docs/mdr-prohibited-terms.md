# MDR Prohibited Terms Reference

Quick reference for terms that are blocked by the CI gate (`mdr-string-check.yml`).
Full policy: `.claude/rules/mdr-compliance.md`.

## Why this matters

Under EU MDR Rule 11, software is classified as a medical device when it
"provides information which is used to take decisions with diagnosis or
therapeutic purposes." AirwayLab is positioned as an educational/informational
tool. Using diagnostic or therapeutic language — even incidentally — risks
regulatory reclassification.

## Prohibited terms and approved replacements

| Prohibited | Approved replacement |
|---|---|
| `RERA detection` / `rera detection` | `elevated RERA-like breath sequences` |
| `detects (respiratory\|breathing) event` | `identifies elevated metrics consistent with...` |
| `suggests (diagnosis\|obstruction\|apnea\|condition\|disorder)` | `breath-shape scores are elevated` / `both obstructive and central events are elevated` |
| `effective treatment` | `metrics are in the typical range` |
| `improves outcomes` | `patterns observed in your data` |
| `diagnose` / `diagnoses` / `diagnosis` / `diagnostic` | `describes` / `shows` / `analysis` |
| `diagnostic tool` | `analysis tool` / `informational tool` |
| `indicates (apnea\|obstruction\|a problem)` | `metrics consistent with...` / `elevated metrics` |
| `may need adjustment` | `patterns observed in your data` (defer changes to a clinician) |

## Language rules

- **Describe, never diagnose.** Say what the data shows, not what it means clinically.
- **Describe, never prescribe.** Say what the machine recorded, not what the user should do.
- **Directional, not judgmental.** Use "lower/typical/higher" rather than "good/bad/effective."
- **Clinician defers.** Any reference to clinical interpretation must end with
  "your clinician can help interpret these findings in context" — never
  "discuss adjustments with your clinician."

## CI gate scope

The check runs on PRs that touch:

- `app/blog/posts/**/*.tsx`
- `lib/blog-posts.ts`
- `lib/insights.ts`
- `lib/email/templates.ts`
- `lib/email/broadcast.ts`
- `app/api/ai-insights/**` (LLM system prompts)
- `__tests__/insights.test.ts`

Only newly added or changed lines are scanned (git diff additions).
