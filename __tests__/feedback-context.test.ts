import { describe, it, expect, vi, beforeEach } from 'vitest'
import { gatherFeedbackContext } from '@/lib/feedback-context'

describe('gatherFeedbackContext', () => {
  beforeEach(() => {
    // Reset localStorage mock
    vi.stubGlobal('localStorage', {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn(),
    })
  })

  it('returns expected metadata shape with all fields', () => {
    const profile = { tier: 'supporter' as const, display_name: 'Test User' }
    const result = gatherFeedbackContext(profile)

    expect(result).toMatchObject({
      user_agent: expect.any(String),
      screen_width: expect.any(Number),
      screen_height: expect.any(Number),
      viewport_width: expect.any(Number),
      viewport_height: expect.any(Number),
      timezone: expect.any(String),
      locale: expect.any(String),
      app_version: expect.any(String),
      has_analysis_results: false, // localStorage returns null → key not found
      user_tier: 'supporter',
      display_name: 'Test User',
      referrer: null, // empty string in jsdom → null
    })
  })

  it('returns null tier and display_name when profile is null', () => {
    const result = gatherFeedbackContext(null)

    expect(result.user_tier).toBeNull()
    expect(result.display_name).toBeNull()
  })

  it('returns app_version as a semver string', () => {
    const result = gatherFeedbackContext(null)

    expect(result.app_version).toMatch(/^\d+\.\d+\.\d+/)
  })

  it('returns has_analysis_results true when localStorage key exists', () => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn().mockReturnValue('{"some":"data"}'),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 1,
      key: vi.fn(),
    })

    const result = gatherFeedbackContext(null)
    expect(result.has_analysis_results).toBe(true)
  })

  it('handles localStorage being unavailable gracefully', () => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn().mockImplementation(() => {
        throw new Error('SecurityError: localStorage is not available')
      }),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      length: 0,
      key: vi.fn(),
    })

    const result = gatherFeedbackContext(null)
    expect(result.has_analysis_results).toBeNull()
  })
})
