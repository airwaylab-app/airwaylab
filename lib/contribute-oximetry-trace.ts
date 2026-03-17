// ============================================================
// AirwayLab — Oximetry Trace Contribution
// Compresses HR/SpO2 timeseries and uploads to the research
// dataset. Runs silently in the background — no UI feedback,
// failures logged to Sentry only.
// ============================================================

import * as Sentry from '@sentry/nextjs';
import { ENGINE_VERSION } from './engine-version';
import {
  getContributedOximetryDates,
  trackContributedOximetryDate,
  clearContributedOximetryDates,
  getContributedOximetryEngine,
  setContributedOximetryEngine,
} from '@/components/upload/contribution-consent-utils';
import type { NightResult, OximetryTraceData } from './types';

const MAX_COMPRESSED_BYTES = 2 * 1024 * 1024; // 2 MB per night (traces are much smaller than waveforms)

/**
 * Serialize an OximetryTraceData into a compact binary format.
 * Layout: [sampleCount:u32] then per sample [t:f32, spo2:f32, hr:f32]
 */
function serializeTrace(trace: OximetryTraceData): ArrayBuffer {
  const points = trace.trace;
  // 4 bytes header + 12 bytes per point (3 x float32)
  const buffer = new ArrayBuffer(4 + points.length * 12);
  const view = new DataView(buffer);

  view.setUint32(0, points.length, true);
  let offset = 4;
  for (const p of points) {
    view.setFloat32(offset, p.t, true);
    view.setFloat32(offset + 4, p.spo2, true);
    view.setFloat32(offset + 8, p.hr, true);
    offset += 12;
  }
  return buffer;
}

/**
 * Compress an ArrayBuffer using the browser-native CompressionStream API.
 * Falls back to raw binary if CompressionStream is unavailable.
 */
async function compressBuffer(
  buffer: ArrayBuffer
): Promise<{ data: ArrayBuffer; isCompressed: boolean }> {
  if (typeof CompressionStream === 'undefined') {
    return { data: buffer, isCompressed: false };
  }

  try {
    const cs = new CompressionStream('gzip');
    const writer = cs.writable.getWriter();
    const reader = cs.readable.getReader();

    writer.write(new Uint8Array(buffer));
    writer.close();

    const chunks: Uint8Array[] = [];
    let totalLength = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      totalLength += value.byteLength;
    }

    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.byteLength;
    }

    return { data: result.buffer, isCompressed: true };
  } catch {
    return { data: buffer, isCompressed: false };
  }
}

/**
 * Anonymise oximetry results for inclusion alongside trace data.
 */
function anonymiseOximetry(n: NightResult) {
  if (!n.oximetry) return null;
  const ox = n.oximetry;
  return {
    odi3: ox.odi3,
    odi4: ox.odi4,
    tBelow90: ox.tBelow90,
    tBelow94: ox.tBelow94,
    spo2Mean: ox.spo2Mean,
    spo2Min: ox.spo2Min,
    hrMean: ox.hrMean,
    hrSD: ox.hrSD,
    hrClin10: ox.hrClin10,
    hrMean10: ox.hrMean10,
    coupled3_10: ox.coupled3_10,
    coupledHRRatio: ox.coupledHRRatio,
    h1: ox.h1,
    h2: ox.h2,
    totalSamples: ox.totalSamples,
    retainedSamples: ox.retainedSamples,
  };
}

/**
 * Contribute oximetry trace data for opted-in users.
 * Fire-and-forget — no UI feedback. Failures logged to Sentry.
 * Only uploads nights with oximetry data that haven't been contributed yet.
 */
export async function contributeOximetryTraceBackground(
  nights: NightResult[],
  contributionId: string
): Promise<void> {
  // Filter to nights that have oximetry trace data
  const nightsWithTrace = nights.filter(
    (n) => n.oximetry !== null && n.oximetryTrace !== null
  );
  if (nightsWithTrace.length === 0) return;

  // Check engine version
  const lastEngine = getContributedOximetryEngine();
  if (lastEngine !== null && lastEngine !== ENGINE_VERSION) {
    clearContributedOximetryDates();
  }

  // Filter to only new nights
  const contributedDates = getContributedOximetryDates();
  const newNights = nightsWithTrace.filter(
    (n) => !contributedDates.has(n.dateStr)
  );
  if (newNights.length === 0) return;

  for (const night of newNights) {
    try {
      const trace = night.oximetryTrace!;
      if (trace.trace.length < 60) continue; // Too short for meaningful data

      // Serialize to compact binary
      const raw = serializeTrace(trace);
      const { data: compressed, isCompressed } = await compressBuffer(raw);

      if (compressed.byteLength > MAX_COMPRESSED_BYTES) {
        Sentry.captureMessage(
          `Oximetry trace skipped: ${night.dateStr} exceeds 2 MB`,
          { level: 'warning', tags: { feature: 'oximetry-trace-contribution' } }
        );
        continue;
      }

      const res = await fetch('/api/contribute-oximetry-trace', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          ...(isCompressed && { 'Content-Encoding': 'gzip' }),
          'x-night-date': night.dateStr,
          'x-contribution-id': contributionId,
          'x-engine-version': ENGINE_VERSION,
          'x-sample-count': String(trace.trace.length),
          'x-duration-seconds': String(trace.durationSeconds),
          'x-device-model': night.settings.deviceModel || 'Unknown',
          'x-pap-mode': night.settings.papMode || 'Unknown',
          'x-oximetry-results': JSON.stringify(anonymiseOximetry(night)),
        },
        body: compressed,
      });

      if (res.ok) {
        trackContributedOximetryDate(night.dateStr);
      } else {
        const errText = await res.text().catch(() => '');
        Sentry.captureMessage(
          `Oximetry trace contribution failed: ${res.status} ${errText}`,
          { level: 'warning', tags: { feature: 'oximetry-trace-contribution' } }
        );
      }
    } catch (err) {
      Sentry.captureException(err, {
        tags: { feature: 'oximetry-trace-contribution', nightDate: night.dateStr },
      });
    }
  }

  setContributedOximetryEngine(ENGINE_VERSION);
}
