#!/usr/bin/env bash
# scripts/check-vercel-env.sh
#
# Pre-flight credential checker for Vercel environment variables.
# Run before filing any Vercel credential provisioning request to confirm
# whether a variable is already present.
#
# Usage:
#   # Live check via Vercel API (requires VERCEL_TOKEN):
#   VERCEL_TOKEN=<token> scripts/check-vercel-env.sh
#
#   # Check if a specific key exists:
#   VERCEL_TOKEN=<token> scripts/check-vercel-env.sh | grep SENTRY_AUTH_TOKEN
#
#   # Offline fallback (reads cached snapshot):
#   scripts/check-vercel-env.sh
#
# Output: one env var name per line (suitable for grep).
# Exits 0 on success, 1 on failure.
#
# Environment variables:
#   VERCEL_TOKEN  — Vercel API token (optional; falls back to snapshot)
#   VERCEL_PROJECT_ID — Vercel project ID (optional; queries all projects if absent)
#   VERCEL_TEAM_ID    — Vercel team ID (optional)
#
# Snapshot location: docs/ops/vercel-env-snapshot.json
# Refresh snapshot:  VERCEL_TOKEN=<token> scripts/check-vercel-env.sh --refresh-snapshot

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SNAPSHOT_FILE="$REPO_ROOT/docs/ops/vercel-env-snapshot.json"

VERCEL_TOKEN="${VERCEL_TOKEN:-}"
VERCEL_PROJECT_ID="${VERCEL_PROJECT_ID:-}"
VERCEL_TEAM_ID="${VERCEL_TEAM_ID:-}"

REFRESH_SNAPSHOT=false
if [[ "${1:-}" == "--refresh-snapshot" ]]; then
  REFRESH_SNAPSHOT=true
fi

fetch_live_env_names() {
  local url params response

  # Build URL: project-scoped or team-scoped
  if [ -n "$VERCEL_PROJECT_ID" ]; then
    url="https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/env"
  else
    url="https://api.vercel.com/v9/projects"
    echo "VERCEL_ENV_CHECK: VERCEL_PROJECT_ID not set — listing projects only" >&2
  fi

  params=""
  if [ -n "$VERCEL_TEAM_ID" ]; then
    params="?teamId=${VERCEL_TEAM_ID}"
  fi

  response=$(curl -sf --max-time 15 \
    -H "Authorization: Bearer $VERCEL_TOKEN" \
    "${url}${params}") || {
    echo "VERCEL_ENV_CHECK: API request failed (check VERCEL_TOKEN and network)" >&2
    return 1
  }

  # Extract env var keys using python3 (no extra dependencies)
  echo "$response" | python3 -c "
import sys, json
data = json.load(sys.stdin)

# /v9/projects/{id}/env returns { 'envs': [...] }
envs = data.get('envs', [])
if not envs and isinstance(data, dict):
    # Also try top-level list
    envs = data if isinstance(data, list) else []

names = sorted({e.get('key', '') for e in envs if e.get('key')})
for name in names:
    print(name)
" 2>/dev/null || {
    echo "VERCEL_ENV_CHECK: Failed to parse API response" >&2
    return 1
  }
}

read_snapshot() {
  if [ ! -f "$SNAPSHOT_FILE" ]; then
    echo "VERCEL_ENV_CHECK: Snapshot not found at $SNAPSHOT_FILE" >&2
    echo "VERCEL_ENV_CHECK: Set VERCEL_TOKEN to fetch live data, or create the snapshot" >&2
    return 1
  fi

  local snapshot_age_days
  snapshot_age_days=$(python3 -c "
import os, time, json
stat = os.stat('$SNAPSHOT_FILE')
age_s = time.time() - stat.st_mtime
print(int(age_s / 86400))
")

  if [ "$snapshot_age_days" -gt 7 ]; then
    echo "VERCEL_ENV_CHECK: WARNING — snapshot is ${snapshot_age_days} days old (>7 days). Run with VERCEL_TOKEN to refresh." >&2
  else
    echo "VERCEL_ENV_CHECK: Using snapshot (${snapshot_age_days} days old). Set VERCEL_TOKEN for live data." >&2
  fi

  python3 -c "
import json, sys
with open('$SNAPSHOT_FILE') as f:
    data = json.load(f)
names = sorted(data.get('keys', []))
for name in names:
    print(name)
"
}

save_snapshot() {
  local names="$1"
  local timestamp
  timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  python3 -c "
import json, sys
keys = [line for line in '''$names'''.strip().split('\n') if line]
data = {'keys': sorted(keys), 'refreshed_at': '$timestamp', 'source': 'vercel-api'}
with open('$SNAPSHOT_FILE', 'w') as f:
    json.dump(data, f, indent=2)
    f.write('\n')
print('VERCEL_ENV_CHECK: Snapshot saved to $SNAPSHOT_FILE', file=sys.stderr)
"
}

# --- Main ---

if [ -n "$VERCEL_TOKEN" ]; then
  echo "VERCEL_ENV_CHECK: Fetching live Vercel env vars..." >&2
  env_names=$(fetch_live_env_names)

  if $REFRESH_SNAPSHOT; then
    save_snapshot "$env_names"
  fi

  echo "$env_names"
else
  read_snapshot
fi
