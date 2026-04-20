/**
 * Tests for MobileEmailCapture touch-target and accessibility fixes (AIR-217).
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MobileEmailCapture } from '@/components/upload/mobile-email-capture';

// Suppress Next.js router warnings in tests
vi.mock('next/navigation', () => ({ useRouter: () => ({}) }));

// Mock analytics to prevent noise
vi.mock('@/lib/analytics', () => ({
  events: {
    mobileReminderShown: vi.fn(),
    mobileReminderSubmitted: vi.fn(),
    mobileReminderSuccess: vi.fn(),
    mobileReminderError: vi.fn(),
  },
}));

// Suppress localStorage unavailability in jsdom
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

beforeEach(() => {
  localStorageMock.clear();
  vi.clearAllMocks();
});

describe('MobileEmailCapture -- touch target and a11y (AIR-217)', () => {
  it('renders the consent wrapper as a <label> element for full-row tap target', () => {
    render(<MobileEmailCapture />);
    // The checkbox wrapper must be a label (not a div) so the full row is tappable
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox.closest('label')).not.toBeNull();
  });

  it('consent wrapper has min-h-[44px] class for 44px touch target', () => {
    render(<MobileEmailCapture />);
    const checkbox = screen.getByRole('checkbox');
    const wrapper = checkbox.closest('label') as HTMLLabelElement;
    expect(wrapper.className).toContain('min-h-[44px]');
  });

  it('checkbox is h-5 w-5 (20px visual, part of 44px label target)', () => {
    render(<MobileEmailCapture />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox.className).toContain('h-5');
    expect(checkbox.className).toContain('w-5');
  });

  it('clicking any part of the label row toggles the checkbox', () => {
    render(<MobileEmailCapture />);
    const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
    const wrapper = checkbox.closest('label') as HTMLLabelElement;
    expect(checkbox.checked).toBe(false);
    fireEvent.click(wrapper);
    expect(checkbox.checked).toBe(true);
  });

  it('submit button has aria-disabled when email is empty', () => {
    render(<MobileEmailCapture />);
    const button = screen.getByRole('button', { name: /email me a reminder/i });
    expect(button).toHaveAttribute('aria-disabled', 'true');
  });

  it('submit button has aria-disabled when consent is unchecked', () => {
    render(<MobileEmailCapture />);
    const emailInput = screen.getByPlaceholderText('your@email.com');
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    const button = screen.getByRole('button', { name: /email me a reminder/i });
    expect(button).toHaveAttribute('aria-disabled', 'true');
  });

  it('submit button removes aria-disabled when email and consent are valid', () => {
    render(<MobileEmailCapture />);
    const emailInput = screen.getByPlaceholderText('your@email.com');
    const checkbox = screen.getByRole('checkbox');
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.click(checkbox);
    const button = screen.getByRole('button', { name: /email me a reminder/i });
    expect(button).toHaveAttribute('aria-disabled', 'false');
  });

  it('no nested <label> elements (HTML spec violation that would break click propagation)', () => {
    render(<MobileEmailCapture />);
    const labels = document.querySelectorAll('label label');
    expect(labels.length).toBe(0);
  });
});
