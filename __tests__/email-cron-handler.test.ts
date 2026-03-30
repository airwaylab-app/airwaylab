import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all external dependencies before imports
vi.mock('@/lib/email/sequences', () => ({
  getPendingEmails: vi.fn(),
  markSent: vi.fn(),
  scheduleDormancySequences: vi.fn(),
  scheduleActivationSequences: vi.fn(),
  applySunsetPolicy: vi.fn(),
}));

vi.mock('@/lib/email/templates', () => ({
  SEQUENCES: {
    post_upload: {
      totalSteps: 3,
      delays: [0, 3, 7],
       
      getTemplate: (step: number, url: string) => {
        if (step >= 1 && step <= 3) {
          return { subject: `Post Upload Step ${step}`, html: `<p>Step ${step}</p><a href="${url}">Unsub</a>` };
        }
        return null;
      },
    },
    dormancy: {
      totalSteps: 2,
      delays: [0, 7],
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      getTemplate: (step: number, url: string) => {
        if (step >= 1 && step <= 2) {
          return { subject: `Dormancy Step ${step}`, html: `<p>Dormancy ${step}</p>` };
        }
        return null;
      },
    },
  },
}));

vi.mock('@/lib/email/unsubscribe-token', () => ({
  getUnsubscribeUrl: (userId: string) => `https://airwaylab.app/api/email/unsubscribe?token=mock-${userId}`,
}));

vi.mock('@/lib/email/send', () => ({
  sendEmail: vi.fn(),
}));

vi.mock('@sentry/nextjs', () => ({
  captureMessage: vi.fn(),
}));

import type { SupabaseClient } from '@supabase/supabase-js';
import { processEmailDrips } from '@/lib/email/cron-handler';
import {
  getPendingEmails,
  markSent,
  scheduleDormancySequences,
  scheduleActivationSequences,
  applySunsetPolicy,
} from '@/lib/email/sequences';
import { sendEmail } from '@/lib/email/send';
import * as Sentry from '@sentry/nextjs';

// ── Helpers ──────────────────────────────────────────────────

function makePendingEmail(overrides: Partial<{
  id: string;
  user_id: string;
  sequence_name: string; // matches SequenceName union at runtime
  step: number;
  email: string;
  ab_variant: string | null;
}> = {}) {
  return {
    id: overrides.id ?? 'email-1',
    user_id: overrides.user_id ?? 'user-1',
    sequence_name: overrides.sequence_name ?? 'post_upload',
    step: overrides.step ?? 1,
    email: overrides.email ?? 'test@example.com',
    ab_variant: overrides.ab_variant ?? null,
  };
}

function makeSupabase(overdueCount: number = 0) {
  return {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          lte: vi.fn().mockResolvedValue({
            count: overdueCount,
          }),
        }),
      }),
    }),
  } as unknown as SupabaseClient;
}

// ── Tests ────────────────────────────────────────────────────

