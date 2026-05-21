/**
 * Test D: validateProfileExists() — DB error vs genuine no-row
 *
 * Scenario A: Supabase returns { data: null, error: null } (PGRST116 — no row)
 *   → { valid: false, error: 'no_profile' }, Sentry warning
 *
 * Scenario B: Supabase returns { data: null, error: { code: '500', ... } }
 *   → { valid: false, error: 'db_error' }, Sentry exception
 *
 * Scenario C: Supabase returns profile row
 *   → { valid: true }
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateProfileExists } from '@/lib/profile-guard';

// ── Mocks ────────────────────────────────────────────────────────

vi.mock('@sentry/nextjs', () => ({
  captureMessage: vi.fn(),
  captureException: vi.fn(),
}));

// ── Helpers ──────────────────────────────────────────────────────

function makeSupabaseClient(result: { data: unknown; error: unknown }) {
  const chainable = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };
  return {
    from: vi.fn().mockReturnValue(chainable),
    _chainable: chainable,
  };
}

// ── Setup ────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Tests ────────────────────────────────────────────────────────

describe('validateProfileExists()', () => {
  describe('Scenario A: PGRST116 — no row (data: null, error: null)', () => {
    it('returns { valid: false, error: "no_profile" }', async () => {
      const client = makeSupabaseClient({ data: null, error: null });

      const result = await validateProfileExists(
        client as unknown as Parameters<typeof validateProfileExists>[0],
        'user-ghost-123'
      );

      expect(result).toEqual({ valid: false, error: 'no_profile' });
    });

    it('calls Sentry.captureMessage with warning level', async () => {
      const { captureMessage } = await import('@sentry/nextjs');
      const client = makeSupabaseClient({ data: null, error: null });

      await validateProfileExists(
        client as unknown as Parameters<typeof validateProfileExists>[0],
        'user-ghost-123'
      );

      expect(captureMessage).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ level: 'warning' })
      );
    });

    it('does NOT call Sentry.captureException', async () => {
      const { captureException } = await import('@sentry/nextjs');
      const client = makeSupabaseClient({ data: null, error: null });

      await validateProfileExists(
        client as unknown as Parameters<typeof validateProfileExists>[0],
        'user-ghost-123'
      );

      expect(captureException).not.toHaveBeenCalled();
    });

    it('includes the userId in Sentry tags', async () => {
      const { captureMessage } = await import('@sentry/nextjs');
      const client = makeSupabaseClient({ data: null, error: null });

      await validateProfileExists(
        client as unknown as Parameters<typeof validateProfileExists>[0],
        'user-ghost-456'
      );

      expect(captureMessage).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          tags: expect.objectContaining({ userId: 'user-ghost-456' }),
        })
      );
    });
  });

  describe('Scenario B: DB error (data: null, error: { code: "500", ... })', () => {
    const dbError = { code: '500', message: 'Internal server error', details: '' };

    it('returns { valid: false, error: "db_error" }', async () => {
      const client = makeSupabaseClient({ data: null, error: dbError });

      const result = await validateProfileExists(
        client as unknown as Parameters<typeof validateProfileExists>[0],
        'user-123'
      );

      expect(result).toEqual({ valid: false, error: 'db_error' });
    });

    it('calls Sentry.captureException with the error object', async () => {
      const { captureException } = await import('@sentry/nextjs');
      const client = makeSupabaseClient({ data: null, error: dbError });

      await validateProfileExists(
        client as unknown as Parameters<typeof validateProfileExists>[0],
        'user-123'
      );

      expect(captureException).toHaveBeenCalledWith(
        dbError,
        expect.objectContaining({
          tags: expect.objectContaining({ check: 'profile-existence' }),
        })
      );
    });

    it('does NOT call Sentry.captureMessage', async () => {
      const { captureMessage } = await import('@sentry/nextjs');
      const client = makeSupabaseClient({ data: null, error: dbError });

      await validateProfileExists(
        client as unknown as Parameters<typeof validateProfileExists>[0],
        'user-123'
      );

      expect(captureMessage).not.toHaveBeenCalled();
    });

    it('includes the userId in Sentry tags on DB error', async () => {
      const { captureException } = await import('@sentry/nextjs');
      const client = makeSupabaseClient({ data: null, error: dbError });

      await validateProfileExists(
        client as unknown as Parameters<typeof validateProfileExists>[0],
        'user-db-err-789'
      );

      expect(captureException).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          tags: expect.objectContaining({ userId: 'user-db-err-789' }),
        })
      );
    });
  });

  describe('Scenario C: profile row found', () => {
    it('returns { valid: true }', async () => {
      const client = makeSupabaseClient({
        data: { id: 'user-real-123' },
        error: null,
      });

      const result = await validateProfileExists(
        client as unknown as Parameters<typeof validateProfileExists>[0],
        'user-real-123'
      );

      expect(result).toEqual({ valid: true });
    });

    it('does NOT call Sentry.captureMessage or captureException', async () => {
      const { captureMessage, captureException } = await import('@sentry/nextjs');
      const client = makeSupabaseClient({
        data: { id: 'user-real-456' },
        error: null,
      });

      await validateProfileExists(
        client as unknown as Parameters<typeof validateProfileExists>[0],
        'user-real-456'
      );

      expect(captureMessage).not.toHaveBeenCalled();
      expect(captureException).not.toHaveBeenCalled();
    });

    it('queries the profiles table with the correct userId', async () => {
      const client = makeSupabaseClient({ data: { id: 'user-real-789' }, error: null });

      await validateProfileExists(
        client as unknown as Parameters<typeof validateProfileExists>[0],
        'user-real-789'
      );

      expect(client.from).toHaveBeenCalledWith('profiles');
      expect(client._chainable.eq).toHaveBeenCalledWith('id', 'user-real-789');
    });
  });
});
