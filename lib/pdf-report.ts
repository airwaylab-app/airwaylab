// ============================================================
// AirwayLab — PDF Report Generator (Print-to-PDF)
// Opens a print-ready window the user can save as PDF.
// Zero external dependencies.
// ============================================================

import type { NightResult } from './types';
import { getTrafficLight, type TrafficLight } from './thresholds';
import { getStoredThresholds } from './threshold-overrides';
import { generateRadarSVG, generateTrendSVG } from './pdf-charts';

const TL_EMOJI: Record<TrafficLight, string> = {
  good: '\u2705',
  warn: '\u26a0\ufe0f',
  bad: '\ud83d\udd34',
};

const TL_HEX: Record<TrafficLight, string> = {
  good: '#10b981',
  warn: '#f59e0b',
  bad: '#ef4444',
};

function fmt(v: number, d = 2): string {
  return v.toFixed(d);
}

function metricRow(
  label: string,
  value: number,
  unit: string,
  thresholdKey?: string
): string {
  const THRESHOLDS = getStoredThresholds();
  const tl = thresholdKey && THRESHOLDS[thresholdKey]
    ? getTrafficLight(value, THRESHOLDS[thresholdKey])
    : null;
  const color = tl ? TL_HEX[tl] : '#94a3b8';
  const emoji = tl ? TL_EMOJI[tl] : '';
  return `<tr>
    <td style="padding:6px 12px;border-bottom:1px solid #1e293b;color:#cbd5e1;">${label}</td>
    <td style="padding:6px 12px;border-bottom:1px solid #1e293b;text-align:right;font-weight:600;color:${color};">
      ${emoji} ${fmt(value)}${unit}
    </td>
  </tr>`;
}

function buildNightSection(n: NightResult, index: number): string {
  const ox = n.oximetry;

  return `
    <div style="page-break-inside:avoid;page-break-before:${index > 0 ? 'always' : 'auto'};margin-bottom:32px;">
      <h2 style="font-size:18px;font-weight:700;margin:0 0 4px;color:#f1f5f9;">
        ${index === 0 ? '\ud83c\udf19' : ''} ${n.dateStr}
      </h2>
      <p style="font-size:12px;color:#64748b;margin:0 0 16px;">
        Duration: ${fmt(n.durationHours, 1)} hrs &middot;
        ${n.sessionCount} session${n.sessionCount !== 1 ? 's' : ''} &middot;
        ${n.settings.papMode} ${n.settings.epap}/${n.settings.ipap} cmH\u2082O
      </p>

      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:12px;">
        <thead>
          <tr style="border-bottom:2px solid #334155;">
            <th style="padding:8px 12px;text-align:left;color:#94a3b8;font-weight:600;">Metric</th>
            <th style="padding:8px 12px;text-align:right;color:#94a3b8;font-weight:600;">Value</th>
          </tr>
        </thead>
        <tbody>
          <tr><td colspan="2" style="padding:8px 12px;font-weight:600;color:#3b82f6;border-bottom:1px solid #1e293b;">Glasgow Index</td></tr>
          ${metricRow('Overall', n.glasgow.overall, '', 'glasgowOverall')}
          ${metricRow('Skew', n.glasgow.skew, '')}
          ${metricRow('Flat Top', n.glasgow.flatTop, '')}
          ${metricRow('Multi-Peak', n.glasgow.multiPeak, '')}

          <tr><td colspan="2" style="padding:8px 12px;font-weight:600;color:#10b981;border-bottom:1px solid #1e293b;">WAT Analysis</td></tr>
          ${metricRow('FL Score', n.wat.flScore, '%', 'watFL')}
          ${metricRow('Regularity', n.wat.regularityScore, '%', 'watRegularity')}
          ${metricRow('Periodicity', n.wat.periodicityIndex, '%', 'watPeriodicity')}

          <tr><td colspan="2" style="padding:8px 12px;font-weight:600;color:#f59e0b;border-bottom:1px solid #1e293b;">NED Analysis</td></tr>
          ${metricRow('NED Mean', n.ned.nedMean, '%', 'nedMean')}
          ${metricRow('NED P95', n.ned.nedP95, '%', 'nedP95')}
          ${metricRow('Combined FL', n.ned.combinedFLPct, '%', 'combinedFL')}
          ${metricRow('RERA Index', n.ned.reraIndex, '/hr', 'reraIndex')}
          ${metricRow('M-Shape', n.ned.mShapePct, '%')}

          ${ox ? `
            <tr><td colspan="2" style="padding:8px 12px;font-weight:600;color:#f43f5e;border-bottom:1px solid #1e293b;">Oximetry</td></tr>
            ${metricRow('ODI-3%', ox.odi3, '/hr', 'odi3')}
            ${metricRow('ODI-4%', ox.odi4, '/hr', 'odi4')}
            ${metricRow('T < 90%', ox.tBelow90, ' min', 'tBelow90')}
            ${metricRow('SpO\u2082 Mean', ox.spo2Mean, '%', 'spo2Mean')}
            ${metricRow('SpO\u2082 Min', ox.spo2Min, '%')}
            ${metricRow('HR Mean', ox.hrMean, ' bpm')}
            ${metricRow('HR Clin Surges (10)', ox.hrClin10, '/hr', 'hrClin10')}
            ${metricRow('Coupled 3/10', ox.coupled3_10, '/hr')}
          ` : ''}
        </tbody>
      </table>
    </div>
  `;
}

