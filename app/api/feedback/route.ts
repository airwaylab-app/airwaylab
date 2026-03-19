import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { z } from 'zod'
import { validateOrigin } from '@/lib/csrf'
import { RateLimiter, getRateLimitKey } from '@/lib/rate-limit'
import { exceedsPayloadLimit } from '@/lib/api/payload-guard'
import { resultToResponse } from '@/lib/errors'
import { submitFeedback } from '@/lib/services/feedback-service'

const limiter = new RateLimiter({ windowMs: 3_600_000, max: 10 })

const FeedbackSchema = z.object({
  message: z.string()
    .max(2000, 'Message too long (max 2000 characters).')
    .refine((s) => s.trim().length >= 5, 'Message must be at least 5 characters.'),
  email: z.preprocess(
    (v) => (typeof v === 'string' && v.length > 0 ? v : null),
    z.string().max(254).regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email address.').nullable()
  ),
  type: z.enum(['feature', 'bug', 'support', 'feedback'] as const).catch('feedback'),
  page: z.preprocess(
    (v) => (typeof v === 'string' && v.length > 0 ? v : null),
    z.string().max(200).regex(/^\/[\w/\-]*$/).nullable().catch(null)
  ),
})

const MAX_PAYLOAD_BYTES = 8_000

/**
 * POST /api/feedback
 *
 * Accepts feedback, feature requests, and support messages.
 * Stores in Supabase `feedback` table. No account required.
 */
export async function POST(request: NextRequest) {
  if (!validateOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
  }

  try {
    const ip = getRateLimitKey(request)
    if (await limiter.isLimited(ip)) {
      Sentry.logger.warn('[feedback] 429 rate limited', { ip })
      return NextResponse.json(
        { error: 'Too many submissions. Please try again later.' },
        { status: 429 }
      )
    }

    if (exceedsPayloadLimit(request, MAX_PAYLOAD_BYTES)) {
      Sentry.logger.warn('[feedback] 413 payload too large', { contentLength: request.headers.get('content-length') })
      return NextResponse.json(
        { error: 'Payload too large.' },
        { status: 413 }
      )
    }

    const body = await request.json().catch(() => null)
    const parsed = FeedbackSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || 'Invalid request data.'
      return NextResponse.json({ error: firstError }, { status: 400 })
    }

    const result = await submitFeedback(parsed.data)
    return resultToResponse(result)
  } catch (err) {
    Sentry.captureException(err, { tags: { route: 'feedback' } })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
