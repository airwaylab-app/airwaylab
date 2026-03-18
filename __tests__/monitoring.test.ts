import { describe, expect, it } from 'vitest';
import {
  getStatus,
  formatBytes,
  formatAlertEmail,
  buildCriticalAlerts,
  type ServiceCheck,
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

// ── Test 1: Threshold calculations ──────────────────────────
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

  it('returns "critical" at 90%', () => {
    expect(getStatus(90)).toBe('critical');
  });

  it('returns "critical" at 95%', () => {
    expect(getStatus(95)).toBe('critical');
  });

  it('returns "critical" at 100%+', () => {
    expect(getStatus(150)).toBe('critical');
  });

  it('returns "ok" at 0%', () => {
    expect(getStatus(0)).toBe('ok');
  });
});

// ── Test 2: Graceful skip for missing config ────────────────
describe('not_configured status', () => {
  it('is a valid ServiceStatus', () => {
    const check = makeCheck({ status: 'not_configured', usage_pct: null, error: 'VERCEL_TOKEN not configured' });
    expect(check.status).toBe('not_configured');
    expect(check.usage_pct).toBeNull();
  });
});

// ── Test 3: Escalating urgency in email subject ─────────────
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
    // Should mention 2 services over threshold
    expect(subject).toContain('2');
  });

  // ── Test 8: Email groups services by severity ─────────────
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
    // Should still produce valid output even if no alerts
    const { subject, body } = formatAlertEmail(checks);
    expect(subject).toBeDefined();
    expect(body).toBeDefined();
  });
});

// ── Test 4: Critical alerts filter ──────────────────────────
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

  // ── Test 7: All-healthy snapshot has empty critical_alerts ─
  it('returns empty array when all services are healthy', () => {
    const checks = [
      makeCheck({ service: 'a', severity: 'critical', status: 'ok', usage_pct: 10 }),
      makeCheck({ service: 'b', severity: 'low', status: 'ok', usage_pct: 20 }),
    ];
    const critical = buildCriticalAlerts(checks);
    expect(critical).toHaveLength(0);
  });
});

// ── Test 9: formatBytes helper ──────────────────────────────
describe('formatBytes', () => {
  it('formats bytes', () => {
    expect(formatBytes(512)).toBe('512 B');
  });

  it('formats kilobytes', () => {
    expect(formatBytes(2048)).toBe('2.0 KB');
  });

  it('formats megabytes', () => {
    expect(formatBytes(42.2 * 1024 * 1024)).toBe('42.2 MB');
  });

  it('formats gigabytes', () => {
    expect(formatBytes(1.73 * 1024 * 1024 * 1024)).toBe('1.73 GB');
  });

  it('formats terabytes', () => {
    expect(formatBytes(1.5 * 1024 * 1024 * 1024 * 1024)).toBe('1.50 TB');
  });

  it('formats 0 bytes', () => {
    expect(formatBytes(0)).toBe('0 B');
  });
});
