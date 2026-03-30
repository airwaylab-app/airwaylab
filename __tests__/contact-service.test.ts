import { describe, it, expect, vi, beforeEach } from 'vitest';

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

vi.mock('@/lib/email/transactional', () => ({
  contactConfirmationEmail: vi.fn(() => ({
    subject: 'We received your message',
    html: '<p>Thank you</p>',
  })),
}));

vi.mock('@/lib/discord-webhook', () => ({
  sendAlert: vi.fn(() => Promise.resolve(true)),
  formatUserSignalEmbed: vi.fn(() => ({ title: 'mock embed' })),
}));

import { submitContactForm, type ContactInput } from '@/lib/services/contact-service';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email/send';
import { contactConfirmationEmail } from '@/lib/email/transactional';
import { sendAlert, formatUserSignalEmbed } from '@/lib/discord-webhook';
import * as Sentry from '@sentry/nextjs';

// ── Helpers ──────────────────────────────────────────────────

function makeContactInput(overrides: Partial<ContactInput> = {}): ContactInput {
  return {
    email: 'user@example.com',
    message: 'I have a question about my data being stored.',
    name: 'Jane Doe',
    category: 'privacy',
    ...overrides,
  };
}

// ── Setup ────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockInsert.mockReturnValue(
    Promise.resolve({ data: null, error: null }),
  );
});

// ── Tests: successful submission ─────────────────────────────

