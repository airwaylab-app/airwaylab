// ============================================================
// AirwayLab — BMC Binary Parser (Luna 2 / RESmart G2/G3)
// Parses proprietary binary format from BMC PAP device SD cards.
// Format reverse-engineered from real device data + community projects:
//   github.com/headrotor/BMC_RESmart
//   github.com/riaancillie/BmcCpapData
// ============================================================

import type {
  ParsedSession,
  ParsedMachineEvent,
  BMCIdxRecord,
  BMCEvtRecord,
  BMCDeviceInfo,
  BMCTherapyMode,
  MachineSettings,
} from '../types';

// ── Constants ─────────────────────────────────────────────
const PACKET_SIZE = 256;
const PACKETS_PER_FILE = 65536; // 16 MB / 256 bytes
const SHARED_HEADER_SIZE = 2048; // 0x800
const IDX_RECORD_SIZE = 512;
const EVT_RECORD_SIZE = 32;
const MAGIC = 0xAAAA;
const SESSION_GAP_SECONDS = 300; // 5 minutes = new session
const BASELINE_WINDOW = 120; // seconds for rolling median baseline

const BMC_MODES: BMCTherapyMode[] = [
  'CPAP', 'AutoCPAP', 'S', 'S/T', 'T', 'Titration', 'AutoS',
];
const MASK_TYPES = ['Full Face', 'Nasal', 'Nasal Pillow', 'Other'];

// ── Main entry point ──────────────────────────────────────

/**
 * Parse all BMC files from an SD card upload and return ParsedSessions.
 * @param files - uploaded file buffers with paths
 * @param serial - the BMC serial prefix (e.g. "22734456") from device-detector
 */
export function parseBMCFiles(
  files: { buffer: ArrayBuffer; path: string }[],
  serial: string
): { sessions: ParsedSession[]; settings: Record<string, MachineSettings>; device: BMCDeviceInfo } {
  const lowerSerial = serial.toLowerCase();

  // Find files by extension
  const findFile = (ext: string) =>
    files.find((f) => f.path.toLowerCase().endsWith(`${lowerSerial}.${ext}`));

  // Parse device info from USR
  const usrFile = findFile('usr');
  const device = usrFile ? parseBMCUsr(usrFile.buffer) : { serial, model: 'BMC', firmware: 'Unknown' };

  // Parse index for session-to-file mapping + settings
  const idxFile = findFile('idx');
  const idxRecords = idxFile ? parseBMCIdx(idxFile.buffer) : [];

  // Parse events
  const evtFile = findFile('evt');
  const evtRecords = evtFile ? parseBMCEvt(evtFile.buffer) : [];

  // Group events by session number
  const eventsBySession = new Map<number, BMCEvtRecord[]>();
  for (const evt of evtRecords) {
    const list = eventsBySession.get(evt.session) ?? [];
    list.push(evt);
    eventsBySession.set(evt.session, list);
  }

  // Collect data files (.000 through .029) sorted by extension
  const dataFiles = new Map<number, ArrayBuffer>();
  for (const f of files) {
    const match = f.path.toLowerCase().match(new RegExp(`${lowerSerial}\\.(\\d{3})$`));
    if (match) {
      dataFiles.set(parseInt(match[1]!, 10), f.buffer);
    }
  }

  // Build settings map from IDX records
  const settings: Record<string, MachineSettings> = {};
  for (const rec of idxRecords) {
    settings[rec.date] = idxToMachineSettings(rec, device);
  }

  // Parse waveform sessions
  const sessions: ParsedSession[] = [];

  if (idxRecords.length > 0 && dataFiles.size > 0) {
    // Gold strategy: use IDX pointers to locate sessions
    for (const rec of idxRecords) {
      try {
        const sessionPackets = readPacketsForSession(
          dataFiles, rec.startFileExt, rec.startPacketOffset,
          rec.endFileExt, rec.endPacketOffset
        );
        if (sessionPackets.length === 0) continue;

        // Detect sub-sessions within this day (gaps > 5 min)
        const subSessions = splitByGaps(sessionPackets);

        for (const packets of subSessions) {
          const session = packetsToSession(packets, device, rec.sequence);
          if (session) {
            // Attach machine events from EVT
            const events = eventsBySession.get(rec.sequence);
            if (events) {
              session.machineEvents = evtToMachineEvents(events);
            }
            sessions.push(session);
          }
        }
      } catch {
        // Skip corrupted sessions
      }
    }
  } else if (dataFiles.size > 0) {
    // Fallback: scan all data files for sessions using timestamp gaps
    const allPackets = readAllPackets(dataFiles);
    const subSessions = splitByGaps(allPackets);
    for (const packets of subSessions) {
      const session = packetsToSession(packets, device, 0);
      if (session) sessions.push(session);
    }
  }

  return { sessions, settings, device };
}

