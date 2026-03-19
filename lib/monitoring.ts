/**
 * Multi-service usage monitoring for AirwayLab.
 *
 * Checks usage across all paid services (Supabase, Vercel, Anthropic,
 * Sentry, Resend, Upstash) and produces unified alerts + daily snapshots.
 *
 * Each check is fail-open: if a service API is unreachable, it reports
 * "unavailable" and the rest continue.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { serverEnv } from '@/lib/env';

// ── Types ───────────────────────────────────────────────────

export type ServiceStatus = 'ok' | 'warning' | 'critical' | 'unavailable' | 'not_configured';
export type ServiceSeverity = 'critical' | 'medium' | 'low';

export interface ServiceCheck {
  service: string;
  severity: ServiceSeverity;
  status: ServiceStatus;
  usage_pct: number | null;
  current: string;
  limit: string;
  details?: Record<string, unknown>;
  error?: string;
}

// ── Thresholds ──────────────────────────────────────────────

const WARNING_THRESHOLD = 80;
const CRITICAL_THRESHOLD = 90;

// Supabase Pro
const SUPABASE_DB_LIMIT_BYTES = 8 * 1024 * 1024 * 1024;         // 8 GB
const SUPABASE_STORAGE_LIMIT_BYTES = 100 * 1024 * 1024 * 1024;  // 100 GB

// Vercel Pro
const VERCEL_BANDWIDTH_LIMIT_BYTES = 1024 * 1024 * 1024 * 1024; // 1 TB

// Resend Pro (transactional)
const RESEND_MONTHLY_LIMIT = 50_000;

// Sentry Free
const SENTRY_MONTHLY_EVENT_LIMIT = 5_000;

// Anthropic cost alert threshold (USD per month)
const ANTHROPIC_COST_WARNING_USD = 10;
const ANTHROPIC_COST_CRITICAL_USD = 25;

// Anthropic pricing per million tokens (USD) — Sonnet as upper bound
const SONNET_INPUT_PER_MTOK = 3.00;
const SONNET_OUTPUT_PER_MTOK = 15.00;

// ── Helpers ─────────────────────────────────────────────────

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes < 1024 * 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  return `${(bytes / (1024 * 1024 * 1024 * 1024)).toFixed(2)} TB`;
}

export function getStatus(usagePct: number): ServiceStatus {
  if (usagePct >= CRITICAL_THRESHOLD) return 'critical';
  if (usagePct >= WARNING_THRESHOLD) return 'warning';
  return 'ok';
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── Service Checks ──────────────────────────────────────────

interface StorageStats {
  database_size_bytes: number;
  shared_analyses_rows: number;
  analysis_sessions_rows: number;
  data_contributions_rows: number;
  waveform_contributions_rows: number;
  user_files_rows: number;
  user_files_total_bytes: number;
}

async function checkSupabaseDB(supabase: SupabaseClient): Promise<ServiceCheck> {
  const { data, error } = await supabase.rpc('get_storage_stats');
  if (error) {
    return {
      service: 'supabase_db',
      severity: 'critical',
      status: 'unavailable',
      usage_pct: null,
      current: 'N/A',
      limit: formatBytes(SUPABASE_DB_LIMIT_BYTES),
      error: error.message,
    };
  }
  const stats = data as StorageStats;
  const pct = (stats.database_size_bytes / SUPABASE_DB_LIMIT_BYTES) * 100;
  return {
    service: 'supabase_db',
    severity: 'critical',
    status: getStatus(pct),
    usage_pct: Math.round(pct * 10) / 10,
    current: formatBytes(stats.database_size_bytes),
    limit: formatBytes(SUPABASE_DB_LIMIT_BYTES),
    details: {
      shared_analyses_rows: stats.shared_analyses_rows,
      analysis_sessions_rows: stats.analysis_sessions_rows,
      data_contributions_rows: stats.data_contributions_rows,
      waveform_contributions_rows: stats.waveform_contributions_rows,
      user_files_rows: stats.user_files_rows,
    },
  };
}

async function checkSupabaseStorage(supabase: SupabaseClient): Promise<ServiceCheck> {
  const { data, error } = await supabase.rpc('get_storage_stats');
  if (error) {
    return {
      service: 'supabase_storage',
      severity: 'critical',
      status: 'unavailable',
      usage_pct: null,
      current: 'N/A',
      limit: formatBytes(SUPABASE_STORAGE_LIMIT_BYTES),
      error: error.message,
    };
  }
  const stats = data as StorageStats;
  const pct = (stats.user_files_total_bytes / SUPABASE_STORAGE_LIMIT_BYTES) * 100;
  return {
    service: 'supabase_storage',
    severity: 'critical',
    status: getStatus(pct),
    usage_pct: Math.round(pct * 10) / 10,
    current: formatBytes(stats.user_files_total_bytes),
    limit: formatBytes(SUPABASE_STORAGE_LIMIT_BYTES),
  };
}

async function checkVercel(): Promise<ServiceCheck> {
  const token = serverEnv.VERCEL_TOKEN;
  const teamId = serverEnv.VERCEL_TEAM_ID;

  if (!token || !teamId) {
    return {
      service: 'vercel',
      severity: 'critical',
      status: 'not_configured',
      usage_pct: null,
      current: 'N/A',
      limit: formatBytes(VERCEL_BANDWIDTH_LIMIT_BYTES),
      error: 'Not configured -- add VERCEL_TOKEN and VERCEL_TEAM_ID to enable monitoring',
    };
  }

  try {
    const res = await fetch(`https://api.vercel.com/v1/usage?teamId=${teamId}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      const text = await res.text();
      return {
        service: 'vercel',
        severity: 'critical',
        status: 'unavailable',
        usage_pct: null,
        current: 'N/A',
        limit: formatBytes(VERCEL_BANDWIDTH_LIMIT_BYTES),
        error: `Vercel API ${res.status}: ${text.slice(0, 200)}`,
      };
    }

    const usage = await res.json();
    const bandwidth = usage?.metrics?.bandwidth?.usage ?? 0;
    const pct = (bandwidth / VERCEL_BANDWIDTH_LIMIT_BYTES) * 100;

    return {
      service: 'vercel',
      severity: 'critical',
      status: getStatus(pct),
      usage_pct: Math.round(pct * 10) / 10,
      current: formatBytes(bandwidth),
      limit: formatBytes(VERCEL_BANDWIDTH_LIMIT_BYTES),
      details: { raw_usage: usage?.metrics },
    };
  } catch (err) {
    return {
      service: 'vercel',
      severity: 'critical',
      status: 'unavailable',
      usage_pct: null,
      current: 'N/A',
      limit: formatBytes(VERCEL_BANDWIDTH_LIMIT_BYTES),
      error: `Vercel API error: ${err instanceof Error ? err.message : 'unknown'}`,
    };
  }
}

async function checkAnthropic(supabase: SupabaseClient): Promise<ServiceCheck> {
  const month = getCurrentMonth();
  const { data, error } = await supabase.rpc('get_monthly_ai_token_usage', { p_month: month });

  if (error) {
    return {
      service: 'anthropic',
      severity: 'medium',
      status: 'unavailable',
      usage_pct: null,
      current: 'N/A',
      limit: 'Pay-per-use',
      error: error.message,
    };
  }

  const totalCalls = Number(data?.total_calls ?? 0);
  const inputTokens = Number(data?.total_input_tokens ?? 0);
  const outputTokens = Number(data?.total_output_tokens ?? 0);

  // Estimate cost using Sonnet pricing as upper bound
  const estimatedCost =
    (inputTokens / 1_000_000) * SONNET_INPUT_PER_MTOK +
    (outputTokens / 1_000_000) * SONNET_OUTPUT_PER_MTOK;

  let status: ServiceStatus = 'ok';
  let usagePct: number | null = null;
  if (estimatedCost >= ANTHROPIC_COST_CRITICAL_USD) {
    status = 'critical';
    usagePct = (estimatedCost / ANTHROPIC_COST_CRITICAL_USD) * 100;
  } else if (estimatedCost >= ANTHROPIC_COST_WARNING_USD) {
    status = 'warning';
    usagePct = (estimatedCost / ANTHROPIC_COST_CRITICAL_USD) * 100;
  }

  return {
    service: 'anthropic',
    severity: 'medium',
    status,
    usage_pct: usagePct !== null ? Math.round(usagePct * 10) / 10 : null,
    current: `~$${estimatedCost.toFixed(2)}`,
    limit: 'Pay-per-use',
    details: {
      total_calls: totalCalls,
      total_input_tokens: inputTokens,
      total_output_tokens: outputTokens,
      estimated_cost_usd: Math.round(estimatedCost * 100) / 100,
      month,
    },
  };
}

async function checkSentry(): Promise<ServiceCheck> {
  const token = serverEnv.SENTRY_AUTH_TOKEN;

  if (!token) {
    return {
      service: 'sentry',
      severity: 'low',
      status: 'not_configured',
      usage_pct: null,
      current: 'N/A',
      limit: `${SENTRY_MONTHLY_EVENT_LIMIT.toLocaleString()} events/mo`,
      error: 'Not configured -- add SENTRY_AUTH_TOKEN to enable monitoring',
    };
  }

  try {
    const res = await fetch(
      'https://de.sentry.io/api/0/organizations/airwaylab/stats_v2/?field=sum(quantity)&category=error&interval=1d&statsPeriod=30d',
      {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(10_000),
      }
    );

    if (!res.ok) {
      return {
        service: 'sentry',
        severity: 'low',
        status: 'unavailable',
        usage_pct: null,
        current: 'N/A',
        limit: `${SENTRY_MONTHLY_EVENT_LIMIT.toLocaleString()} events/mo`,
        error: `Sentry API ${res.status}`,
      };
    }

    const stats = await res.json();
    const totalEvents = stats?.groups?.[0]?.totals?.['sum(quantity)'] ?? 0;
    const pct = (totalEvents / SENTRY_MONTHLY_EVENT_LIMIT) * 100;

    return {
      service: 'sentry',
      severity: 'low',
      status: getStatus(pct),
      usage_pct: Math.round(pct * 10) / 10,
      current: `${totalEvents.toLocaleString()} events`,
      limit: `${SENTRY_MONTHLY_EVENT_LIMIT.toLocaleString()} events/mo`,
    };
  } catch (err) {
    return {
      service: 'sentry',
      severity: 'low',
      status: 'unavailable',
      usage_pct: null,
      current: 'N/A',
      limit: `${SENTRY_MONTHLY_EVENT_LIMIT.toLocaleString()} events/mo`,
      error: `Sentry API error: ${err instanceof Error ? err.message : 'unknown'}`,
    };
  }
}

async function checkResend(supabase: SupabaseClient): Promise<ServiceCheck> {
  const startOfMonth = `${getCurrentMonth()}-01T00:00:00Z`;

  const { count, error } = await supabase
    .from('email_sequences')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'sent')
    .gte('sent_at', startOfMonth);

  if (error) {
    return {
      service: 'resend',
      severity: 'low',
      status: 'unavailable',
      usage_pct: null,
      current: 'N/A',
      limit: `${RESEND_MONTHLY_LIMIT.toLocaleString()}/mo`,
      error: error.message,
    };
  }

  const sentCount = count ?? 0;
  const pct = (sentCount / RESEND_MONTHLY_LIMIT) * 100;

  return {
    service: 'resend',
    severity: 'low',
    status: getStatus(pct),
    usage_pct: Math.round(pct * 10) / 10,
    current: `${sentCount.toLocaleString()} emails`,
    limit: `${RESEND_MONTHLY_LIMIT.toLocaleString()}/mo`,
    details: { sent_this_month: sentCount },
  };
}

async function checkUpstash(): Promise<ServiceCheck> {
  const url = serverEnv.UPSTASH_REDIS_REST_URL;
  const token = serverEnv.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return {
      service: 'upstash',
      severity: 'low',
      status: 'not_configured',
      usage_pct: null,
      current: 'Not configured',
      limit: '10,000 cmds/day',
      error: 'Not configured -- using in-memory rate limiting',
    };
  }

  try {
    const res = await fetch(`${url}/PING`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5_000),
    });

    if (!res.ok) {
      return {
        service: 'upstash',
        severity: 'low',
        status: 'unavailable',
        usage_pct: null,
        current: 'Unreachable',
        limit: '10,000 cmds/day',
        error: `Upstash ${res.status}`,
      };
    }

    return {
      service: 'upstash',
      severity: 'low',
      status: 'ok',
      usage_pct: null,
      current: 'Reachable',
      limit: '10,000 cmds/day',
    };
  } catch (err) {
    return {
      service: 'upstash',
      severity: 'low',
      status: 'unavailable',
      usage_pct: null,
      current: 'Unreachable',
      limit: '10,000 cmds/day',
      error: `Upstash error: ${err instanceof Error ? err.message : 'unknown'}`,
    };
  }
}

// ── Orchestrator ────────────────────────────────────────────

export async function checkAll(supabase: SupabaseClient): Promise<ServiceCheck[]> {
  const results = await Promise.allSettled([
    checkSupabaseDB(supabase),
    checkSupabaseStorage(supabase),
    checkVercel(),
    checkAnthropic(supabase),
    checkSentry(),
    checkResend(supabase),
    checkUpstash(),
  ]);

  const services = ['supabase_db', 'supabase_storage', 'vercel', 'anthropic', 'sentry', 'resend', 'upstash'];
  const severities: ServiceSeverity[] = ['critical', 'critical', 'critical', 'medium', 'low', 'low', 'low'];

  return results.map((r, i) => {
    if (r.status === 'fulfilled') return r.value;
    return {
      service: services[i]!,
      severity: severities[i]!,
      status: 'unavailable' as ServiceStatus,
      usage_pct: null,
      current: 'N/A',
      limit: 'N/A',
      error: r.reason instanceof Error ? r.reason.message : 'Check failed',
    };
  });
}

// ── Alert Formatting ────────────────────────────────────────

export function buildCriticalAlerts(checks: ServiceCheck[]): ServiceCheck[] {
  return checks.filter(
    (c) => c.severity === 'critical' && (c.status === 'warning' || c.status === 'critical')
  );
}

export function formatAlertEmail(checks: ServiceCheck[]): { subject: string; body: string } {
  const alertChecks = checks.filter((c) => c.status === 'warning' || c.status === 'critical');
  const hasUrgent = checks.some((c) => c.usage_pct !== null && c.usage_pct >= CRITICAL_THRESHOLD);

  const alertCount = alertChecks.length;
  const plural = alertCount === 1 ? '' : 's';

  const subject = hasUrgent
    ? `URGENT: AirwayLab usage alert (${alertCount} service${plural} over 90%)`
    : `AirwayLab: Usage alert (${alertCount} service${plural} over threshold)`;

  const severityOrder: ServiceSeverity[] = ['critical', 'medium', 'low'];
  const severityLabels: Record<ServiceSeverity, string> = {
    critical: 'CRITICAL (would break core functionality)',
    medium: 'MEDIUM (feature degradation)',
    low: 'LOW (operational)',
  };

  const sections: string[] = [];
  for (const sev of severityOrder) {
    const group = checks.filter((c) => c.severity === sev);
    if (group.length === 0) continue;

    sections.push(`--- ${severityLabels[sev]} ---`);
    sections.push('');
    for (const c of group) {
      const statusTag = c.status.toUpperCase();
      if (c.usage_pct !== null) {
        sections.push(`${c.service}: ${c.current} / ${c.limit} (${c.usage_pct}%) [${statusTag}]`);
      } else if (c.error) {
        sections.push(`${c.service}: ${c.error}`);
      } else {
        sections.push(`${c.service}: ${c.current} [${statusTag}]`);
      }
    }
    sections.push('');
  }

  // Supabase detail section
  const dbCheck = checks.find((c) => c.service === 'supabase_db');
  if (dbCheck?.details) {
    sections.push('--- Supabase Detail ---');
    sections.push('');
    sections.push(`Database size: ${dbCheck.current} / ${dbCheck.limit} (${dbCheck.usage_pct ?? '?'}%)`);
    const storageCheck = checks.find((c) => c.service === 'supabase_storage');
    if (storageCheck) {
      sections.push(`File storage:  ${storageCheck.current} / ${storageCheck.limit} (${storageCheck.usage_pct ?? '?'}%)`);
    }
    sections.push('');
    const d = dbCheck.details;
    sections.push(`shared_analyses:        ${(d.shared_analyses_rows as number)?.toLocaleString() ?? '?'} rows`);
    sections.push(`analysis_sessions:      ${(d.analysis_sessions_rows as number)?.toLocaleString() ?? '?'} rows`);
    sections.push(`data_contributions:     ${(d.data_contributions_rows as number)?.toLocaleString() ?? '?'} rows`);
    sections.push(`waveform_contributions: ${(d.waveform_contributions_rows as number)?.toLocaleString() ?? '?'} rows`);
    sections.push(`user_files:             ${(d.user_files_rows as number)?.toLocaleString() ?? '?'} rows`);
    sections.push('');
  }

  // Critical alerts summary
  const criticalAlerts = buildCriticalAlerts(checks);
  if (criticalAlerts.length > 0) {
    sections.push(`Services at risk of breaking: ${criticalAlerts.map((c) => c.service).join(', ')}`);
    sections.push('');
  }

  sections.push('---');
  sections.push('Daily snapshot saved. Query: SELECT * FROM daily_usage_snapshots ORDER BY snapshot_date DESC LIMIT 7;');

  const body = sections.join('\n');
  return { subject, body };
}

// ── Snapshot Persistence ────────────────────────────────────

export async function writeSnapshot(
  supabase: SupabaseClient,
  checks: ServiceCheck[],
  alertsSent: number
): Promise<void> {
  const criticalAlerts = buildCriticalAlerts(checks);

  const { error } = await supabase
    .from('daily_usage_snapshots')
    .upsert(
      {
        snapshot_date: getToday(),
        metrics: checks,
        critical_alerts: criticalAlerts,
        alerts_sent: alertsSent,
      },
      { onConflict: 'snapshot_date' }
    );

  if (error) {
    console.error('[monitoring] Failed to write snapshot:', error.message);
  }
}
