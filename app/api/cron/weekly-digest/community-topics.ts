/**
 * Rotating community discussion topics and usage tips for Discord.
 *
 * Used by the weekly digest cron to post engaging content to #general.
 * Topics rotate weekly (index = ISO week number % array length).
 */

export const DISCUSSION_TOPICS = [
  {
    title: 'Flow Limitation Patterns',
    prompt: 'What does your flow limitation data look like? Share your FL Score and what you have noticed about patterns across nights. Are your numbers consistent or do they vary a lot?',
  },
  {
    title: 'Pressure Settings Journey',
    prompt: 'How have your pressure settings evolved since starting therapy? What changes made the biggest difference in your data? (Remember: always discuss changes with your clinician first.)',
  },
  {
    title: 'First vs Second Half of Night',
    prompt: 'AirwayLab splits your analysis into H1 (first half) and H2 (second half). Do you notice differences? Many users see worse flow limitation in H2 — what about you?',
  },
  {
    title: 'Oximetry Insights',
    prompt: 'If you use a pulse oximeter alongside your CPAP, what has your oximetry data revealed? Any surprising patterns in your ODI or heart rate data?',
  },
  {
    title: 'Mask and Leak Management',
    prompt: 'Leaks affect data quality and therapy effectiveness. What mask do you use, and how do you manage leak rates? Any tips that worked for you?',
  },
  {
    title: 'Data Contribution Stories',
    prompt: 'Have you contributed your anonymised data to AirwayLab research? What motivated you to share (or not)? Every contribution helps build better analysis tools.',
  },
  {
    title: 'Comparing OSCAR and AirwayLab',
    prompt: 'Many of us come from OSCAR. What differences have you noticed in the analysis? What does AirwayLab show you that OSCAR does not (or vice versa)?',
  },
  {
    title: 'Therapy Wins',
    prompt: 'Share a positive change you have seen in your data recently. Better Glasgow scores? Fewer RERAs? Improved regularity? Small wins matter.',
  },
]

export const USAGE_TIPS = [
  'Did you know you can **export your analysis as a PDF report**? Great for sharing with your sleep physician. Look for the Export button on your dashboard.',
  'AirwayLab analyses **multiple nights at once** — just upload your full SD card. The more data, the better the trend analysis.',
  'The **Glasgow Index** scores your breath shapes from 0 to 9. A lower score means more normal breathing patterns. Track it across nights to see trends.',
  'You can view your data in **dark or light mode** — check Settings > Display Preferences.',
  'AirwayLab runs entirely **in your browser** — your EDF files never leave your device unless you explicitly opt in to data contribution or AI insights.',
  'The **Forum Export** button formats your analysis for posting on ApneaBoard or Reddit, complete with medical disclaimer.',
  'Try the **AI Insights** feature (paid) for a detailed interpretation of your data. It analyses flow limitation patterns, RERA clustering, and breath shape distributions.',
  'Your analysis results are **saved locally for 30 days**. Upload fresh data anytime to update them.',
  'The **NED (Negative Effort Dependence)** metric detects subtle flow limitation that AHI alone misses. A higher NED means more effort-dependent airflow reduction.',
  'You can compare your **current night vs your 7-night trend** on the Overview tab. Look for the trend arrows next to each metric.',
]

/** Get the current ISO week number (1-53). */
export function getISOWeekNumber(): number {
  const date = new Date()
  const jan4 = new Date(date.getFullYear(), 0, 4)
  const dayDiff = (date.getTime() - jan4.getTime()) / 86400000
  return Math.ceil((dayDiff + jan4.getDay() + 1) / 7)
}
