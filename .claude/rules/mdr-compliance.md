# MDR SaMD Compliance Rules

These rules apply to ALL code changes in user-facing features. Airwaylab is positioned as educational/informational, NOT as a medical device.

## MUST Rules (violation = regulatory risk)

1. **NEVER suggest therapy changes.** The software describes data patterns. It does NOT recommend what to do about them.
   - BAD: "Discuss pressure adjustments with your clinician"
   - GOOD: "Your clinician can help interpret these findings in context"
   - BAD: "Consider adjusting Trigger sensitivity"
   - GOOD: "Machine-triggered breath percentage is elevated"

2. **NEVER use diagnostic language.** Do not imply the software diagnoses, detects, or classifies a medical condition.
   - BAD: "suggests persistent upper airway obstruction"
   - GOOD: "breath-shape scores are elevated"
   - BAD: "may indicate complex sleep apnea"
   - GOOD: "both obstructive and central events are elevated"

3. **NEVER make predictive claims.** Do not claim the software predicts therapy response or health outcomes.
   - BAD: "patterns like yours typically respond to..."
   - GOOD: "deeper analysis of cross-engine correlations in your data"

4. **NEVER assert clinical effectiveness.** Do not judge whether therapy is "working" or "effective."
   - BAD: "Your therapy looks effective"
   - GOOD: "Your metrics are in the typical range"

5. **AI system prompts MUST NOT instruct the model to suggest actions, adjustments, or investigations.** The AI describes what the data shows. Period.

6. **NEVER expose compliance verdicts or regulatory framework names in public artifact names.** Branch names, PR titles, and commit message subjects are publicly indexed and discoverable. Names containing regulatory or audit language create self-incriminating evidence and reveal internal compliance posture. This rule applies to indexed public artifacts only; internal files, Paperclip tickets, PR description bodies, and audit documents are out of scope and may reference frameworks freely.
   - **Forbidden substrings in branch name / PR title / commit subject:** `MDR`, `GDPR`, `SaMD`, `medical device`, `diagnostic`, `effectiveness claim`, `violation`, `compliance`, `positioning audit`, `competitive`
   - BAD branch: `fix/mdr-gdpr-violation`, `audit/samd-compliance-fixes`, `fix/air-123-mdr-effectiveness-violations`
   - GOOD branch: `fix/air-123-remove-effectiveness-language`
   - BAD PR title: `Fix MDR MUST violations in insights copy`
   - GOOD PR title: `Remove effectiveness judgment from insights copy`
   - BAD commit subject: `fix(mdr): remove SaMD diagnostic claim from email template`
   - GOOD commit subject: `fix: update email template copy to directional language`
   - **Neutral-alternative guide:** `fix(mdr):` → `fix:` · `effectiveness-claim` → `pressure-description` · `mdr-violation` → `copy-update` · `compliance-fix` → `language-update`
   - **Rationale:** out-of-scope carve-out for internal files is intentional — we are open about compliance internally and want rules enforced rigorously there. Only the externally-indexed namespace (branch, commit subject, PR title) must remain neutral to avoid creating discoverable regulatory admissions.

## SHOULD Rules (best practice)

7. Every component showing clinical metrics SHOULD have a point-of-use disclaimer.
8. Email templates SHOULD include a medical disclaimer.
9. Traffic light labels SHOULD use directional language ("lower"/"typical"/"higher") rather than clinical judgment language in user-facing display.
10. Community benchmarks SHOULD note that comparisons are informational, not clinical reference ranges.

## PR Checklist

Before merging any PR that touches insights, AI prompts, thresholds, community features, email templates, or marketing copy:

- [ ] No therapeutic recommendations ("discuss adjustments", "consider changing", "may need adjustment")
- [ ] No diagnostic claims ("suggests obstruction", "indicates central apnea")
- [ ] No predictive claims ("typically respond to", "predicts")
- [ ] No clinical effectiveness judgments ("therapy looks effective")
- [ ] AI system prompts describe data only, never suggest actions
- [ ] Point-of-use disclaimers present on clinical feature components
- [ ] Email content has medical disclaimer
- [ ] Branch name, PR title, and commit subjects contain no regulatory/compliance terminology (MDR, GDPR, SaMD, "violation", "compliance")

## Background

Under EU MDR Rule 11, software is classified as a medical device when it "provides information which is used to take decisions with diagnosis or therapeutic purposes." Disclaimers do NOT override functional classification.

Run `cortis:mdr-compliance-scanner` agent for a full audit when making significant changes to clinical features.
