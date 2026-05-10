# Credential Inventory

Authoritative record of all shared secrets in the AirwayLab system.
Checked weekly by the **Credential Rotation Reminder** routine (Mon 09:00 CET).
Update this file whenever a credential is rotated.

## Inventory

| Name | Owner | Stored In | Cadence | Last Rotated | Next Rotation Due | Status |
|------|-------|-----------|---------|--------------|-------------------|--------|
| `SENTRY_AUTH_TOKEN` | CTO / Board | Vercel env var `SENTRY_AUTH_TOKEN` | 90 days | 2026-04-22† | 2026-07-21 | active |
| `GITHUB_PAT` (airwaylab-dev) | Board (Demian) | Cortis `.netrc` / git remote URL | 90 days | 2026-04-20 | **2026-04-20 (EXPIRED)** | EXPIRED |

†Estimated from [AIR-927](/AIR/issues/AIR-927) fix date — verify actual expiry in Sentry dashboard and update this row.

---

## Rotation Instructions

### SENTRY_AUTH_TOKEN

1. Sentry → Settings → Account → API Tokens → Create token
2. Required scopes: `project:releases`, `org:read`, `project:read`, `project:write`
3. Update `SENTRY_AUTH_TOKEN` in Vercel environment (Production + Preview + Development)
4. Update `Last Rotated` and `Next Rotation Due` in the table above
5. Comment on the rotation ticket with the new expiry date

### GITHUB_PAT (airwaylab-dev)

1. Board action — log in to GitHub as `airwaylab-dev`
2. Settings → Developer Settings → Personal Access Tokens → Fine-grained
3. Required scopes: `Contents: Read & Write`, `Pull requests: Read & Write`, `Workflows: Read & Write`
4. Set expiry: 90 days from today
5. Update the Cortis server `.netrc` entry and any embedded PAT in the git remote URL:
   ```
   git remote set-url origin https://airwaylab-dev:<NEW_PAT>@github.com/airwaylab-app/airwaylab.git
   ```
6. Update `Last Rotated` and `Next Rotation Due` in the table above
7. Comment on the rotation ticket confirming the new expiry date

---

## How the Rotation Reminder Routine Works

Each Monday at 09:00 CET, the `Credential Rotation Reminder` routine fires and creates an execution issue
assigned to the CTO. The CTO agent picks up the issue and:

1. Reads this file
2. For each entry where `Next Rotation Due <= today + 14 days`, creates a **HIGH-priority** ticket:
   - Title: `Credential rotation due: <NAME>`
   - Assignee: CTO (to triage/escalate to board as needed)
   - Links to rotation instructions in this document
3. Marks the execution issue `done` with a summary

---

## Test Entry (dry-run only — remove after AIR-931 verification)

| Name | Owner | Stored In | Cadence | Last Rotated | Next Rotation Due | Status |
|------|-------|-----------|---------|--------------|-------------------|--------|
| `DRY_RUN_TEST_TOKEN` | CTO | test-only | 90 days | 2026-02-05 | 2026-05-06 | test |
