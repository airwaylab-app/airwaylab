import { describe, expect, it } from 'vitest';
import {
  getStatus,
  formatBytes,
  formatAlertEmail,
  buildCriticalAlerts,
  type ServiceCheck,
  type ServiceSeverity,
  type ServiceStatus,
} from '@/lib/monitoring';

// ── Helper: build a ServiceCheck with defaults ──────────────
function makeCheck(overrides: Partial<ServiceCheck> = {}): ServiceCheck {
  return {
    service: 'test_service',
    severity: 'low',
    status: 'ok',
    usage_pct: 50,
    current: '50 MB',
    limit: '100 MB',
    ...overrides,
  };
}

// ── getStatus: threshold calculations ────────────────────────
describe('getStatus', () => {
  it('returns "ok" at 79%', () => {
    expect(getStatus(79)).toBe('ok');
  });

  it('returns "warning" at exactly 80%', () => {
    expect(getStatus(80)).toBe('warning');
  });

  it('returns "warning" at 89%', () => {
    expect(getStatus(89)).toBe('warning');
  });

  it('returns "critical" at exactly 90%', () => {
    expect(getStatus(90)).toBe('critical');
  });

  it('returns "critical" at 95%', () => {
    expect(getStatus(95)).toBe('critical');
  });

  it('returns "critical" at 100%+ (over-limit)', () => {
    expect(getStatus(150)).toBe('critical');
  });

  it('returns "ok" at 0%', () => {
    expect(getStatus(0)).toBe('ok');
  });

  it('returns "ok" for very small fractional values', () => {
    expect(getStatus(0.001)).toBe('ok');
  });

  it('returns "warning" at 79.999 rounded to 80 threshold boundary', () => {
    // 79.999 is below 80, should still be ok
    expect(getStatus(79.999)).toBe('ok');
  });

  it('returns "warning" at 89.999 (just below critical)', () => {
    expect(getStatus(89.999)).toBe('warning');
  });
});

// ── not_configured status ───────────────────────────────────
describe('not_configured status', () => {
  it('is a valid ServiceStatus with null usage', () => {
    const check = makeCheck({ status: 'not_configured', usage_pct: null, error: 'VERCEL_TOKEN not configured' });
    expect(check.status).toBe('not_configured');
    expect(check.usage_pct).toBeNull();
  });

  it('preserves error message for missing config', () => {
    const check = makeCheck({ status: 'not_configured', error: 'Not configured -- add SENTRY_AUTH_TOKEN' });
    expect(check.error).toContain('Not configured');
  });
});

