import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

vi.mock('@/lib/parsers/device-detector', () => ({
  getFileStructureMetadata: vi.fn(() => ({
    totalFiles: 0,
    extensions: {},
    folderStructure: [],
    totalSizeBytes: 0,
  })),
}));

vi.mock('@/lib/analytics', () => ({
  events: { uploadStart: vi.fn() },
}));

vi.mock('@/lib/directory-traversal', () => ({
  supportsWebkitGetAsEntry: vi.fn(() => false),
  traverseDataTransferItems: vi.fn(() => Promise.resolve([])),
  toFilesWithPaths: vi.fn((files: File[]) => files),
  isIOSDevice: vi.fn(() => false),
}));

vi.mock('@/lib/upload-validation', () => ({
  validateSDFiles: vi.fn(() => ({ valid: false, errors: [], warnings: [], edfCount: 0, deviceType: 'unknown' })),
  validateOximetryFiles: vi.fn(() => ({ valid: false, errors: [], warnings: [] })),
  checkOximetryFormats: vi.fn(() => Promise.resolve([])),
}));

vi.mock('@/components/upload/unsupported-format-dialog', () => ({
  UnsupportedFormatDialog: () => null,
}));

vi.mock('@/components/upload/unsupported-device-dialog', () => ({
  UnsupportedDeviceDialog: () => null,
}));

// ── Import after mocks ────────────────────────────────────────────────────────

import { FileUpload } from '@/components/upload/file-upload';

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('FileUpload — isFirstRun progressive disclosure', () => {
  it('hides oximetry upload section when isFirstRun is true', () => {
    render(<FileUpload onFilesSelected={vi.fn()} isFirstRun={true} />);
    expect(screen.queryByText(/Pulse Oximetry CSVs/i)).not.toBeInTheDocument();
  });

  it('shows oximetry upload section when isFirstRun is false', () => {
    render(<FileUpload onFilesSelected={vi.fn()} isFirstRun={false} />);
    expect(screen.getByText(/Pulse Oximetry CSVs/i)).toBeInTheDocument();
  });

  it('shows oximetry upload section when isFirstRun is not provided', () => {
    render(<FileUpload onFilesSelected={vi.fn()} />);
    expect(screen.getByText(/Pulse Oximetry CSVs/i)).toBeInTheDocument();
  });

  it('still shows SD card upload when isFirstRun is true', () => {
    render(<FileUpload onFilesSelected={vi.fn()} isFirstRun={true} />);
    expect(screen.getByText(/Upload SD Card/i)).toBeInTheDocument();
  });
});
