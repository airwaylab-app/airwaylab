/**
 * Gmail REST API client.
 *
 * Uses OAuth2 refresh token flow to obtain access tokens on demand.
 * Creates Gmail drafts on behalf of the configured service account.
 * Zero external dependencies — all network calls use fetch().
 */

const GMAIL_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me'

export interface GmailConfig {
  clientId: string
  clientSecret: string
  refreshToken: string
}

export interface GmailDraftInput {
  to: string
  subject: string
  body: string
}

export interface GmailDraftResult {
  draftId: string
}

interface TokenResponse {
  access_token: string
  expires_in: number
  token_type: string
}

interface GmailApiError {
  error: {
    code: number
    message: string
    status: string
  }
}

/**
 * Refreshes the OAuth2 access token using the stored refresh token.
 */
export async function refreshAccessToken(config: GmailConfig): Promise<string> {
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: config.refreshToken,
    grant_type: 'refresh_token',
  })

  const response = await fetch(GMAIL_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Gmail token refresh failed (${response.status}): ${text}`)
  }

  const data = (await response.json()) as TokenResponse
  return data.access_token
}

/**
 * Encodes a Gmail RFC 2822 message to base64url format.
 */
function encodeMessage(to: string, subject: string, body: string): string {
  const message = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset=UTF-8',
    'MIME-Version: 1.0',
    '',
    body,
  ].join('\r\n')

  return Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

/**
 * Creates a Gmail draft in the configured mailbox.
 */
export async function createGmailDraft(
  accessToken: string,
  input: GmailDraftInput,
): Promise<GmailDraftResult> {
  const raw = encodeMessage(input.to, input.subject, input.body)

  const response = await fetch(`${GMAIL_API_BASE}/drafts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message: { raw } }),
  })

  if (!response.ok) {
    const data = (await response.json()) as GmailApiError
    throw new Error(
      `Gmail draft creation failed (${response.status}): ${data.error?.message ?? 'unknown error'}`,
    )
  }

  const result = (await response.json()) as { id: string }
  return { draftId: result.id }
}

/**
 * Reads Gmail config from environment variables.
 * Returns null when any required variable is missing (feature disabled).
 */
export function getGmailConfig(): GmailConfig | null {
  const clientId = process.env.GMAIL_CLIENT_ID
  const clientSecret = process.env.GMAIL_CLIENT_SECRET
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN

  if (!clientId || !clientSecret || !refreshToken) {
    return null
  }

  return { clientId, clientSecret, refreshToken }
}
