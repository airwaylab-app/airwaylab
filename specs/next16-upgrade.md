# Next.js 16 Upgrade (14.2.35 -> 16.x)

**Date:** 2026-03-16
**Status:** Draft
**Slug:** next16-upgrade
**Tier:** Full spec (major framework upgrade, touches build tooling, middleware, ESLint, Sentry integration)

## Motivation

### Security: Active CVEs in Next.js 14.2.35

`npm audit` currently reports the following vulnerabilities that can only be resolved by upgrading Next.js:

| CVE | Severity | Title | Affected Range |
|-----|----------|-------|----------------|
| [GHSA-9g9p-9gw9-jx7f](https://github.com/advisories/GHSA-9g9p-9gw9-jx7f) | Moderate (CVSS 5.9) | Image Optimizer DoS via remotePatterns | next >=10.0.0 <15.5.10 |
| [GHSA-h25m-26qc-wcjf](https://github.com/advisories/GHSA-h25m-26qc-wcjf) | High (CVSS 7.5) | RSC HTTP request deserialization DoS | next >=13.0.0 <15.0.8 |
| [GHSA-5j98-mcp5-4vw2](https://github.com/advisories/GHSA-5j98-mcp5-4vw2) | High (CVSS 7.5) | glob CLI command injection | glob 10.2.0-10.4.5 (via @next/eslint-plugin-next) |

Additionally:
- `flatted` < 3.4.0: unbounded recursion DoS in `parse()` (GHSA-25h7-pfq9-p65f, CVSS 7.5)
- `undici`: malicious WebSocket 64-bit length overflow (transitive via Next.js)
- `hono` < 4.12.7: prototype pollution via `__proto__` key (moderate)

The `eslint-config-next` 14.2.35 is pinned to `@next/eslint-plugin-next` which depends on vulnerable `glob` 10.2.0-10.4.5. This cannot be fixed without upgrading `eslint-config-next` to 16.x.

### Technical Debt

- The project is on Next.js **14.2.35** (App Router), which is two major versions behind current stable (16.1.6).
- React 18 -> React 19.2 brings View Transitions, `useEffectEvent()`, and `<Activity/>`.
- Turbopack (now default in 16) provides 2-5x faster builds and up to 10x faster Fast Refresh.
- The longer we wait, the larger the migration surface becomes.

### What This Is NOT

This upgrade does not adopt optional new features (Cache Components, React Compiler, Build Adapters). It is a compatibility upgrade only -- get to Next.js 16 with all existing functionality intact. New features can be evaluated separately.

---

## Current State

| Package | Current Version | Target Version |
|---------|----------------|----------------|
| `next` | 14.2.35 | 16.x (latest) |
| `react` | ^18 | ^19 (19.2+) |
| `react-dom` | ^18 | ^19 (19.2+) |
| `@types/react` | ^18 | ^19 |
| `@types/react-dom` | ^18 | ^19 |
| `eslint-config-next` | 14.2.35 | 16.x (latest) |
| `@next/bundle-analyzer` | ^16.1.6 | ^16.1.6 (already compatible) |
| `@sentry/nextjs` | ^10.42.0 | Check Turbopack compat |

**Node.js:** v25.6.1 (exceeds 20.9+ minimum)
**TypeScript:** 5.9.3 (exceeds 5.1+ minimum)

---

## Breaking Changes Checklist

### CRITICAL -- Code Changes Required

| # | Breaking Change | Impact on This Codebase | Files Affected | Effort |
|---|----------------|------------------------|----------------|--------|
| 1 | **Async Request APIs enforced** -- `cookies()`, `headers()`, `draftMode()` must be `await`ed. Sync access removed (was deprecated in 15). | **HIGH.** Two files call `cookies()` synchronously. | `lib/supabase/server.ts` (L21), `app/auth/callback/route.ts` (L47) | Small |
| 2 | **Async `params` enforced** -- `params` in pages/layouts/routes must be `Promise<>` and `await`ed. | **MEDIUM.** One file uses sync `params`: `app/shared/[id]/page.tsx` (L77-81). Blog `[slug]/page.tsx` already uses async params. | `app/shared/[id]/page.tsx` | Small |
| 3 | **`next lint` command removed** -- `next build` no longer runs linting. | **HIGH.** `package.json` "lint" script is `"next lint"`. `lint-staged` uses `"next lint --fix --file"`. Both break. | `package.json` (L9, L42-44) | Small |
| 4 | **Middleware -> Proxy rename** -- `middleware.ts` deprecated in favour of `proxy.ts` with `proxy()` export. | **MEDIUM.** `middleware.ts` exists with Supabase auth session refresh. Still works (deprecated, not removed), but should migrate. | `middleware.ts` | Small |
| 5 | **Turbopack is default bundler** -- `next build` uses Turbopack by default. Custom `webpack` config in `next.config.mjs` will cause build failure. | **HIGH.** `next.config.mjs` has a custom `webpack` callback (L29-35, `fs: false` fallback). Sentry `withSentryConfig` also injects webpack config. Must either migrate to Turbopack or use `--webpack` flag. | `next.config.mjs`, `package.json` | Medium |
| 6 | **ESLint legacy config format** -- `@next/eslint-plugin-next` now defaults to Flat Config. Legacy `.eslintrc.json` still works but is deprecated. | **LOW.** `.eslintrc.json` exists with legacy format. Will still work for now but should plan migration. | `.eslintrc.json` | Deferred |
| 7 | **React 18 -> 19** -- Potential breaking changes in React APIs, type changes. | **MEDIUM.** `@types/react` and `@types/react-dom` need to be v19. Some deprecated React APIs may be removed. Recharts 3.8 and @base-ui/react need React 19 compatibility verification. | All components | Medium |

### LOW/NO IMPACT -- Verify Only

| # | Breaking Change | Impact Assessment | Action |
|---|----------------|-------------------|--------|
| 8 | AMP support removed | No impact. AirwayLab does not use AMP. | None |
| 9 | `serverRuntimeConfig` / `publicRuntimeConfig` removed | No impact. Not used in codebase. | None |
| 10 | `next/legacy/image` deprecated | No impact. Not used in codebase. | None |
| 11 | `images.domains` deprecated | No impact. Not used in codebase. | None |
| 12 | `experimental.turbopack` moved to top-level `turbopack` | No impact. Not using `experimental.turbopack`. | None |
| 13 | `experimental.dynamicIO` renamed to `cacheComponents` | No impact. Not using either. | None |
| 14 | `experimental.ppr` removed | No impact. Not using PPR. | None |
| 15 | `devIndicators` options removed | No impact. Not configured. | None |
| 16 | `scroll-behavior: smooth` no longer auto-overridden | No impact. Not using `scroll-behavior: smooth` in CSS. | None |
| 17 | `images.minimumCacheTTL` default changed (60s -> 4hr) | No impact. Using default. New default is better. | None |
| 18 | `images.imageSizes` default changed (16 removed) | Minimal impact. Verify no 16px images used. | Verify |
| 19 | `images.qualities` default changed (all -> [75]) | Minimal impact. Not using custom quality props. | Verify |
| 20 | `images.dangerouslyAllowLocalIP` blocks local IP by default | No impact. Not optimizing local IP images. | None |
| 21 | `images.maximumRedirects` limited to 3 | No impact. Not using image redirects. | None |
| 22 | Parallel routes require explicit `default.js` | No impact. No parallel routes (`app/@*/`) in codebase. | None |
| 23 | OG/Twitter image `params` now async | Minimal impact. `app/opengraph-image.tsx` and `app/twitter-image.tsx` don't use params. No change needed. | Verify |
| 24 | Sitemap `id` param now async | No impact. `app/sitemap.ts` does not use `generateSitemaps` or dynamic `id`. | None |
| 25 | `revalidateTag()` signature changed | No impact. Not using `revalidateTag()` in codebase. | None |
| 26 | `cacheLife` / `cacheTag` stabilized (unstable_ prefix removed) | No impact. Not using either. | None |
| 27 | Dev/build use separate output directories | Low impact. `.next/dev` for dev, `.next` for build. May need `.gitignore` update. | Verify |

---

## Migration Steps

### Phase 1: Pre-flight (before touching dependencies)

**Step 1.** Create upgrade branch
```bash
git checkout main && git pull
git checkout -b chore/next16-upgrade
```

**Step 2.** Snapshot current state
```bash
npm run build  # Confirm clean build on 14.x baseline
npm test       # Confirm all tests pass
npx playwright test  # Confirm e2e passes
```

### Phase 2: Dependency Upgrade

**Step 3.** Run the Next.js upgrade codemod (handles some automated migrations)
```bash
npx @next/codemod@canary upgrade latest
```
The codemod will:
- Update `next`, `react`, `react-dom` to latest
- Attempt to migrate async APIs
- Migrate middleware -> proxy naming
- Update config flags

**Step 4.** Manually update remaining dependencies
```bash
npm install eslint-config-next@latest @types/react@latest @types/react-dom@latest
```

**Step 5.** Verify `@sentry/nextjs` Turbopack compatibility
```bash
npm ls @sentry/nextjs
```
Check [Sentry docs](https://docs.sentry.io/platforms/javascript/guides/nextjs/) for Turbopack support status. As of early 2026, Sentry SDK 10.x supports Turbopack but the `withSentryConfig` webpack plugin needs the `--webpack` flag OR must be replaced with Sentry's Turbopack-compatible config.

### Phase 3: Code Migrations (Critical)

**Step 6.** Fix async `cookies()` calls

`lib/supabase/server.ts` -- make `getSupabaseServer()` async:
```typescript
// Before
export function getSupabaseServer() {
  // ...
  const cookieStore = cookies();

// After
export async function getSupabaseServer() {
  // ...
  const cookieStore = await cookies();
```
Note: All callers of `getSupabaseServer()` must now `await` it. Search for all usages and update.

`app/auth/callback/route.ts`:
```typescript
// Before
const cookieStore = cookies();

// After
const cookieStore = await cookies();
```

**Step 7.** Fix async `params` in `app/shared/[id]/page.tsx`
```typescript
// Before
interface PageProps {
  params: { id: string };
}
export default async function SharedAnalysisPage({ params }: PageProps) {
  const { id } = params;

// After
interface PageProps {
  params: Promise<{ id: string }>;
}
export default async function SharedAnalysisPage({ params }: PageProps) {
  const { id } = await params;
```

**Step 8.** Fix `next lint` removal

Update `package.json`:
```json
{
  "scripts": {
    "lint": "eslint . --ext .ts,.tsx,.js,.jsx"
  },
  "lint-staged": {
    "*.{ts,tsx,js,jsx}": [
      "eslint --fix"
    ]
  }
}
```
Or run the codemod: `npx @next/codemod@canary next-lint-to-eslint-cli .`

### Phase 4: Turbopack / Webpack Decision

**Step 9.** Decide Turbopack vs Webpack for production builds

The codebase has two webpack dependencies:
1. **`next.config.mjs` L29-35:** `resolve.fallback = { fs: false }` -- This is needed because client-side code imports modules that reference `fs`. In Turbopack, use `turbopack.resolveAlias` instead.
2. **`@sentry/nextjs` `withSentryConfig`:** Uses webpack plugins for source map upload and tree-shaking.

**Recommended approach:** Use `--webpack` flag for production builds initially, Turbopack for dev.
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "node scripts/check-version.mjs && next build --webpack",
    "start": "next start"
  }
}
```

This is the safest path because:
- Sentry source map upload relies on webpack plugin
- The `fs: false` fallback has a Turbopack equivalent but needs testing
- Turbopack build is stable but the Sentry integration needs verification

**Future follow-up:** Migrate to full Turbopack once Sentry confirms Turbopack build support. This would involve:
- Replacing webpack `fs: false` with `turbopack.resolveAlias: { fs: { browser: './empty.ts' } }`
- Switching Sentry to their Turbopack-compatible config (or using `sentry-cli` for source maps)

### Phase 5: Middleware -> Proxy (Recommended but Not Blocking)

**Step 10.** Rename middleware to proxy (deprecated, not yet removed)
```bash
mv middleware.ts proxy.ts
```
Update the exported function:
```typescript
// Before
export async function middleware(request: NextRequest) {

// After
export default async function proxy(request: NextRequest) {
```
Keep the same `config` export with the matcher.

Note: `proxy.ts` uses the Node.js runtime (not Edge). The current middleware already uses the Edge runtime implicitly. Verify Supabase SSR cookie handling works on the Node.js runtime. If issues arise, keep `middleware.ts` until the Edge runtime story is clarified in a future minor.

### Phase 6: Config Cleanup

**Step 11.** Update `next.config.mjs` if needed

Remove any deprecated config options. The current config has no deprecated options (no `serverRuntimeConfig`, no `experimental.turbopack`, no `devIndicators` options to remove).

If migrating to Turbopack in build (Step 9 alternative):
```javascript
// Add to nextConfig:
turbopack: {
  resolveAlias: {
    fs: { browser: false },
  },
},
```

**Step 12.** Verify `.gitignore` covers `.next/dev/` (new dev output directory)

Check that `.next` is already in `.gitignore` (it should be -- `.next/dev/` is a subdirectory).

### Phase 7: React 19 Compatibility

**Step 13.** Verify key dependency React 19 compatibility

| Dependency | React 19 Support | Action |
|-----------|------------------|--------|
| `recharts` ^3.8.0 | Verify -- Recharts 3.x should support React 19 | Check release notes |
| `@base-ui/react` ^1.2.0 | Verify -- Base UI targets latest React | Check release notes |
| `@supabase/ssr` ^0.9.0 | Likely compatible | Test |
| `@sentry/nextjs` ^10.42.0 | Should support React 19 | Check docs |
| `@vercel/speed-insights` ^2.0.0 | Likely compatible | Test |
| `lucide-react` ^0.577.0 | Should support React 19 | Test |
| `shadcn` ^4.0.0 | Verify | Check docs |

**Step 14.** Fix any React 19 type errors

React 19 changes some TypeScript types. Common issues:
- `React.FC` children prop is no longer implicit
- `useRef` no longer requires `null` initial value
- `forwardRef` may be deprecated in favour of ref as prop

Run `npx tsc --noEmit` and fix any type errors.

---

## Testing Strategy

### Automated

1. **Type check:** `npx tsc --noEmit` -- catches React 19 type changes and async API issues
2. **Lint:** `eslint . --ext .ts,.tsx,.js,.jsx` (updated command) -- catches ESLint config issues
3. **Unit tests:** `npm test` (vitest) -- catches engine regressions, export format changes
4. **Build:** `npm run build` -- catches Turbopack/webpack issues, SSR errors, import resolution
5. **E2E tests:** `npx playwright test` -- catches routing, navigation, and page rendering issues

### Manual Smoke Test (on Vercel Preview Deploy)

- [ ] Upload ResMed SD card data -- full pipeline: upload -> parse -> analyze -> all dashboard tabs
- [ ] Verify all 4 analysis engines produce correct results (compare to pre-upgrade)
- [ ] Navigate between all pages (landing, analyze, blog, about, pricing, etc.)
- [ ] Test auth flow: sign up, sign in, sign out (Supabase cookie handling via proxy)
- [ ] Test AI insights (premium feature behind gate)
- [ ] Test sharing flow (create share link, view shared analysis)
- [ ] Test file upload/download (cloud storage)
- [ ] Verify all charts render correctly (Recharts with React 19)
- [ ] Check console for new errors/warnings
- [ ] Mobile viewport spot check
- [ ] Verify Sentry captures errors correctly (trigger a test error)
- [ ] Verify Plausible analytics still fires events

---

## Risk Assessment

| Risk | Likelihood | Impact | Detection | Mitigation |
|------|-----------|--------|-----------|------------|
| React 19 type errors cascade | Medium | Medium | `tsc --noEmit` | Fix incrementally; React 19 types are well-documented |
| Recharts breaks with React 19 | Low | High | Visual inspection + e2e | Pin recharts version; test charts manually |
| Sentry source map upload fails with Turbopack | Medium | Low | Build output + Sentry dashboard | Use `--webpack` flag for builds (recommended approach) |
| `@base-ui/react` incompatible with React 19 | Low | High | Build + runtime errors | Check compatibility before upgrading React |
| Supabase SSR cookie handling breaks in proxy (Node.js runtime vs Edge) | Low | High | Auth flow testing | Keep `middleware.ts` if proxy doesn't work; test thoroughly |
| `getSupabaseServer()` callers not updated to await | Medium | High | `tsc --noEmit` + runtime | TypeScript will catch this at compile time |
| Turbopack build produces different output than webpack | Low | Medium | E2e tests + manual | Use `--webpack` flag initially |
| Third-party packages use removed React 18 APIs | Low | Medium | Build errors | Update packages or find alternatives |

### Revert Plan

1. `git revert` the upgrade commit(s) on main
2. `npm install` to restore previous `node_modules`
3. Verify `npm run build` passes on reverted state
4. Deploy reverted state via Vercel

Because this is a dependency upgrade with no database migrations or infrastructure changes, revert is clean.

---

## Estimated Effort

| Phase | Tasks | Estimate |
|-------|-------|----------|
| Phase 1: Pre-flight | Branch, baseline tests | 10 min |
| Phase 2: Dependency upgrade | Codemod + manual installs | 15 min |
| Phase 3: Code migrations | Async APIs (2 files), async params (1 file), lint script | 30 min |
| Phase 4: Turbopack decision | Config update, verify builds | 20 min |
| Phase 5: Middleware -> Proxy | Rename + test auth | 15 min |
| Phase 6: Config cleanup | Minor config tweaks | 5 min |
| Phase 7: React 19 compat | Type fixes, dependency verification | 30-60 min |
| Testing | Full automated + manual smoke test | 30 min |
| **Total** | | **~2.5-3 hours** |

This exceeds the 2hr/week maintenance budget by ~1 hour. Recommend scheduling across two sessions:
- Session 1: Phases 1-4 (dependency upgrade + code migrations + build verification)
- Session 2: Phases 5-7 + testing + PR

---

## Scope Boundary

**In scope:**
- Upgrade Next.js 14.2.35 -> 16.x
- Upgrade React 18 -> 19.2
- Fix all breaking changes for compatibility
- Migrate `next lint` to ESLint CLI
- Rename middleware -> proxy (soft migration)
- Use `--webpack` flag for production builds (safe default)

**Out of scope (future work):**
- Cache Components / `"use cache"` directive
- React Compiler integration
- Full Turbopack migration (removing webpack entirely)
- ESLint Flat Config migration (legacy format still works)
- View Transitions / Activity API adoption
- Build Adapters API
- Next.js DevTools MCP integration

---

## Dependencies and Blockers

- **No database changes** -- no migration needed
- **No infrastructure changes** -- Vercel auto-deploys from main as usual
- **Sentry compatibility** -- must verify `@sentry/nextjs` 10.x works with Next.js 16 + webpack builds before merging
- **Vercel runtime** -- verify Vercel supports Next.js 16 (it should, as Vercel is the maintainer)

---

## Acceptance Criteria

- [ ] `npm run build` passes cleanly (with `--webpack` flag)
- [ ] `npx tsc --noEmit` reports zero errors
- [ ] `npm test` -- all existing tests pass
- [ ] `npx playwright test` -- all e2e tests pass
- [ ] `npm audit` no longer reports Next.js CVEs (GHSA-9g9p, GHSA-h25m, GHSA-5j98)
- [ ] Full analysis pipeline works on Vercel preview (SD card upload -> parse -> analyze -> dashboard)
- [ ] Auth flow works (sign in, session refresh, sign out)
- [ ] AI insights endpoint works (premium feature)
- [ ] Sentry error tracking works (source maps resolve correctly)
- [ ] No new console errors or warnings in production
- [ ] Bundle size delta within 10KB threshold
