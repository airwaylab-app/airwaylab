/**
 * EDF Test Fixture Generator
 *
 * Generates minimal valid EDF binary files that match ResMed SD card format.
 * Used for both unit tests (Vitest) and E2E tests (Playwright file upload).
 *
 * Format reference: https://www.edfplus.info/specs/edf.html
 */

function pad(str: string, len: number): string {
  return str.padEnd(len, ' ').slice(0, len);
}

export interface EdfFixtureOptions {
  /** Recording date in DD.MM.YY format */
  startDate?: string;
  /** Recording time in HH.MM.SS format */
  startTime?: string;
  /** Number of data records */
  numRecords?: number;
  /** Duration of each data record in seconds */
  recordDuration?: number;
  /** Signal label (must contain 'Flow' or 'FLW' for flow data) */
  signalLabel?: string;
  /** Samples per data record */
  samplesPerRecord?: number;
  /** Physical min/max range for signal scaling */
  physicalMin?: number;
  physicalMax?: number;
  /** Patient ID field */
  patientId?: string;
  /** Recording ID field */
  recordingId?: string;
}

/**
 * Build a complete, valid EDF file as an ArrayBuffer.
 * Includes header + signal metadata + synthetic signal data.
 */
export function buildEdfFixture(options: EdfFixtureOptions = {}): ArrayBuffer {
  const {
    startDate = '15.01.25',
    startTime = '23.15.00',
    numRecords = 30,
    recordDuration = 1,
    signalLabel = 'Flow',
    samplesPerRecord = 25,
    physicalMin = -128,
    physicalMax = 128,
    patientId = 'X X X X',
    recordingId = 'Startdate 15-JAN-2025 X AirwayLab_Test X',
  } = options;

  const numSignals = 1;
  const headerBytes = 256 + numSignals * 256;

  // Fixed header (256 bytes)
  let header = '';
  header += pad('0', 8);
  header += pad(patientId, 80);
  header += pad(recordingId, 80);
  header += pad(startDate, 8);
  header += pad(startTime, 8);
  header += pad(String(headerBytes), 8);
  header += pad('', 44);
  header += pad(String(numRecords), 8);
  header += pad(String(recordDuration), 8);
  header += pad(String(numSignals), 4);

  // Signal header (256 bytes per signal)
  header += pad(signalLabel, 16);             // label
  header += pad('Unknown transducer', 80);    // transducer type
  header += pad('cmH2O', 8);                  // physical dimension
  header += pad(String(physicalMin), 8);      // physical min
  header += pad(String(physicalMax), 8);      // physical max
  header += pad('-32768', 8);                 // digital min
  header += pad('32767', 8);                  // digital max
  header += pad('HP:0.10Hz LP:100Hz', 80);    // prefiltering
  header += pad(String(samplesPerRecord), 8); // samples per record
  header += pad('', 32);                      // reserved

  const encoder = new TextEncoder();
  const headerBuf = encoder.encode(header);

  // Generate signal data (simulated breathing pattern)
  const dataSize = numRecords * samplesPerRecord * 2; // Int16 = 2 bytes
  const totalSize = headerBytes + dataSize;
  const buffer = new ArrayBuffer(totalSize);
  const uint8 = new Uint8Array(buffer);
  uint8.set(headerBuf);

  const view = new DataView(buffer);
  let offset = headerBytes;

  // Simulate breathing: ~15 breaths/min sinusoidal pattern
  const breathsPerMinute = 15;
  const samplingRate = samplesPerRecord / recordDuration;
  const samplesPerBreath = samplingRate * 60 / breathsPerMinute;

  for (let rec = 0; rec < numRecords; rec++) {
    for (let s = 0; s < samplesPerRecord; s++) {
      const globalSample = rec * samplesPerRecord + s;
      const phase = (globalSample / samplesPerBreath) * 2 * Math.PI;

      // Breathing: inspiration (positive) + expiration (negative)
      // Add some flow limitation characteristics (flat top)
      let value = Math.sin(phase);
      // Clip positive peaks to simulate flow limitation
      if (value > 0.7) value = 0.7 + (value - 0.7) * 0.3;

      // Scale to digital range (-32768 to 32767)
      const digital = Math.round(value * 15000);
      view.setInt16(offset, digital, true); // little-endian
      offset += 2;
    }
  }

  return buffer;
}

/**
 * Build a minimal STR.edf (settings) file.
 * STR.edf contains machine settings — we just need a valid EDF header.
 */
export function buildStrEdf(): ArrayBuffer {
  return buildEdfFixture({
    signalLabel: 'Flow', // STR files have signal data too
    startDate: '01.01.25',
    startTime: '00.00.00',
    numRecords: 1,
    samplesPerRecord: 4,
    recordingId: 'Startdate 01-JAN-2025 X ResMed_STR X',
  });
}

/**
 * Generate a Viatom/Checkme O2 Max compatible oximetry CSV.
 * Simulates a realistic overnight recording with SpO2 desaturations.
 */
export function buildOximetryCsv(options: {
  /** Number of data rows (4-second intervals typical for Viatom) */
  numRows?: number;
  /** Base SpO2 level */
  baseSpO2?: number;
  /** Base heart rate */
  baseHR?: number;
  /** Start time */
  startTime?: string;
} = {}): string {
  const {
    numRows = 100,
    baseSpO2 = 96,
    baseHR = 62,
    startTime = '2025-01-15 23:00:00',
  } = options;

  const lines: string[] = ['Time, Oxygen Level, Pulse Rate, Motion'];
  const start = new Date(startTime);

  for (let i = 0; i < numRows; i++) {
    const time = new Date(start.getTime() + i * 4000); // 4-sec intervals
    const timeStr = time.toISOString().replace('T', ' ').slice(0, 19);

    // Simulate occasional desaturations (every ~40 rows, dip 3-8%)
    let spo2 = baseSpO2;
    const desatPhase = (i % 40) / 40;
    if (desatPhase > 0.7 && desatPhase < 0.9) {
      const depth = 3 + Math.random() * 5;
      spo2 = Math.round(baseSpO2 - depth * Math.sin((desatPhase - 0.7) * 5 * Math.PI));
    }
    spo2 = Math.max(80, Math.min(100, spo2));

    // HR varies with desaturation events
    let hr = baseHR + Math.round(Math.random() * 4 - 2);
    if (spo2 < baseSpO2 - 2) hr += Math.round((baseSpO2 - spo2) * 1.5);
    hr = Math.max(40, Math.min(120, hr));

    const motion = Math.random() > 0.95 ? 1 : 0;

    lines.push(`${timeStr}, ${spo2}, ${hr}, ${motion}`);
  }

  return lines.join('\n');
}
