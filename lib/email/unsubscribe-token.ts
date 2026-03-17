/**
 * Unsubscribe token generation and verification.
 *
 * Uses HMAC-SHA256 with CRON_SECRET as the signing key.
 * Tokens are included in email footer links so users can unsubscribe
 * without being logged in. No JWT dependency — just a signed user_id.
 *
 * Format: base64url(user_id):base64url(hmac)
 */

import { createHmac } from 'crypto';

const BASE_URL = 'https://airwaylab.app';

function getSecret(): string {
  const secret = process.env.CRON_SECRET;
  if (!secret) throw new Error('CRON_SECRET not configured');
  return secret;
}

function sign(userId: string): string {
  return createHmac('sha256', getSecret())
    .update(userId)
    .digest('base64url');
}

/**
 * Generate an unsubscribe token for a user.
 */
export function createUnsubscribeToken(userId: string): string {
  const sig = sign(userId);
  return `${Buffer.from(userId).toString('base64url')}:${sig}`;
}

/**
 * Verify an unsubscribe token and return the user_id.
 * Returns null if the token is invalid.
 */
export function verifyUnsubscribeToken(token: string): string | null {
  const parts = token.split(':');
  if (parts.length !== 2) return null;

  try {
    const userId = Buffer.from(parts[0], 'base64url').toString('utf-8');
    const expectedSig = sign(userId);

    // Constant-time comparison
    if (parts[1].length !== expectedSig.length) return null;
    const a = Buffer.from(parts[1]);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length) return null;

    let diff = 0;
    for (let i = 0; i < a.length; i++) {
      diff |= a[i] ^ b[i];
    }

    return diff === 0 ? userId : null;
  } catch {
    return null;
  }
}

/**
 * Generate the full unsubscribe URL for an email footer.
 */
export function getUnsubscribeUrl(userId: string): string {
  const token = createUnsubscribeToken(userId);
  return `${BASE_URL}/api/email/unsubscribe?token=${encodeURIComponent(token)}`;
}
