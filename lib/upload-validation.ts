// ============================================================
// AirwayLab — Pre-upload File Validation
// Quick checks before sending files to the analysis worker.
// ============================================================

export interface ValidationResult {
  valid: boolean;
  edfCount: number;
  warnings: string[];
  errors: string[];
}

/**
 * Validate selected SD card files before analysis.
 * Checks for presence of EDF files, expected folder structure,
 * and common mistakes (wrong folder, non-ResMed data).
 */
export function validateSDFiles(files: File[]): ValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  if (files.length === 0) {
    return { valid: false, edfCount: 0, warnings, errors: ['No files selected.'] };
  }

  // Count EDF files
  const edfFiles = files.filter(
    (f) => f.name.toLowerCase().endsWith('.edf')
  );

  // Check for DATALOG folder structure
  const paths = files.map((f) => {
    const rel = (f as unknown as { webkitRelativePath?: string }).webkitRelativePath;
    return rel || f.name;
  });

  const hasDatalog = paths.some((p) =>
    p.toUpperCase().includes('DATALOG')
  );

  const hasSTR = edfFiles.some(
    (f) => f.name.toUpperCase().startsWith('STR')
  );

  // Look for flow data files (BRP, FLW patterns)
  const hasFlowData = edfFiles.some(
    (f) => /^(BRP|FLW)/i.test(f.name)
  );

  // Check for common mistakes
  if (edfFiles.length === 0) {
    errors.push(
      'No EDF files found. Make sure you selected the DATALOG folder from your ResMed SD card.'
    );
    return { valid: false, edfCount: 0, warnings, errors };
  }

  if (!hasDatalog && edfFiles.length < 5) {
    warnings.push(
      'Folder structure doesn\'t look like a ResMed SD card. Expected a DATALOG folder with dated subfolders.'
    );
  }

  if (!hasSTR) {
    warnings.push(
      'No STR.edf settings file found. Machine settings won\'t be available.'
    );
  }

  if (!hasFlowData) {
    warnings.push(
      'No flow data files (BRP/FLW) found. Breath-by-breath analysis requires flow signal data.'
    );
  }

  // Check for Identification file (device info — lives in parent folder)
  const hasIdentification = files.some(
    (f) => f.name.toUpperCase().startsWith('IDENTIFICATION')
  );
  if (!hasIdentification) {
    warnings.push(
      'No Identification file found. Select the SD card root folder (one level above DATALOG) so we can identify your device model.'
    );
  }

  return {
    valid: errors.length === 0,
    edfCount: edfFiles.length,
    warnings,
    errors,
  };
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
    return { valid: false, edfCount: 0, warnings, errors };
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
  };
}
