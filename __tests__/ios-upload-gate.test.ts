/**
 * Tests for AIR-554: iOS upload gate
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');

function readSource(filePath: string): string {
  return fs.readFileSync(path.join(ROOT, filePath), 'utf-8');
}

const iosUploadGateSrc = readSource('components/upload/ios-upload-gate.tsx');
const fileUploadSrc = readSource('components/upload/file-upload.tsx');

describe('AIR-554 — IosUploadGate component', () => {
  it('contains the required headline', () => {
    expect(iosUploadGateSrc).toContain('Upload needs a desktop browser');
  });
  it('contains the required body copy', () => {
    expect(iosUploadGateSrc).toContain('SD card folder selection requires a desktop');
  });
  it('links to the demo', () => {
    expect(iosUploadGateSrc).toContain('href="/analyze?demo"');
    expect(iosUploadGateSrc).toContain('Try the demo instead');
  });
  it('uses the existing remind-desktop endpoint', () => {
    expect(iosUploadGateSrc).toContain('/api/remind-desktop');
  });
  it('uses the shared localStorage key', () => {
    expect(iosUploadGateSrc).toContain('airwaylab_remind_submitted');
  });
  it('has consent checkbox text', () => {
    expect(iosUploadGateSrc).toContain('I agree to receive a one-time reminder email');
  });
  it('has Remind me button', () => {
    expect(iosUploadGateSrc).toContain('Remind me');
  });
});

describe('AIR-554 — file-upload.tsx iOS branching', () => {
  it('imports isIOSDevice', () => {
    expect(fileUploadSrc).toContain('isIOSDevice');
  });
  it('has isIOS state', () => {
    expect(fileUploadSrc).toContain('isIOS');
  });
  it('renders IosUploadGate for iOS users', () => {
    expect(fileUploadSrc).toContain('IosUploadGate');
  });
  it('keeps the file picker for non-iOS mobile', () => {
    expect(fileUploadSrc).toContain('!isIOS && isMobile');
  });
});
