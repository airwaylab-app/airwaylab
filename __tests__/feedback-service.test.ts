import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mock dependencies ────────────────────────────────────────

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

const mockInsert = vi.fn();
const mockFrom = vi.fn(() => ({ insert: mockInsert }));

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseAdmin: vi.fn(() => ({
    from: mockFrom,
  })),
}));

vi.mock('@/lib/email/send', () => ({
  sendEmail: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/lib/discord-webhook', () => ({
  sendAlert: vi.fn(() => Promise.resolve(true)),
  formatUserSignalEmbed: vi.fn(() => ({ title: 'mock embed' })),
}));

import { submitFeedback, type FeedbackInput } from '@/lib/services/feedback-service';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email/send';
import { sendAlert, formatUserSignalEmbed } from '@/lib/discord-webhook';
import * as Sentry from '@sentry/nextjs';

// ── Helpers ──────────────────────────────────────────────────

function makeFeedbackInput(overrides: Partial<FeedbackInput> = {}): FeedbackInput {
  return {
    message: 'Flow limitation scores seem off when using EPAP > 10',
    email: 'user@example.com',
    type: 'bug',
    page: '/analyze',
    user_id: 'user-uuid-123',
    contact_ok: true,
    metadata: {
      app_version: '1.2.0',
      user_tier: 'supporter',
      display_name: 'Test User',
      user_agent: 'Mozilla/5.0',
      screen_width: 1920,
      screen_height: 1080,
      viewport_width: 1440,
      viewport_height: 900,
      timezone: 'Europe/Amsterdam',
      has_analysis_results: true,
    },
    ...overrides,
  };
}

// ── Setup ────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  // Default: Supabase insert succeeds
  mockInsert.mockReturnValue(
    Promise.resolve({ data: null, error: null }),
  );
});

afterEach(() => {
  delete process.env.DISCORD_ADMIN_USER_ID;
});

// ── Tests: successful submission ─────────────────────────────

