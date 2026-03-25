import { describe, it, expect } from 'vitest';
import { parseBMCIdx, parseBMCEvt, parseBMCUsr, parseBMCFiles, bmcSessionNightDate } from '@/lib/parsers/bmc-parser';

// ── Helpers to build synthetic binary fixtures ──────────────

/** Build a shared header (2048 bytes) for idx/evt/log files */
function buildSharedHeader(fileTypeId: number, serial: string): ArrayBuffer {
  const buf = new ArrayBuffer(2048);
  const view = new DataView(buf);
  const bytes = new Uint8Array(buf);

  // 8 space padding
  for (let i = 0; i < 8; i++) bytes[i] = 0x20;
  // File type ID at 0x20
  view.setUint8(0x20, fileTypeId);
  // Data offset at 0x22
  view.setUint16(0x22, 0x0800, true);
  // Serial at 0x34
  const encoder = new TextEncoder();
  const serialBytes = encoder.encode(serial);
  bytes.set(serialBytes, 0x34);
  // Fill rest with 0xFF
  for (let i = 0x80; i < 2048; i++) bytes[i] = 0xFF;

  return buf;
}

/** Build a single IDX record (512 bytes) */
function buildIdxRecord(opts: {
  sequence: number;
  year: number;
  month: number;
  day: number;
  startFileExt: number;
  startPacketOffset: number;
  endFileExt: number;
  endPacketOffset: number;
  mode: number;
  treatPressureCmH2O: number;
  maskType?: number;
}): ArrayBuffer {
  const buf = new ArrayBuffer(512);
  const view = new DataView(buf);
  // Magic
  view.setUint16(0x00, 0xAAAA, true);
  // Sequence
  view.setUint16(0x02, opts.sequence, true);
  // Date
  view.setUint8(0x04, opts.year - 2000);
  view.setUint8(0x05, opts.month);
  view.setUint8(0x06, opts.day);
  // Start pointer
  view.setUint16(0x0D, opts.startPacketOffset, true);
  view.setUint8(0x0F, opts.startFileExt);
  // End pointer
  view.setUint16(0x11, opts.endPacketOffset, true);
  view.setUint8(0x13, opts.endFileExt);
  // Initial pressure (x2)
  view.setUint8(0x140, opts.treatPressureCmH2O * 2);
  // Treat pressure (x2)
  view.setUint8(0x141, opts.treatPressureCmH2O * 2);
  // Ramp time
  view.setUint8(0x142, 15); // 15 min
  // Humidifier
  view.setUint8(0x146, 3); // level 3
  // Mode at 0x14D upper nibble
  view.setUint8(0x14D, (opts.mode << 4) & 0xF0);
  // Max pressure
  view.setUint8(0x14C, 20 * 2); // 20 cmH2O
  // Mask type
  view.setUint8(0x160, opts.maskType ?? 1); // Nasal
  return buf;
}

/** Build a single EVT record (32 bytes) */
function buildEvtRecord(opts: {
  session: number;
  eventType: number;
  timestampSecs: number;
  durationSecs: number;
  value?: number;
}): ArrayBuffer {
  const buf = new ArrayBuffer(32);
  const view = new DataView(buf);
  view.setUint16(0x00, 0xAAAA, true);
  view.setUint16(0x02, opts.session, true);
  view.setUint16(0x04, opts.eventType, true);
  view.setUint32(0x08, opts.timestampSecs, true);
  view.setUint32(0x0C, opts.durationSecs, true);
  view.setUint16(0x12, opts.value ?? 0, true);
  return buf;
}

