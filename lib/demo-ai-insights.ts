// ============================================================
// AirwayLab — Static Demo AI Insights
// Pre-computed insights for demo mode. Never calls the AI API.
// References values from SAMPLE_NIGHTS in lib/sample-data.ts.
// ============================================================

import type { Insight } from './insights';

/**
 * Curated AI insights for demo mode that showcase cross-engine
 * correlation analysis — the differentiator vs rule-based insights.
 */
export const DEMO_AI_INSIGHTS: Insight[] = [
  {
    id: 'demo-ai-therapy',
    type: 'positive',
    title: 'Pressure increase correlating with multi-metric improvement',
    body: 'The EPAP 8\u200A\u2192\u200A10 change on Jan 14 shows a correlated response across engines: Glasgow dropped from 2.6 to the 1.2\u20131.8 range, and flat-top scoring fell from 0.48 to 0.22 \u2014 consistent with reduced inspiratory flow limitation. Discuss the sustained improvement with your clinician at your next review.',
    category: 'therapy',
  },
  {
    id: 'demo-ai-ned',
    type: 'warning',
    title: 'NED worsening pattern may indicate REM-related obstruction',
    body: 'Despite overall improvement post-settings-change, NED combined shows a rising H1\u200A\u2192\u200AH2 trend (from 16% up to 22%) that correlates with an ODI-3 shift from 3.4 to 5.0/hr on nights with oximetry data. This pattern is consistent with REM-phase residual obstruction. Worth discussing positional or pressure-response strategies with your clinician.',
    category: 'ned',
  },
  {
    id: 'demo-ai-wat',
    type: 'info',
    title: 'WAT and NED convergence after settings change',
    body: 'Pre-change, WAT FL (48%) and NED combined (38%) showed a 10-point gap suggesting different sensitivity to obstruction type. Post-change, both narrowed to 32%/22% \u2014 the converging scores suggest the pressure increase is addressing the dominant flow-limitation mechanism rather than masking it. A positive signal for your current settings.',
    category: 'wat',
  },
  {
    id: 'demo-ai-oximetry',
    type: 'actionable',
    title: 'Elevated arousal index driving coupled HR-desaturation events',
    body: 'The estimated arousal index of 12.4/hr is generating coupled heart-rate and desaturation events at 1.4/hr (HR Clin 10), which is above the 1.0/hr threshold. This coupling pattern suggests RERA-driven arousals rather than frank apneas. Discuss whether RERA-focused titration adjustments could reduce sleep fragmentation with your clinician.',
    category: 'oximetry',
  },
];
