// ============================================================
// AirwayLab — Oximetry CSV Parser
// Parses Viatom/Checkme O2 Max pulse oximetry CSV exports
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
}

/**
 * Parse a Checkme O2 Max / Viatom CSV file.
 *
 * Expected format:
 * Time, Oxygen Level, Pulse Rate, Motion, O2 Reminder, PR Reminder
 * HH:MM:SS Mon DD YYYY, value, value, value, value, value
 *
 * Invalid readings use "--" as placeholder.
 */
export function parseOximetryCSV(csvText: string): ParsedOximetry {
  const lines = csvText.trim().split('\n');

  // Skip header line
  const startIdx = lines.findIndex((line) =>
    line.toLowerCase().includes('time') && line.toLowerCase().includes('oxygen')
  );

  const dataLines = lines.slice(startIdx >= 0 ? startIdx + 1 : 1);
  const samples: OximetrySample[] = [];

  for (const line of dataLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Parse CSV - handle the date format which contains commas
    // Format: "HH:MM:SS Mon DD YYYY, value, value, value, value, value"
    // The date part doesn't have commas, so simple split works
    const parts = trimmed.split(',').map((s) => s.trim());

    if (parts.length < 4) continue;

    const timeStr = parts[0]!;
    const spo2Str = parts[1]!;
    const hrStr = parts[2]!;
    const motionStr = parts[3]!;

    // Parse time
    const time = parseOximetryTime(timeStr);
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

  return {
    samples,
    startTime,
    endTime,
    durationSeconds,
    dateStr,
  };
}

/**
 * Parse Checkme O2 Max time format: "HH:MM:SS Mon DD YYYY"
 * e.g., "23:45:12 Jan 15 2025"
 */
function parseOximetryTime(timeStr: string): Date | null {
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
