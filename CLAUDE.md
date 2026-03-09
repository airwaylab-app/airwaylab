# AirwayLab

Open-core sleep/airway analysis tool for PAP users. Parses OSCAR data, provides AI-powered therapy insights.

## Stack

Next.js 14 (App Router) · TypeScript (strict) · Tailwind CSS · Supabase · Vercel

## Build & Verify

```bash
npm run dev          # Dev server
npx tsc --noEmit     # Type check
npm run lint         # Lint
npm run build        # Full build
```

## Conventions

- TypeScript strict — no `any`, no `@ts-ignore`
- Server Components by default, `'use client'` only when needed
- Zod for all external data validation
- Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`
- Branch per feature, never commit directly to main

## File Structure

```
src/app/          → Pages and API routes
src/components/   → Shared components
src/lib/          → Utilities, clients, helpers
src/types/        → Type definitions
src/hooks/        → Client-side hooks
supabase/migrations/ → DB migrations (append-only)
```
