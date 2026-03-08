# AirwayLab — Claude Code Configuration

AirwayLab is a free, open-source, browser-based CPAP flow limitation analysis tool for ResMed devices. It runs four research-grade analysis engines (Glasgow Index, WAT, NED, Oximetry) entirely client-side via Web Workers. Deployed on Vercel at airwaylab.app. GPL-3.0 licensed open-core model.

## Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint
npm run typecheck    # TypeScript type checking (tsc --noEmit)
npm test             # Vitest test suite
npm run test:watch   # Vitest watch mode
npm run analyze      # Bundle analysis (ANALYZE=true)
```

## Architecture

```
app/                 # Next.js 14 App Router pages
components/          # React components (shadcn/ui + custom)
  layout/            # Header, Footer
  dashboard/         # Analysis dashboard UI
  common/            # Shared components (disclaimer, email opt-in, etc.)
  ui/                # shadcn/ui primitives
lib/                 # Core logic, types, utilities, persistence
workers/             # Web Workers for analysis engines (Glasgow, WAT, NED, Oximetry)
supabase/migrations/ # Database schema (for future auth/premium features)
__tests__/           # Vitest + Testing Library tests
```

## Key Conventions

- **TypeScript strict mode** — no `any` unless absolutely necessary
- **Tailwind CSS** for all styling, **shadcn/ui** for component primitives
- **IBM Plex Sans** (body) + **JetBrains Mono** (data/code)
- **Web Workers** for all heavy computation — never block the main thread
- **All analysis is client-side** — no server-side processing of user health data
- **localStorage** for persistence (summary results only, bulk data stripped, 4MB cap, 7-day TTL)
- **Sentry** for error monitoring (client, edge, server configs)
- **Plausible** for privacy-friendly analytics (optional, via env var)

## Important Constraints

- **Never send user health data to a server** — this is the core privacy promise
- **GPL-3.0** — all contributions must be compatible; derivative works must also be GPL-3.0
- **Do not modify analysis engine logic** (Glasgow, WAT, NED, Oximetry) without thorough testing
- **Do not modify Supabase migrations** without explicit approval
- **Keep Vercel deployment compatible** — no server-side dependencies that break edge/serverless

## Environment Variables

See `.env.local.example` for required variables. Key ones:
- `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` — Plausible analytics domain (optional)
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase (for future premium features)
- `SENTRY_DSN` — Sentry error reporting
