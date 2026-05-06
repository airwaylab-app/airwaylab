#!/usr/bin/env bash
# scripts/validate-github-credentials.sh
#
# Pre-flight validation for GitHub credentials. Run at the start of any
# heartbeat that depends on git push. Returns exit code 0 if credentials
# are valid, 1 if invalid or missing.
#
# Usage:
#   source scripts/validate-github-credentials.sh
#   if ! validate_github_credentials; then
#     # handle gracefully — skip push-dependent work, escalate
#   fi
#
# Or standalone:
#   scripts/validate-github-credentials.sh && echo "ok" || echo "bad"

set -euo pipefail

validate_github_credentials() {
  local remote_url pat http_code

  remote_url=$(git remote get-url origin 2>/dev/null) || {
    echo "CREDENTIAL_CHECK: No git remote 'origin' configured" >&2
    return 1
  }

  pat=$(echo "$remote_url" | sed -n 's|.*x-access-token:\([^@]*\)@.*|\1|p')

  if [ -z "$pat" ]; then
    echo "CREDENTIAL_CHECK: No PAT found in remote URL" >&2
    return 1
  fi

  http_code=$(curl -s -o /dev/null -w "%{http_code}" \
    --max-time 10 \
    -H "Authorization: Bearer $pat" \
    "https://api.github.com/rate_limit") || {
    echo "CREDENTIAL_CHECK: GitHub API unreachable (network error)" >&2
    return 1
  }

  if [ "$http_code" = "200" ]; then
    echo "CREDENTIAL_CHECK: PAT valid (HTTP $http_code)" >&2
    return 0
  elif [ "$http_code" = "401" ]; then
    echo "CREDENTIAL_CHECK: PAT expired or revoked (HTTP 401)" >&2
    return 1
  else
    echo "CREDENTIAL_CHECK: Unexpected response (HTTP $http_code)" >&2
    return 1
  fi
}

# When run as a standalone script (not sourced), execute the check
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  validate_github_credentials
fi
