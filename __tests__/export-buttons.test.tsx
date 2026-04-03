import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { NightResult } from '@/lib/types';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/auth/auth-context', () => ({
  useAuth: () => ({ tier: 'community' }),
}));

vi.mock('@/lib/auth/feature-gate', () => ({
  canAccess: () => true,
}));

vi.mock('@/lib/analytics', () => ({
  events: { export: vi.fn() },
}));

vi.mock('@/lib/export', () => ({
  exportCSV: vi.fn(() => 'csv-content'),
  exportJSON: vi.fn(() => '{}'),
  downloadFile: vi.fn(),
}));

vi.mock('@/lib/forum-export', () => ({
  exportForumSingleNight: vi.fn(() => 'forum-text'),
  exportForumMultiNight: vi.fn(() => 'forum-text'),
}));

vi.mock('@/lib/pdf-report', () => ({
  openPDFReport: vi.fn(),
}));

// ── Import after mocks ────────────────────────────────────────────────────────

import * as exportLib from '@/lib/export';
import * as pdfLib from '@/lib/pdf-report';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeNight(): NightResult {
  return {
    date: new Date('2024-01-15'),
    dateStr: '2024-01-15',
    durationHours: 7.5,
    sessionCount: 1,
    settings: {} as NightResult['settings'],
    glasgow: {} as NightResult['glasgow'],
    wat: {} as NightResult['wat'],
    ned: {} as NightResult['ned'],
    oximetry: null,
    oximetryTrace: null,
    settingsMetrics: null,
    crossDevice: null,
    machineSummary: null,
    settingsFingerprint: null,
    csl: null,
    pldSummary: null,
  };
}

async function renderExportButtons(nights = [makeNight()]) {
  const { ExportButtons } = await import('@/components/dashboard/export-buttons');
  return render(<ExportButtons nights={nights} />);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ExportButtons error feedback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(exportLib.exportCSV).mockReset().mockReturnValue('csv-content');
    vi.mocked(exportLib.exportJSON).mockReset().mockReturnValue('{}');
    vi.mocked(exportLib.downloadFile).mockReset();
    vi.mocked(pdfLib.openPDFReport).mockReset();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('shows Failed on CSV button when export throws', async () => {
    vi.mocked(exportLib.exportCSV).mockImplementation(() => { throw new Error('disk full'); });

    const { unmount } = await renderExportButtons();
    const csvBtn = screen.getByRole('button', { name: /export.*csv spreadsheet/i });

    await act(async () => { fireEvent.click(csvBtn); });

    expect(csvBtn.textContent).toContain('Failed');
    unmount();
  });

  it('auto-dismisses CSV error after 5 seconds', async () => {
    vi.mocked(exportLib.exportCSV).mockImplementation(() => { throw new Error('disk full'); });

    const { unmount } = await renderExportButtons();
    const csvBtn = screen.getByRole('button', { name: /export.*csv spreadsheet/i });

    await act(async () => { fireEvent.click(csvBtn); });
    expect(csvBtn.textContent).toContain('Failed');

    act(() => { vi.advanceTimersByTime(5001); });

    expect(csvBtn.textContent).toContain('CSV');
    expect(csvBtn.textContent).not.toContain('Failed');
    unmount();
  });

  it('shows Failed on JSON button when export throws', async () => {
    vi.mocked(exportLib.exportJSON).mockImplementation(() => { throw new Error('serialization error'); });

    const { unmount } = await renderExportButtons();
    const jsonBtn = screen.getByRole('button', { name: /export.*json data/i });

    await act(async () => { fireEvent.click(jsonBtn); });

    expect(jsonBtn.textContent).toContain('Failed');
    unmount();
  });

  it('auto-dismisses JSON error after 5 seconds', async () => {
    vi.mocked(exportLib.exportJSON).mockImplementation(() => { throw new Error('serialization error'); });

    const { unmount } = await renderExportButtons();
    const jsonBtn = screen.getByRole('button', { name: /export.*json data/i });

    await act(async () => { fireEvent.click(jsonBtn); });
    expect(jsonBtn.textContent).toContain('Failed');

    act(() => { vi.advanceTimersByTime(5001); });

    expect(jsonBtn.textContent).toContain('JSON');
    expect(jsonBtn.textContent).not.toContain('Failed');
    unmount();
  });

  it('shows Failed on PDF button when report generation throws', async () => {
    vi.mocked(pdfLib.openPDFReport).mockImplementation(() => { throw new Error('pdf error'); });

    const { unmount } = await renderExportButtons();
    const pdfBtn = screen.getByRole('button', { name: /open printable pdf/i });

    await act(async () => { fireEvent.click(pdfBtn); });

    expect(pdfBtn.textContent).toContain('Failed');
    unmount();
  });

  it('auto-dismisses PDF error after 5 seconds', async () => {
    vi.mocked(pdfLib.openPDFReport).mockImplementation(() => { throw new Error('pdf error'); });

    const { unmount } = await renderExportButtons();
    const pdfBtn = screen.getByRole('button', { name: /open printable pdf/i });

    await act(async () => { fireEvent.click(pdfBtn); });
    expect(pdfBtn.textContent).toContain('Failed');

    act(() => { vi.advanceTimersByTime(5001); });

    expect(pdfBtn.textContent).toContain('PDF');
    expect(pdfBtn.textContent).not.toContain('Failed');
    unmount();
  });

  it('shows Downloaded on CSV button on success', async () => {
    const { unmount } = await renderExportButtons();
    const csvBtn = screen.getByRole('button', { name: /export.*csv spreadsheet/i });

    await act(async () => { fireEvent.click(csvBtn); });

    expect(csvBtn.textContent).toContain('Downloaded');
    expect(vi.mocked(exportLib.downloadFile)).toHaveBeenCalledOnce();
    unmount();
  });

  it('shows Downloaded on JSON button on success', async () => {
    const { unmount } = await renderExportButtons();
    const jsonBtn = screen.getByRole('button', { name: /export.*json data/i });

    await act(async () => { fireEvent.click(jsonBtn); });

    expect(jsonBtn.textContent).toContain('Downloaded');
    unmount();
  });
});
