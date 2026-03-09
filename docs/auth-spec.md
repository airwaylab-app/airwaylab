# AirwayLab — User Authentication Spec

## Overview

Add optional user accounts so users can persist their analysis history across sessions/devices. Supabase Auth is already configured in the project.

## Feasibility: Medium effort (half day to full day)

### What's already in place
- Supabase client configured (`lib/supabase.ts`)
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` env vars
- Database migrations directory (`supabase/migrations/`)
- `analysis_sessions` table for anonymous tracking

### Implementation Scope

#### 1. Auth Infrastructure (~2 hours)
- Install `@supabase/ssr` for cookie-based session management
- Create Supabase client helpers (browser client, server client, middleware client)
- Add Next.js middleware for session refresh (`middleware.ts`)
- Configure auth redirect URLs in Supabase dashboard

#### 2. Auth UI (~1-2 hours)
- Magic link (email) as primary — lowest friction
- Optional: Google/Apple OAuth for faster onboarding
- Login/signup modal or page
- User menu in header (avatar, sign out)
- "Save your results" prompt post-analysis for anonymous users

#### 3. Database (~1 hour)
- `user_profiles` table (id, display_name, created_at)
- `saved_analyses` table (id, user_id, analysis_date, summary_json, created_at)
- Row Level Security (RLS) policies so users only see their own data
- Migration files

#### 4. Data Persistence (~2 hours)
- Save analysis summaries to Supabase when logged in
- History page showing past analyses
- "Continue as guest" flow (current localStorage behavior)
- Optional: migrate localStorage data to account on first login

### Privacy Considerations
- Core promise: "all analysis is client-side, no health data sent to servers"
- Account feature stores **summary results only** (same as current localStorage)
- Raw PAP data (EDF/CSV files) never leaves the browser
- Must clearly communicate what is and isn't stored
- Consider making account feature opt-in with clear data policy

### Auth Methods (recommended)
1. **Magic link** (email) — primary, lowest friction
2. **Google OAuth** — optional, fast onboarding
3. **Apple Sign-In** — optional, good for iOS users

### Not in scope (v1)
- Password-based auth (friction, security burden)
- Multi-device sync of raw data
- Sharing analyses with doctors
- Premium/paid features gating
