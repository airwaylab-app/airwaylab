import { getSupabaseAdmin } from '@/lib/supabase/server'

const THRESHOLDS = [20, 50]

/**
 * Increments the daily count for `signalType` and fires the Paperclip
 * threshold webhook the first time the count reaches 20 or 50.
 *
 * Fire-and-forget — caller wraps with `void`. All errors are swallowed
 * so tracking never delays or fails the originating request.
 */
export async function trackSignalCount(signalType: string, signalName: string): Promise<void> {
  try {
    const supabase = getSupabaseAdmin()
    if (!supabase) return

    const { data, error } = await supabase.rpc('increment_signal_count', {
      p_signal_type: signalType,
      p_signal_name: signalName,
    })

    if (error || !data || (data as unknown[]).length === 0) return

    const rows = data as Array<{ new_count: number; fired_thresholds: number[] }>
    const row = rows[0]
    if (!row) return
    const { new_count: newCount, fired_thresholds: firedThresholds } = row

    for (const threshold of THRESHOLDS) {
      if (newCount === threshold && !firedThresholds.includes(threshold)) {
        await fireThresholdWebhook(signalType, signalName, newCount)
        await supabase
          .from('signal_daily_counts')
          .update({ webhook_fired_at_thresholds: [...firedThresholds, threshold] })
          .eq('signal_type', signalType)
          .eq('signal_date', new Date().toISOString().slice(0, 10))
        break
      }
    }
  } catch {
    // fire-and-forget — tracking errors must not impact request latency or reliability
  }
}

export async function fireThresholdWebhook(
  signalType: string,
  signalName: string,
  hitsIn24h: number,
): Promise<void> {
  const url = process.env.PAPERCLIP_SIGNAL_WEBHOOK_URL
  if (!url) return

  try {
    await fetch(url, {
      method: 'POST',
      signal: AbortSignal.timeout(5_000),
      headers: {
        Authorization: `Bearer ${process.env.PAPERCLIP_SIGNAL_WEBHOOK_SECRET ?? ''}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        signal_type: signalType,
        signal_name: signalName,
        hits_24h: hitsIn24h,
        threshold: hitsIn24h,
      }),
    })
  // eslint-disable-next-line airwaylab/no-silent-catch
  } catch (err) {
    // Webhook failure is non-critical — tracking must never fail the originating request
    console.error('[signal-tracker] webhook fire failed', err)
  }
}
