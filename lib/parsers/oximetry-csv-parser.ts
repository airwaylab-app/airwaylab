// ============================================================
// AirwayLab — Oximetry CSV Parser
// Parses Viatom/Checkme O2 Max and Wellue O2Ring CSV exports
// ============================================================

export interface OximetrySample {
  time: Date;
  spo2: number;
  hr: number;
  motion: number;
  valid: boolean;
}

export interface ParsedOximetry {
  samples: OximetrySample[];
  startTime: Date;
  endTime: Date;
  durationSeconds: number;
  dateStr: string; // YYYY-MM-DD for matching with EDF nights
  intervalSeconds: number;
}

export type OximetryFormat = 'checkme' | 'o2ring';

/**
 * Detect CSV format from header line.
 * O2Ring uses `SpO2(%)` / `Pulse Rate(bpm)` columns.
 * Checkme uses `Oxygen Level` / `Pulse Rate` columns.
 */
export function detectOximetryFormat(headerLine: string): OximetryFormat {
  if (headerLine.includes('SpO2(%)') || headerLine.includes('Pulse Rate(bpm)')) {
    return 'o2ring';
  }
  return 'checkme';
}

/**
 * Parse O2Ring time format: "HH:MM:SSAM Mon DD, YYYY" (with surrounding quotes)
 * e.g., "08:48:26PM Nov 27, 2025"
 */
export function parseO2RingTime(timeStr: string): Date | null {
  // Strip surrounding quotes and whitespace
  const cleaned = timeStr.replace(/^["'\s]+|["'\s]+$/g, '');

  // Match: HH:MM:SS AM/PM Mon DD, YYYY
  const match = cleaned.match(
    /^(\d{1,2}):(\d{2}):(\d{2})(AM|PM)\s+(\w+)\s+(\d{1,2}),\s+(\d{4})$/i
  );
  if (!match) return null;

  const [, hStr, mStr, sStr, ampm, mon, dayStr, yearStr] = match;

  const monthNames: Record<string, number> = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
  };
  const monthNum = monthNames[mon!];
  if (monthNum === undefined) return null;

  let hours = parseInt(hStr!);
  const minutes = parseInt(mStr!);
  const seconds = parseInt(sStr!);
  const year = parseInt(yearStr!);
  const day = parseInt(dayStr!);

  // Handle AM/PM conversion
  const isPM = ampm!.toUpperCase() === 'PM';
  if (isPM && hours !== 12) {
    hours += 12;
  } else if (!isPM && hours === 12) {
    hours = 0;
  }

  return new Date(year, monthNum, day, hours, minutes, seconds);
}

/**
 * Quote-aware CSV line parser for O2Ring format.
 * First field is quoted (contains comma in date): extract between quotes.
 * Remaining fields are comma-separated after the closing quote+comma.
 */
export function parseO2RingLine(line: string): {
  timeStr: string;
  spo2Str: string;
  hrStr: string;
  motionStr: string;
} | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  // Find the quoted time field
  const quoteStart = trimmed.indexOf('"');
  if (quoteStart === -1) return null;

  const quoteEnd = trimmed.indexOf('"', quoteStart + 1);
  if (quoteEnd === -1) return null;

  const timeStr = trimmed.substring(quoteStart + 1, quoteEnd);

  // After closing quote, skip comma and split remaining fields
  const rest = trimmed.substring(quoteEnd + 1);
  // rest looks like: ,96,72,0,0,0,
  const parts = rest.split(',').map((s) => s.trim()).filter((s) => s !== '');

  if (parts.length < 3) return null;

  return {
    timeStr,
    spo2Str: parts[0]!,
    hrStr: parts[1]!,
    motionStr: parts[2]!,
  };
}

export function detectInterval(samples: OximetrySample[]): number {
  if (samples.length < 3) return 2;
  const gaps: number[] = [];
  const limit = Math.min(samples.length - 1, 10);
  for (let i = 0; i < limit; i++) {
    const gap = (samples[i + 1]!.time.getTime() - samples[i]!.time.getTime()) / 1000;
    if (gap > 0 && gap < 10) gaps.push(gap);
  }
  if (gaps.length === 0) return 2;
  gaps.sort((a, b) => a - b);
  return gaps[Math.floor(gaps.length / 2)]!;
}

/**
 * Parse a pulse oximetry CSV file (Checkme O2 Max or Wellue O2Ring).
 *
 * Checkme format:
 * Time, Oxygen Level, Pulse Rate, Motion, O2 Reminder, PR Reminder
 * HH:MM:SS Mon DD YYYY, value, value, value, value, value
 *
 * O2Ring format:
 * Time,SpO2(%),Pulse Rate(bpm),Motion,SpO2 Reminder,PR Reminder,
 * "08:48:26PM Nov 27, 2025",96,72,0,0,0,
 *
 * Invalid readings use "--" as placeholder.
 */
