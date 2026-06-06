---
name: backend-feature
description: >
  Use this skill when implementing API routes, Supabase integration,
  authentication, webhooks, database migrations, or server-side functionality.
  Don't use for UI components (use frontend-feature), bug fixes (use bug-triage),
  or code review (use code-review).
---

# Backend Feature Development

Implement server-side features following AirwayLab conventions.

## Scope

Your domain:
- `app/api/` all API routes
- `lib/auth/` authentication context, feature gating
- `lib/ai-insights-client.ts` AI insights fetcher
- `supabase/migrations/` database migrations (append-only)

NOT your domain:
- `app/` pages (Frontend Engineer)
- `components/` (Frontend Engineer)
- `lib/analyzers/`, `lib/parsers/`, `workers/` (PROTECTED -- never modify)

## Critical Security Rules

- EVERY API route MUST have auth middleware
- EVERY new Supabase table MUST have RLS enabled
- NEVER hardcode secrets -- use process.env with Zod validation
- NEVER send health data without explicit user consent
- NEVER store health data server-side without documenting retention + deletion path
- Migrations are append-only -- NEVER edit existing files
- All new env vars MUST be added to .env.example

## AI Insights Rules

- AI system prompts describe data only
- NEVER suggest actions, adjustments, or investigations
- Always include medical disclaimer in AI output
- Two-tier model: Claude Haiku for community, Claude Sonnet 4.6 for premium (see app/api/ai-insights/route.ts). Do not change models without discussion (cost constraint)

## Build Checks (MANDATORY)

```bash
npx tsc --noEmit && npm run lint && npm test && npm run build
```

## Testing

- Vitest for unit tests
- Test API validation, auth middleware, edge cases
- Tests in __tests__/*.test.ts
- Tests ship with the code

## Database Conventions

- Supabase EU region (GDPR)
- RLS on every table
- Document retention period for health-related data
- Ensure deletion path for DSAR requests
- New third-party integrations must be added to Privacy Policy processor list
