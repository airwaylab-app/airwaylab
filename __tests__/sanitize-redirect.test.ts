import { describe, it, expect } from 'vitest';
import { sanitizeRedirectPath } from '@/lib/auth/sanitize-redirect';

describe('sanitizeRedirectPath', () => {
  const FALLBACK = '/analyze';

  // Valid paths
  it('allows simple relative paths', () => {
    expect(sanitizeRedirectPath('/pricing')).toBe('/pricing');
  });

  it('allows paths with query strings', () => {
    expect(sanitizeRedirectPath('/analyze?checkout=success')).toBe('/analyze?checkout=success');
  });

  it('allows nested paths', () => {
    expect(sanitizeRedirectPath('/blog/my-post')).toBe('/blog/my-post');
  });

  it('allows root path', () => {
    expect(sanitizeRedirectPath('/')).toBe('/');
  });

  // Null/empty
  it('returns fallback for null', () => {
    expect(sanitizeRedirectPath(null)).toBe(FALLBACK);
  });

  it('returns fallback for empty string', () => {
    expect(sanitizeRedirectPath('')).toBe(FALLBACK);
  });

  // Protocol-relative URLs (open redirect attack)
  it('blocks protocol-relative URLs', () => {
    expect(sanitizeRedirectPath('//evil.com')).toBe(FALLBACK);
  });

  it('blocks protocol-relative with path', () => {
    expect(sanitizeRedirectPath('//evil.com/steal-cookies')).toBe(FALLBACK);
  });

  // Protocol schemes
  it('blocks javascript: protocol', () => {
    expect(sanitizeRedirectPath('/javascript:alert(1)')).toBe(FALLBACK);
  });

  it('blocks data: protocol', () => {
    expect(sanitizeRedirectPath('/data:text/html,<h1>pwned</h1>')).toBe(FALLBACK);
  });

  it('blocks vbscript: protocol', () => {
    expect(sanitizeRedirectPath('/vbscript:foo')).toBe(FALLBACK);
  });

  // Case-insensitive protocol blocking
  it('blocks JAVASCRIPT: protocol (case-insensitive)', () => {
    expect(sanitizeRedirectPath('/JAVASCRIPT:alert(1)')).toBe(FALLBACK);
  });

  // Backslash tricks
  it('blocks paths with backslashes', () => {
    expect(sanitizeRedirectPath('/evil\\path')).toBe(FALLBACK);
  });

  it('blocks backslash at start that could normalize to //', () => {
    expect(sanitizeRedirectPath('/\\evil.com')).toBe(FALLBACK);
  });

  // Doesn't start with /
  it('blocks paths not starting with /', () => {
    expect(sanitizeRedirectPath('https://evil.com')).toBe(FALLBACK);
  });

  it('blocks relative path without leading slash', () => {
    expect(sanitizeRedirectPath('analyze')).toBe(FALLBACK);
  });
});
