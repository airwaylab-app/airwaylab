// ============================================================
// AirwayLab — Ensure Profile Route
// Idempotent profile repair for authenticated users whose
// profile row is missing (trigger gap, stale session, etc.).
// Called by auth-context when fetchProfile returns null.
// ============================================================

import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { getSupabaseServer, getSupabaseServiceRole } from '@/lib/supabase/server';

export async function POST() {
  const supabase = await getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: 'Auth not configured' }, { status: 503 });
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }

  const adminClient = getSupabaseServiceRole();
  if (!adminClient) {
    Sentry.captureMessage('ensure-profile: service role client unavailable', {
      level: 'error',
      tags: { route: 'ensure-profile' },
      extra: { userId: user.id },
    });
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }

  const { error: upsertError } = await adminClient
    .from('profiles')
    .upsert(
      {
        id: user.id,
        email: user.email ?? '',
        storage_consent: true,
        storage_consent_at: new Date().toISOString(),
      },
      { onConflict: 'id', ignoreDuplicates: true }
    );

  if (upsertError) {
    console.error('[ensure-profile] Upsert failed:', upsertError.message);
    Sentry.captureMessage('ensure-profile: upsert failed', {
      level: 'error',
      tags: { route: 'ensure-profile' },
      extra: { userId: user.id, error: upsertError.message },
    });
    return NextResponse.json({ error: 'Profile repair failed' }, { status: 500 });
  }

  Sentry.captureMessage('ensure-profile: repaired missing profile row', {
    level: 'info',
    tags: { route: 'ensure-profile' },
    extra: { userId: user.id },
  });

  console.error('[ensure-profile] Repaired missing profile for user:', user.id);
  return NextResponse.json({ ok: true });
}
