---
name: test-coverage-audit
description: >
  Use this skill when auditing test coverage, identifying untested code paths,
  or planning test writing priorities. Use periodically or after significant
  code changes.
  Don't use for implementing individual bug fix tests (use bug-triage) or
  build verification (run checks directly).
---

# Test Coverage Audit

Identify gaps in test coverage and prioritize test writing.

## Audit Process

### 1. Scan for Untested Code
- Cross-reference source files against __tests__/*.test.ts
- Identify modules with no corresponding test file
- Check test files for coverage of edge cases

### 2. Priority Classification

| Priority | What to test | Why |
|----------|-------------|-----|
| Critical | Analysis engines output (Glasgow, WAT, NED, Oximetry) | Wrong results = clinical harm |
| Critical | API route validation (auth, input sanitization) | Security boundary |
| High | Export functions (CSV, JSON, PDF, forum) | User-facing data integrity |
| High | Persistence (save/load with schema migration) | Data loss risk |
| Medium | UI component rendering (dashboard tabs) | User experience |
| Medium | Insight generation (thresholds, traffic lights) | Misleading health info |
| Low | Utility functions (cn, date formatting) | Low blast radius |

### 3. Test Quality Check
Review existing tests for:
- Do they test behavior or implementation details?
- Do they cover edge cases (null oximetry, multi-session nights, empty data)?
- Do they use synthetic data helpers correctly?
- Are assertions specific enough to catch regressions?

### 4. E2E Coverage
Map critical user flows that need Playwright tests:
- Upload -> parse -> analyze -> dashboard (full pipeline)
- Login -> premium feature access
- Export (CSV, PDF, forum format)
- Settings persistence

## Testing Conventions

- Vitest 4.0, jsdom, @testing-library/jest-dom
- __tests__/*.test.ts(x) -- flat directory
- Synthetic data via helpers (makeSineWave, etc.)
- @/ path alias for imports

## Output Format

```
## Test Coverage Audit

**Overall coverage:** [assessment]

### Critical Gaps
- [module] -- [what's untested] -- [risk]

### Recommended Test Plan
1. [highest priority test to write]
2. [next priority]
...

### Existing Test Quality
- [issues found in current tests]
```