describe('submitContactForm', () => {
  describe('successful submission', () => {
    it('inserts into feedback table with formatted message', async () => {
      const input = makeContactInput();
      const result = await submitContactForm(input);

      expect(result.isOk()).toBe(true);
      expect(mockFrom).toHaveBeenCalledWith('feedback');
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('[contact:privacy]'),
          email: 'user@example.com',
          page: '/contact',
        }),
      );
    });

    it('includes name prefix in message when provided', async () => {
      const input = makeContactInput({ name: 'Dr. Smith' });
      await submitContactForm(input);

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Dr. Smith:'),
        }),
      );
    });

    it('omits name prefix when name is null', async () => {
      const input = makeContactInput({ name: null });
      await submitContactForm(input);

      const insertArg = mockInsert.mock.calls[0]!![0];
      expect(insertArg.message).toBe('[contact:privacy] I have a question about my data being stored.');
    });

    it('normalizes email to lowercase and trimmed', async () => {
      const input = makeContactInput({ email: '  User@EXAMPLE.com  ' });
      await submitContactForm(input);

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'user@example.com',
        }),
      );
    });

    it('trims message before inserting', async () => {
      const input = makeContactInput({ message: '  padded message  ' });
      await submitContactForm(input);

      const insertArg = mockInsert.mock.calls[0]!![0];
      expect(insertArg.message).toContain('padded message');
      // The message inside should be trimmed
      expect(insertArg.message).not.toMatch(/\s{2,}$/);
    });

    it('sets page to /contact', async () => {
      const input = makeContactInput();
      await submitContactForm(input);

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          page: '/contact',
        }),
      );
    });
  });

  // ── Tests: category handling ────────────────────────────────

  describe('category handling', () => {
    it('includes category in Supabase message tag', async () => {
      const categories: ContactInput['category'][] = [
        'general', 'privacy', 'billing', 'accessibility', 'security',
      ];

      for (const category of categories) {
        vi.clearAllMocks();
        mockInsert.mockReturnValue(Promise.resolve({ data: null, error: null }));
        const input = makeContactInput({ category });
        await submitContactForm(input);

        const insertArg = mockInsert.mock.calls[0]!![0];
        expect(insertArg.message).toContain(`[contact:${category}]`);
      }
    });

    it('uses readable label in admin email subject', async () => {
      const input = makeContactInput({ category: 'billing' });
      await submitContactForm(input);

      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining('[Billing]'),
        }),
      );
    });

    it('maps privacy category to readable label', async () => {
      const input = makeContactInput({ category: 'privacy' });
      await submitContactForm(input);

      // Admin email
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining('[Privacy & Data]'),
        }),
      );
    });
  });

  // ── Tests: email notifications ──────────────────────────────

  describe('email notifications', () => {
    it('sends admin notification to dev@airwaylab.app', async () => {
      const input = makeContactInput();
      await submitContactForm(input);

      // First sendEmail call is admin notification
      const adminCall = (sendEmail as ReturnType<typeof vi.fn>).mock.calls[0]!![0];
      expect(adminCall.to).toBe('dev@airwaylab.app');
      expect(adminCall.metadata).toEqual({ emailType: 'admin_contact' });
    });

    it('includes replyTo with normalized email in admin notification', async () => {
      const input = makeContactInput({ email: 'User@Test.com' });
      await submitContactForm(input);

      const adminCall = (sendEmail as ReturnType<typeof vi.fn>).mock.calls[0]!![0];
      expect(adminCall.replyTo).toBe('user@test.com');
    });

    it('sends confirmation email to submitter', async () => {
      const input = makeContactInput({ email: 'User@Test.com' });
      await submitContactForm(input);

      // Second sendEmail call is confirmation
      const confirmCall = (sendEmail as ReturnType<typeof vi.fn>).mock.calls[1]![0];
      expect(confirmCall.to).toBe('user@test.com');
      expect(confirmCall.subject).toBe('We received your message');
      expect(confirmCall.html).toBe('<p>Thank you</p>');
      expect(confirmCall.metadata).toEqual({ emailType: 'contact_confirmation' });
    });

    it('calls contactConfirmationEmail with name and category', async () => {
      const input = makeContactInput({ name: 'Jane', category: 'billing' });
      await submitContactForm(input);

      expect(contactConfirmationEmail).toHaveBeenCalledWith('Jane', 'billing');
    });

    it('truncates long messages in admin email subject', async () => {
      const longMessage = 'X'.repeat(100);
      const input = makeContactInput({ message: longMessage });
      await submitContactForm(input);

      const adminCall = (sendEmail as ReturnType<typeof vi.fn>).mock.calls[0]!![0];
      expect(adminCall.subject).toContain('...');
    });

    it('does not add ellipsis for short messages', async () => {
      const input = makeContactInput({ message: 'Short' });
      await submitContactForm(input);

      const adminCall = (sendEmail as ReturnType<typeof vi.fn>).mock.calls[0]!![0];
      expect(adminCall.subject).not.toContain('...');
    });

    it('includes message body in admin email text', async () => {
      const input = makeContactInput({ message: 'Detailed question here' });
      await submitContactForm(input);

      const adminCall = (sendEmail as ReturnType<typeof vi.fn>).mock.calls[0]!![0];
      expect(adminCall.text).toContain('Detailed question here');
    });
  });

  // ── Tests: Discord notification ─────────────────────────────

  describe('Discord notification', () => {
    it('sends alert to user-signals channel', async () => {
      const input = makeContactInput();
      await submitContactForm(input);

      expect(sendAlert).toHaveBeenCalledWith(
        'user-signals',
        '',
        expect.any(Array),
      );
    });

    it('creates user signal embed with contact type', async () => {
      const input = makeContactInput({
        name: 'Test User',
        category: 'privacy',
        message: 'Privacy question',
        email: 'test@example.com',
      });
      await submitContactForm(input);

      expect(formatUserSignalEmbed).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'contact',
          category: 'Privacy & Data',
          message: 'Privacy question',
          email: 'test@example.com',
          name: 'Test User',
        }),
      );
    });

    it('passes undefined for name when null', async () => {
      const input = makeContactInput({ name: null });
      await submitContactForm(input);

      expect(formatUserSignalEmbed).toHaveBeenCalledWith(
        expect.objectContaining({
          name: undefined,
        }),
      );
    });
  });

  // ── Tests: Sentry logging ──────────────────────────────────

  describe('Sentry logging', () => {
    it('logs contact submission at info level for non-security categories', async () => {
      const input = makeContactInput({ category: 'general' });
      await submitContactForm(input);

      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        expect.stringContaining('general'),
        expect.objectContaining({
          level: 'info',
          tags: expect.objectContaining({
            route: 'contact',
            contact_category: 'general',
          }),
        }),
      );
    });

    it('logs security category at warning level', async () => {
      const input = makeContactInput({ category: 'security' });
      await submitContactForm(input);

      expect(Sentry.captureMessage).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          level: 'warning',
          tags: expect.objectContaining({ contact_category: 'security' }),
        }),
      );
    });

    it('truncates message in Sentry extra to 500 chars', async () => {
      const longMessage = 'Z'.repeat(700);
      const input = makeContactInput({ message: longMessage });
      await submitContactForm(input);

      const sentryCall = (Sentry.captureMessage as ReturnType<typeof vi.fn>).mock.calls[0]!;
      expect(sentryCall![1].extra.message.length).toBe(500);
    });

    it('includes category in Sentry extra', async () => {
      const input = makeContactInput({ category: 'accessibility' });
      await submitContactForm(input);

      const sentryCall = (Sentry.captureMessage as ReturnType<typeof vi.fn>).mock.calls[0]!;
      expect(sentryCall![1].extra.category).toBe('accessibility');
    });
  });

  // ── Tests: graceful degradation ─────────────────────────────

  describe('graceful degradation', () => {
    it('returns ok when Supabase is not configured', async () => {
      (getSupabaseAdmin as ReturnType<typeof vi.fn>).mockReturnValueOnce(null);

      const input = makeContactInput();
      const result = await submitContactForm(input);

      expect(result.isOk()).toBe(true);
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it('does not send any notifications when Supabase is not configured', async () => {
      (getSupabaseAdmin as ReturnType<typeof vi.fn>).mockReturnValueOnce(null);

      const input = makeContactInput();
      await submitContactForm(input);

      expect(sendEmail).not.toHaveBeenCalled();
      expect(sendAlert).not.toHaveBeenCalled();
    });

    it('returns API_ERROR when Supabase insert fails', async () => {
      mockInsert.mockReturnValueOnce(
        Promise.resolve({ data: null, error: { message: 'duplicate key' } }),
      );

      const input = makeContactInput();
      const result = await submitContactForm(input);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.type).toBe('API_ERROR');
        expect(result.error).toHaveProperty('service', 'supabase');
      }
    });

    it('does not send notifications when Supabase insert fails', async () => {
      mockInsert.mockReturnValueOnce(
        Promise.resolve({ data: null, error: { message: 'connection refused' } }),
      );

      const input = makeContactInput();
      await submitContactForm(input);

      expect(sendEmail).not.toHaveBeenCalled();
      expect(sendAlert).not.toHaveBeenCalled();
    });
  });
});
