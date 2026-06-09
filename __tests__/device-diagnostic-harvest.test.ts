import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Stateful device_diagnostics store so the route's fingerprint dedup (select →
// insert) behaves like the real table across calls within a test.
interface DdRow { device_model: string; reason: string | null; fingerprint: string | null }
let ddStore: DdRow[] = []
const _ddInsert = vi.fn((row: DdRow) => { ddStore.push(row); return Promise.resolve({ error: null }) })
let _routeAlertFn = vi.fn().mockResolvedValue(false)

vi.mock('@/lib/discord-webhook', () => ({ routeAlert: (...a: unknown[]) => _routeAlertFn(...a) }))
vi.mock('@/lib/signal-tracker', () => ({ trackSignalCount: vi.fn().mockResolvedValue(undefined) }))
vi.mock('./_dedup', () => ({ checkAndUpdateDedup: vi.fn().mockResolvedValue({ shouldFire: false, suppressedCount: 0 }) }))
vi.mock('@/lib/csrf', () => ({ validateOrigin: vi.fn().mockReturnValue(true) }))
vi.mock('@/lib/rate-limit', () => {
  const isLimited = vi.fn().mockResolvedValue(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function RateLimiter(this: any) { this.isLimited = isLimited }
  return { RateLimiter, getRateLimitKey: vi.fn().mockReturnValue('test-ip') }
})
vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn(), captureMessage: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({
  getSupabaseAdmin: vi.fn().mockImplementation(() => ({
    from: (table: string) => {
      if (table === 'device_diagnostics') {
        return {
          select: () => ({
            eq: (_col: string, fp: string) => ({
              limit: () => ({
                maybeSingle: () =>
                  Promise.resolve({ data: ddStore.find((r) => r.fingerprint === fp) ?? null, error: null }),
              }),
            }),
          }),
          insert: (row: DdRow) => _ddInsert(row),
        }
      }
      return { insert: vi.fn().mockResolvedValue({ error: null }) }
    },
  })),
}))

import { POST } from '@/app/api/device-diagnostic/route'

function harvestReq(signalLabels: string[]): NextRequest {
  return new NextRequest('http://localhost/api/device-diagnostic', {
    method: 'POST',
    body: JSON.stringify({
      deviceModel: 'AirSense 11 AutoSet',
      signalLabels,
      identificationText: null,
      hasStrFile: true,
      reason: 'untrusted_autoset_range',
    }),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('device-diagnostic harvest (#1036 coverage gap)', () => {
  beforeEach(() => {
    ddStore = []
    _ddInsert.mockClear()
    _routeAlertFn = vi.fn().mockResolvedValue(false)
  })

  it('captures a row with reason + fingerprint and fires NO live alert', async () => {
    const res = await POST(harvestReq(['S.C.Press', 'S.EPR.Level']))
    expect(res.status).toBe(200)
    expect(_ddInsert).toHaveBeenCalledTimes(1)
    const row = _ddInsert.mock.calls[0]![0]
    expect(row.reason).toBe('untrusted_autoset_range')
    expect(row.fingerprint).toMatch(/^[0-9a-f]{32}$/)
    // harvests are a tracked gap, not a per-upload alarm
    expect(_routeAlertFn).not.toHaveBeenCalled()
  })

  it('dedups by fingerprint — a second identical harvest does not insert again', async () => {
    await POST(harvestReq(['S.C.Press', 'S.EPR.Level']))
    await POST(harvestReq(['S.C.Press', 'S.EPR.Level']))
    expect(_ddInsert).toHaveBeenCalledTimes(1)
  })

  it('fingerprint is order-independent for signal labels (still dedups)', async () => {
    await POST(harvestReq(['S.C.Press', 'S.EPR.Level']))
    await POST(harvestReq(['S.EPR.Level', 'S.C.Press'])) // reversed
    expect(_ddInsert).toHaveBeenCalledTimes(1)
  })

  it('rejects unknown fields (strict schema)', async () => {
    const req = new NextRequest('http://localhost/api/device-diagnostic', {
      method: 'POST',
      body: JSON.stringify({
        deviceModel: 'AirSense 11 AutoSet', signalLabels: ['S.C.Press'],
        identificationText: null, hasStrFile: true, reason: 'untrusted_autoset_range',
        evilExtraField: 'x',
      }),
      headers: { 'Content-Type': 'application/json' },
    })
    expect((await POST(req)).status).toBe(400)
  })

  it('rejects non-printable signal labels (control char)', async () => {
    const ctrl = 'bad' + String.fromCharCode(1) + 'label'
    expect((await POST(harvestReq(['S.C.Press', ctrl]))).status).toBe(400)
    expect(_ddInsert).not.toHaveBeenCalled()
  })

  it('rejects an unknown reason value', async () => {
    const req = new NextRequest('http://localhost/api/device-diagnostic', {
      method: 'POST',
      body: JSON.stringify({
        deviceModel: 'AirSense 11 AutoSet', signalLabels: ['S.C.Press'],
        identificationText: null, hasStrFile: true, reason: 'something_else',
      }),
      headers: { 'Content-Type': 'application/json' },
    })
    expect((await POST(req)).status).toBe(400)
  })
})
