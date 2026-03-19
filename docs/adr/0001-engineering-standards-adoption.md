# ADR-0001: Adopt Engineering Standards Framework

## Status
Accepted

## Context
As the project grows, we need consistent standards for code quality, testing, error handling, and dependency management.

## Decision
Adopt Phase 1 engineering standards: TypeScript strict mode with noUncheckedIndexedAccess, unified npm run check, Knip for dead code, conventional commits, Renovate for dependency updates.

## Consequences
- (+) Mechanical enforcement of code quality
- (+) Automated dependency updates with supply chain protection
- (-) Minor friction from commitlint on every commit
- (-) Renovate creates weekly PR noise (mitigated by auto-merge on patches)
