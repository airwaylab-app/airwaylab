/**
 * Tests for AIR-435: Mobile file picker
 *
 * Source-code analysis tests (no React rendering) that verify:
 *  - file-upload.tsx wires up the mobile file input correctly
 *  - mobile-email-capture.tsx is demoted to secondary section
 *  - app/analyze/page.tsx renders FileUpload before MobileEmailCapture
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');

function readSource(filePath: string): string {
  return fs.readFileSync(path.join(ROOT, filePath), 'utf-8');
}

const fileUploadSrc = readSource('components/upload/file-upload.tsx');
const mobileEmailCaptureSrc = readSource('components/upload/mobile-email-capture.tsx');
const analyzePageSrc = readSource('app/analyze/page.tsx');

describe('AIR-435 — Mobile file picker: file-upload.tsx', () => {
  it('declares mobileFileInputRef', () => {
    expect(fileUploadSrc).toContain('mobileFileInputRef');
  });

  it('includes hidden input with accept=".edf,.csv"', () => {
    expect(fileUploadSrc).toContain('accept=".edf,.csv"');
  });

  it('defines handleMobileFileChange handler', () => {
    expect(fileUploadSrc).toContain('handleMobileFileChange');
  });

  it('uses isMobile guard to show mobile picker', () => {
    expect(fileUploadSrc).toContain('isMobile');
  });

  it('shows trust text about browser-only processing', () => {
    expect(fileUploadSrc).toContain('processed in your browser');
  });

  it('does not show the iOS desktop warning anymore', () => {
    expect(fileUploadSrc).not.toContain('Please use a desktop browser');
  });
});

describe('AIR-435 — Mobile file picker: mobile-email-capture.tsx', () => {
  it('contains an "or" divider to signal secondary role', () => {
    expect(mobileEmailCaptureSrc).toContain('>or<');
  });

  it('uses smaller icon size (h-5 w-5) for the Monitor icon', () => {
    expect(mobileEmailCaptureSrc).toContain('h-5 w-5');
  });

  it('uses demoted heading style (text-sm font-medium text-muted-foreground)', () => {
    expect(mobileEmailCaptureSrc).toContain('text-sm font-medium text-muted-foreground');
  });
});

describe('AIR-435 — Mobile file picker: app/analyze/page.tsx ordering', () => {
  it('renders FileUpload before MobileEmailCapture in source order', () => {
    const fileUploadIndex = analyzePageSrc.indexOf('<FileUpload');
    const mobileEmailCaptureIndex = analyzePageSrc.indexOf('<MobileEmailCapture');
    expect(fileUploadIndex).toBeGreaterThan(-1);
    expect(mobileEmailCaptureIndex).toBeGreaterThan(-1);
    expect(fileUploadIndex).toBeLessThan(mobileEmailCaptureIndex);
  });

  it('uses mt-4 (not mb-4) on MobileEmailCapture — placed below FileUpload', () => {
    expect(analyzePageSrc).toContain('MobileEmailCapture className="mt-4 sm:hidden"');
  });
});
