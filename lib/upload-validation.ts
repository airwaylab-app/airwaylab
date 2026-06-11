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

// ── Selection context detection ──────────────────────────────────────────────
// Detects what the user actually selected (file, subfolder, or SD card root)
// so error messages can be specific and actionable.

type SelectionContextType = 'single-file' | 'subfolder-datalog' | 'subfolder-date' | 'subfolder-other' | 'root';

interface SelectionContext {
  type: SelectionContextType;
  selectedName: string;
}

function detectSelectionContext(files: File[]): SelectionContext {
  const paths = files.map((f) => (f as unknown as { webkitRelativePath?: string }).webkitRelativePath || '');
  const relativePaths = paths.filter((p) => p.includes('/'));

  // No relative paths — user dropped a single file or the browser didn't provide paths
  if (relativePaths.length === 0) {
    return { type: 'single-file', selectedName: files[0]?.name || '' };
  }

  const rootName = relativePaths[0]!.split('/')[0] || '';

  // Paths start with DATALOG — could be Windows drive root or user selected DATALOG subfolder.
  // Distinguish by presence of root-level files (no slash in path): Windows drive root has them.
  if (rootName.toUpperCase() === 'DATALOG') {
    const hasRootLevelFiles = paths.some((p) => !p.includes('/') && p.length > 0);
    if (hasRootLevelFiles) {
      return { type: 'root', selectedName: rootName };
    }
    return { type: 'subfolder-datalog', selectedName: 'DATALOG' };
  }

  // Root name looks like a ResMed date-session folder (YYYYMMDD or YYYYMMDD_HHMMSS)
  if (/^\d{8}(_\d{6})?$/.test(rootName)) {
    return { type: 'subfolder-date', selectedName: rootName };
  }

  // Check if DATALOG appears anywhere in the paths — if so, user selected the SD card root
  const hasDatalogInPaths = relativePaths.some(
    (p) => p.toUpperCase().includes('/DATALOG/') || p.toUpperCase().startsWith('DATALOG/')
  );
  if (hasDatalogInPaths) {
    return { type: 'root', selectedName: rootName };
  }

  return { type: 'subfolder-other', selectedName: rootName };
}

function noEdfErrorMessage(ctx: SelectionContext): string {
  if (ctx.type === 'single-file') {
    return `You selected a file ("${ctx.selectedName}") — please select the SD card folder, not a single file.`;
  }
  if (ctx.type === 'subfolder-datalog') {
    return 'You selected the "DATALOG" folder — navigate up one level and select the SD card root instead.';
  }
  if (ctx.type === 'subfolder-date') {
    return `You selected a session folder ("${ctx.selectedName}") — navigate up to the SD card root and select that instead.`;
  }
  return 'No EDF files found. Make sure you selected the SD card root, not a subfolder.';
}

function unknownDeviceErrorMessage(ctx: SelectionContext): string {
  if (ctx.type === 'single-file') {
    return `You selected a file ("${ctx.selectedName}") — please select the SD card drive (the top-level folder).`;
  }
  if (ctx.type === 'subfolder-datalog') {
    return 'You selected the "DATALOG" folder — navigate up one level and select the SD card root.';
  }
  if (ctx.type === 'subfolder-date') {
    return `You selected "${ctx.selectedName}" — navigate up to the SD card root and select that instead.`;
  }
  if (ctx.type === 'subfolder-other') {
    return `You selected "${ctx.selectedName}" — this doesn't look like a ResMed SD card folder. Expected a DATALOG subfolder — navigate up and select the SD card root.`;
  }
  return 'This SD card format is not recognised. AirwayLab currently supports ResMed (AirSense 10/11) and BMC (Luna 2, RESmart G2/G3) devices.';
}

// ─────────────────────────────────────────────────────────────────────────────

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

  const selectionContext = detectSelectionContext(files);

  // Detect device type from file structure
  const fileInfos = files.map((f) => ({
    name: f.name,
    path: (f as unknown as { webkitRelativePath?: string }).webkitRelativePath || f.name,
    size: f.size,
  }));
  const detection = detectDeviceType(fileInfos);

  if (detection.deviceType === 'resmed') {
    return validateResMedFiles(files, detection, warnings, errors, selectionContext);
  }

  if (detection.deviceType === 'bmc') {
    return validateBMCFiles(files, detection, warnings, errors);
  }

  // Unknown device
  errors.push(unknownDeviceErrorMessage(selectionContext));
  return { valid: false, edfCount: 0, warnings, errors, deviceType: 'unknown', deviceLabel: detection.deviceLabel };
}

function validateResMedFiles(
  files: File[],
  detection: DeviceDetectionResult,
  warnings: string[],
  errors: string[],
  selectionContext: SelectionContext
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
    errors.push(noEdfErrorMessage(selectionContext));
    return { valid: false, edfCount: 0, warnings, errors, deviceType: 'resmed', deviceLabel: 'ResMed' };
  }

  if (!hasDatalog && edfFiles.length < 5) {
    warnings.push('Folder structure doesn\'t look like a typical ResMed SD card. Make sure you selected the SD card itself, not a subfolder.');
  }
  if (!hasSTR) {
    warnings.push('No STR.edf settings file found — mode, pressure and therapy settings won\'t appear in results. STR.edf is at the SD card root, not inside the DATALOG folder.');
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