// ── formatAlertEmail ────────────────────────────────────────
describe('formatAlertEmail', () => {
  it('uses normal subject when highest usage is 80-89%', () => {
    const checks = [
      makeCheck({ service: 'supabase_storage', severity: 'critical', status: 'warning', usage_pct: 85 }),
      makeCheck({ service: 'sentry', severity: 'low', status: 'ok', usage_pct: 40 }),
    ];
    const { subject } = formatAlertEmail(checks);
    expect(subject).toContain('Usage alert');
    expect(subject).not.toContain('URGENT');
  });

  it('uses URGENT subject when any service is >= 90%', () => {
    const checks = [
      makeCheck({ service: 'supabase_db', severity: 'critical', status: 'critical', usage_pct: 92 }),
      makeCheck({ service: 'sentry', severity: 'low', status: 'ok', usage_pct: 40 }),
    ];
    const { subject } = formatAlertEmail(checks);
    expect(subject).toContain('URGENT');
  });

  it('counts only warning/critical services in the alert count', () => {
    const checks = [
      makeCheck({ service: 'a', severity: 'critical', status: 'warning', usage_pct: 82 }),
      makeCheck({ service: 'b', severity: 'low', status: 'ok', usage_pct: 40 }),
      makeCheck({ service: 'c', severity: 'medium', status: 'critical', usage_pct: 95 }),
    ];
    const { subject } = formatAlertEmail(checks);
    expect(subject).toContain('2');
  });

  it('groups services by severity (critical first)', () => {
    const checks = [
      makeCheck({ service: 'sentry', severity: 'low', status: 'ok', usage_pct: 40 }),
      makeCheck({ service: 'supabase_db', severity: 'critical', status: 'warning', usage_pct: 85 }),
      makeCheck({ service: 'anthropic', severity: 'medium', status: 'ok', usage_pct: null }),
    ];
    const { body } = formatAlertEmail(checks);
    const criticalPos = body.indexOf('CRITICAL');
    const mediumPos = body.indexOf('MEDIUM');
    const lowPos = body.indexOf('LOW');
    expect(criticalPos).toBeLessThan(mediumPos);
    expect(mediumPos).toBeLessThan(lowPos);
  });

  it('does not crash with all-healthy checks', () => {
    const checks = [
      makeCheck({ service: 'a', status: 'ok', usage_pct: 10 }),
      makeCheck({ service: 'b', status: 'ok', usage_pct: 20 }),
    ];
    const { subject, body } = formatAlertEmail(checks);
    expect(subject).toBeDefined();
    expect(body).toBeDefined();
  });

  it('shows singular "service" for single alert', () => {
    const checks = [
      makeCheck({ service: 'supabase_db', severity: 'critical', status: 'warning', usage_pct: 85 }),
    ];
    const { subject } = formatAlertEmail(checks);
    expect(subject).toMatch(/1 service\b/);
    expect(subject).not.toContain('services');
  });

  it('shows plural "services" for multiple alerts', () => {
    const checks = [
      makeCheck({ service: 'a', severity: 'critical', status: 'warning', usage_pct: 82 }),
      makeCheck({ service: 'b', severity: 'critical', status: 'critical', usage_pct: 91 }),
    ];
    const { subject } = formatAlertEmail(checks);
    expect(subject).toContain('services');
  });

  it('includes Supabase detail section when supabase_db has details', () => {
    const checks = [
      makeCheck({
        service: 'supabase_db',
        severity: 'critical',
        status: 'ok',
        usage_pct: 20,
        current: '1.60 GB',
        limit: '8.00 GB',
        details: {
          shared_analyses_rows: 150,
          analysis_sessions_rows: 500,
          data_contributions_rows: 80,
          waveform_contributions_rows: 30,
          user_files_rows: 10,
        },
      }),
      makeCheck({
        service: 'supabase_storage',
        severity: 'critical',
        status: 'ok',
        usage_pct: 5,
        current: '5.00 GB',
        limit: '100.00 GB',
      }),
    ];
    const { body } = formatAlertEmail(checks);
    expect(body).toContain('Supabase Detail');
    expect(body).toContain('Database size: 1.60 GB');
    expect(body).toContain('shared_analyses');
    expect(body).toContain('150');
    expect(body).toContain('File storage:');
  });

  it('omits Supabase detail when supabase_db has no details', () => {
    const checks = [
      makeCheck({ service: 'supabase_db', severity: 'critical', status: 'ok', usage_pct: 20 }),
    ];
    const { body } = formatAlertEmail(checks);
    expect(body).not.toContain('Supabase Detail');
  });

  it('includes critical alerts summary when critical services are at risk', () => {
    const checks = [
      makeCheck({ service: 'supabase_db', severity: 'critical', status: 'critical', usage_pct: 95 }),
      makeCheck({ service: 'vercel', severity: 'critical', status: 'warning', usage_pct: 85 }),
    ];
    const { body } = formatAlertEmail(checks);
    expect(body).toContain('Services at risk of breaking');
    expect(body).toContain('supabase_db');
    expect(body).toContain('vercel');
  });

  it('shows error message for unavailable services with no usage_pct', () => {
    const checks = [
      makeCheck({
        service: 'vercel',
        severity: 'critical',
        status: 'unavailable',
        usage_pct: null,
        error: 'Vercel API 401: Unauthorized',
      }),
    ];
    const { body } = formatAlertEmail(checks);
    expect(body).toContain('Vercel API 401');
  });

  it('shows status tag for services with no usage_pct and no error', () => {
    const checks = [
      makeCheck({
        service: 'upstash',
        severity: 'low',
        status: 'ok',
        usage_pct: null,
        current: 'Reachable',
      }),
    ];
    const { body } = formatAlertEmail(checks);
    expect(body).toContain('upstash: Reachable [OK]');
  });

  it('always ends with snapshot persistence info', () => {
    const checks = [makeCheck({ status: 'ok', usage_pct: 10 })];
    const { body } = formatAlertEmail(checks);
    expect(body).toContain('Daily snapshot saved');
    expect(body).toContain('daily_usage_snapshots');
  });

  it('handles empty checks array without crashing', () => {
    const { subject, body } = formatAlertEmail([]);
    expect(subject).toBeDefined();
    expect(body).toBeDefined();
    expect(subject).toContain('0 services');
  });
});

