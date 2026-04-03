// ============================================================
// AirwayLab — Pre-upload File Validation
// Quick checks before sending files to the analysis worker.
// ============================================================

import type { DeviceType } from './types';
import { detectDeviceType, type DeviceDetectionResult } from './parsers/device-detector';

export interface ValidationResult {
  valid: boolean;
  edfCount: number;
  warnings: string[];
  errors: string[];
  deviceType: DeviceType;
  deviceLabel: string;
  /** BMC serial prefix (only set when deviceType === 'bmc') */
  bmcSerial?: string;
}

/**
 * Validate selected SD card files before analysis.
 * First detects device type, then applies device-specific validation.
 */
export function validateSDFiles(files: File[]): ValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  if (files.length === 0) {
    return { valid: false, edfCount: 0, warnings, errors: ['No files selected.'], deviceType: 'unknown', deviceLabel: 'Unknown' };
  }

  // Detect device type from file structure
  const fileInfos = files.map((f) => ({
    name: f.name,
    path: (f as unknown as { webkitRelativePath?: string }).webkitRelativePath || f.name,
    size: f.size,
  }));
  const detection = detectDeviceType(fileInfos);

  if (detection.deviceType === 'resmed') {
    return validateResMedFiles(files, detection, warnings, errors);
  }

  if (detection.deviceType === 'bmc') {
    return validateBMCFiles(files, detection, warnings, errors);
  }

  // Unknown device
  errors.push(
    'This SD card format is not recognised. AirwayLab currently supports ResMed (AirSense 10/11) and BMC (Luna 2, RESmart G2/G3) devices.'
  );
  return { valid: false, edfCount: 0, warnings, errors, deviceType: 'unknown', deviceLabel: detection.deviceLabel };
}

function validateResMedFiles(
  files: File[],
  detection: DeviceDetectionResult,
  warnings: string[],
  errors: string[]
): ValidationResult {
  const edfFiles = files.filter((f) => f.name.toLowerCase().endsWith('.edf'));
  const paths = files.map((f) => {
    const rel = (f as unknown as { webkitRelativePath?: string }).webkitRelativePath;
    return rel || f.name;
  });
  const hasDatalog = paths.some((p) => p.toUpperCase().includes('DATALOG'));
  const hasSTR = edfFiles.some((f) => f.name.toUpperCase().startsWith('STR'));

  const MIN_FLOW_SIZE = 50 * 1024;
  const hasFlowData = edfFiles.some((f) => {
    const name = f.name.toLowerCase();
    return (name.endsWith('brp.edf') || name.endsWith('_brp.edf') ||
            name.endsWith('flw.edf') || name.endsWith('_flw.edf')) &&
      f.size > MIN_FLOW_SIZE;
  });

  if (edfFiles.length === 0) {
    errors.push('No EDF files found. Make sure you selected the SD card itself, not a subfolder.');
    return { valid: false, edfCount: 0, warnings, errors, deviceType: 'resmed', deviceLabel: 'ResMed' };
  }

  if (!hasDatalog && edfFiles.length < 5) {
    warnings.push('Folder structure doesn\'t look like a typical ResMed SD card. Make sure you selected the SD card itself, not a subfolder.');
  }
  if (!hasSTR) {
    warnings.push('No STR.edf settings file found. Machine settings won\'t be available.');
  }

  if (!hasFlowData) {
    const hasSmallFlowFiles = edfFiles.some((f) => {
      const name = f.name.toLowerCase();
      return (name.endsWith('brp.edf') || name.endsWith('_brp.edf') ||
              name.endsWith('flw.edf') || name.endsWith('_flw.edf')) &&
        f.size <= MIN_FLOW_SIZE;
    });
    if (hasSmallFlowFiles) {
      errors.push('Flow data files were found but are too small to contain usable data (< 50KB). Try uploading more nights of data.');
    } else {
      errors.push('No flow data files (BRP/FLW) found. Breath-by-breath analysis requires flow signal data from your ResMed SD card.');
    }
  }

  const hasSA2 = edfFiles.some((f) => /sa2\.edf$/i.test(f.name));
  if (hasSA2) {
    warnings.push('Pulse oximetry data detected on your SD card (SpO2 + heart rate will be included in your analysis).');
  }

  const hasPLD = edfFiles.some((f) => /(?:^|_)pld\.edf$/i.test(f.name));
  if (hasPLD) {
    warnings.push('Therapy summary data detected (leak, pressure, snore metrics will be included in your analysis).');
  }

  const hasIdentification = files.some((f) => f.name.toUpperCase().startsWith('IDENTIFICATION'));
  if (!hasIdentification) {
    warnings.push('No Identification file found. Select the SD card itself (not a subfolder) so we can identify your device model.');
  }

  return { valid: errors.length === 0, edfCount: edfFiles.length, warnings, errors, deviceType: 'resmed', deviceLabel: 'ResMed' };
}

