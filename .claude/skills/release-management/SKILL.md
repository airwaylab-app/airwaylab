---
name: release-management
description: >
  Use this skill when preparing a release, updating the changelog, or managing
  the deployment pipeline. Use after a set of features have been merged and
  are ready for production.
  Don't use for individual feature PRs or bug fixes.
---

# Release Management

Manage AirwayLab releases, changelogs, and post-deploy verification.

## Release Checklist

### Pre-Release
1. All PRs for this release are merged to main
2. Full pipeline passes on main:
   ```bash
   npx tsc --noEmit && npm run lint && npm test && npm run build
   ```
3. Changelog updated at `app/changelog/page.tsx`
4. Version bumped if applicable

### Changelog Entry Format
```
## v0.X.Y — [Date]

### Added
- [Feature description with user-facing impact]

### Fixed
- [Bug description and resolution]

### Changed
- [Modification and why]
```

Keep entries user-focused. "Added oximetry H1/H2 split comparison" not "Refactored OximetryResult interface to include half-split arrays."

### Deployment
AirwayLab deploys via Vercel on push to main. After merge:

1. Wait for Vercel build to complete
2. Check Vercel deployment logs for errors
3. Run post-deploy verification

### Post-Deploy Verification

Create a verification checklist issue assigned to the board (human) with these items:
1. **Smoke test** -- Upload SD card data on airwaylab.app. Full pipeline: upload -> parse -> analyze -> all dashboard tabs.
2. **Feature check** -- The specific feature from the release works on production.
3. **Regression spot-check** -- 2-3 adjacent features that share components or state.
4. **Console check** -- DevTools shows no new errors or warnings.
5. **Mobile check** -- Changed area renders correctly on mobile viewport.

Agent-verifiable checks (do these directly):
6. **Build logs** -- Verify Vercel build completed without errors.
7. **API health** -- Check /api/health endpoint responds 200.

### Rollback Protocol
If something breaks:
1. Assess severity: core analysis broken = revert immediately. Cosmetic = hotfix.
2. Revert first, investigate second: `git revert <commit> && git push`
3. Hotfix via normal PR process (don't skip checks)
4. Post-incident note on the PR

## Cross-Team Announcement

After a successful release, create an announcement task for the Head of Growth:
- Feature name and version
- User-facing impact (one sentence)
- Suggested messaging angle for community/blog/email

This ensures the growth team can announce new features promptly.

## Output Format

Comment on the release task with:
- Version number
- Changelog entry (for review)
- Post-deploy verification results (pass/fail per check)
- Announcement task created for Head of Growth (yes/no)
- Any issues found
