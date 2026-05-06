import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  normaliseEmail,
  groupByEmail,
  buildDraftBody,
  type FeedbackRow,
} from '@/lib/services/feedback-processor'
import { getGmailConfig, refreshAccessToken, createGmailDraft } from '@/lib/gmail/client'

// ── Helpers ──────────────────────────────────────────────────

function makeRow(overrides: Partial<FeedbackRow> = {}): FeedbackRow {
  return {
    id: 'row-1',
    message: 'This is a test message',
    email: 'user@example.com',
    type: 'feedback',
    page: '/analyze',
    created_at: '2026-04-22T07:00:00Z',
    metadata: null,
    ...overrides,
  }
}

// ── Test 1: Email normalisation ───────────────────────────────

describe('normaliseEmail', () => {
  it('lowercases and trims the email', () => {
    expect(normaliseEmail('  User@EXAMPLE.COM  ')).toBe('user@example.com')
  })

  it('does not alter an already-normalised email', () => {
    expect(normaliseEmail('dev@airwaylab.app')).toBe('dev@airwaylab.app')
  })
})

// ── Test 2: groupByEmail ──────────────────────────────────────

describe('groupByEmail', () => {
  it('groups rows by normalised email', () => {
    const rows = [
      makeRow({ id: '1', email: 'alice@example.com' }),
      makeRow({ id: '2', email: 'Alice@Example.COM' }),
      makeRow({ id: '3', email: 'bob@example.com' }),
    ]

    const groups = groupByEmail(rows)

    expect(groups.size).toBe(2)
    expect(groups.get('alice@example.com')).toHaveLength(2)
    expect(groups.get('bob@example.com')).toHaveLength(1)
  })

  it('excludes rows with null email', () => {
    const rows = [
      makeRow({ id: '1', email: null }),
      makeRow({ id: '2', email: 'user@example.com' }),
    ]

    const groups = groupByEmail(rows)

    expect(groups.size).toBe(1)
    expect(groups.get('user@example.com')).toHaveLength(1)
  })

  it('returns an empty map when all rows have null email', () => {
    const rows = [makeRow({ email: null }), makeRow({ email: null })]
    expect(groupByEmail(rows).size).toBe(0)
  })

  it('returns an empty map for empty input', () => {
    expect(groupByEmail([]).size).toBe(0)
  })
})

// ── Test 3: buildDraftBody ────────────────────────────────────

describe('buildDraftBody', () => {
  it('includes the email address in the header', () => {
    const row = makeRow({ message: 'Hello world', type: 'bug' })
    const body = buildDraftBody('alice@example.com', [row])
    expect(body).toContain('Feedback from: alice@example.com')
  })

  it('includes the message text', () => {
    const row = makeRow({ message: 'Please add dark mode' })
    const body = buildDraftBody('user@example.com', [row])
    expect(body).toContain('Please add dark mode')
  })

  it('includes the item count', () => {
    const rows = [makeRow({ id: '1' }), makeRow({ id: '2' })]
    const body = buildDraftBody('user@example.com', rows)
    expect(body).toContain('Count: 2 items')
  })

  it('uses singular item label for one row', () => {
    const body = buildDraftBody('user@example.com', [makeRow()])
    expect(body).toContain('Count: 1 item')
    expect(body).not.toContain('Count: 1 items')
  })

  it('includes page path when present', () => {
    const row = makeRow({ page: '/pricing' })
    const body = buildDraftBody('user@example.com', [row])
    expect(body).toContain('Page: /pricing')
  })
})

// ── Test 4: getGmailConfig ────────────────────────────────────

describe('getGmailConfig', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns null when env vars are missing', () => {
    vi.stubEnv('GMAIL_CLIENT_ID', '')
    vi.stubEnv('GMAIL_CLIENT_SECRET', '')
    vi.stubEnv('GMAIL_REFRESH_TOKEN', '')
    expect(getGmailConfig()).toBeNull()
  })

  it('returns config when all three vars are set', () => {
    vi.stubEnv('GMAIL_CLIENT_ID', 'test-client-id')
    vi.stubEnv('GMAIL_CLIENT_SECRET', 'test-secret')
    vi.stubEnv('GMAIL_REFRESH_TOKEN', 'test-refresh')

    const config = getGmailConfig()
    expect(config).not.toBeNull()
    expect(config?.clientId).toBe('test-client-id')
    expect(config?.clientSecret).toBe('test-secret')
    expect(config?.refreshToken).toBe('test-refresh')
  })

  it('returns null when only some vars are set', () => {
    vi.stubEnv('GMAIL_CLIENT_ID', 'test-client-id')
    vi.stubEnv('GMAIL_CLIENT_SECRET', '')
    vi.stubEnv('GMAIL_REFRESH_TOKEN', '')
    expect(getGmailConfig()).toBeNull()
  })
})

// ── Test 5: refreshAccessToken ────────────────────────────────

describe('refreshAccessToken', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns access token on success', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'ya29.test-token', expires_in: 3600, token_type: 'Bearer' }),
    } as Response)

    const token = await refreshAccessToken({
      clientId: 'cid',
      clientSecret: 'csec',
      refreshToken: 'rtoken',
    })

    expect(token).toBe('ya29.test-token')
  })

  it('throws on non-OK response', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => 'invalid_grant',
    } as Response)

    await expect(
      refreshAccessToken({ clientId: 'cid', clientSecret: 'csec', refreshToken: 'expired' }),
    ).rejects.toThrow('Gmail token refresh failed')
  })
})

// ── Test 6: createGmailDraft ──────────────────────────────────

describe('createGmailDraft', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns draftId on success', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'draft-abc123', message: { id: 'msg-xyz' } }),
    } as Response)

    const result = await createGmailDraft('test-token', {
      to: 'dev@airwaylab.app',
      subject: 'Test subject',
      body: 'Test body',
    })

    expect(result.draftId).toBe('draft-abc123')
  })

  it('throws on non-OK response', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ error: { code: 403, message: 'Forbidden', status: 'PERMISSION_DENIED' } }),
    } as Response)

    await expect(
      createGmailDraft('bad-token', {
        to: 'dev@airwaylab.app',
        subject: 'Test',
        body: 'Test',
      }),
    ).rejects.toThrow('Gmail draft creation failed')
  })
})