function validateBMCFiles(
  files: File[],
  detection: DeviceDetectionResult,
  warnings: string[],
  errors: string[]
): ValidationResult {
  const serial = detection.bmcSerial!;
  const lowerSerial = serial.toLowerCase();

  // Count data files
  const dataFiles = files.filter((f) => {
    const name = f.name.toLowerCase();
    return name.startsWith(lowerSerial) && /\.\d{3}$/.test(name);
  });

  if (dataFiles.length === 0) {
    errors.push(`BMC device detected (${serial}) but no waveform data files found.`);
    return { valid: false, edfCount: 0, warnings, errors, deviceType: 'bmc', deviceLabel: 'BMC / Luna', bmcSerial: serial };
  }

  const hasIdx = files.some((f) => f.name.toLowerCase() === `${lowerSerial}.idx`);
  const hasUsr = files.some((f) => f.name.toLowerCase() === `${lowerSerial}.usr`);

  if (!hasIdx) {
    warnings.push('No index file found. Session metadata will be limited.');
  }
  if (!hasUsr) {
    warnings.push('No device info file found. Device model identification may be incomplete.');
  }

  warnings.push(`BMC device detected with ${dataFiles.length} data file${dataFiles.length !== 1 ? 's' : ''}.`);

  return {
    valid: errors.length === 0,
    edfCount: dataFiles.length,
    warnings,
    errors,
    deviceType: 'bmc',
    deviceLabel: 'BMC / Luna',
    bmcSerial: serial,
  };
}

/**
 * Detect whether a CSV header line matches a supported oximetry format.
 * Returns the format name or 'unknown'.
 */
type OximetryFormat = 'viatom' | 'o2ring' | 'unknown';

export function detectOximetryFormat(headerLine: string): OximetryFormat {
  const lower = headerLine.toLowerCase();
  // Viatom / Checkme O2 Max: "Time, Oxygen Level, Pulse Rate, Motion, ..."
  if (lower.includes('oxygen level') && lower.includes('pulse rate')) {
    return 'viatom';
  }
  // Wellue O2Ring: "Time,SpO2(%),Pulse Rate(bpm),Motion,..."
  if (lower.includes('spo2(%)') || (lower.includes('spo2') && lower.includes('pulse rate'))) {
    return 'o2ring';
  }
  return 'unknown';
}

/**
 * Read the first 5 lines of each CSV file and check format support.
 * Returns a list of unsupported files with their header samples.
 */
export async function checkOximetryFormats(
  files: File[]
): Promise<{ fileName: string; headerSample: string }[]> {
  const unsupported: { fileName: string; headerSample: string }[] = [];
  for (const file of files) {
    if (!file.name.toLowerCase().endsWith('.csv')) continue;
    try {
      const slice = file.slice(0, 2048); // first ~2KB is enough for headers
      const text = await slice.text();
      const lines = text.split(/\r?\n/).filter(Boolean);
      const header = lines[0] || '';
      if (detectOximetryFormat(header) === 'unknown') {
        unsupported.push({
          fileName: file.name,
          headerSample: lines.slice(0, 5).join('\n'),
        });
      }
    } catch {
      // If we can't read the file, skip format check
    }
  }
  return unsupported;
}

/**
 * Validate oximetry CSV files.
 */
export function validateOximetryFiles(files: File[]): ValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  const csvFiles = files.filter(
    (f) => f.name.toLowerCase().endsWith('.csv')
  );

  if (csvFiles.length === 0) {
    errors.push('No CSV files found. Oximetry data should be in .csv format.');
    return { valid: false, edfCount: 0, warnings, errors, deviceType: 'unknown', deviceLabel: 'Oximetry' };
  }

  // Check for extremely large files (>50MB probably not oximetry)
  const largFiles = csvFiles.filter((f) => f.size > 50 * 1024 * 1024);
  if (largFiles.length > 0) {
    warnings.push(
      `${largFiles.length} file${largFiles.length !== 1 ? 's' : ''} over 50MB — these may not be oximetry exports.`
    );
  }

  return {
    valid: errors.length === 0,
    edfCount: csvFiles.length,
    warnings,
    errors,
    deviceType: 'unknown',
    deviceLabel: 'Oximetry',
  };
}
