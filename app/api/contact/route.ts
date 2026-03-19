import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { z } from 'zod'
import { validateOrigin } from '@/lib/csrf'
import { RateLimiter, getRateLimitKey } from '@/lib/rate-limit'
import { exceedsPayloadLimit } from '@/lib/api/payload-guard'
import { resultToResponse } from '@/lib/errors'
import { submitContactForm } from '@/lib/services/contact-service'

const limiter = new RateLimiter({ windowMs: 3_600_000, max: 5 })

const ContactSchema = z.object({
  email: z.string().min(1).max(254).regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'A valid email address is required.'),
  message: z.string()
    .max(2000, 'Message too long (max 2000 characters).')
    .refine((s) => s.trim().length >= 10, 'Message must be at least 10 characters.'),
  name: z.preprocess(
    (v) => (typeof v === 'string' && v.trim().length > 0 ? v.trim() : null),
    z.string().max(100).nullable()
  ),
  category: z.enum(['general', 'privacy', 'billing', 'accessibility', 'security'] as const).catch('general'),
})

const MAX_PAYLOAD_BYTES = 8_000

/**
 * POST /api/contact
 *
 * Contact form submissions. Stores in Supabase `feedback` table and sends
 * notification email via Resend. No account required.
 */
export async function POST(request: NextRequest) {
  if (!validateOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
  }

  try {
    const ip = getRateLimitKey(request)
    if (await limiter.isLimited(ip)) {
      Sentry.logger.warn('[contact] 429 rate limited', { ip })
      return NextResponse.json(
        { error: 'Too many submissions. Please try again later.' },
        { status: 429 }
      )
    }

    if (exceedsPayloadLimit(request, MAX_PAYLOAD_BYTES)) {
      Sentry.logger.warn('[contact] 413 payload too large', { contentLength: request.headers.get('content-length') })
      return NextResponse.json({ error: 'Payload too large.' }, { status: 413 })
    }

    const body = await request.json().catch(() => null)
    const parsed = ContactSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || 'Invalid request data.'
      return NextResponse.json({ error: firstError }, { status: 400 })
    }

    const result = await submitContactForm(parsed.data)
    return resultToResponse(result)
  } catch (err) {
    Sentry.captureException(err, { tags: { route: 'contact' } })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
