#!/bin/bash
# MDR content scanner.
# Reads ban-list phrases from .claude/rules/mdr-compliance.md (lines containing "BAD:").
# Scans .md, .mdx, .ts, .tsx, content/**, and emails/** files for prohibited terms.
# To waive a specific line, append:  <!-- mdr-ok: <reason> -->  or  {/* mdr-ok: <reason> */}
#
# Usage:
#   Pre-commit (staged files only):   bash scripts/mdr-precommit.sh
#   CI (all tracked content files):   MDR_SCAN_ALL=true bash scripts/mdr-precommit.sh

set -euo pipefail

RULES_FILE=".claude/rules/mdr-compliance.md"
VIOLATIONS=0

if [ ! -f "$RULES_FILE" ]; then
  echo "⚠️  mdr-scan: rules file not found at $RULES_FILE — skipping scan"
  exit 0
fi

# Extract quoted phrases from BAD: lines (strips trailing ellipsis if present)
BAD_TERMS=$(grep 'BAD: "' "$RULES_FILE" \
  | sed 's/.*BAD: "\([^"]*\)".*/\1/' \
  | sed 's/\.\.\.//' \
  | grep -v '^$' || true)

if [ -z "$BAD_TERMS" ]; then
  echo "ℹ️  mdr-scan: no ban-list terms extracted from $RULES_FILE — skipping scan"
  exit 0
fi

# Determine file list: all tracked content files in CI, staged only in pre-commit
# The rules file itself is excluded (it contains examples of prohibited language)
if [ "${MDR_SCAN_ALL:-}" = "true" ]; then
  FILES=$(git ls-files \
    | grep -E '\.(md|mdx|tsx|ts)$|^content/|^emails/' \
    | grep -v "^$RULES_FILE$" || true)
  MODE="all tracked"
else
  FILES=$(git diff --cached --name-only --diff-filter=ACM 2>/dev/null \
    | grep -E '\.(md|mdx|tsx|ts)$|^content/|^emails/' \
    | grep -v "^$RULES_FILE$" || true)
  MODE="staged"
fi

if [ -z "$FILES" ]; then
  echo "ℹ️  mdr-scan: no $MODE content files to check."
  exit 0
fi

FILE_COUNT=$(echo "$FILES" | wc -l | tr -d ' ')
echo "🔍 mdr-scan: checking $FILE_COUNT $MODE content file(s) against MDR ban-list..."

while IFS= read -r file; do
  [ -z "$file" ] && continue
  [ ! -f "$file" ] && continue

  # In pre-commit mode, read the staged index version; in CI mode read the file directly
  if [ "${MDR_SCAN_ALL:-}" = "true" ]; then
    CONTENT=$(cat "$file")
  else
    CONTENT=$(git show ":$file" 2>/dev/null || cat "$file")
  fi

  LINE_NUM=0
  while IFS= read -r line; do
    LINE_NUM=$((LINE_NUM + 1))

    # Lines containing an explicit waiver are skipped
    if echo "$line" | grep -qi "mdr-ok"; then
      continue
    fi

    while IFS= read -r term; do
      [ -z "$term" ] && continue
      if echo "$line" | grep -qi "$term"; then
        echo "❌  $file:$LINE_NUM — matched: \"$term\""
        echo "    $line"
        VIOLATIONS=$((VIOLATIONS + 1))
      fi
    done <<< "$BAD_TERMS"
  done <<< "$CONTENT"
done <<< "$FILES"

if [ "$VIOLATIONS" -gt 0 ]; then
  echo ""
  echo "❌  mdr-scan: $VIOLATIONS violation(s) found."
  echo "    Review: .claude/rules/mdr-compliance.md"
  echo "    To waive an intentional exception, add to the end of the line:"
  echo "      <!-- mdr-ok: <reason> -->   (Markdown)"
  echo "      {/* mdr-ok: <reason> */}    (JSX/MDX)"
  exit 1
fi

echo "✅  mdr-scan: all clear."
exit 0
