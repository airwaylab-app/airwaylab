import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { getSupabaseServiceRole } from '@/lib/supabase/server'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://airwaylab.app'

const UNSUBSCRIBED_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Unsubscribed -- AirwayLab</title>
  <style>
    body { margin: 0; padding: 0; background: #0a0a0b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .card { max-width: 400px; padding: 32px 24px; text-align: center; }
    .brand { font-size: 18px; font-weight: 700; color: #fff; margin-bottom: 24px; }
    .brand span { color: #5eead4; font-weight: 400; }
    h1 { font-size: 20px; color: #fff; margin: 0 0 12px; }
    p { font-size: 14px; color: #a1a1aa; line-height: 1.7; margin: 0 0 24px; }
    a { color: #5eead4; text-decoration: none; font-size: 14px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="brand">Airway<span>Lab</span></div>
    <h1>You've been unsubscribed</h1>
    <p>You won't receive any more desktop reminder emails from AirwayLab.</p>
    <a href="${BASE_URL}">Back to AirwayLab</a>
  </div>
</body>
</html>`

const INVALID_TOKEN_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Invalid link -- AirwayLab</title>
  <style>
    body { margin: 0; padding: 0; background: #0a0a0b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .card { max-width: 400px; padding: 32px 24px; text-align: center; }
    .brand { font-size: 18px; font-weight: 700; color: #fff; margin-bottom: 24px; }
    .brand span { color: #5eead4; font-weight: 400; }
    h1 { font-size: 20px; color: #fff; margin: 0 0 12px; }
    p { font-size: 14px; color: #a1a1aa; line-height: 1.7; margin: 0 0 24px; }
    a { color: #5eead4; text-decoration: none; font-size: 14px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="brand">Airway<span>Lab</span></div>
    <h1>Invalid or expired link</h1>
    <p>This unsubscribe link is invalid or has already been used.</p>
    <a href="${BASE_URL}">Back to AirwayLab</a>
  </div>
</body>
</html>`

/**
 * GET /api/remind-desktop/unsubscribe?token=<token>
 *
 * One-click unsubscribe handler for desktop reminder emails.
 * Sets `unsubscribed_at` on the matching remind_request row.
 * Returns a static HTML confirmation page (not a redirect).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token || token.length > 200) {
    return new NextResponse(INVALID_TOKEN_HTML, {
      status: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  try {
    const supabase = getSupabaseServiceRole()
    if (!supabase) {
      console.error('[remind-desktop/unsubscribe] Supabase service role not configured')
      return new NextResponse(INVALID_TOKEN_HTML, {
        status: 500,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      })
    }

    const { data, error } = await supabase
      .from('remind_requests')
      .update({ unsubscribed_at: new Date().toISOString() })
      .eq('unsubscribe_token', token)
      .is('unsubscribed_at', null)
      .select('id')
      .maybeSingle()

    if (error) {
      console.error('[remind-desktop/unsubscribe] DB error:', error.message)
      Sentry.captureException(error, { tags: { route: 'remind-desktop/unsubscribe' } })
      return new NextResponse(INVALID_TOKEN_HTML, {
        status: 500,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      })
    }

    if (!data) {
      // Token not found or already unsubscribed
      return new NextResponse(INVALID_TOKEN_HTML, {
        status: 400,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      })
    }

    console.error('[remind-desktop/unsubscribe] unsubscribed', { action: 'remind_desktop_unsubscribe', id: 'anon' })

    return new NextResponse(UNSUBSCRIBED_HTML, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  } catch (err) {
    Sentry.captureException(err, { tags: { route: 'remind-desktop/unsubscribe' } })
    return new NextResponse(INVALID_TOKEN_HTML, {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }
}
