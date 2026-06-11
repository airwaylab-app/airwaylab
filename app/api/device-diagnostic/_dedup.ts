import { getSupabaseAdmin } from '@/lib/supabase/server'

export const DEDUP_WINDOW_MS = 24 * 60 * 60 * 1000

interface KvRow {
  last_fired_at: string
  suppressed_count: number
}

/**
 * Returns { shouldFire: boolean, suppressedCount: number }.
 * shouldFire = true means the caller should send the alert.
 * suppressedCount = number of hits since the last fired alert (including this one).
 *
 * Uses an UPSERT on kv_alert_dedup so state survives Vercel cold-starts
 * and is shared across function instances.
 */
export async function checkAndUpdateDedup(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  key: string,
  now: Date,
  windowMs?: number,
): Promise<{ shouldFire: boolean; suppressedCount: number }> {
  const { data: existing } = await supabase
    .from('kv_alert_dedup')
    .select('last_fired_at, suppressed_count')
    .eq('key', key)
    .single<KvRow>()

  const windowStart = new Date(now.getTime() - (windowMs ?? DEDUP_WINDOW_MS))
  const lastFiredAt = existing ? new Date(existing.last_fired_at) : null
  const shouldFire = !lastFiredAt || lastFiredAt < windowStart

  if (shouldFire) {
    const suppressedCount = (existing?.suppressed_count ?? 0) + 1
    await supabase.from('kv_alert_dedup').upsert({
      key,
      last_fired_at: now.toISOString(),
      suppressed_count: 0,
    })
    return { shouldFire: true, suppressedCount }
  }

  await supabase.from('kv_alert_dedup').upsert({
    key,
    last_fired_at: existing!.last_fired_at,
    suppressed_count: existing!.suppressed_count + 1,
  })
  return { shouldFire: false, suppressedCount: 0 }
}
