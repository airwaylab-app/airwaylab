import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'

// ── Mock auth ────────────────────────────────────────────────
let mockUser: { id: string } | null = null
let mockProfile: { email: string; tier: string; display_name: string | null } | null = null

vi.mock('@/lib/auth/auth-context', () => ({
  useAuth: () => ({
    user: mockUser,
    profile: mockProfile,
    isLoading: false,
    tier: mockProfile?.tier ?? 'community',
  }),
}))

// ── Mock analytics ───────────────────────────────────────────
vi.mock('@/lib/analytics', () => ({
  events: {
    feedbackSubmitted: vi.fn(),
  },
}))

// ── Mock feedback context ────────────────────────────────────
vi.mock('@/lib/feedback-context', () => ({
  gatherFeedbackContext: vi.fn(() => ({
    user_agent: 'test-agent',
    screen_width: 1920,
    screen_height: 1080,
    viewport_width: 1200,
    viewport_height: 800,
    timezone: 'Europe/Amsterdam',
    locale: 'en-US',
    app_version: '1.2.0',
    has_analysis_results: false,
    user_tier: null,
    display_name: null,
    referrer: null,
  })),
}))

import { FeedbackPanel } from '@/components/feedback/feedback-panel'

// ── Helpers ──────────────────────────────────────────────────
const noop = () => {}

function renderPanel(open = true, onClose = noop) {
  return render(<FeedbackPanel open={open} onClose={onClose} />)
}

describe('FeedbackPanel', () => {
  beforeEach(() => {
    mockUser = null
    mockProfile = null
    vi.restoreAllMocks()
  })

  // ── Rendering ──────────────────────────────────────────────

  it('renders nothing when closed', () => {
    renderPanel(false)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders panel with type selector, textarea, and submit button when open', () => {
    renderPanel()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Bug')).toBeInTheDocument()
    expect(screen.getByText('Idea')).toBeInTheDocument()
    expect(screen.getByText('Other')).toBeInTheDocument()
    expect(screen.getByPlaceholderText("What's on your mind?")).toBeInTheDocument()
    expect(screen.getByText('Send Feedback')).toBeInTheDocument()
  })

  it('defaults to "Other" type selected', () => {
    renderPanel()
    // The "Other" button should have the active styling (bg-primary/5)
    const otherBtn = screen.getByText('Other').closest('button')!
    expect(otherBtn.className).toContain('bg-primary')
  })

  // ── Validation ─────────────────────────────────────────────

  it('disables submit when message is less than 5 characters', () => {
    renderPanel()
    const submitBtn = screen.getByText('Send Feedback')
    expect(submitBtn).toBeDisabled()

    const textarea = screen.getByPlaceholderText("What's on your mind?")
    fireEvent.change(textarea, { target: { value: 'Hi' } })
    expect(submitBtn).toBeDisabled()
  })

  it('enables submit when message is 5+ characters', () => {
    renderPanel()
    const textarea = screen.getByPlaceholderText("What's on your mind?")
    fireEvent.change(textarea, { target: { value: 'Hello world' } })

    const submitBtn = screen.getByText('Send Feedback')
    expect(submitBtn).not.toBeDisabled()
  })

  it('shows character counter that turns red near limit', () => {
    renderPanel()
    const textarea = screen.getByPlaceholderText("What's on your mind?")

    fireEvent.change(textarea, { target: { value: 'x'.repeat(460) } })
    const counter = screen.getByText('40 characters left')
    expect(counter.className).toContain('text-red-400')
  })

  // ── Auth-aware email ───────────────────────────────────────

  it('shows editable email field and unchecked checkbox when not signed in', () => {
    renderPanel()
    const emailInput = screen.getByPlaceholderText('Email (optional)')
    expect(emailInput).not.toBeDisabled()

    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).not.toBeChecked()
  })

  it('shows read-only email and pre-checked checkbox when signed in', () => {
    mockUser = { id: 'user-123' }
    mockProfile = { email: 'user@test.com', tier: 'supporter', display_name: 'Test' }

    renderPanel()
    const emailInput = screen.getByDisplayValue('user@test.com')
    expect(emailInput).toBeDisabled()

    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toBeChecked()
  })

  // ── Type selector ──────────────────────────────────────────

  it('switches type when clicking different pills', () => {
    renderPanel()

    const bugBtn = screen.getByText('Bug').closest('button')!
    fireEvent.click(bugBtn)
    expect(bugBtn.className).toContain('bg-primary')

    const otherBtn = screen.getByText('Other').closest('button')!
    expect(otherBtn.className).not.toContain('bg-primary/5')
  })

  // ── Submission ─────────────────────────────────────────────

  it('shows success state after successful submission', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200 })

    renderPanel()
    const textarea = screen.getByPlaceholderText("What's on your mind?")
    fireEvent.change(textarea, { target: { value: 'Great tool, love it!' } })

    const submitBtn = screen.getByText('Send Feedback')
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText(/Thanks — we read every message/)).toBeInTheDocument()
    })
  })

  it('shows error state on failure without clearing message', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 })

    renderPanel()
    const textarea = screen.getByPlaceholderText("What's on your mind?")
    fireEvent.change(textarea, { target: { value: 'Something broke' } })

    const submitBtn = screen.getByText('Send Feedback')
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText('Something went wrong. Please try again.')).toBeInTheDocument()
    })

    // Message should still be there
    expect(screen.getByPlaceholderText("What's on your mind?")).toHaveValue('Something broke')
  })

  it('shows rate limit message on 429', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 429 })

    renderPanel()
    const textarea = screen.getByPlaceholderText("What's on your mind?")
    fireEvent.change(textarea, { target: { value: 'Testing rate limit' } })

    fireEvent.click(screen.getByText('Send Feedback'))

    await waitFor(() => {
      expect(screen.getByText(/sent a few messages recently/)).toBeInTheDocument()
    })
  })

  // ── Close behavior ─────────────────────────────────────────

  it('calls onClose when ESC is pressed', () => {
    const onClose = vi.fn()
    renderPanel(true, onClose)

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn()
    renderPanel(true, onClose)

    // The backdrop is the first child with the fixed inset-0 class
    const backdrop = document.querySelector('[aria-hidden="true"]')!
    fireEvent.click(backdrop)
    expect(onClose).toHaveBeenCalled()
  })
})