describe('submitFeedback', () => {
  describe('successful submission', () => {
    it('inserts feedback into Supabase with correct fields', async () => {
      const input = makeFeedbackInput();
      const result = await submitFeedback(input);

      expect(result.isOk()).toBe(true);
      expect(mockFrom).toHaveBeenCalledWith('feedback');
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('[bug]'),
          email: 'user@example.com',
          page: '/analyze',
          user_id: 'user-uuid-123',
          contact_ok: true,
          type: 'bug',
        }),
      );
    });

    it('prefixes message with feedback type tag', async () => {
      const input = makeFeedbackInput({ type: 'feature', message: 'Add dark charts' });
      await submitFeedback(input);

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          message: '[feature] Add dark charts',
        }),
      );
    });

    it('trims message before inserting', async () => {
      const input = makeFeedbackInput({ message: '  needs trimming  ' });
      await submitFeedback(input);

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          message: '[bug] needs trimming',
        }),
      );
    });

    it('trims email before inserting', async () => {
      const input = makeFeedbackInput({ email: '  user@test.com  ' });
      await submitFeedback(input);

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'user@test.com',
        }),
      );
    });

    it('handles null email', async () => {
      const input = makeFeedbackInput({ email: null });
      await submitFeedback(input);

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          email: null,
        }),
      );
    });

    it('defaults contact_ok to false when not provided', async () => {
      const input = makeFeedbackInput({ contact_ok: undefined });
      await submitFeedback(input);

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          contact_ok: false,
        }),
      );
    });

    it('defaults metadata to null when not provided', async () => {
      const input = makeFeedbackInput({ metadata: undefined });
      await submitFeedback(input);

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: null,
        }),
      );
    });
  });

  // ── Tests: notification routing ──────────────────────────────

  describe('notification routing', () => {
    it('sends admin email for bug reports', async () => {
      const input = makeFeedbackInput({ type: 'bug' });
      await submitFeedback(input);

      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'dev@airwaylab.app',
          subject: expect.stringContaining('Bug report'),
          metadata: { emailType: 'admin_feedback' },
        }),
      );
    });

    it('does not send admin email for feature requests', async () => {
      const input = makeFeedbackInput({ type: 'feature' });
      await submitFeedback(input);

      expect(sendEmail).not.toHaveBeenCalled();
    });

    it('does not send admin email for support requests', async () => {
      const input = makeFeedbackInput({ type: 'support' });
      await submitFeedback(input);

      expect(sendEmail).not.toHaveBeenCalled();
    });

    it('does not send admin email for general feedback', async () => {
      const input = makeFeedbackInput({ type: 'feedback' });
      await submitFeedback(input);

      expect(sendEmail).not.toHaveBeenCalled();
    });

    it('truncates long messages in email subject to 60 chars + ellipsis', async () => {
      const longMessage = 'A'.repeat(80);
      const input = makeFeedbackInput({ type: 'bug', message: longMessage });
      await submitFeedback(input);

      const callArgs = (sendEmail as ReturnType<typeof vi.fn>).mock.calls[0]![0];
      expect(callArgs.subject).toContain('...');
      // Subject includes label prefix + first 60 chars of message
      expect(callArgs.subject.length).toBeLessThan(100);
    });

    it('sends Discord notification for all feedback types', async () => {
      const types: FeedbackInput['type'][] = ['bug', 'feature', 'support', 'feedback'];

      for (const type of types) {
        vi.clearAllMocks();
        mockInsert.mockReturnValue(Promise.resolve({ data: null, error: null }));
        const input = makeFeedbackInput({ type });
        await submitFeedback(input);

        expect(sendAlert).toHaveBeenCalledWith(
          'user-signals',
          expect.any(String),
          expect.any(Array),
        );
      }
    });

    it('includes admin mention for bug reports when DISCORD_ADMIN_USER_ID is set', async () => {
      process.env.DISCORD_ADMIN_USER_ID = '123456789';
      const input = makeFeedbackInput({ type: 'bug' });
      await submitFeedback(input);

      expect(sendAlert).toHaveBeenCalledWith(
        'user-signals',
        expect.stringContaining('<@123456789>'),
        expect.any(Array),
      );
    });

    it('sends empty content for non-bug Discord alerts', async () => {
      const input = makeFeedbackInput({ type: 'feature' });
      await submitFeedback(input);

      expect(sendAlert).toHaveBeenCalledWith(
        'user-signals',
        '',
        expect.any(Array),
      );
    });
  });

  // ── Tests: Sentry categorization ────────────────────────────

  describe('Sentry alert categorization', () => {
    it('logs bug submissions at warning level', async () => {
      const input = makeFeedbackInput({ type: 'bug' });
      await submitFeedback(input);

      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        expect.stringContaining('bug'),
        expect.objectContaining({
          level: 'warning',
          tags: expect.objectContaining({ feedback_type: 'bug' }),
        }),
      );
    });

    it('logs feature requests at info level', async () => {
      const input = makeFeedbackInput({ type: 'feature' });
      await submitFeedback(input);

      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          level: 'info',
          tags: expect.objectContaining({ feedback_type: 'feature' }),
        }),
      );
    });

    it('classifies oximetry format request as unsupported_format with warning level', async () => {
      const input = makeFeedbackInput({
        type: 'feedback',
        message: 'Oximetry format request: Nonin 3012',
      });
      await submitFeedback(input);

      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        expect.stringContaining('unsupported_format'),
        expect.objectContaining({
          level: 'warning',
          tags: expect.objectContaining({ feedback_type: 'unsupported_format' }),
        }),
      );
    });

    it('uses unsupported_device embed type for oximetry format requests', async () => {
      const input = makeFeedbackInput({
        type: 'feedback',
        message: 'Oximetry format request: Garmin watch',
      });
      await submitFeedback(input);

      expect(formatUserSignalEmbed).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'unsupported_device',
        }),
      );
    });

    it('truncates message in Sentry extra to 500 chars', async () => {
      const longMessage = 'B'.repeat(700);
      const input = makeFeedbackInput({ message: longMessage });
      await submitFeedback(input);

      const sentryCall = (Sentry.captureMessage as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(sentryCall![1].extra.message.length).toBe(500);
    });

    it('includes route and page in Sentry tags/extra', async () => {
      const input = makeFeedbackInput({ page: '/analyze' });
      await submitFeedback(input);

      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          tags: expect.objectContaining({ route: 'feedback' }),
          extra: expect.objectContaining({ page: '/analyze' }),
        }),
      );
    });
  });

  // ── Tests: graceful degradation ─────────────────────────────

  describe('graceful degradation', () => {
    it('returns ok when Supabase is not configured', async () => {
      (getSupabaseAdmin as ReturnType<typeof vi.fn>).mockReturnValueOnce(null);

      const input = makeFeedbackInput();
      const result = await submitFeedback(input);

      expect(result.isOk()).toBe(true);
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it('does not send email or Discord when Supabase is not configured', async () => {
      (getSupabaseAdmin as ReturnType<typeof vi.fn>).mockReturnValueOnce(null);

      const input = makeFeedbackInput({ type: 'bug' });
      await submitFeedback(input);

      expect(sendEmail).not.toHaveBeenCalled();
      expect(sendAlert).not.toHaveBeenCalled();
    });

    it('returns error when Supabase insert fails', async () => {
      mockInsert.mockReturnValueOnce(
        Promise.resolve({ data: null, error: { message: 'relation "feedback" does not exist' } }),
      );

      const input = makeFeedbackInput();
      const result = await submitFeedback(input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe('API_ERROR');
        expect(result.error).toHaveProperty('service', 'supabase');
      }
    });
  });

  // ── Tests: type validation ──────────────────────────────────

  describe('type labels', () => {
    it('maps all known types to readable labels in email subject', async () => {
      const input = makeFeedbackInput({ type: 'bug' });
      await submitFeedback(input);

      const callArgs = (sendEmail as ReturnType<typeof vi.fn>).mock.calls[0]![0];
      expect(callArgs.subject).toContain('Bug report');
    });
  });
});
