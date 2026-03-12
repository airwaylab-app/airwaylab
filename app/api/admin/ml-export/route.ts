import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { getSupabaseServiceRole } from '@/lib/supabase/server';
import { validateAdminAuth } from '@/lib/admin-auth';
import { serverEnv } from '@/lib/env';

/**
 * GET /api/admin/ml-export
 *
 * Admin-only endpoint to export ML training data from
 * anonymised symptom contributions.
 *
 * Query params:
 *   - format: 'json' (default) | 'csv'
 *   - stats: 'true' to return dataset stats instead of data
 *
 * Auth: x-admin-api-key header must match ADMIN_API_KEY env var
 */
export async function GET(request: NextRequest) {
  // Auth check
  const apiKey = request.headers.get('x-admin-api-key');
  const auth = validateAdminAuth(apiKey, serverEnv.ADMIN_API_KEY);

  if (!auth.authorized) {
    return NextResponse.json(
      { error: auth.error },
      { status: 401 }
    );
  }

  const supabase = getSupabaseServiceRole();
  if (!supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') || 'json';
  const statsOnly = searchParams.get('stats') === 'true';

  try {
    if (statsOnly) {
      const { data, error } = await supabase.rpc('ml_dataset_stats');
      if (error) {
        console.error('[ml-export] Stats query failed:', error);
        Sentry.captureException(error, { tags: { route: 'admin-ml-export' } });
        return NextResponse.json({ error: 'Stats query failed' }, { status: 500 });
      }
      return NextResponse.json(data);
    }

    const { data, error } = await supabase.rpc('export_ml_training_data');
    if (error) {
      console.error('[ml-export] Export query failed:', error);
      Sentry.captureException(error, { tags: { route: 'admin-ml-export' } });
      return NextResponse.json({ error: 'Export query failed' }, { status: 500 });
    }

    if (format === 'csv') {
      return convertToCsv(data || []);
    }

    return NextResponse.json({
      meta: {
        total_rows: (data || []).length,
        exported_at: new Date().toISOString(),
        columns: [
          'symptom_rating', 'glasgow_overall', 'fl_score', 'regularity',
          'ned_mean', 'rera_index', 'combined_fl_pct', 'eai',
          'pressure_bucket', 'pap_mode', 'device_model', 'duration_hours',
          'ifl_risk',
        ],
      },
      data: data || [],
    });
  } catch (err) {
    console.error('[ml-export] Unexpected error:', err);
    Sentry.captureException(err, { tags: { route: 'admin-ml-export' } });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

interface MlRow {
  symptom_rating: number;
  glasgow_overall: number;
  fl_score: number;
  regularity: number;
  ned_mean: number;
  rera_index: number;
  combined_fl_pct: number;
  eai: number;
  pressure_bucket: string;
  pap_mode: string;
  device_model: string;
  duration_hours: number;
  ifl_risk: number;
}

function convertToCsv(data: MlRow[]): NextResponse {
  const columns = [
    'symptom_rating', 'glasgow_overall', 'fl_score', 'regularity',
    'ned_mean', 'rera_index', 'combined_fl_pct', 'eai',
    'pressure_bucket', 'pap_mode', 'device_model', 'duration_hours',
    'ifl_risk',
  ] as const;

  const header = columns.join(',');
  const rows = data.map((row) =>
    columns.map((col) => {
      const val = row[col];
      // Quote strings that may contain commas
      if (typeof val === 'string') {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val ?? '';
    }).join(',')
  );

  const csv = [header, ...rows].join('\n');

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="airwaylab-ml-training-data-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
