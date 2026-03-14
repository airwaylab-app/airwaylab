// ============================================================
// AirwayLab — CSV and JSON Export
// ============================================================

import type { NightResult } from './types';
import { computeIFLRisk } from './ifl-risk';
import { computeEstimatedRDI } from './derived-metrics';
import { loadNightNotes } from './night-notes';

export function exportCSV(nights: NightResult[]): string {
  const headers = [
    'Date',
    'IFL Symptom Risk (%)',
    'Duration (hrs)',
    'Sessions',
    'Mode',
    'EPAP',
    'IPAP',
    'PS',
    'Glasgow Overall',
    'Glasgow Skew',
    'Glasgow Spike',
    'Glasgow FlatTop',
    'Glasgow TopHeavy',
    'Glasgow MultiPeak',
    'Glasgow NoPause',
    'Glasgow InspirRate',
    'Glasgow MultiBreath',
    'Glasgow VarAmp',
    'WAT FL Score',
    'WAT Regularity',
    'WAT Periodicity',
    'NED Mean',
    'NED Median',
    'NED P95',
    'NED Clear FL%',
    'NED Borderline%',
    'FI Mean',
    'FI FL85%',
    'Tpeak Mean',
    'M-Shape%',
    'RERA Index',
    'RERA Count',
    'Estimated RDI (/hr)',
    'H1 NED Mean',
    'H2 NED Mean',
    'Combined FL%',
    'ODI3',
    'ODI4',
    'T<90 (min)',
    'T<94 (min)',
    'SpO2 Mean',
    'SpO2 Min',
    'HR Mean',
    'HR SD',
    'HR Clin 10',
    'HR Mean 10',
    'Coupled 3/6',
    'Coupled 3/10',
    'Brief Obstruction Index (/hr)',
    'Hypopnea Index (/hr)',
    'Hypopnea Source',
    'Amplitude CV (%)',
    'Unstable Epochs (%)',
    'NED-Invisible Events (%)',
    'Symptom Rating',
  ];

  const ox = (n: NightResult, get: (o: NonNullable<NightResult['oximetry']>) => number) =>
    n.oximetry ? get(n.oximetry).toFixed(2) : '';

  const rows = nights.map((n) => [
    n.dateStr,
    computeIFLRisk(n).toFixed(1),
    n.durationHours.toFixed(2),
    n.sessionCount,
    n.settings.papMode,
    n.settings.epap,
    n.settings.ipap,
    n.settings.pressureSupport,
    n.glasgow.overall.toFixed(2),
    n.glasgow.skew.toFixed(2),
    n.glasgow.spike.toFixed(2),
    n.glasgow.flatTop.toFixed(2),
    n.glasgow.topHeavy.toFixed(2),
    n.glasgow.multiPeak.toFixed(2),
    n.glasgow.noPause.toFixed(2),
    n.glasgow.inspirRate.toFixed(2),
    n.glasgow.multiBreath.toFixed(2),
    n.glasgow.variableAmp.toFixed(2),
    n.wat.flScore.toFixed(2),
    n.wat.regularityScore.toFixed(2),
    n.wat.periodicityIndex.toFixed(2),
    n.ned.nedMean.toFixed(2),
    n.ned.nedMedian.toFixed(2),
    n.ned.nedP95.toFixed(2),
    n.ned.nedClearFLPct.toFixed(2),
    n.ned.nedBorderlinePct.toFixed(2),
    n.ned.fiMean.toFixed(2),
    n.ned.fiFL85Pct.toFixed(2),
    n.ned.tpeakMean.toFixed(2),
    n.ned.mShapePct.toFixed(2),
    n.ned.reraIndex.toFixed(2),
    n.ned.reraCount,
    computeEstimatedRDI(n.ned).toFixed(2),
    n.ned.h1NedMean.toFixed(2),
    n.ned.h2NedMean.toFixed(2),
    n.ned.combinedFLPct.toFixed(2),
    ox(n, (o) => o.odi3),
    ox(n, (o) => o.odi4),
    ox(n, (o) => o.tBelow90),
    ox(n, (o) => o.tBelow94),
    ox(n, (o) => o.spo2Mean),
    ox(n, (o) => o.spo2Min),
    ox(n, (o) => o.hrMean),
    ox(n, (o) => o.hrSD),
    ox(n, (o) => o.hrClin10),
    ox(n, (o) => o.hrMean10),
    ox(n, (o) => o.coupled3_6),
    ox(n, (o) => o.coupled3_10),
    (n.ned.briefObstructionIndex ?? 0).toFixed(2),
    (n.ned.hypopneaIndex ?? 0).toFixed(2),
    n.ned.hypopneaSource ?? 'algorithm',
    (n.ned.amplitudeCvOverall ?? 0).toFixed(2),
    (n.ned.unstableEpochPct ?? 0).toFixed(2),
    (n.ned.hypopneaNedInvisiblePct ?? 0).toFixed(2),
    (() => {
      try {
        const notes = loadNightNotes(n.dateStr);
        return notes.symptomRating !== null ? String(notes.symptomRating) : '';
      } catch {
        return '';
      }
    })(),
  ]);

  // Properly escape fields containing commas, quotes, or newlines (RFC 4180)
  const esc = (v: string | number): string => {
    const s = String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.map(esc).join(','), ...rows.map((r) => r.map(esc).join(','))].join('\n');
}

export function exportJSON(nights: NightResult[]): string {
  // Serialize without Float32Arrays (they become objects in JSON)
  return JSON.stringify(nights, null, 2);
}

export function downloadFile(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
