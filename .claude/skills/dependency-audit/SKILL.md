---
name: dependency-audit
description: >
  Use this skill when auditing project dependencies for security vulnerabilities,
  outdated packages, or unnecessary bloat. Use on a monthly cadence or when
  a security advisory is reported. Complements the dependency-review CI gate
  (which only blocks high-severity new deps on PRs) with a proactive audit.
  Don't use for feature development or bug fixes.
---

# Dependency Audit

Audit AirwayLab's npm dependencies for security, freshness, and bundle impact.

## Audit Steps

### 1. Security Check
```bash
npm audit
```
Review all findings. Critical and high severity issues require immediate action.

### 2. Outdated Packages
```bash
npm outdated
```
Identify packages with available updates. Prioritize:
- Security patches (always update)
- Minor versions of core dependencies (Next.js, React, TypeScript)
- Major versions (evaluate breaking changes first)

### 3. Bundle Size Impact
Check current bundle size:
```bash
npm run build
```
Review the build output for any package contributing >50KB to the client bundle.

### 4. Unused Dependencies
Cross-reference `package.json` dependencies against actual imports in the codebase. Flag any dependency that has zero imports.

## Key Constraints

- **NEVER install new dependencies without CTO/board discussion.** Each dependency is maintenance cost against the 2hr/week budget.
- **NEVER update a major version without testing.** Run the full check suite after any update.
- **Bundle size budget:** Flag any change increasing bundle >10KB.

## Core Dependencies to Watch

| Package | Role | Update Risk |
|---------|------|-------------|
| next | Framework | High -- test thoroughly |
| react / react-dom | UI | High -- test thoroughly |
| typescript | Type system | Medium |
| tailwindcss | Styling | Medium |
| recharts | Charts | Medium -- visual regression |
| @supabase/supabase-js | Auth + DB | Medium |
| zod | Validation | Low |
| vitest | Testing | Low |

## Output Format

```
## Dependency Audit — [Date]

### Security
- [Critical/High/Medium findings with package names]

### Outdated
| Package | Current | Latest | Priority |
|---------|---------|--------|----------|
| ... | ... | ... | update/skip/evaluate |

### Bundle Impact
- Total client bundle: [size]
- Largest contributors: [list]

### Recommendation
[Single recommended action]
```
