import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

// Mock Sentry before importing the module under test
const mockCaptureException = vi.fn();
const mockCaptureMessage = vi.fn();
vi.mock('@sentry/nextjs', () => ({
  captureException: (...args: unknown[]) => mockCaptureException(...args),
  captureMessage: (...args: unknown[]) => mockCaptureMessage(...args),
}));

import { validateProfileExists } from '@/lib/auth/validate-profile';

function makeSupabaseMock(result: { data: unknown; error: unknown }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };
  return {
    from: vi.fn(() => chain),
    _chain: chain,
  } as unknown as SupabaseClient;
}

describe('validateProfileExists', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns valid: true when profile exists', async () => {
    const supabase = makeSupabaseMock({ data: { id: 'user-123' }, error: null });
    const result = await validateProfileExists(supabase, 'user-123', { route: 'test-route' });
    expect(result).toEqual({ valid: true });
    expect(mockCaptureException).not.toHaveBeenCalled();
    expect(mockCaptureMessage).not.toHaveBeenCalled();
  });

  it('returns valid: false with error db_error on Supabase error', async () => {
    const dbError = { message: 'connection refused', code: '500' };
    const supabase = makeSupabaseMock({ data: null, error: dbError });
    const result = await validateProfileExists(supabase, 'user-123', { route: 'test-route' });
    expect(result).toEqual({ valid: false, error: 'db_error' });
    expect(mockCaptureException).toHaveBeenCalledWith(dbError, {
      tags: { route: 'test-route', check: 'profile-exists' },
    });
    expect(mockCaptureMessage).not.toHaveBeenCalled();
  });

  it('returns valid: false with error no_profile when profile row is missing', async () => {
    const supabase = makeSupabaseMock({ data: null, error: null });
    const result = await validateProfileExists(supabase, 'user-456', { route: 'customer-portal' });
    expect(result).toEqual({ valid: false, error: 'no_profile' });
    expect(mockCaptureMessage).toHaveBeenCalledWith(
      'profile-not-found for authenticated user',
      expect.objectContaining({
        level: 'error',
        tags: { route: 'customer-portal', check: 'profile-exists' },
        extra: { userId: 'user-456' },
      })
    );
    expect(mockCaptureException).not.toHaveBeenCalled();
  });

  it('queries profiles table with correct userId', async () => {
    const supabase = makeSupabaseMock({ data: { id: 'user-789' }, error: null });
    await validateProfileExists(supabase, 'user-789', { route: 'discord-callback' });
    expect(supabase.from).toHaveBeenCalledWith('profiles');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chain = (supabase as any)._chain;
    expect(chain.select).toHaveBeenCalledWith('id');
    expect(chain.eq).toHaveBeenCalledWith('id', 'user-789');
    expect(chain.maybeSingle).toHaveBeenCalled();
  });
});
