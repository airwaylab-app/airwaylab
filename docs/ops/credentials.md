# Credential Inventory

Authoritative record of all shared secrets in the AirwayLab system.
Checked weekly by the **Credential Rotation Reminder** routine (Mon 09:00 CET).
Update this file whenever a credential is rotated.

## Inventory

| Name | Owner | Stored In | Cadence | Last Rotated | Next Rotation Due | Status |
|------|-------|-----------|---------|--------------|-------------------|--------|
| `SENTRY_AUTH_TOKEN` | CTO / Board | Vercel env var `SENTRY_AUTH_TOKEN` | 90 days | 2026-04-22† | 2026-07-21 | active |
| `GITHUB_PAT` (airwaylab-dev) | Board (Demian) | Cortis `.netrc` / git remote URL | 90 days | 2026-04-20† | 2026-07-12 | active |
| `GMAIL_CLIENT_ID` | Board (Demian) | Vercel env var `GMAIL_CLIENT_ID` | 365 days | unknown§ | 2026-12-02 | active |
| `GMAIL_CLIENT_SECRET` | Board (Demian) | Vercel env var `GMAIL_CLIENT_SECRET` | 365 days | unknown§ | 2026-12-02 | active |
| `GMAIL_REFRESH_TOKEN` | Board (Demian) | Vercel env var `GMAIL_REFRESH_TOKEN` | 365 days | unknown§ | 2026-12-02 | active |
| `DISCORD_REVENUE_WEBHOOK_URL` | Board (Demian) | Vercel env var | as needed | unknown | — | verify urgently |
| `DISCORD_OPS_WEBHOOK_URL` | Board (Demian) | Vercel env var | as needed | unknown | — | untracked |
| `DISCORD_WEBHOOK_CRITICAL` | Board (Demian) | Vercel env var | as needed | unknown | — | untracked |
| `DISCORD_USER_SIGNALS_WEBHOOK_URL` | Board (Demian) | Vercel env var | as needed | unknown | — | untracked |
| `DISCORD_PLATFORM_HEALTH_WEBHOOK_URL` | Board (Demian) | Vercel env var | as needed | unknown | — | untracked |

†Estimated from [AIR-927](/AIR/issues/AIR-927) fix date — verify actual expiry in Sentry dashboard and update this row.
‡Expiry confirmed via live `GET /rate_limit` header check on 2026-05-11 (`github-authentication-token-expiration: 2026-07-12 14:33:16 UTC`). Doc was previously stale (showed EXPIRED). Updated by [AIR-1358](/AIR/issues/AIR-1358) health check.
§Gmail OAuth credentials were confirmed present in Vercel as of 2026-05-31 (env snapshot) but creation date is unknown — first documented by [AIR-2344](/AIR/issues/AIR-2344). Next rotation date is set to 2026-12-02 as an initial review anchor; update after first explicit rotation.
‖Discord webhook URLs have no built-in expiry but are permanently invalidated when the target channel or webhook is deleted in Discord. Status "verify urgently" reflects the regression found in [AIR-2385](/AIR/issues/AIR-2385) / [AIR-2389](/AIR/issues/AIR-2389) (2026-06-02): subscription revenue alerts stopped posting to Discord, root cause traced to DISCORD_REVENUE_WEBHOOK_URL missing or pointing to a deleted webhook. Demian must verify in Vercel dashboard and regenerate from Discord server settings if needed.

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

### Gmail OAuth credentials (GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN)

Used by: feedback-processor cron (`/api/cron/feedback-processor`, 07:00 UTC daily) to create Gmail drafts on `dev@airwaylab.app`.

**Rotate client secret** (keep existing client ID unless revoking the whole app):

1. Google Cloud Console → APIs & Services → Credentials
2. Select the OAuth 2.0 client ID used for AirwayLab (`dev@airwaylab.app`)
3. Click "Reset Secret" → copy new `GMAIL_CLIENT_SECRET`
4. File a board approval (External-Service WRITE policy) before updating Vercel
5. After approval: update `GMAIL_CLIENT_SECRET` in Vercel (Production + Preview + Development)

**Re-issue refresh token** (required if token is revoked or after secret rotation):

1. Re-run the OAuth consent flow for `dev@airwaylab.app` in Google OAuth Playground or equivalent
2. Exchange auth code for a new refresh token (scope: `https://www.googleapis.com/auth/gmail.compose`)
3. File a board approval before updating Vercel
4. After approval: update `GMAIL_REFRESH_TOKEN` in Vercel (Production + Preview + Development)

**Verify** by triggering `GET /api/cron/feedback-processor` (with `CRON_SECRET` header) and confirming the response is `{ ok: true }`, not `{ skipped: true }`.

Note: If the feedback-processor cron silently returns `{ skipped: true, reason: 'Gmail not configured' }`, it means one or more of these three vars is missing or empty in Vercel.

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

### Discord Webhook URLs

Discord webhook URLs do not expire on a schedule but are permanently invalidated when the Discord channel or webhook is deleted. There is no API to check validity without sending a test message.

**How to verify a webhook URL:**
```bash
curl -s -o /dev/null -w "%{http_code}" \
  -X POST -H "Content-Type: application/json" \
  -d '{"content":"[health check — ignore]"}' \
  "$DISCORD_REVENUE_WEBHOOK_URL"
# 204 = valid, 404/410 = deleted/invalid
```

**How to regenerate:**
1. Discord server → Server Settings → Integrations → Webhooks
2. Find the webhook for the relevant channel (or create new)
3. Copy the webhook URL
4. Update the corresponding Vercel env var (Production + Preview + Development)
5. Update `Last Rotated` in the table above

**Channel → env var mapping:**
| Channel | Env var |
|---------|---------|
| `#revenue-alerts` | `DISCORD_REVENUE_WEBHOOK_URL` |
| `#ops-alerts` | `DISCORD_OPS_WEBHOOK_URL` |
| `#critical` | `DISCORD_WEBHOOK_CRITICAL` |
| `#user-signals` | `DISCORD_USER_SIGNALS_WEBHOOK_URL` |
| `#platform-health` | `DISCORD_PLATFORM_HEALTH_WEBHOOK_URL` |

---

## Test Entry (dry-run only — remove after AIR-931 verification)

| Name | Owner | Stored In | Cadence | Last Rotated | Next Rotation Due | Status |
|------|-------|-----------|---------|--------------|-------------------|--------|
| `DRY_RUN_TEST_TOKEN` | CTO | test-only | 90 days | 2026-02-05 | 2026-05-06 | test |
