---
name: privacy-audit
description: >
  Use this skill when auditing code changes for GDPR compliance, privacy
  policy accuracy, data flow verification, or consent mechanism review.
  Don't use for MDR SaMD compliance (use mdr-compliance-check) or
  general code review (use code-review).
---

# Privacy Audit

Verify that code changes comply with GDPR and AirwayLab's privacy architecture.

## Privacy Architecture

### Tier 1 -- Browser-only (default)
All core analysis runs client-side in a Web Worker. No data leaves the browser. No network requests for health data. Results persist in localStorage (airwaylab_ prefix, 30-day expiry, 4MB cap).

### Tier 2 -- Server-enhanced (opt-in)
Users explicitly opt in to: AI-powered insights (sends metrics, never raw waveforms), data contribution (anonymised aggregate metrics to Supabase), premium features behind `ailab-beta-2026` gate. Every server interaction requires informed, affirmative consent.

## Audit Checklist

### 1. Data Flow Verification
- Does any new feature send health data to a server?
- If yes, is there an explicit consent step?
- Is the consent informed (user knows what data, where it goes, how long it's kept)?

### 2. Storage Compliance
- New server-side health data storage must document:
  - Retention period
  - Deletion mechanism (for DSAR requests)
  - Who has access
- Account deletion must be fulfillable within 30 days

### 3. Third-Party Integrations
- New integrations must be added to Privacy Policy processor list BEFORE deployment
- Verify data processing agreements are in place

### 4. Consent Mechanisms
- Automated processing of health data requires GDPR Article 22 informed consent
- Use the existing consent component (e.g. components/share/share-consent-modal.tsx or components/dashboard/ai-insights-gate.tsx) or equivalent
- Consent must be: freely given, specific, informed, unambiguous

### 5. Privacy Policy Accuracy
- Verify /privacy page reflects all current data flows
- Check processor table is complete
- Verify retention periods are documented

## Output Format

```
## Privacy Audit

**Verdict:** PASS / FAIL / NEEDS_REVIEW

### Data Flow
- [New data flows identified: yes/no]
- [Consent mechanism present: yes/no]

### Storage
- [New data stores: list with retention + deletion path]

### Third-Party
- [New integrations: list with privacy policy status]

### Recommendations
- [prioritized fixes]
```