/** Build a single waveform packet (256 bytes) */
function buildWaveformPacket(opts: {
  sessionNumber: number;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  ipapCmH2O: number;
  epapCmH2O: number;
  flowBaseline?: number;
}): ArrayBuffer {
  const buf = new ArrayBuffer(256);
  const view = new DataView(buf);
  const baseline = opts.flowBaseline ?? 500;

  // Magic
  view.setUint16(0x00, 0xAAAA, true);
  // Session
  view.setUint16(0x02, opts.sessionNumber, true);
  // IPAP/EPAP (x2)
  view.setUint16(0x04, opts.ipapCmH2O * 2, true);
  view.setUint16(0x06, opts.epapCmH2O * 2, true);

  // Pressure wave (25 samples at 0x08)
  for (let i = 0; i < 25; i++) {
    view.setUint16(0x08 + i * 2, 400 + Math.round(Math.sin(i * 0.25) * 20), true);
  }

  // Snoring (25 samples at 0x3A)
  for (let i = 0; i < 25; i++) {
    view.setUint16(0x3A + i * 2, 336, true);
  }

  // Flow (25 samples at 0x6C) — simulate breathing cycle
  for (let i = 0; i < 25; i++) {
    const breathPhase = Math.sin(i * Math.PI * 2 / 25);
    const flowValue = baseline + Math.round(breathPhase * 200);
    view.setUint16(0x6C + i * 2, Math.max(0, flowValue), true);
  }

  // Leak at 0xC4 (x10)
  view.setUint16(0xC4, 100, true); // 10 L/min
  // Tidal volume at 0xC6
  view.setUint16(0xC6, 450, true); // 450 mL
  // SpO2 at 0xC8
  view.setUint16(0xC8, 0, true); // no oximeter
  // Minute vent at 0xCA (x10)
  view.setUint16(0xCA, 65, true); // 6.5 L/min
  // Resp rate at 0xD0
  view.setUint16(0xD0, 14, true); // 14 BPM
  // I/E ratio at 0xD2
  view.setUint16(0xD2, 10, true);

  // Timestamp at 0xF8
  view.setUint16(0xF8, opts.year, true);
  view.setUint8(0xFA, opts.month);
  view.setUint8(0xFB, opts.day);
  view.setUint8(0xFC, opts.hour);
  view.setUint8(0xFD, opts.minute);
  view.setUint8(0xFE, opts.second);

  return buf;
}

/** Build a USR file with device info */
function buildUsrFile(serial: string, model: string, firmware: string): ArrayBuffer {
  const buf = new ArrayBuffer(512);
  const bytes = new Uint8Array(buf);
  const encoder = new TextEncoder();

  // Serial at 0x35
  bytes.set(encoder.encode(serial), 0x35);
  // Firmware at 0x4D
  bytes.set(encoder.encode(firmware), 0x4D);
  // Model at 0xE9
  bytes.set(encoder.encode(model), 0xE9);

  return buf;
}

function concatBuffers(...buffers: ArrayBuffer[]): ArrayBuffer {
  const total = buffers.reduce((sum, b) => sum + b.byteLength, 0);
  const result = new ArrayBuffer(total);
  const view = new Uint8Array(result);
  let offset = 0;
  for (const b of buffers) {
    view.set(new Uint8Array(b), offset);
    offset += b.byteLength;
  }
  return result;
}

// ── Tests ───────────────────────────────────────────────────

describe('parseBMCIdx', () => {
  it('parses IDX records from a valid buffer', () => {
    const header = buildSharedHeader(0x01, 'ES422734456');
    const record1 = buildIdxRecord({
      sequence: 1, year: 2026, month: 1, day: 13,
      startFileExt: 0, startPacketOffset: 0,
      endFileExt: 0, endPacketOffset: 1000,
      mode: 0, treatPressureCmH2O: 12,
    });
    const record2 = buildIdxRecord({
      sequence: 2, year: 2026, month: 1, day: 14,
      startFileExt: 0, startPacketOffset: 1000,
      endFileExt: 0, endPacketOffset: 2000,
      mode: 1, treatPressureCmH2O: 8,
    });

    const buffer = concatBuffers(header, record1, record2);
    const records = parseBMCIdx(buffer);

    expect(records).toHaveLength(2);
    expect(records[0]!.date).toBe('2026-01-13');
    expect(records[0]!.treatPressure).toBe(12);
    expect(records[0]!.mode).toBe('CPAP');
    expect(records[0]!.maskType).toBe('Nasal');

    expect(records[1]!.date).toBe('2026-01-14');
    expect(records[1]!.mode).toBe('AutoCPAP');
    expect(records[1]!.treatPressure).toBe(8);
  });

  it('skips records without magic bytes', () => {
    const header = buildSharedHeader(0x01, 'ES422734456');
    const badRecord = new ArrayBuffer(512); // all zeros, no magic
    const buffer = concatBuffers(header, badRecord);
    const records = parseBMCIdx(buffer);
    expect(records).toHaveLength(0);
  });
});