// ── IDX parser ────────────────────────────────────────────

export function parseBMCIdx(buffer: ArrayBuffer): BMCIdxRecord[] {
  const records: BMCIdxRecord[] = [];
  const view = new DataView(buffer);

  // Records start after 2048-byte shared header, 512 bytes each
  for (let offset = SHARED_HEADER_SIZE; offset + IDX_RECORD_SIZE <= buffer.byteLength; offset += IDX_RECORD_SIZE) {
    const magic = view.getUint16(offset, true);
    if (magic !== MAGIC) continue;

    const year = view.getUint8(offset + 0x04) + 2000;
    const month = view.getUint8(offset + 0x05);
    const day = view.getUint8(offset + 0x06);
    if (month < 1 || month > 12 || day < 1 || day > 31) continue;

    const modeRaw = view.getUint8(offset + 0x14D);
    const modeValue = (modeRaw >> 4) & 0x0F;
    const ipapByte = view.getUint8(offset + 0x148);
    const rampRaw = view.getUint8(offset + 0x142);
    const humRaw = view.getUint8(offset + 0x146);

    records.push({
      sequence: view.getUint16(offset + 0x02, true),
      date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      startFileExt: view.getUint8(offset + 0x0F),
      startPacketOffset: view.getUint16(offset + 0x0D, true),
      endFileExt: view.getUint8(offset + 0x13),
      endPacketOffset: view.getUint16(offset + 0x11, true),
      mode: BMC_MODES[modeValue] ?? 'CPAP',
      initialPressure: view.getUint8(offset + 0x140) / 2,
      treatPressure: view.getUint8(offset + 0x141) / 2,
      maxPressure: view.getUint8(offset + 0x14C) / 2,
      rampTime: rampRaw === 0xFF ? null : rampRaw,
      humidifier: humRaw === 6 ? null : humRaw,
      maskType: MASK_TYPES[view.getUint8(offset + 0x160)] ?? 'Other',
      reslexLevel: ipapByte & 0x03,
    });
  }

  return records;
}

// ── EVT parser ────────────────────────────────────────────

export function parseBMCEvt(buffer: ArrayBuffer): BMCEvtRecord[] {
  const records: BMCEvtRecord[] = [];
  const view = new DataView(buffer);

  for (let offset = SHARED_HEADER_SIZE; offset + EVT_RECORD_SIZE <= buffer.byteLength; offset += EVT_RECORD_SIZE) {
    const magic = view.getUint16(offset, true);
    if (magic !== MAGIC) continue;

    records.push({
      session: view.getUint16(offset + 0x02, true),
      eventType: view.getUint16(offset + 0x04, true),
      timestampSecs: view.getUint32(offset + 0x08, true),
      durationSecs: view.getUint32(offset + 0x0C, true),
      value: view.getUint16(offset + 0x12, true),
    });
  }

  return records;
}

// ── USR parser ────────────────────────────────────────────

export function parseBMCUsr(buffer: ArrayBuffer): BMCDeviceInfo {
  const decoder = new TextDecoder('ascii');
  const bytes = new Uint8Array(buffer);

  const readString = (offset: number, maxLen: number): string => {
    let end = offset;
    while (end < offset + maxLen && end < bytes.length && bytes[end] !== 0 && bytes[end] !== 0xFF) {
      end++;
    }
    return decoder.decode(bytes.slice(offset, end)).trim();
  };

  return {
    model: readString(0xE9, 20) || 'BMC',
    serial: readString(0x35, 20) || 'Unknown',
    firmware: readString(0x4D, 20) || 'Unknown',
  };
}

// ── Waveform packet parser ────────────────────────────────

interface BMCPacket {
  sessionNumber: number;
  timestamp: Date;
  ipap: number;
  epap: number;
  flow: Uint16Array;       // 25 samples at 25 Hz (raw unsigned)
  pressure: Uint16Array;   // 25 samples at 25 Hz
  leak: number;
  tidalVolume: number;
  minuteVent: number;
  respRate: number;
  spo2: number;
}

