import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { z } from 'zod'
import { validateOrigin } from '@/lib/csrf'
import { RateLimiter, getRateLimitKey } from '@/lib/rate-limit'
import { exceedsPayloadLimit } from '@/lib/api/payload-guard'
import { getSupabaseServiceRole } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/send'
import { remindDesktopEmail } from '@/lib/email/transactional'

const remindLimiter = new RateLimiter({ windowMs: 3_600_000, max: 3 })

const RemindDesktopSchema = z.object({
  email: z.string().email('Invalid email address.').max(254),
  consent: z.literal(true, { message: 'Consent is required.' }),
})

const MAX_PAYLOAD_BYTES = 2_000

/**
 * POST /api/remind-desktop
 *
 * Captures an opt-in email from mobile users who cannot upload on mobile.
 * Stores in `remind_requests` table and immediately sends a reminder email.
 * No account required. Rate-limited to 3 requests per IP per hour.
 */
export async function POST(request: NextRequest) {
  if (!validateOrigin(request)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 })
  }

  try {
    const ip = getRateLimitKey(request)
    if (await remindLimiter.isLimited(ip)) {
      console.error('[remind-desktop] 429 rate limited', { ip })
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }

    if (exceedsPayloadLimit(request, MAX_PAYLOAD_BYTES)) {
      return NextResponse.json({ error: 'Payload too large.' }, { status: 413 })
    }

    const body = await request.json().catch(() => null)
    const parsed = RemindDesktopSchema.safeParse(body)
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || 'Invalid request data.'
      return NextResponse.json({ error: firstError }, { status: 400 })
    }

    const { email } = parsed.data

    const supabase = getSupabaseServiceRole()
    if (!supabase) {
      console.error('[remind-desktop] Supabase service role not configured')
      return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }

    const { data: row, error: insertError } = await supabase
      .from('remind_requests')
      .insert({ email, reminded_at: new Date().toISOString() })
      .select('unsubscribe_token')
      .single()

    if (insertError) {
      console.error('[remind-desktop] DB insert error:', insertError.message)
      Sentry.captureException(insertError, { tags: { route: 'remind-desktop' } })
      return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://airwaylab.app'
    const unsubscribeUrl = `${baseUrl}/api/remind-desktop/unsubscribe?token=${row.unsubscribe_token}`

    const { subject, html } = remindDesktopEmail(unsubscribeUrl)
    void sendEmail({
      to: email,
      subject,
      html,
      unsubscribeUrl,
      metadata: { emailType: 'remind_desktop' },
    })

    console.error('[remind-desktop] captured', { action: 'remind_desktop_capture', id: 'anon' })

    return new NextResponse(null, { status: 204 })
  } catch (err) {
    Sentry.captureException(err, { tags: { route: 'remind-desktop' } })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
