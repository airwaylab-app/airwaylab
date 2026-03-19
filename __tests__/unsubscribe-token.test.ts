import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createUnsubscribeToken,
  verifyUnsubscribeToken,
  getUnsubscribeUrl,
} from '@/lib/email/unsubscribe-token';

describe('Unsubscribe Token', () => {
  beforeEach(() => {
    vi.stubEnv('CRON_SECRET', 'test-secret-key-for-hmac');
  });

  it('creates a token with two parts separated by colon', () => {
    const token = createUnsubscribeToken('user-123');
    expect(token).toContain(':');
    const parts = token.split(':');
    expect(parts).toHaveLength(2);
    expect(parts[0]!.length).toBeGreaterThan(0);
    expect(parts[1]!.length).toBeGreaterThan(0);
  });

  it('verifies a valid token and returns the user ID', () => {
    const userId = 'abc-def-ghi-jkl';
    const token = createUnsubscribeToken(userId);
    const result = verifyUnsubscribeToken(token);
    expect(result).toBe(userId);
  });

  it('rejects a tampered token', () => {
    const token = createUnsubscribeToken('user-123');
    // Tamper with the signature
    const tampered = token.slice(0, -1) + 'X';
    expect(verifyUnsubscribeToken(tampered)).toBeNull();
  });

  it('rejects a token with a different user ID', () => {
    const token = createUnsubscribeToken('user-123');
    const parts = token.split(':');
    // Replace user ID portion with a different one
    const fakeUserId = Buffer.from('user-999').toString('base64url');
    const forged = `${fakeUserId}:${parts[1]}`;
    expect(verifyUnsubscribeToken(forged)).toBeNull();
  });

  it('rejects an empty string', () => {
    expect(verifyUnsubscribeToken('')).toBeNull();
  });

  it('rejects a token without a colon', () => {
    expect(verifyUnsubscribeToken('nocolonhere')).toBeNull();
  });

  it('rejects a token with multiple colons', () => {
    expect(verifyUnsubscribeToken('a:b:c')).toBeNull();
  });

  it('generates a full unsubscribe URL', () => {
    const url = getUnsubscribeUrl('user-123');
    expect(url).toContain('https://airwaylab.app/api/email/unsubscribe?token=');
    // URL should contain an encoded token
    const tokenParam = new URL(url).searchParams.get('token');
    expect(tokenParam).toBeTruthy();
    // Token should be verifiable
    expect(verifyUnsubscribeToken(tokenParam!)).toBe('user-123');
  });

  it('produces different tokens for different user IDs', () => {
    const token1 = createUnsubscribeToken('user-1');
    const token2 = createUnsubscribeToken('user-2');
    expect(token1).not.toBe(token2);
  });

  it('produces the same token for the same user ID (deterministic)', () => {
    const token1 = createUnsubscribeToken('user-1');
    const token2 = createUnsubscribeToken('user-1');
    expect(token1).toBe(token2);
  });
});
