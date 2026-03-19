import { ResultAsync } from 'neverthrow'
import type { AppError } from '@/lib/errors'

/**
 * Wraps a Supabase query in ResultAsync, converting Supabase errors
 * into typed AppError values.
 *
 * Usage:
 * ```ts
 * const result = supabaseQuery(
 *   supabase.from('feedback').insert({ message: 'hello' }).select(),
 *   'feedback',
 * )
 * ```
 */
export function supabaseQuery<T>(
  query: PromiseLike<{ data: T | null; error: { message: string } | null }>,
  resource: string,
): ResultAsync<T, AppError> {
  return ResultAsync.fromPromise(
    Promise.resolve(query).then(({ data, error }) => {
      if (error) throw error
      if (data === null || data === undefined) throw new Error(`No data returned from ${resource}`)
      return data
    }),
    (e) => ({
      type: 'API_ERROR' as const,
      service: 'supabase',
      message: e instanceof Error ? e.message : String(e),
    }),
  )
}

/**
 * Like supabaseQuery but for insert/update/delete operations where
 * Supabase returns `{ data: null, error: null }` on success (no `.select()`).
 *
 * Returns `{ ok: true }` on success.
 *
 * Usage:
 * ```ts
 * const result = supabaseInsert(
 *   supabase.from('feedback').insert({ message: 'hello' }),
 *   'feedback',
 * )
 * ```
 */
export function supabaseInsert(
  query: PromiseLike<{ data: unknown; error: { message: string } | null }>,
  _resource: string,
): ResultAsync<{ ok: true }, AppError> {
  return ResultAsync.fromPromise(
    Promise.resolve(query).then(({ error }) => {
      if (error) throw error
      return { ok: true as const }
    }),
    (e) => ({
      type: 'API_ERROR' as const,
      service: 'supabase',
      message: e instanceof Error ? e.message : String(e),
    }),
  )
}
