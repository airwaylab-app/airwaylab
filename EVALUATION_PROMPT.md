# AirwayLab — Pre-Launch Evaluation

## Context

AirwayLab (formerly SleepScope) v0.4.0 is ready for public launch. This is a comprehensive evaluation before going live. The codebase has been through rename (SleepScope → AirwayLab), anonymization, pre-launch polish, and AI Insights MVP build.

**Goal:** Find and fix anything that would embarrass us on launch day, harm users, or miss easy wins.

**Working directory:** This project root.

**Rules:**
- Do NOT modify analysis engine logic in `lib/parsers/`, `lib/analyzers/`, `workers/`
- DO fix bugs, improve UX, add missing error handling, improve copy
- Keep changes focused — this is a polish pass, not a feature sprint
- Run `npm run lint && npm test && npm run build` at the end

---

## Evaluation 1: Anonymization & Identity Safety

**Critical for privacy. Any leak = identity exposed.**

```bash
# Run these and fix ANY matches
grep -ri "sleepscope\|sleep-scope\|sleep_scope" --include="*.ts" --include="*.tsx" --include="*.md" --include="*.json" --include="*.css" --include="*.sql" --include="*.mjs" . | grep -v node_modules | grep -v .next
grep -ri "demian\|voorhagen\|d\.voorhagen\|qwerty\|mirava\|haarlem" --include="*.ts" --include="*.tsx" --include="*.md" --include="*.json" --include="*.css" --include="*.sql" --include="*.mjs" . | grep -v node_modules | grep -v .next
```

Also check:
- `package.json` — author field must NOT contain personal info
- `package-lock.json` — search for personal email/name (npm can embed these)
- Any hardcoded URLs pointing to personal domains
- OG image / favicon — verify they say "AirwayLab" not "SleepScope"
- Git config: `git config user.name` and `git config user.email` should return "AirwayLab" and "dev@airwaylab.app"

**Fix all issues found.**

---

## Evaluation 2: Build & Test Health

```bash
npm run lint
npm test
npm run build
```

- All three must pass with zero errors
- Review any warnings — fix if quick, document if not
- Check for TypeScript `any` types that could hide bugs
- Check for `// TODO` or `// FIXME` comments that need addressing before launch
- Check for `console.log` statements that should be removed (keep only intentional debug logging behind env flags)

**Fix all errors. List remaining warnings.**

---

## Evaluation 3: User Experience Walkthrough

Mentally walk through each user journey and verify the code handles it:

### Journey A: First-time visitor
1. Lands on `/` — Does the H1 clearly communicate what this tool does? Is AirwayLab branding consistent?
2. Scans the page — Can they understand the value in <5 seconds?
3. Clicks "See Demo" — Does it work? Is the link correct (`/analyze?demo`)?
4. Sees dashboard — Is demo mode clearly labeled? Can they explore all 5 tabs?
5. Wants to try with real data — Is the "Upload Your Data" CTA visible?

### Journey B: CPAP user with SD card
1. Goes to `/analyze` — Is the upload instruction clear?
2. Selects their DATALOG folder — Does file validation catch wrong folders?
3. Waits during processing — Skeleton shimmer visible? Progress meaningful?
4. Sees results — Are insights actionable? Do traffic lights make sense?
5. Wants to share with doctor — PDF export works? Forum export copies to clipboard?
6. Closes tab, returns later — localStorage restore works? Banner explains it?

### Journey C: Error scenarios
1. Uploads non-EDF files — Helpful error message?
2. Uploads empty folder — Doesn't crash?
3. Uploads 100+ nights — Performance OK? (check if there are any O(n²) patterns in rendering)
4. No oximetry data — Empty state is informative, not broken?
5. JavaScript disabled — Graceful degradation or at least no white screen?
6. Mobile (375px width) — All tabs usable? Tables don't overflow? Charts render?

**For each issue found: fix it or document it with rationale for why it's acceptable for launch.**

---

## Evaluation 4: Security & Safety

### Data safety
- Verify NO data is sent to any server during normal analysis (check all fetch calls, XMLHttpRequest, WebSocket)
- Verify localStorage data is properly scoped (can't be read by other domains)
- Verify the email subscribe endpoint doesn't leak user data in responses
- Check that the AI insights endpoint validates input and doesn't forward raw user data to error messages

### API route safety
- `app/api/subscribe/route.ts` — Rate limiting? Input validation? SQL injection via Supabase?
- `app/api/ai-insights/route.ts` — API key validation working? What happens with malformed input? Is there a request size limit?
- Are there any other API routes? Check `app/api/` directory.

### Content safety
- Medical disclaimer visible and adequate?
- "Not a medical device" language present in: footer, about page, PDF export, forum export?
- No language that could be interpreted as medical advice or diagnosis?
- Insights always include "discuss with your clinician" or similar?

**Fix any security issues immediately. Document safety review results.**

---

## Evaluation 5: SEO & Social Sharing

- Check `app/layout.tsx` metadata — title, description, OG tags all say "AirwayLab"
- Check `app/opengraph-image.tsx` — renders "AirwayLab" correctly
- Check `app/twitter-image.tsx` — same
- Check JSON-LD structured data — correct name, URL, features
- Check `robots.ts` — allows indexing
- Check `sitemap.ts` — lists ALL pages including SEO content pages under /about/
- Check each SEO page has unique `<title>` and meta description:
  - `/about/glasgow-index`
  - `/about/flow-limitation`
  - `/about/oximetry-analysis`
- Check canonical URLs are correct (airwaylab.app, not sleepscope.app)

**Fix any issues found.**

---

## Evaluation 6: Missing Easy Wins

Review the codebase for quick improvements that would meaningfully improve launch quality. Only implement things that take <15 minutes each:

### Copy improvements
- Are metric labels clear to non-experts? (e.g., "HR Clin 10" is cryptic — should it say "Heart Rate Surges ≥10 bpm"?)
- Are empty states helpful? (e.g., "No oximetry data" — does it explain what to do?)
- Is the CTA copy compelling? ("See Demo" vs "Explore Sample Data" — which is better for the audience?)

### Accessibility quick wins
- All images have alt text?
- Focus order makes sense on the dashboard?
- Color-only indicators have text alternatives? (traffic lights have aria-labels?)
- Skip-to-content link for keyboard users?

### Error handling
- What happens if localStorage is full? (persistence.ts handles this — verify)
- What happens if the Plausible script fails to load? (should not block rendering)
- What happens if Supabase is down? (email subscribe should fail gracefully)

### Performance
- Are chart components memoized with React.memo?
- Are large lists virtualized (or is the dataset small enough not to need it)?
- Is there a loading state for the AI insights fetch?
- Are images optimized (next/image or appropriate formats)?

**Implement quick wins. Skip anything that would take >15 minutes.**

---

## Evaluation 7: README & Documentation

- Does README.md render correctly as markdown? (check formatting, links, tables)
- Are all links valid? (GitHub repo link, demo link, community links)
- Does CHANGELOG.md reflect the rename and current version?
- Does LICENSE file exist and is it GPL-3.0?
- Is `.env.local.example` present and documented?
- Is there a CONTRIBUTING.md or contributing section in README?

**Fix any documentation issues.**

---

## Output

After completing all evaluations:

1. **Summary:** One paragraph on overall launch readiness
2. **Fixed:** Bulleted list of everything you fixed
3. **Accepted risks:** Things you found but deliberately chose not to fix, with rationale
4. **Build status:** Final `npm run lint && npm test && npm run build` result
5. **Recommendation:** Ship or hold, with conditions if hold