// ── buildCriticalAlerts ─────────────────────────────────────
describe('buildCriticalAlerts', () => {
  it('only includes checks with severity "critical" AND status warning/critical', () => {
    const checks = [
      makeCheck({ service: 'supabase_db', severity: 'critical', status: 'warning', usage_pct: 85 }),
      makeCheck({ service: 'supabase_storage', severity: 'critical', status: 'ok', usage_pct: 50 }),
      makeCheck({ service: 'sentry', severity: 'low', status: 'warning', usage_pct: 82 }),
      makeCheck({ service: 'anthropic', severity: 'medium', status: 'critical', usage_pct: 95 }),
      makeCheck({ service: 'vercel', severity: 'critical', status: 'critical', usage_pct: 92 }),
    ];
    const critical = buildCriticalAlerts(checks);
    expect(critical).toHaveLength(2);
    expect(critical.map((c) => c.service)).toEqual(['supabase_db', 'vercel']);
  });

  it('returns empty array when all services are healthy', () => {
    const checks = [
      makeCheck({ service: 'a', severity: 'critical', status: 'ok', usage_pct: 10 }),
      makeCheck({ service: 'b', severity: 'low', status: 'ok', usage_pct: 20 }),
    ];
    const critical = buildCriticalAlerts(checks);
    expect(critical).toHaveLength(0);
  });

  it('excludes critical-severity checks with unavailable status', () => {
    const checks = [
      makeCheck({ service: 'vercel', severity: 'critical', status: 'unavailable', usage_pct: null }),
    ];
    const critical = buildCriticalAlerts(checks);
    expect(critical).toHaveLength(0);
  });

  it('excludes critical-severity checks with not_configured status', () => {
    const checks = [
      makeCheck({ service: 'vercel', severity: 'critical', status: 'not_configured', usage_pct: null }),
    ];
    const critical = buildCriticalAlerts(checks);
    expect(critical).toHaveLength(0);
  });

  it('includes both warning and critical status for critical severity', () => {
    const checks = [
      makeCheck({ service: 'a', severity: 'critical', status: 'warning', usage_pct: 82 }),
      makeCheck({ service: 'b', severity: 'critical', status: 'critical', usage_pct: 95 }),
    ];
    const critical = buildCriticalAlerts(checks);
    expect(critical).toHaveLength(2);
  });

  it('returns empty for empty input', () => {
    expect(buildCriticalAlerts([])).toHaveLength(0);
  });

  it('excludes medium-severity services even when critical status', () => {
    const checks = [
      makeCheck({ service: 'anthropic', severity: 'medium', status: 'critical', usage_pct: 120 }),
    ];
    const critical = buildCriticalAlerts(checks);
    expect(critical).toHaveLength(0);
  });
});

// ── formatBytes helper ──────────────────────────────────────
describe('formatBytes', () => {
  it('formats 0 bytes', () => {
    expect(formatBytes(0)).toBe('0 B');
  });

  it('formats small byte values', () => {
    expect(formatBytes(1)).toBe('1 B');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1023)).toBe('1023 B');
  });

  it('formats kilobytes', () => {
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(2048)).toBe('2.0 KB');
  });

  it('formats megabytes', () => {
    expect(formatBytes(42.2 * 1024 * 1024)).toBe('42.2 MB');
  });

  it('formats gigabytes with 2 decimal places', () => {
    expect(formatBytes(1.73 * 1024 * 1024 * 1024)).toBe('1.73 GB');
  });

  it('formats terabytes with 2 decimal places', () => {
    expect(formatBytes(1.5 * 1024 * 1024 * 1024 * 1024)).toBe('1.50 TB');
  });

  it('formats exact boundaries', () => {
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(1024 * 1024)).toBe('1.0 MB');
    expect(formatBytes(1024 * 1024 * 1024)).toBe('1.00 GB');
    expect(formatBytes(1024 * 1024 * 1024 * 1024)).toBe('1.00 TB');
  });
});

// ── Type exhaustiveness: all ServiceStatus values ───────────
describe('ServiceStatus type coverage', () => {
  const allStatuses: ServiceStatus[] = ['ok', 'warning', 'critical', 'unavailable', 'not_configured'];

  it('all status values can be assigned to ServiceCheck', () => {
    for (const status of allStatuses) {
      const check = makeCheck({ status });
      expect(check.status).toBe(status);
    }
  });
});

describe('ServiceSeverity type coverage', () => {
  const allSeverities: ServiceSeverity[] = ['critical', 'medium', 'low'];

  it('all severity values can be assigned to ServiceCheck', () => {
    for (const severity of allSeverities) {
      const check = makeCheck({ severity });
      expect(check.severity).toBe(severity);
    }
  });
});