export function parseOximetryCSV(csvText: string): ParsedOximetry {
  const lines = csvText.trim().split('\n');

  // Find header line — supports both Checkme ("oxygen") and O2Ring ("spo2")
  const startIdx = lines.findIndex((line) => {
    const lower = line.toLowerCase();
    return lower.includes('time') && (lower.includes('oxygen') || lower.includes('spo2'));
  });

  const headerLine = startIdx >= 0 ? lines[startIdx]! : lines[0]!;
  const format = detectOximetryFormat(headerLine);
  const dataLines = lines.slice(startIdx >= 0 ? startIdx + 1 : 1);
  const samples: OximetrySample[] = [];

  for (const line of dataLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let timeStr: string;
    let spo2Str: string;
    let hrStr: string;
    let motionStr: string;

    if (format === 'o2ring') {
      // O2Ring: quoted time field with comma inside the date
      const parsed = parseO2RingLine(trimmed);
      if (!parsed) continue;
      timeStr = parsed.timeStr;
      spo2Str = parsed.spo2Str;
      hrStr = parsed.hrStr;
      motionStr = parsed.motionStr;
    } else {
      // Checkme: simple comma split (date field has no commas)
      const parts = trimmed.split(',').map((s) => s.trim());
      if (parts.length < 4) continue;
      timeStr = parts[0]!;
      spo2Str = parts[1]!;
      hrStr = parts[2]!;
      motionStr = parts[3]!;
    }

    // Parse time based on format
    const time = format === 'o2ring'
      ? parseO2RingTime(timeStr)
      : parseCheckmeTime(timeStr);
    if (!time) continue;

    // Check validity
    const spo2Invalid = spo2Str === '--' || spo2Str === '';
    const hrInvalid = hrStr === '--' || hrStr === '';

    const spo2 = spo2Invalid ? -1 : parseInt(spo2Str);
    const hr = hrInvalid ? -1 : parseInt(hrStr);
    const motion = parseInt(motionStr) || 0;

    samples.push({
      time,
      spo2,
      hr,
      motion,
      valid: !spo2Invalid && !hrInvalid && spo2 >= 50 && spo2 <= 100,
    });
  }

  if (samples.length === 0) {
    throw new Error('No valid oximetry samples found in CSV');
  }

  const startTime = samples[0]!.time;
  const endTime = samples[samples.length - 1]!.time;
  const durationSeconds = (endTime.getTime() - startTime.getTime()) / 1000;

  // Determine the sleep night date (using same heuristic as EDF)
  const hour = startTime.getHours();
  let nightDate: Date;
  if (hour >= 18) {
    nightDate = startTime;
  } else if (hour < 12) {
    nightDate = new Date(startTime);
    nightDate.setDate(nightDate.getDate() - 1);
  } else {
    nightDate = startTime;
  }
  // Use local date components — toISOString() converts to UTC which causes
  // off-by-one mismatches with DATALOG folder dates (stored in local time)
  const dateStr = `${nightDate.getFullYear()}-${String(nightDate.getMonth() + 1).padStart(2, '0')}-${String(nightDate.getDate()).padStart(2, '0')}`;

  const intervalSeconds = detectInterval(samples);

  return {
    samples,
    startTime,
    endTime,
    durationSeconds,
    dateStr,
    intervalSeconds,
  };
}

/**
 * Parse Checkme O2 Max time format: "HH:MM:SS Mon DD YYYY"
 * e.g., "23:45:12 Jan 15 2025"
 */
function parseCheckmeTime(timeStr: string): Date | null {
  // Try standard Date parsing first
  const d = new Date(timeStr);
  if (!isNaN(d.getTime())) return d;

  // Try manual parsing for format "HH:MM:SS Mon DD YYYY"
  const match = timeStr.match(
    /(\d{1,2}):(\d{2}):(\d{2})\s+(\w+)\s+(\d{1,2})\s+(\d{4})/
  );
  if (match) {
    const [, h, m, s, mon, day, year] = match;
    const monthNames: Record<string, number> = {
      Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
      Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
    };
    const monthNum = monthNames[mon!];
    if (monthNum !== undefined) {
      return new Date(
        parseInt(year!),
        monthNum,
        parseInt(day!),
        parseInt(h!),
        parseInt(m!),
        parseInt(s!)
      );
    }
  }

  return null;
}
