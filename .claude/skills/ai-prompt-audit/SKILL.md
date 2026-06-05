---
name: ai-prompt-audit
description: >
  Use this skill when reviewing or auditing the AI insights system prompt for
  hallucination risk, prompt quality, output reliability, and cost. MDR language
  is delegated to the mdr-compliance-check skill + mdr-string-check CI.
  Don't use for general MDR audits (use mdr-compliance-check) or code review
  (use code-review).
---

# AI Prompt Audit

Review the AI insights system prompt and pipeline for quality, hallucination risk, reliability, and cost.

## What to Audit

### 1. System Prompt (app/api/ai-insights/)
- Does it describe data only? (MUST -- no action suggestions)
- Does it include medical disclaimer instruction?
- Does it reference the specific metrics being sent?
- Are there guardrails against hallucination? (e.g., "only reference metrics provided")
- Does it instruct the model to say "I don't know" when uncertain?

### 2. MDR Language (delegated)
MDR language risk in AI output is owned by the `mdr-compliance-check` skill, the `mdr-string-check` CI gate, and `.claude/rules/mdr-compliance.md`. Do not duplicate those checks here. If a prompt change touches MDR-relevant wording, run that gate. Keep one prompt-level invariant: the system prompt MUST NOT instruct the model to suggest actions.

### 3. Data Sent to API
- Only aggregated metrics sent, never raw waveforms
- No personally identifiable information in the payload
- User has explicitly consented to Tier 2 (server-enhanced) analysis

### 4. Output Quality
- Are responses consistent across similar inputs?
- Does the model stay within the scope of provided data?
- Are numerical references accurate (does it cite the actual values sent)?
- Does it make up data points not in the input?

### 5. Cost Efficiency
- Is the model tier right? Community uses Claude Haiku, premium uses Claude Sonnet 4.6 (cost constraint; see app/api/ai-insights/route.ts)
- Are token counts reasonable for the input size?
- Could the prompt be shorter without losing quality?

## Audit Output

```
## AI Prompt Audit -- [Date]

### System Prompt
**Version:** [hash or last-modified date]
**Token count:** [input prompt tokens]

### MDR (delegated)
Ran `mdr-compliance-check` + `mdr-string-check`: [yes / no]
- [MDR findings belong to that skill, not here]

### Hallucination Risk
**Risk level:** Low / Medium / High
- [guardrails present/missing]
- [failure modes identified]

### Data Privacy
- Metrics only (no raw waveforms): [yes/no]
- Consent verified before send: [yes/no]

### Recommendations
- [prioritized improvements]
```
