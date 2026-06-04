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

## Approved-context exemptions (allowlist)

The gate scans each added line against the prohibited list, then **exonerates**
that line if it also matches the approved-context allowlist **and** does not
contain a hard-prohibited claim. This stops the gate false-flagging legitimate
disclaimer and standard-descriptor language while still catching real claims.

A flagged line is exonerated only when **both** hold:

1. It matches an approved context (negation/disclaimer or standard descriptor), and
2. It does **not** match a never-exempt claim.

**Approved contexts (any one exonerates):**

| Category | Patterns (case-insensitive) | Example that now passes |
|---|---|---|
| Negation / disclaimer | `not a ` / `not an ` / `is not ` / `does not (provide\|constitute\|offer)` / `no diagnos` / `without ...diagnos` / `informational purposes` / `not a (medical\|substitute\|replacement)` | "data-quality signal, **not a** diagnosis"; "**does not provide** medical advice, diagnosis, or treatment"; "**is not** a diagnostic test" |
| Standard clinical descriptor | `diagnostic (ahi\|test\|study\|sleep study)` | "your **diagnostic AHI** from the lab"; "rather than a standalone **diagnostic test**" |
| Disclaimer collocation | `diagnosis,? (and\|or) treatment` / `diagnosis and treatment plan` | "...substitute for clinical advice, **diagnosis, or treatment**"; "in the context of your **diagnosis and treatment plan**" |

**Never exempt (always a violation, even inside an approved context):**

These prohibited claims have no legitimate disclaimer/descriptor form, so the
allowlist can never rescue them: `rera detection`, `detects respiratory/breathing
event`, `suggests (diagnosis/obstruction/apnea/condition/disorder)`, `effective
treatment`, `improves outcomes`, **`diagnostic tool`**, `indicates
(apnea/obstruction/a problem)`, `may need adjustment`.

Concretely: **"AirwayLab is a diagnostic tool, not a substitute for a doctor"
still fails** — claiming AirwayLab IS a diagnostic tool is a real MDR Rule 11
violation, and the trailing negation does not exempt it. The exemption only
removes the bare descriptive word `diagnose`/`diagnosis`/`diagnostic` when it
appears in disclaimer or standard-descriptor language.

Exonerated lines emit a CI `::notice` (visible in the run log) rather than an
`::error`, so the exemption stays auditable.

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