function buildSummaryPage(nights: NightResult[]): string {
  const THRESHOLDS = getStoredThresholds();
  const avg = (fn: (n: NightResult) => number) =>
    nights.reduce((sum, n) => sum + fn(n), 0) / nights.length;

  const avgGlasgow = avg((n) => n.glasgow.overall);
  const avgFL = avg((n) => n.wat.flScore);
  const avgNED = avg((n) => n.ned.nedMean);
  const avgRERA = avg((n) => n.ned.reraIndex);
  const avgReg = avg((n) => n.wat.regularityScore);

  const glTL = getTrafficLight(avgGlasgow, THRESHOLDS.glasgowOverall);
  const flTL = getTrafficLight(avgFL, THRESHOLDS.watFL);
  const nedTL = getTrafficLight(avgNED, THRESHOLDS.nedMean);
  const reraTL = getTrafficLight(avgRERA, THRESHOLDS.reraIndex);

  function summaryMetric(label: string, value: string, tl: TrafficLight): string {
    return `<div style="text-align:center;padding:12px;">
      <div style="font-size:24px;font-weight:700;color:${TL_HEX[tl]};">${TL_EMOJI[tl]} ${value}</div>
      <div style="font-size:11px;color:#94a3b8;margin-top:4px;">${label}</div>
    </div>`;
  }

  const mostRecent = nights[0];
  const radarSVG = generateRadarSVG(mostRecent.glasgow);

  return `
    <div style="page-break-after:always;">
      <h2 style="font-size:18px;font-weight:700;color:#f1f5f9;margin:0 0 4px;">Summary — ${nights.length} Night${nights.length !== 1 ? 's' : ''}</h2>
      <p style="font-size:12px;color:#64748b;margin:0 0 20px;">
        ${nights[nights.length - 1].dateStr} to ${nights[0].dateStr} &middot;
        ${mostRecent.settings.deviceModel} &middot; ${mostRecent.settings.papMode}
      </p>

      <div style="display:flex;justify-content:space-around;border:1px solid #334155;border-radius:8px;padding:8px;margin-bottom:24px;">
        ${summaryMetric('Avg Glasgow', fmt(avgGlasgow), glTL)}
        ${summaryMetric('Avg FL Score', fmt(avgFL) + '%', flTL)}
        ${summaryMetric('Avg NED Mean', fmt(avgNED) + '%', nedTL)}
        ${summaryMetric('Avg RERA/hr', fmt(avgRERA), reraTL)}
        ${summaryMetric('Avg Regularity', Math.round(avgReg) + '%', getTrafficLight(avgReg, THRESHOLDS.watRegularity))}
      </div>

      <h3 style="font-size:14px;font-weight:600;color:#94a3b8;margin:0 0 8px;">Glasgow Radar — ${mostRecent.dateStr}</h3>
      ${radarSVG}
    </div>
  `;
}

function buildTrendsPage(nights: NightResult[]): string {
  if (nights.length < 2) return '';
  const trendSVG = generateTrendSVG(nights);
  return `
    <div style="page-break-before:always;">
      <h2 style="font-size:18px;font-weight:700;color:#f1f5f9;margin:0 0 4px;">Trends</h2>
      <p style="font-size:12px;color:#64748b;margin:0 0 20px;">
        Key metrics across ${nights.length} nights
      </p>
      ${trendSVG}
    </div>
  `;
}

/**
 * Generate and open a print-ready PDF report in a new window.
 * User can then "Save as PDF" from the browser print dialog.
 */
export function openPDFReport(nights: NightResult[]): void {
  const now = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const summaryPage = buildSummaryPage(nights);
  const nightSections = nights
    .map((n, i) => buildNightSection(n, i))
    .join('');
  const trendsPage = buildTrendsPage(nights);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>AirwayLab Report — ${now}</title>
  <style>
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0f172a;
      color: #cbd5e1;
      padding: 40px;
      line-height: 1.5;
    }
    h1 { font-size: 24px; font-weight: 800; color: #f1f5f9; }
  </style>
</head>
<body>
  <!-- Print button -->
  <div class="no-print" style="position:fixed;top:16px;right:16px;z-index:100;">
    <button onclick="window.print()" style="
      background:#6366f1;color:white;border:none;padding:10px 20px;
      border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;
    ">
      \ud83d\udda8\ufe0f Save as PDF
    </button>
  </div>

  <!-- Header -->
  <div style="margin-bottom:32px;border-bottom:2px solid #334155;padding-bottom:20px;">
    <h1>\ud83c\udf19 AirwayLab Report</h1>
    <p style="font-size:14px;color:#64748b;margin-top:4px;">
      Generated ${now} &middot; ${nights.length} night${nights.length !== 1 ? 's' : ''} analysed
    </p>
    <p style="font-size:11px;color:#475569;margin-top:8px;">
      Traffic lights: \u2705 Good &middot; \u26a0\ufe0f Moderate &middot; \ud83d\udd34 Needs attention
    </p>
  </div>

  <!-- Summary Page -->
  ${summaryPage}

  <!-- Night sections -->
  ${nightSections}

  <!-- Trends Page -->
  ${trendsPage}

  <!-- Footer -->
  <div style="margin-top:40px;padding-top:16px;border-top:1px solid #334155;font-size:11px;color:#475569;">
    <p>Generated by AirwayLab &mdash; free, open-source airway analysis &mdash; airwaylab.app</p>
    <p style="margin-top:4px;">
      This report is for informational purposes only and is not a substitute for professional medical advice.
      Always consult your sleep physician regarding therapy changes.
    </p>
  </div>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}