function parsePacket(buffer: ArrayBuffer, offset: number): BMCPacket | null {
  if (offset + PACKET_SIZE > buffer.byteLength) return null;

  const view = new DataView(buffer, offset, PACKET_SIZE);
  const magic = view.getUint16(0x00, true);
  if (magic !== MAGIC) return null;

  const year = view.getUint16(0xF8, true);
  const month = view.getUint8(0xFA);
  const day = view.getUint8(0xFB);
  const hour = view.getUint8(0xFC);
  const minute = view.getUint8(0xFD);
  const second = view.getUint8(0xFE);

  // Validate timestamp
  if (year < 2000 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  return {
    sessionNumber: view.getUint16(0x02, true),
    timestamp: new Date(year, month - 1, day, hour, minute, second),
    ipap: view.getUint16(0x04, true) / 2,
    epap: view.getUint16(0x06, true) / 2,
    flow: new Uint16Array(buffer.slice(offset + 0x6C, offset + 0x6C + 50)),
    pressure: new Uint16Array(buffer.slice(offset + 0x08, offset + 0x08 + 50)),
    leak: view.getUint16(0xC4, true) / 10,
    tidalVolume: view.getUint16(0xC6, true),
    minuteVent: view.getUint16(0xCA, true) / 10,
    respRate: view.getUint16(0xD0, true),
    spo2: view.getUint16(0xC8, true),
  };
}

// ── Waveform data reading ─────────────────────────────────

function readPacketsForSession(
  dataFiles: Map<number, ArrayBuffer>,
  startFileExt: number,
  startPacketOffset: number,
  endFileExt: number,
  endPacketOffset: number
): BMCPacket[] {
  const packets: BMCPacket[] = [];
  let fileExt = startFileExt;
  let packetIdx = startPacketOffset;

  while (true) {
    const buffer = dataFiles.get(fileExt);
    if (!buffer) break;

    const byteOffset = packetIdx * PACKET_SIZE;
    const packet = parsePacket(buffer, byteOffset);
    if (packet) packets.push(packet);

    // Check if we've reached the end
    if (fileExt === endFileExt && packetIdx >= endPacketOffset) break;

    packetIdx++;
    if (packetIdx >= PACKETS_PER_FILE) {
      packetIdx = 0;
      fileExt++;
      if (fileExt > 29) fileExt = 0; // circular
    }

    // Safety: don't read more than 24 hours of data (86400 packets)
    if (packets.length > 86400) break;
  }

  return packets;
}

function readAllPackets(dataFiles: Map<number, ArrayBuffer>): BMCPacket[] {
  const packets: BMCPacket[] = [];
  const sortedExts = Array.from(dataFiles.keys()).sort((a, b) => a - b);

  for (const ext of sortedExts) {
    const buffer = dataFiles.get(ext)!;
    for (let offset = 0; offset + PACKET_SIZE <= buffer.byteLength; offset += PACKET_SIZE) {
      const packet = parsePacket(buffer, offset);
      if (packet) packets.push(packet);
    }
  }

  // Sort by timestamp
  packets.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  return packets;
}

// ── Session assembly ──────────────────────────────────────

function splitByGaps(packets: BMCPacket[]): BMCPacket[][] {
  if (packets.length === 0) return [];

  const sessions: BMCPacket[][] = [];
  let current: BMCPacket[] = [packets[0]!];

  for (let i = 1; i < packets.length; i++) {
    const gap = (packets[i]!.timestamp.getTime() - packets[i - 1]!.timestamp.getTime()) / 1000;
    if (gap > SESSION_GAP_SECONDS) {
      if (current.length > 0) sessions.push(current);
      current = [];
    }
    current.push(packets[i]!);
  }
  if (current.length > 0) sessions.push(current);

  return sessions;
}

/**
 * Convert a sequence of BMC packets into a ParsedSession.
 * Critical step: normalise unsigned uint16 flow to signed Float32Array.
 */
function packetsToSession(
  packets: BMCPacket[],
  device: BMCDeviceInfo,
  sessionNum: number
): ParsedSession | null {
  if (packets.length < 10) return null; // too short to analyze

  const samplingRate = 25;
  const totalSamples = packets.length * samplingRate;

  // Extract raw flow values
  const rawFlow = new Uint16Array(totalSamples);
  const rawPressure = new Uint16Array(totalSamples);
  for (let i = 0; i < packets.length; i++) {
    rawFlow.set(packets[i]!.flow, i * samplingRate);
    rawPressure.set(packets[i]!.pressure, i * samplingRate);
  }

  // Normalise flow: unsigned → signed via rolling median baseline
  const flowData = normaliseFlow(rawFlow, samplingRate);

  // Pressure: convert to Float32Array (arbitrary units, but useful for shape analysis)
  const pressureData = new Float32Array(totalSamples);
  for (let i = 0; i < totalSamples; i++) {
    pressureData[i] = rawPressure[i]!;
  }

  const firstTs = packets[0]!.timestamp;
  const lastTs = packets[packets.length - 1]!.timestamp;
  const durationSeconds = (lastTs.getTime() - firstTs.getTime()) / 1000 + 1;

  return {
    deviceType: 'bmc',
    deviceModel: device.model,
    filePath: `bmc-session-${sessionNum}`,
    flowData,
    pressureData,
    samplingRate,
    durationSeconds,
    recordingDate: firstTs,
  };
}

/**
 * Normalise BMC unsigned flow to signed Float32Array.
 *
 * BMC stores flow as unsigned uint16 where higher = inspiration.
 * The zero-flow baseline shifts with pressure settings and leak.
 *
 * Strategy: compute a rolling median over BASELINE_WINDOW seconds,
 * subtract it to center the flow around zero, then flip sign convention
 * so inspiration = positive (matching ResMed/EDF convention).
 */
function normaliseFlow(raw: Uint16Array, samplingRate: number): Float32Array {
  const len = raw.length;
  const result = new Float32Array(len);

  // Compute per-second medians for efficiency (1 median per 25 samples)
  const secondCount = Math.ceil(len / samplingRate);
  const secondMedians = new Float32Array(secondCount);
  for (let s = 0; s < secondCount; s++) {
    const start = s * samplingRate;
    const end = Math.min(start + samplingRate, len);
    const chunk: number[] = [];
    for (let i = start; i < end; i++) chunk.push(raw[i]!);
    chunk.sort((a, b) => a - b);
    secondMedians[s] = chunk[Math.floor(chunk.length / 2)]!;
  }

  // Rolling median baseline from per-second medians
  const halfWindow = Math.floor(BASELINE_WINDOW / 2);
  for (let s = 0; s < secondCount; s++) {
    const wStart = Math.max(0, s - halfWindow);
    const wEnd = Math.min(secondCount, s + halfWindow + 1);
    const windowVals: number[] = [];
    for (let w = wStart; w < wEnd; w++) windowVals.push(secondMedians[w]!);
    windowVals.sort((a, b) => a - b);
    const baseline = windowVals[Math.floor(windowVals.length / 2)]!;

    // Apply to all samples in this second
    const sampleStart = s * samplingRate;
    const sampleEnd = Math.min(sampleStart + samplingRate, len);
    for (let i = sampleStart; i < sampleEnd; i++) {
      // Subtract baseline so zero = no flow, positive = inspiration
      result[i] = raw[i]! - baseline;
    }
  }

  return result;
}

// ── Helpers ───────────────────────────────────────────────

function evtToMachineEvents(evtRecords: BMCEvtRecord[]): ParsedMachineEvent[] {
  const events: ParsedMachineEvent[] = [];
  for (const evt of evtRecords) {
    let type: ParsedMachineEvent['type'] | null = null;
    // EVT type mapping (verified against USR cross-reference):
    // 0x01 = CSA, 0x02 = OSA, 0x03 = HYP
    if (evt.eventType === 0x01) type = 'CSA';
    else if (evt.eventType === 0x02) type = 'OSA';
    else if (evt.eventType === 0x03) type = 'HYP';
    if (!type) continue;

    events.push({
      type,
      onsetSec: evt.timestampSecs,
      durationSec: evt.durationSecs,
    });
  }
  return events;
}

function idxToMachineSettings(rec: BMCIdxRecord, device: BMCDeviceInfo): MachineSettings {
  return {
    deviceModel: `${device.model} (${device.serial})`,
    epap: rec.treatPressure,
    ipap: rec.mode === 'CPAP' ? rec.treatPressure : rec.treatPressure + 2, // approximate for non-bilevel
    pressureSupport: rec.mode === 'S' || rec.mode === 'S/T' || rec.mode === 'AutoS'
      ? rec.maxPressure - rec.treatPressure
      : 0,
    papMode: rec.mode,
    riseTime: null,
    trigger: 'N/A',
    cycle: 'N/A',
    easyBreathe: false,
    rampEnabled: rec.rampTime !== null,
    rampTime: rec.rampTime,
    rampPressure: rec.initialPressure,
    humidifierLevel: rec.humidifier,
    maskType: rec.maskType,
    settingsSource: 'extracted',
    reslexLevel: rec.reslexLevel,
  };
}

/**
 * Determine BMC sleep night date for a session.
 * BMC uses noon-to-noon boundaries (same concept as ResMed's DATALOG dates).
 */
export function bmcSessionNightDate(recordingDate: Date): string {
  const hour = recordingDate.getHours();
  const d = new Date(recordingDate);

  // Before noon → belongs to previous calendar date's "night"
  if (hour < 12) {
    d.setDate(d.getDate() - 1);
  }

  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
