import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { getSupabaseServer, getSupabaseServiceRole } from '@/lib/supabase/server';
import { RateLimiter, getRateLimitKey } from '@/lib/rate-limit';
import { validateOrigin } from '@/lib/csrf';
import { STORAGE_BUCKET } from '@/lib/storage/types';

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

    const supabase = getSupabaseServer();
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

    // 2. Delete from DB tables (service role to bypass RLS)
    const tables = [
      'user_files',
      'user_storage_usage',
      'analysis_data',
      'contributed_data',
      'contributed_waveforms',
      'ai_usage',
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

    // 3. Delete from consent_audit
    try {
      const { error: consentError } = await serviceRole
        .from('consent_audit')
        .delete()
        .eq('user_id', user.id);

      if (consentError) {
        Sentry.captureException(consentError, {
          extra: { userId: user.id, step: 'delete_consent_audit' },
        });
      }
    } catch (error) {
      Sentry.captureException(error, {
        extra: { userId: user.id, step: 'delete_consent_audit' },
      });
    }

    return NextResponse.json({ deleted: true });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
