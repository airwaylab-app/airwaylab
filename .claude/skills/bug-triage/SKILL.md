---
name: bug-triage
description: >
  Use this skill when triaging, investigating, or fixing a reported bug.
  Covers reproduction, root cause analysis, fix implementation, and regression testing.
  Use when assigned a bug report or when investigating unexpected behavior.
  Don't use for new features (use backend-feature or frontend-feature) or reviews (use code-review).
---

# Bug Triage

Investigate and fix bugs in AirwayLab following the triage protocol.

## Triage Steps

### 1. Reproduce
- Understand the reported behavior vs expected behavior
- Identify which component/module is affected
- Check if it's a known issue (search existing issues/comments)

### 2. Root Cause Analysis
- Read the relevant code before proposing changes
- Check if the bug is in a protected module (lib/analyzers/, lib/parsers/, workers/)
  - If yes: document the bug and escalate to CTO/board. Do NOT fix.
- Trace the data flow to find where behavior diverges
- Check for common gotchas:
  - Float32Array serialisation issues
  - Null oximetry data not handled
  - Hardcoded sampling rates
  - EDF date parsing (2-digit years)
  - Duration-weighted averaging edge cases
  - localStorage 4MB cap exceeded

### 3. Write a Test First
- Write a test that catches the bug before fixing it
- Test goes in `__tests__/<module-name>.test.ts`
- The test should fail before the fix and pass after

### 4. Fix
- Minimal change. Fix the bug, don't refactor surrounding code.
- One concern per PR, max 400 lines
- Follow all coding conventions (TypeScript strict, Tailwind, etc.)

### 5. Verify
```bash
npx tsc --noEmit && npm run lint && npm test && npm run build
```

### 6. Report
Comment on the issue with:
- Root cause (one sentence)
- Fix description (what changed and why)
- Test added (name and what it covers)
- Regression risk (low/medium/high with reasoning)

## Severity Classification

| Severity | Definition | Action |
|----------|-----------|--------|
| Critical | Core analysis produces incorrect results | Escalate immediately. Revert if merged. |
| High | Feature broken, no workaround | Fix in current heartbeat |
| Medium | Feature degraded, workaround exists | Schedule for next heartbeat |
| Low | Cosmetic, minor UX issue | Create task, prioritize normally |

## Fix-on-Fix Rule

If a fix introduces a new bug, STOP. This is a red flag. Escalate to CTO. Do not stack fixes.
