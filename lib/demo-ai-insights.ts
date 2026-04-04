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
    title: 'Pressure increase correlating with multi-metric shift',
    body: 'The EPAP 8\u200A\u2192\u200A10 change on Jan 15 shows a correlated response across engines: Glasgow dropped from 2.6 to the 1.2\u20131.8 range, and flat-top scoring fell from 0.48 to 0.22. Your clinician can help interpret these patterns at your next review.',
    category: 'therapy',
  },
  {
    id: 'demo-ai-ned',
    type: 'warning',
    title: 'NED pattern shows H1-to-H2 worsening trend',
    body: 'Despite lower overall scores post-settings-change, NED combined shows a rising H1\u200A\u2192\u200AH2 trend (from 16% up to 22%) that correlates with an ODI-3 shift from 3.4 to 5.0/hr on nights with oximetry data. This late-night pattern is worth discussing with your clinician at your next review.',
    category: 'ned',
  },
  {
    id: 'demo-ai-wat',
    type: 'info',
    title: 'WAT and NED convergence after settings change',
    body: 'Pre-change, WAT FL (48%) and NED combined (38%) showed a 10-point gap suggesting different sensitivity to obstruction type. Post-change, both narrowed to 32%/22%. The converging scores after the settings change are a notable pattern. Your clinician can help interpret what this means for your current therapy.',
    category: 'wat',
  },
  {
    id: 'demo-ai-oximetry',
    type: 'actionable',
    title: 'Coupled HR-desaturation events linked to flow limitation',
    body: 'Coupled heart-rate and desaturation events at 1.4/hr (HR Clin 10) are co-occurring with elevated flow limitation scores across multiple nights in this dataset. Your clinician can help interpret this pattern in context.',
    category: 'oximetry',
  },
  {
    id: 'demo-ai-trend-7night',
    type: 'positive',
    title: '7-night trend shows consistent post-change pattern',
    body: 'Across all 7 nights, AHI dropped from a pre-change average of 6.5/hr (nights 4\u20137) to 3.2/hr (nights 1\u20133). The flow limitation metrics show a consistent downward trend across the post-change nights: combined FL percentage fell from 29% to 19%, and RERA index from 8.8 to 5.4.',
    category: 'therapy',
  },
  {
    id: 'demo-ai-leak-correlation',
    type: 'info',
    title: 'Leak reduction co-occurring with settings change',
    body: 'P95 leak dropped from 15.8\u201318.2 L/min pre-change to 8.5\u201312.8 L/min post-change. While the pressure increase might have been expected to worsen leaks, the lower AHI and fewer arousals likely reduced mouth-opening events. The co-occurring leak reduction is a notable data pattern.',
    category: 'therapy',
  },
];
