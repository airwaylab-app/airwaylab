import type { Event } from '@sentry/nextjs';

/**
 * PII scrubber for Sentry. AirwayLab handles patient/medical data, so identifiers
 * and emails must never reach Sentry in cleartext.
 *
 * `scrubEvent` mutates the event in place (matching how Sentry's `beforeSend`
 * expects to receive and return the event) and is safe to call in the browser,
 * edge, and Node runtimes. It is synchronous because `beforeSend` is synchronous.
 *
 * Strategy:
 * - ID-like keys are replaced with a short, non-reversible hash so errors can
 *   still be correlated across events without exposing the real value.
 * - Email keys and email-looking substrings are dropped entirely.
 */

// Keys whose values are identifiers: hashed (correlation survives, value does not).
const ID_KEYS = [
  'userId',
  'user_id',
  'stripe_customer_id',
  'subscriptionId',
  'stripe_subscription_id',
  'discord_id',
  'dateStr',
  'subject_pattern',
  'storagePath',
] as const;

// Keys whose values are emails: dropped entirely.
const EMAIL_KEYS = ['email'] as const;

const EMAIL_REGEX = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

const SCRUBBED_EMAIL = '[redacted-email]';

// SHA-256 round constants (FIPS 180-4 §4.2.2).
const SHA256_K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
] as const;

const rotr = (x: number, n: number): number => (x >>> n) | (x << (32 - n));

/**
 * Minimal synchronous SHA-256 (FIPS 180-4). Self-contained so the scrubber works
 * in every runtime: the Web Crypto digest is async and Node's `crypto` is not
 * available in the browser bundle. We only need a short non-reversible digest.
 *
 * State words live in a `DataView`, whose `getUint32`/`getUint8` return `number`
 * (not `number | undefined`), so the message schedule stays clean under
 * `noUncheckedIndexedAccess`.
 */
function sha256Hex(input: string): string {
  // Eight 32-bit hash words (FIPS 180-4 §5.3.3), held in a DataView.
  const state = new DataView(new ArrayBuffer(32));
  const initial = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];
  for (let i = 0; i < 8; i++) state.setUint32(i * 4, initial[i] ?? 0, false);

  // UTF-8 encode. TextEncoder exists in browser, edge, and Node.
  const utf8 = new TextEncoder().encode(input);
  const bitLen = utf8.length * 8;

  // Pad: 0x80, zeros, then 64-bit big-endian length.
  const totalLen = (((utf8.length + 8) >> 6) + 1) << 6;
  const buf = new Uint8Array(totalLen);
  buf.set(utf8);
  buf[utf8.length] = 0x80;
  const block = new DataView(buf.buffer);
  // JS bitwise is 32-bit, so write the 64-bit length as two big-endian words.
  block.setUint32(totalLen - 8, Math.floor(bitLen / 0x100000000), false);
  block.setUint32(totalLen - 4, bitLen >>> 0, false);

  const w = new DataView(new ArrayBuffer(256)); // 64 × 32-bit words

  for (let i = 0; i < totalLen; i += 64) {
    for (let t = 0; t < 16; t++) w.setUint32(t * 4, block.getUint32(i + t * 4, false), false);
    for (let t = 16; t < 64; t++) {
      const w15 = w.getUint32((t - 15) * 4, false);
      const w2 = w.getUint32((t - 2) * 4, false);
      const s0 = rotr(w15, 7) ^ rotr(w15, 18) ^ (w15 >>> 3);
      const s1 = rotr(w2, 17) ^ rotr(w2, 19) ^ (w2 >>> 10);
      const val = (w.getUint32((t - 16) * 4, false) + s0 + w.getUint32((t - 7) * 4, false) + s1) >>> 0;
      w.setUint32(t * 4, val, false);
    }

    let a = state.getUint32(0, false);
    let b = state.getUint32(4, false);
    let c = state.getUint32(8, false);
    let d = state.getUint32(12, false);
    let e = state.getUint32(16, false);
    let f = state.getUint32(20, false);
    let g = state.getUint32(24, false);
    let hh = state.getUint32(28, false);

    for (let t = 0; t < 64; t++) {
      const sig1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (hh + sig1 + ch + (SHA256_K[t] ?? 0) + w.getUint32(t * 4, false)) >>> 0;
      const sig0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (sig0 + maj) >>> 0;
      hh = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    state.setUint32(0, (state.getUint32(0, false) + a) >>> 0, false);
    state.setUint32(4, (state.getUint32(4, false) + b) >>> 0, false);
    state.setUint32(8, (state.getUint32(8, false) + c) >>> 0, false);
    state.setUint32(12, (state.getUint32(12, false) + d) >>> 0, false);
    state.setUint32(16, (state.getUint32(16, false) + e) >>> 0, false);
    state.setUint32(20, (state.getUint32(20, false) + f) >>> 0, false);
    state.setUint32(24, (state.getUint32(24, false) + g) >>> 0, false);
    state.setUint32(28, (state.getUint32(28, false) + hh) >>> 0, false);
  }

  let hex = '';
  for (let i = 0; i < 8; i++) hex += state.getUint32(i * 4, false).toString(16).padStart(8, '0');
  return hex;
}

/** First 8 hex chars of the SHA-256 digest. Non-reversible, keeps correlation. */
function shortHash(value: string): string {
  return sha256Hex(value).slice(0, 8);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Walk an arbitrary container and scrub PII keys wherever they appear (recursively).
 * Arrays are walked element-by-element. `WeakSet` guards against cyclic structures.
 */
function scrubContainer(container: unknown, seen: WeakSet<object>): void {
  if (Array.isArray(container)) {
    if (seen.has(container)) return;
    seen.add(container);
    for (const item of container) scrubContainer(item, seen);
    return;
  }

  if (!isPlainObject(container)) return;
  if (seen.has(container)) return;
  seen.add(container);

  for (const key of Object.keys(container)) {
    if ((ID_KEYS as readonly string[]).includes(key)) {
      const value = container[key];
      if (value != null && value !== '') {
        container[key] = shortHash(String(value));
      }
      continue;
    }
    if ((EMAIL_KEYS as readonly string[]).includes(key)) {
      delete container[key];
      continue;
    }
    scrubContainer(container[key], seen);
  }
}

/**
 * Scrub PII from a Sentry event in place and return it.
 * Call inside each Sentry config's `beforeSend`.
 */
export function scrubEvent<T extends Event>(event: T): T {
  const seen = new WeakSet<object>();

  if (event.extra) scrubContainer(event.extra, seen);
  if (event.contexts) scrubContainer(event.contexts, seen);
  if (event.tags) scrubContainer(event.tags, seen);
  if (event.user) {
    // `Sentry.setUser({ id })` lands on event.user.id. Hash it so a user can
    // still be correlated across events without exposing the real identifier.
    if (event.user.id != null && event.user.id !== '') {
      event.user.id = shortHash(String(event.user.id));
    }
    scrubContainer(event.user, seen);
  }

  // Redact email-looking substrings from the top-level message.
  if (typeof event.message === 'string') {
    event.message = event.message.replace(EMAIL_REGEX, SCRUBBED_EMAIL);
  }

  return event;
}
