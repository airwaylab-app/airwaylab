import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock posthog-js/react before importing the hook
const mockGetFeatureFlag = vi.fn();
const mockPostHog = { getFeatureFlag: mockGetFeatureFlag };
let mockUsePostHogReturn: typeof mockPostHog | null = mockPostHog;

vi.mock('posthog-js/react', () => ({
  usePostHog: () => mockUsePostHogReturn,
}));

import { useTierHistoryWindowDays } from '@/hooks/use-tier-history-window-days';

// Named with 'use' prefix to satisfy react-hooks/rules-of-hooks
function useInvoke() {
  return useTierHistoryWindowDays();
}

describe('useTierHistoryWindowDays', () => {
  beforeEach(() => {
    mockUsePostHogReturn = mockPostHog;
    mockGetFeatureFlag.mockReset();
  });

  it('returns undefined when PostHog is unavailable', () => {
    mockUsePostHogReturn = null;
    expect(useInvoke()).toBeUndefined();
  });

  it('returns undefined when flag is unset (undefined)', () => {
    mockGetFeatureFlag.mockReturnValue(undefined);
    expect(useInvoke()).toBeUndefined();
  });

  it('returns undefined when flag is a boolean (PostHog on/off flag, not a number)', () => {
    mockGetFeatureFlag.mockReturnValue(true);
    expect(useInvoke()).toBeUndefined();
  });

  describe('string flag values', () => {
    it('parses a valid positive string integer', () => {
      mockGetFeatureFlag.mockReturnValue('14');
      expect(useInvoke()).toBe(14);
    });

    it('parses "7" correctly', () => {
      mockGetFeatureFlag.mockReturnValue('7');
      expect(useInvoke()).toBe(7);
    });

    it('returns undefined for non-numeric string', () => {
      mockGetFeatureFlag.mockReturnValue('abc');
      expect(useInvoke()).toBeUndefined();
    });

    it('returns undefined for string "0" (not > 0)', () => {
      mockGetFeatureFlag.mockReturnValue('0');
      expect(useInvoke()).toBeUndefined();
    });

    it('returns undefined for negative string "-7"', () => {
      mockGetFeatureFlag.mockReturnValue('-7');
      expect(useInvoke()).toBeUndefined();
    });

    it('returns undefined for empty string', () => {
      mockGetFeatureFlag.mockReturnValue('');
      expect(useInvoke()).toBeUndefined();
    });
  });

  describe('numeric flag values', () => {
    it('returns a valid positive number directly', () => {
      mockGetFeatureFlag.mockReturnValue(30);
      expect(useInvoke()).toBe(30);
    });

    it('returns undefined for 0 (not > 0)', () => {
      mockGetFeatureFlag.mockReturnValue(0);
      expect(useInvoke()).toBeUndefined();
    });

    it('returns undefined for a negative number', () => {
      mockGetFeatureFlag.mockReturnValue(-14);
      expect(useInvoke()).toBeUndefined();
    });
  });
});
