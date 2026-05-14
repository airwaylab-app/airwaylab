import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { z } from 'zod';
import { getSupabaseServer, getSupabaseServiceRole } from '@/lib/supabase/server';
import { RateLimiter, getRateLimitKey } from '@/lib/rate-limit';
import { validateOrigin } from '@/lib/csrf';
import { STORAGE_BUCKET } from '@/lib/storage/types';

// This endpoint derives all input from the authenticated session.
// No request body is accepted; unexpected fields are rejected.
const BodySchema = z.object({}).strict();

const rateLimiter = new RateLimiter({ windowMs: 3_600_000, max: 3 });

export async function POST(request: NextRequest) {
  try {
    if (!validateOrigin(request)) {
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
    }

    const ip = getRateLimitKey(request);
    if (await rateLimiter.isLimited(ip)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const rawBody = await request.json().catch(() => null);
    if (rawBody !== null) {
      const parsed = BodySchema.safeParse(rawBody);
      if (!parsed.success) {
        return NextResponse.json({ error: 'This endpoint does not accept a request body.' }, { status: 400 });
      }
    }

    const supabase = await getSupabaseServer();
    if (!supabase) {
      return NextResponse.json({ error: 'Auth not configured' }, { status: 503 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceRole = getSupabaseServiceRole();
    if (!serviceRole) {
      return NextResponse.json({ error: 'Service not configured' }, { status: 503 });
    }

    // 1. Delete files from Supabase Storage (handles nested directories)
    try {
      // List top-level entries (date folders + analysis folder)
      const { data: topLevel } = await serviceRole.storage
        .from(STORAGE_BUCKET)
        .list(user.id);

      if (topLevel && topLevel.length > 0) {
        const allPaths: string[] = [];
        for (const entry of topLevel) {
          // Entry could be a folder or file — list contents of each folder
          const { data: subFiles } = await serviceRole.storage
            .from(STORAGE_BUCKET)
            .list(`${user.id}/${entry.name}`);

          if (subFiles && subFiles.length > 0) {
            for (const file of subFiles) {
              allPaths.push(`${user.id}/${entry.name}/${file.name}`);
            }
          } else if (entry.id) {
            // It's a file at top level
            allPaths.push(`${user.id}/${entry.name}`);
          }
        }

        if (allPaths.length > 0) {
          // Remove in batches of 100
          for (let i = 0; i < allPaths.length; i += 100) {
            const batch = allPaths.slice(i, i + 100);
            const { error: removeError } = await serviceRole.storage
              .from(STORAGE_BUCKET)
              .remove(batch);

            if (removeError) {
              Sentry.captureException(removeError, {
                extra: { userId: user.id, step: 'storage_delete', batch: i },
              });
            }
          }
        }
      }
    } catch (error) {
      Sentry.captureException(error, {
        extra: { userId: user.id, step: 'storage_delete' },
      });
    }

    // 2. Delete user health data from DB (service role to bypass RLS)
    //
    // Excluded by design:
    //   - data_contributions, waveform_contributions, symptom_contributions,
    //     oximetry_trace_contributions: anonymised research data, no user_id
    //   - ai_usage: usage counter, not user data (resetting would grant free credits)
    //   - email_sequences: drip state (deleting re-triggers onboarding emails)
    //   - consent_audit: legal compliance record, retained under GDPR Art. 17(3)(b)
    const tables = [
      'user_files',
      'user_storage_usage',
      'analysis_data',
      'user_nights',
    ];

    for (const table of tables) {
      try {
        const { error: deleteError } = await serviceRole
          .from(table)
          .delete()
          .eq('user_id', user.id);

        if (deleteError) {
          Sentry.captureException(deleteError, {
            extra: { userId: user.id, step: `delete_${table}` },
          });
        }
      } catch (error) {
        Sentry.captureException(error, {
          extra: { userId: user.id, step: `delete_${table}` },
        });
      }
    }

    // remind_requests has no user_id FK — delete by email
    if (user.email) {
      try {
        const { error: remindError } = await serviceRole
          .from('remind_requests')
          .delete()
          .eq('email', user.email);

        if (remindError) {
          Sentry.captureException(remindError, {
            extra: { userId: user.id, step: 'delete_remind_requests' },
          });
        }
      } catch (error) {
        Sentry.captureException(error, {
          extra: { userId: user.id, step: 'delete_remind_requests' },
        });
      }
    }

    // consent_audit is intentionally retained (GDPR Art. 17(3)(b) — legal compliance)

    // 3. Delete auth user — cascades to profiles and all FK children
    //    (profiles → user_files, user_storage_usage, user_nights, subscriptions;
    //     auth.users → analysis_data, ai_insights_log, account_deletion_requests)
    const { error: deleteAuthError } = await serviceRole.auth.admin.deleteUser(user.id);
    if (deleteAuthError) {
      Sentry.captureException(deleteAuthError, {
        extra: { userId: user.id, step: 'delete_auth_user' },
      });
      return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
    }

    return NextResponse.json({ deleted: true });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { route: 'delete-user-data' },
      extra: {
        errorName: error instanceof Error ? error.name : typeof error,
        errorMessage: error instanceof Error ? error.message : String(error),
      },
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
