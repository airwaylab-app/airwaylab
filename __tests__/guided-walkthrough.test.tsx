import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { readFileSync } from 'fs';
import { join } from 'path';

// ── Mock localStorage ────────────────────────────────────────────
const storage = new Map<string, string>();
const localStorageMock: Storage = {
  getItem: vi.fn((key: string) => storage.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => { storage.set(key, value); }),
  removeItem: vi.fn((key: string) => { storage.delete(key); }),
  clear: vi.fn(() => { storage.clear(); }),
  get length() { return storage.size; },
  key: vi.fn((index: number) => Array.from(storage.keys())[index] ?? null),
};
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

// Mock the auth context
const mockMarkWalkthroughComplete = vi.fn();
vi.mock('@/lib/auth/auth-context', () => ({
  useAuth: () => ({
    profile: null,
    isPaid: false,
    markWalkthroughComplete: mockMarkWalkthroughComplete,
  }),
}));

// Mock analytics
vi.mock('@/lib/analytics', () => ({
  events: {
    walkthroughStarted: vi.fn(),
    walkthroughStepViewed: vi.fn(),
    walkthroughCompleted: vi.fn(),
    walkthroughSkipped: vi.fn(),
  },
}));

import { GuidedWalkthrough } from '@/components/dashboard/guided-walkthrough';

// Create fake DOM elements for walkthrough targets
function setupWalkthroughTargets() {
  const targets = [
    'summary-hero',
    'metrics-grid',
    'tab-bar',
    'night-selector',
    'next-steps',
  ];
  const elements: HTMLDivElement[] = [];
  for (const name of targets) {
    const el = document.createElement('div');
    el.setAttribute('data-walkthrough', name);
    el.style.position = 'fixed';
    el.style.top = '100px';
    el.style.left = '100px';
    el.style.width = '200px';
    el.style.height = '50px';
    el.getBoundingClientRect = () => ({
      top: 100,
      left: 100,
      bottom: 150,
      right: 300,
      width: 200,
      height: 50,
      x: 100,
      y: 100,
      toJSON: () => ({}),
    });
    document.body.appendChild(el);
    elements.push(el);
  }
  return () => {
    for (const el of elements) {
      if (el.parentNode) el.parentNode.removeChild(el);
    }
  };
}

describe('GuidedWalkthrough', () => {
  let cleanupTargets: () => void;

  beforeEach(() => {
    storage.clear();
    mockMarkWalkthroughComplete.mockClear();
    cleanupTargets = setupWalkthroughTargets();
    Object.defineProperty(window, 'innerHeight', { value: 800, writable: true });
    Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
  });

  afterEach(() => {
    cleanupTargets();
  });

  it('shows prompt when isComplete is true and walkthrough not done', () => {
    render(<GuidedWalkthrough isComplete={true} />);
    expect(screen.getByText('First time here?')).toBeInTheDocument();
    expect(screen.getByText('Show me around')).toBeInTheDocument();
  });

  it('does not show prompt when isComplete is false', () => {
    render(<GuidedWalkthrough isComplete={false} />);
    expect(screen.queryByText('First time here?')).not.toBeInTheDocument();
  });

  it('does not show prompt when localStorage flag is set', () => {
    storage.set('airwaylab_walkthrough_done', '1');
    render(<GuidedWalkthrough isComplete={true} />);
    expect(screen.queryByText('First time here?')).not.toBeInTheDocument();
  });

  it('starts tour when "Show me around" is clicked', () => {
    render(<GuidedWalkthrough isComplete={true} />);
    fireEvent.click(screen.getByText('Show me around'));
    expect(screen.getByText(/headline result/i)).toBeInTheDocument();
    expect(screen.getByText('1 of 5')).toBeInTheDocument();
  });

  it('dismisses when "I\'ll explore on my own" is clicked and marks complete', () => {
    render(<GuidedWalkthrough isComplete={true} />);
    fireEvent.click(screen.getByText("I'll explore on my own"));
    expect(screen.queryByText('First time here?')).not.toBeInTheDocument();
    expect(mockMarkWalkthroughComplete).toHaveBeenCalled();
  });

  it('advances to next step when "Next" is clicked', () => {
    render(<GuidedWalkthrough isComplete={true} />);
    fireEvent.click(screen.getByText('Show me around'));
    expect(screen.getByText('1 of 5')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByText('2 of 5')).toBeInTheDocument();
    expect(screen.getByText(/key metrics/i)).toBeInTheDocument();
  });

  it('completes tour and marks walkthrough complete on final step', () => {
    render(<GuidedWalkthrough isComplete={true} />);
    fireEvent.click(screen.getByText('Show me around'));
    for (let i = 0; i < 4; i++) {
      fireEvent.click(screen.getByText('Next'));
    }
    expect(screen.getByText('Got it')).toBeInTheDocument();
    expect(screen.getByText('5 of 5')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Got it'));
    expect(mockMarkWalkthroughComplete).toHaveBeenCalled();
  });

  it('skips tour at any step and marks complete', () => {
    render(<GuidedWalkthrough isComplete={true} />);
    fireEvent.click(screen.getByText('Show me around'));
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Skip tour'));
    expect(mockMarkWalkthroughComplete).toHaveBeenCalled();
  });

  it('dismisses tour on Escape key press', () => {
    render(<GuidedWalkthrough isComplete={true} />);
    fireEvent.click(screen.getByText('Show me around'));
    expect(screen.getByText('1 of 5')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(mockMarkWalkthroughComplete).toHaveBeenCalled();
  });

  it('shows premium upsell for non-paid users', () => {
    render(<GuidedWalkthrough isComplete={true} />);
    expect(screen.getByText(/Supporters get personalized/i)).toBeInTheDocument();
  });

  it('exposes restart function on window', () => {
    render(<GuidedWalkthrough isComplete={true} />);
    expect(typeof (window as unknown as Record<string, unknown>).__airwaylab_restart_walkthrough).toBe('function');
  });

  it('can restart tour after completion', () => {
    render(<GuidedWalkthrough isComplete={true} />);
    fireEvent.click(screen.getByText("I'll explore on my own"));
    expect(screen.queryByText('First time here?')).not.toBeInTheDocument();

    act(() => {
      const fn = (window as unknown as Record<string, () => void>).__airwaylab_restart_walkthrough;
      if (fn) fn();
    });

    expect(screen.getByText(/headline result/i)).toBeInTheDocument();
  });
});

describe('Walkthrough server-side state', () => {
  it('auth context includes walkthrough_completed in profile type', () => {
    const content = readFileSync(
      join(__dirname, '..', 'lib/auth/auth-context.tsx'),
      'utf-8'
    );
    expect(content).toContain('walkthrough_completed: boolean');
    expect(content).toContain('markWalkthroughComplete');
  });

  it('migration file adds walkthrough_completed to profiles', () => {
    const content = readFileSync(
      join(__dirname, '..', 'supabase/migrations/025_walkthrough_completed.sql'),
      'utf-8'
    );
    expect(content).toContain('walkthrough_completed');
    expect(content).toContain('boolean');
    expect(content).toContain('default false');
  });

  it('analytics module contains all walkthrough events', () => {
    const content = readFileSync(
      join(__dirname, '..', 'lib/analytics.ts'),
      'utf-8'
    );
    expect(content).toContain('walkthroughStarted');
    expect(content).toContain('walkthroughStepViewed');
    expect(content).toContain('walkthroughCompleted');
    expect(content).toContain('walkthroughSkipped');
    expect(content).toContain('gettingStartedViewed');
  });
});
