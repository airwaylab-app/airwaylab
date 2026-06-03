## What

[1-2 sentences: what this PR does]

## Why

[1-2 sentences: why this change is needed]

## Ticket

Closes AIR-____

## Testing

- [ ] `npm run check` passes
- [ ] Manual testing done (if applicable)
- [ ] New tests added for new behavior

## Protected paths

- [ ] This PR does **not** change logic in `lib/parsers/`, `lib/analyzers/`, or `workers/` — **or** the `clinical-signoff` label is applied (rationale in Risk & rollback).

## Risk & rollback

- **Risk:** low / medium / high
- **Rollback:** [how to revert if this misbehaves in production]
- **Data / PHI impact:** none / [describe]

## MDR Self-Check

> Skip with "N/A — code-only" if this PR contains zero user-facing strings (pure logic, types, tests, infra).
> Full ruleset: [`.claude/rules/mdr-compliance.md`](.claude/rules/mdr-compliance.md)

- [ ] **MDR self-check run / N/A — code-only change**
- [ ] No therapeutic recommendations (e.g. "discuss adjustments", "consider changing pressure")
- [ ] No diagnostic claims (e.g. "suggests obstruction", "indicates central apnea")
- [ ] No predictive claims (e.g. "typically respond to", "predicts outcomes")
- [ ] No clinical effectiveness judgments (e.g. "therapy looks effective")
- [ ] AI prompts describe data only — no suggested actions
- [ ] Point-of-use medical disclaimers present on any new clinical feature components