describe('parseBMCEvt', () => {
  it('parses respiratory events correctly', () => {
    const header = buildSharedHeader(0x06, 'ES422734456');
    const csa = buildEvtRecord({ session: 1, eventType: 0x01, timestampSecs: 36000, durationSecs: 15 });
    const osa = buildEvtRecord({ session: 1, eventType: 0x02, timestampSecs: 37000, durationSecs: 20 });
    const hyp = buildEvtRecord({ session: 1, eventType: 0x03, timestampSecs: 38000, durationSecs: 12 });

    const buffer = concatBuffers(header, csa, osa, hyp);
    const records = parseBMCEvt(buffer);

    expect(records).toHaveLength(3);
    expect(records[0]!.eventType).toBe(0x01); // CSA
    expect(records[0]!.durationSecs).toBe(15);
    expect(records[1]!.eventType).toBe(0x02); // OSA
    expect(records[2]!.eventType).toBe(0x03); // HYP
  });
});

describe('parseBMCUsr', () => {
  it('extracts device info', () => {
    const buffer = buildUsrFile('ES422734456', 'BMC-630', 'G2.1-');
    const device = parseBMCUsr(buffer);
    expect(device.serial).toBe('ES422734456');
    expect(device.model).toBe('BMC-630');
    expect(device.firmware).toBe('G2.1-');
  });
});

describe('bmcSessionNightDate', () => {
  it('assigns evening sessions to current date', () => {
    const date = new Date(2026, 0, 15, 22, 30, 0); // Jan 15 at 22:30
    expect(bmcSessionNightDate(date)).toBe('2026-01-15');
  });

  it('assigns morning sessions to previous date', () => {
    const date = new Date(2026, 0, 16, 6, 0, 0); // Jan 16 at 06:00
    expect(bmcSessionNightDate(date)).toBe('2026-01-15');
  });

  it('assigns noon to current date', () => {
    const date = new Date(2026, 0, 15, 12, 0, 0);
    expect(bmcSessionNightDate(date)).toBe('2026-01-15');
  });

  it('assigns 11:59 to previous date', () => {
    const date = new Date(2026, 0, 16, 11, 59, 0);
    expect(bmcSessionNightDate(date)).toBe('2026-01-15');
  });
});

