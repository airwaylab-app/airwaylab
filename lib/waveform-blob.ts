// ============================================================
// AirwayLab — Waveform Blob Format (AWL2)
//
// Binary format for contributing flow + pressure waveform data.
// Supports both single-channel (flow-only) and dual-channel
// (flow + pressure interleaved) with a 16-byte header.
//
// Legacy blobs (pre-AWL2, no header) are raw Float32 flow arrays.
// ============================================================

/** AWL2 magic number: 0x41574C32 ("AWL2" in little-endian) */
export const AWL2_MAGIC = 0x41574c32;

/** Current format version */
const AWL2_VERSION = 2;

/** Size of the AWL2 header in bytes */
const HEADER_BYTES = 16;

interface ParsedWaveformBlob {
  formatVersion: number;
  channelCount: number;
  flow: Float32Array;
  pressure: Float32Array | null;
}

/**
 * Build a waveform blob with AWL2 header.
 *
 * If pressure data is provided and matches flow length, produces
 * a 2-channel interleaved blob. Otherwise falls back to 1-channel.
 *
 * Format:
 *   Bytes 0-3:   Magic (0x41574C32)
 *   Bytes 4-7:   Version (uint32 = 2)
 *   Bytes 8-11:  Channel count (uint32 = 1 or 2)
 *   Bytes 12-15: Reserved (0)
 *   Bytes 16+:   Float32 samples (interleaved if 2 channels)
 */
export function buildWaveformBlob(
  flow: Float32Array,
  pressure: Float32Array | null
): ArrayBuffer {
  const hasPressure =
    pressure !== null && pressure.length > 0 && pressure.length === flow.length;
  const channelCount = hasPressure ? 2 : 1;
  const sampleCount = hasPressure ? flow.length * 2 : flow.length;
  const totalBytes = HEADER_BYTES + sampleCount * 4;

  const buffer = new ArrayBuffer(totalBytes);
  const headerView = new DataView(buffer);

  // Write header
  headerView.setUint32(0, AWL2_MAGIC, true);
  headerView.setUint32(4, AWL2_VERSION, true);
  headerView.setUint32(8, channelCount, true);
  headerView.setUint32(12, 0, true); // reserved

  // Write sample data
  const data = new Float32Array(buffer, HEADER_BYTES);

  if (hasPressure) {
    // Interleave: [flow0, pressure0, flow1, pressure1, ...]
    for (let i = 0; i < flow.length; i++) {
      data[i * 2] = flow[i]!;
      data[i * 2 + 1] = pressure![i]!;
    }
  } else {
    // Single channel: [flow0, flow1, ...]
    data.set(flow);
  }

  return buffer;
}

/**
 * Parse a waveform blob, handling both AWL2 and legacy formats.
 *
 * Legacy detection: if the first 4 bytes don't match AWL2_MAGIC,
 * treat the entire buffer as a raw Float32 flow array (format v1).
 */
export function parseWaveformBlob(buffer: ArrayBuffer): ParsedWaveformBlob {
  // Check for AWL2 magic header
  if (buffer.byteLength >= HEADER_BYTES) {
    const headerView = new DataView(buffer);
    const magic = headerView.getUint32(0, true);

    if (magic === AWL2_MAGIC) {
      const formatVersion = headerView.getUint32(4, true);
      const channelCount = headerView.getUint32(8, true);
      const data = new Float32Array(buffer, HEADER_BYTES);

      if (channelCount === 2) {
        const sampleCount = data.length / 2;
        const flow = new Float32Array(sampleCount);
        const pressure = new Float32Array(sampleCount);

        for (let i = 0; i < sampleCount; i++) {
          flow[i] = data[i * 2]!;
          pressure[i] = data[i * 2 + 1]!;
        }

        return { formatVersion, channelCount, flow, pressure };
      }

      // Single channel
      return {
        formatVersion,
        channelCount: 1,
        flow: new Float32Array(data),
        pressure: null,
      };
    }
  }

  // Legacy format: raw Float32 array, no header
  return {
    formatVersion: 1,
    channelCount: 1,
    flow: new Float32Array(buffer),
    pressure: null,
  };
}
