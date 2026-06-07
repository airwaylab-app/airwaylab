/**
 * Device pseudonymisation.
 *
 * A device serial (ResMed #SRN / SerialNumber, or a per-device GUID) uniquely and
 * permanently identifies one physical machine, and via the machine a person. We never
 * persist it raw. Instead we store a keyed hash so we can still group uploads by device
 * (distinct-device counts, per-device longitudinal ML, dedup) without holding the
 * re-identifiable value.
 *
 * HMAC-SHA256 keyed by DEVICE_ID_PEPPER (mirrors lib/email/unsubscribe-token.ts). The
 * pepper is a server-side secret so the hash cannot be brute-forced from the small,
 * structured ResMed serial space. It is LONG-LIVED: rotating it changes every device key
 * and breaks longitudinal grouping, so it must not share a rotating secret like CRON_SECRET.
 *
 * Note: a keyed hash is pseudonymous personal data under GDPR (Recital 26), not anonymous.
 * It lowers exposure, it does not remove the data from scope. Keep device keys service-role
 * only — they are a strong cross-record linkage key.
 */

import { createHmac } from 'crypto';

function getPepper(): string {
  const pepper = process.env.DEVICE_ID_PEPPER;
  if (!pepper) throw new Error('DEVICE_ID_PEPPER not configured');
  return pepper;
}

/**
 * Stable pseudonymous key for a device serial/GUID.
 * Same serial -> same key (under a fixed pepper). Returns null for an absent or blank
 * serial — never hash nothing, and never fabricate a key.
 */
export function hashDeviceSerial(serial: string | null | undefined): string | null {
  if (!serial) return null;
  const normalised = serial.trim();
  if (!normalised) return null;
  return createHmac('sha256', getPepper()).update(normalised).digest('base64url');
}