describe('parseBMCFiles — end-to-end', () => {
  it('produces ParsedSessions from synthetic BMC data', () => {
    // Build a minimal BMC SD card: 1 session with 60 packets (1 minute)
    const serial = '22734456';

    // USR
    const usr = buildUsrFile('ES422734456', 'BMC-630', 'G2.1-');

    // IDX with 1 record
    const idxHeader = buildSharedHeader(0x01, 'ES422734456');
    const idxRecord = buildIdxRecord({
      sequence: 1, year: 2026, month: 1, day: 13,
      startFileExt: 0, startPacketOffset: 0,
      endFileExt: 0, endPacketOffset: 60,
      mode: 0, treatPressureCmH2O: 12,
    });
    const idx = concatBuffers(idxHeader, idxRecord);

    // EVT with 2 events
    const evtHeader = buildSharedHeader(0x06, 'ES422734456');
    const evt1 = buildEvtRecord({ session: 1, eventType: 0x02, timestampSecs: 36020, durationSecs: 15 }); // OSA
    const evt2 = buildEvtRecord({ session: 1, eventType: 0x03, timestampSecs: 36040, durationSecs: 10 }); // HYP
    const evt = concatBuffers(evtHeader, evt1, evt2);

    // Waveform data: 60 sequential packets (22:00:00 to 22:00:59)
    const packets: ArrayBuffer[] = [];
    for (let s = 0; s < 60; s++) {
      packets.push(buildWaveformPacket({
        sessionNumber: 1,
        year: 2026, month: 1, day: 13,
        hour: 22, minute: 0, second: s,
        ipapCmH2O: 12, epapCmH2O: 12,
      }));
    }
    const dataFile = concatBuffers(...packets);

    const files = [
      { buffer: usr, path: `${serial}.USR` },
      { buffer: idx, path: `${serial}.idx` },
      { buffer: evt, path: `${serial}.evt` },
      { buffer: dataFile, path: `${serial}.000` },
    ];

    const result = parseBMCFiles(files, serial);

    expect(result.device.model).toBe('BMC-630');
    expect(result.device.serial).toBe('ES422734456');
    expect(result.sessions.length).toBeGreaterThanOrEqual(1);

    const session = result.sessions[0]!;
    expect(session.deviceType).toBe('bmc');
    expect(session.samplingRate).toBe(25);
    expect(session.flowData).toBeInstanceOf(Float32Array);
    expect(session.flowData.length).toBe(60 * 25); // 60 seconds x 25 Hz
    expect(session.durationSeconds).toBeGreaterThanOrEqual(59);

    // Machine events should be attached
    expect(session.machineEvents).toBeDefined();
    expect(session.machineEvents!.length).toBe(2);
    expect(session.machineEvents![0]!.type).toBe('OSA');
    expect(session.machineEvents![1]!.type).toBe('HYP');

    // Settings should be extracted
    expect(Object.keys(result.settings).length).toBe(1);
    expect(result.settings['2026-01-13']!.papMode).toBe('CPAP');
    expect(result.settings['2026-01-13']!.epap).toBe(12);
  });

  it('handles missing USR file gracefully', () => {
    const serial = '11111111';
    const packets: ArrayBuffer[] = [];
    for (let s = 0; s < 30; s++) {
      packets.push(buildWaveformPacket({
        sessionNumber: 1,
        year: 2026, month: 3, day: 20,
        hour: 23, minute: 0, second: s,
        ipapCmH2O: 10, epapCmH2O: 10,
      }));
    }
    const dataFile = concatBuffers(...packets);

    const files = [
      { buffer: dataFile, path: `${serial}.000` },
    ];

    const result = parseBMCFiles(files, serial);
    expect(result.device.model).toBe('BMC');
    expect(result.sessions.length).toBeGreaterThanOrEqual(1);
  });

  it('detects session boundaries from timestamp gaps', () => {
    const serial = '22222222';
    const packets: ArrayBuffer[] = [];

    // Session 1: 20 packets at 22:00:00-22:00:19
    for (let s = 0; s < 20; s++) {
      packets.push(buildWaveformPacket({
        sessionNumber: 1,
        year: 2026, month: 1, day: 15,
        hour: 22, minute: 0, second: s,
        ipapCmH2O: 10, epapCmH2O: 10,
      }));
    }

    // Gap of 10 minutes (> SESSION_GAP_SECONDS)

    // Session 2: 20 packets at 22:10:00-22:10:19
    for (let s = 0; s < 20; s++) {
      packets.push(buildWaveformPacket({
        sessionNumber: 2,
        year: 2026, month: 1, day: 15,
        hour: 22, minute: 10, second: s,
        ipapCmH2O: 10, epapCmH2O: 10,
      }));
    }

    const dataFile = concatBuffers(...packets);
    const files = [{ buffer: dataFile, path: `${serial}.000` }];

    const result = parseBMCFiles(files, serial);
    // Fallback strategy (no IDX) should detect 2 sessions from gap
    expect(result.sessions.length).toBe(2);
  });

  it('normalises flow so inspiration is positive', () => {
    const serial = '33333333';
    const packets: ArrayBuffer[] = [];

    for (let s = 0; s < 30; s++) {
      packets.push(buildWaveformPacket({
        sessionNumber: 1,
        year: 2026, month: 2, day: 1,
        hour: 23, minute: 0, second: s,
        ipapCmH2O: 12, epapCmH2O: 12,
        flowBaseline: 500,
      }));
    }

    const dataFile = concatBuffers(...packets);
    const files = [{ buffer: dataFile, path: `${serial}.000` }];

    const result = parseBMCFiles(files, serial);
    expect(result.sessions.length).toBe(1);

    const flow = result.sessions[0]!.flowData;
    // After normalisation, flow should have both positive and negative values
    let hasPositive = false;
    let hasNegative = false;
    for (let i = 0; i < flow.length; i++) {
      if (flow[i]! > 10) hasPositive = true;
      if (flow[i]! < -10) hasNegative = true;
    }
    expect(hasPositive).toBe(true);
    expect(hasNegative).toBe(true);
  });
});
