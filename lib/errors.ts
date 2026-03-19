import { NextResponse } from 'next/server'
import { type Result } from 'neverthrow'

/**
 * Typed error union for service-layer functions.
 *
 * API routes call service functions that return Result<T, AppError>.
 * The route then uses `resultToResponse()` to convert to NextResponse.
 * This eliminates nested try/catch and makes error paths explicit.
 */
export type AppError =
  | { type: 'NOT_FOUND'; resource: string; id?: string }
  | { type: 'UNAUTHORIZED'; reason?: string }
  | { type: 'FORBIDDEN'; reason?: string }
  | { type: 'VALIDATION'; field: string; message: string }
  | { type: 'RATE_LIMITED' }
  | { type: 'API_ERROR'; service: string; message: string; cause?: unknown }
  | { type: 'CONFIG_ERROR'; detail: string }
  | { type: 'INTERNAL'; message: string; cause?: unknown }

function errorToStatus(error: AppError): { status: number; message: string } {
  switch (error.type) {
    case 'NOT_FOUND':
      return { status: 404, message: `${error.resource} not found` }
    case 'UNAUTHORIZED':
      return { status: 401, message: error.reason ?? 'Unauthorized' }
    case 'FORBIDDEN':
      return { status: 403, message: error.reason ?? 'Forbidden' }
    case 'VALIDATION':
      return { status: 400, message: `${error.field}: ${error.message}` }
    case 'RATE_LIMITED':
      return { status: 429, message: 'Too many requests. Please try again later.' }
    case 'API_ERROR':
      return { status: 502, message: `${error.service} error` }
    case 'CONFIG_ERROR':
      return { status: 503, message: 'Service not configured' }
    case 'INTERNAL':
      return { status: 500, message: 'Server error' }
  }
}

/**
 * Convert a Result<T, AppError> to NextResponse.
 *
 * Usage in API routes:
 * ```ts
 * const result = await someService(input)
 * return resultToResponse(result)
 * ```
 */
export function resultToResponse<T>(
  result: Result<T, AppError>,
  successStatus = 200,
): NextResponse {
  return result.match(
    (data) => NextResponse.json(data, { status: successStatus }),
    (error) => {
      const { status, message } = errorToStatus(error)
      return NextResponse.json({ error: message }, { status })
    },
  )
}