describe('processEmailDrips', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});

    // Default: no pending emails, no candidates, no sunset, no send
    vi.mocked(scheduleDormancySequences).mockResolvedValue(0);
    vi.mocked(scheduleActivationSequences).mockResolvedValue(0);
    vi.mocked(getPendingEmails).mockResolvedValue([]);
    vi.mocked(applySunsetPolicy).mockResolvedValue(0);
    vi.mocked(markSent).mockResolvedValue();
    vi.mocked(sendEmail).mockResolvedValue(null); // default: send fails
  });

  it('returns a CronResult with all counters', async () => {
    const supabase = makeSupabase();
    const result = await processEmailDrips(supabase);

    expect(result).toHaveProperty('sent');
    expect(result).toHaveProperty('failed');
    expect(result).toHaveProperty('dormancyScheduled');
    expect(result).toHaveProperty('activationScheduled');
    expect(result).toHaveProperty('sunsetted');
  });

  it('discovers dormancy and activation candidates before sending', async () => {
    vi.mocked(scheduleDormancySequences).mockResolvedValue(3);
    vi.mocked(scheduleActivationSequences).mockResolvedValue(2);

    const supabase = makeSupabase();
    const result = await processEmailDrips(supabase);

    expect(scheduleDormancySequences).toHaveBeenCalledWith(supabase);
    expect(scheduleActivationSequences).toHaveBeenCalledWith(supabase);
    expect(result.dormancyScheduled).toBe(3);
    expect(result.activationScheduled).toBe(2);
  });

  it('sends pending emails and marks them as sent', async () => {
    const pending = [makePendingEmail({ id: 'e1', user_id: 'u1' })];
    vi.mocked(getPendingEmails).mockResolvedValue(pending as never);
    vi.mocked(sendEmail).mockResolvedValue('resend-abc');

    const supabase = makeSupabase();
    const result = await processEmailDrips(supabase);

    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'test@example.com',
      subject: 'Post Upload Step 1',
    }));
    expect(markSent).toHaveBeenCalledWith(supabase, 'e1', 'resend-abc');
    expect(result.sent).toBe(1);
    expect(result.failed).toBe(0);
  });

  it('increments failed counter when sendEmail returns null', async () => {
    const pending = [makePendingEmail({ id: 'e1' })];
    vi.mocked(getPendingEmails).mockResolvedValue(pending as never);
    vi.mocked(sendEmail).mockResolvedValue(null);

    const supabase = makeSupabase();
    const result = await processEmailDrips(supabase);

    expect(result.sent).toBe(0);
    expect(result.failed).toBe(1);
    expect(markSent).not.toHaveBeenCalled();
  });

  it('increments failed counter when sequence config is missing', async () => {
    const pending = [makePendingEmail({ sequence_name: 'nonexistent' as never })];
    vi.mocked(getPendingEmails).mockResolvedValue(pending as never);

    const supabase = makeSupabase();
    const result = await processEmailDrips(supabase);

    expect(result.failed).toBe(1);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('increments failed counter when template returns null for invalid step', async () => {
    const pending = [makePendingEmail({ step: 99 })];
    vi.mocked(getPendingEmails).mockResolvedValue(pending as never);

    const supabase = makeSupabase();
    const result = await processEmailDrips(supabase);

    expect(result.failed).toBe(1);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  describe('rate limiting: max 1 email per user per cron run', () => {
    it('deduplicates multiple pending emails for the same user', async () => {
      const pending = [
        makePendingEmail({ id: 'e1', user_id: 'user-a', step: 1 }),
        makePendingEmail({ id: 'e2', user_id: 'user-a', step: 2 }),
        makePendingEmail({ id: 'e3', user_id: 'user-b', step: 1 }),
      ];
      vi.mocked(getPendingEmails).mockResolvedValue(pending as never);
      vi.mocked(sendEmail).mockResolvedValue('resend-ok');

      const supabase = makeSupabase();
      const result = await processEmailDrips(supabase);

      // Should send 2 emails (1 per user), not 3
      expect(sendEmail).toHaveBeenCalledTimes(2);
      expect(result.sent).toBe(2);
    });

    it('picks the first (lowest step) email per user', async () => {
      const pending = [
        makePendingEmail({ id: 'step1', user_id: 'user-x', step: 1 }),
        makePendingEmail({ id: 'step2', user_id: 'user-x', step: 2 }),
      ];
      vi.mocked(getPendingEmails).mockResolvedValue(pending as never);
      vi.mocked(sendEmail).mockResolvedValue('ok');

      const supabase = makeSupabase();
      await processEmailDrips(supabase);

      expect(markSent).toHaveBeenCalledWith(supabase, 'step1', 'ok');
      expect(markSent).not.toHaveBeenCalledWith(supabase, 'step2', expect.anything());
    });
  });

  describe('sunset policy', () => {
    it('applies sunset policy and reports count', async () => {
      vi.mocked(applySunsetPolicy).mockResolvedValue(4);

      const supabase = makeSupabase();
      const result = await processEmailDrips(supabase);

      expect(applySunsetPolicy).toHaveBeenCalledWith(supabase);
      expect(result.sunsetted).toBe(4);
    });
  });

  describe('health check: overdue email alert', () => {
    it('fires Sentry alert when overdue count exceeds threshold', async () => {
      const supabase = makeSupabase(55); // > 50 threshold

      await processEmailDrips(supabase);

      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        expect.stringContaining('overdue emails after processing'),
        expect.objectContaining({
          level: 'warning',
          tags: { subsystem: 'email-drips' },
        })
      );
    });

    it('does not fire Sentry when overdue count is below threshold', async () => {
      const supabase = makeSupabase(5); // < 50 threshold

      await processEmailDrips(supabase);

      expect(Sentry.captureMessage).not.toHaveBeenCalled();
    });

    it('does not fire Sentry when overdue count is exactly at threshold', async () => {
      const supabase = makeSupabase(50); // === 50, threshold is >50

      await processEmailDrips(supabase);

      expect(Sentry.captureMessage).not.toHaveBeenCalled();
    });
  });

  describe('multiple emails across users', () => {
    it('processes a batch of emails from different users', async () => {
      const pending = [
        makePendingEmail({ id: 'e1', user_id: 'u1', sequence_name: 'post_upload', step: 1 }),
        makePendingEmail({ id: 'e2', user_id: 'u2', sequence_name: 'dormancy', step: 1, email: 'u2@test.com' }),
        makePendingEmail({ id: 'e3', user_id: 'u3', sequence_name: 'post_upload', step: 2, email: 'u3@test.com' }),
      ];
      vi.mocked(getPendingEmails).mockResolvedValue(pending as never);
      vi.mocked(sendEmail)
        .mockResolvedValueOnce('r1')
        .mockResolvedValueOnce('r2')
        .mockResolvedValueOnce('r3');

      const supabase = makeSupabase();
      const result = await processEmailDrips(supabase);

      expect(sendEmail).toHaveBeenCalledTimes(3);
      expect(markSent).toHaveBeenCalledTimes(3);
      expect(result.sent).toBe(3);
      expect(result.failed).toBe(0);
    });

    it('handles mixed success and failure in a batch', async () => {
      const pending = [
        makePendingEmail({ id: 'e1', user_id: 'u1' }),
        makePendingEmail({ id: 'e2', user_id: 'u2', email: 'u2@test.com' }),
      ];
      vi.mocked(getPendingEmails).mockResolvedValue(pending as never);
      vi.mocked(sendEmail)
        .mockResolvedValueOnce('r1')      // success
        .mockResolvedValueOnce(null);     // failure

      const supabase = makeSupabase();
      const result = await processEmailDrips(supabase);

      expect(result.sent).toBe(1);
      expect(result.failed).toBe(1);
      expect(markSent).toHaveBeenCalledTimes(1); // only for successful send
    });
  });

  it('passes unsubscribe URL to both template and sendEmail', async () => {
    const pending = [makePendingEmail({ id: 'e1', user_id: 'user-abc' })];
    vi.mocked(getPendingEmails).mockResolvedValue(pending as never);
    vi.mocked(sendEmail).mockResolvedValue('ok');

    const supabase = makeSupabase();
    await processEmailDrips(supabase);

    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      unsubscribeUrl: 'https://airwaylab.app/api/email/unsubscribe?token=mock-user-abc',
    }));
  });

  it('logs warning when getPendingEmails returns 0 rows', async () => {
    vi.mocked(getPendingEmails).mockResolvedValue([]);
    const consoleSpy = vi.spyOn(console, 'error');

    const supabase = makeSupabase();
    await processEmailDrips(supabase);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('getPendingEmails returned 0 rows')
    );
  });
});
