/**
 * Email drip templates for AirwayLab.
 *
 * Returns HTML strings — sent via Resend's fetch API (no @react-email dependency).
 * Dark theme matching the app aesthetic. Each email has:
 * - AirwayLab header with moon icon
 * - Body text + single CTA button
 * - Unsubscribe footer
 * - No health data (only links back to the app)
 */

const BASE_URL = 'https://airwaylab.app';

// ── Shared layout ────────────────────────────────────────────

function layout(content: string, unsubscribeUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="dark" />
  <title>AirwayLab</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <!-- Header -->
    <div style="margin-bottom:32px;">
      <span style="font-size:18px;font-weight:700;color:#ffffff;">
        <span style="color:#ffffff;">Airway</span><span style="color:#5eead4;font-weight:400;">Lab</span>
      </span>
    </div>

    <!-- Content -->
    ${content}

    <!-- Footer -->
    <div style="margin-top:40px;padding-top:24px;border-top:1px solid #1e1e21;">
      <p style="font-size:11px;color:#52525b;line-height:1.6;margin:0;">
        You're receiving this because you opted in to email updates on
        <a href="${BASE_URL}" style="color:#5eead4;text-decoration:none;">airwaylab.app</a>.
      </p>
      <p style="font-size:11px;color:#52525b;margin:8px 0 0 0;">
        <a href="${unsubscribeUrl}" style="color:#5eead4;text-decoration:underline;">Unsubscribe</a>
        from these emails.
      </p>
    </div>
  </div>
</body>
</html>`;
}

function ctaButton(text: string, href: string): string {
  return `<div style="margin:24px 0;">
    <a href="${href}" style="display:inline-block;padding:10px 24px;background-color:#5eead4;color:#0a0a0b;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">
      ${text}
    </a>
  </div>`;
}

function paragraph(text: string): string {
  return `<p style="font-size:14px;color:#a1a1aa;line-height:1.7;margin:0 0 16px 0;">${text}</p>`;
}

function heading(text: string): string {
  return `<h2 style="font-size:20px;color:#ffffff;font-weight:700;margin:0 0 16px 0;">${text}</h2>`;
}

function bulletList(items: string[]): string {
  const lis = items.map(
    (item) => `<li style="font-size:14px;color:#a1a1aa;line-height:1.7;margin-bottom:8px;">${item}</li>`
  ).join('');
  return `<ul style="margin:0 0 16px 0;padding-left:20px;">${lis}</ul>`;
}

// ── Sequence 1: Post-Upload ──────────────────────────────────

export function postUploadStep1(unsubscribeUrl: string): { subject: string; html: string } {
  return {
    subject: 'Your first analysis is saved -- here\'s what to do next',
    html: layout(`
      ${heading('Your analysis is saved')}
      ${paragraph('Your ResMed SD card data has been analysed by four research-grade engines. Here\'s what you can do next:')}
      ${bulletList([
        '<strong style="color:#fff;">Upload more nights</strong> -- trend tracking shows how your therapy changes over time. One night is a snapshot; seven nights is a picture.',
        '<strong style="color:#fff;">Try AI insights</strong> -- get a plain-language explanation of what your metrics mean for your therapy. Free users get 3 per month.',
        '<strong style="color:#fff;">Export your report</strong> -- download a PDF or CSV to bring to your next sleep clinic visit.',
      ])}
      ${ctaButton('Upload Your Next Night', `${BASE_URL}/analyze?utm_source=email&utm_medium=drip&utm_campaign=post_upload_1`)}
      ${paragraph('Your data stays in your browser unless you choose to share it. No one sees your results but you.')}
    `, unsubscribeUrl),
  };
}

export function postUploadStep2(unsubscribeUrl: string): { subject: string; html: string } {
  return {
    subject: 'One night tells part of the story -- trends tell the rest',
    html: layout(`
      ${heading('Why multi-night analysis matters')}
      ${paragraph('Sleep-disordered breathing varies from night to night. Body position, alcohol, stress, and nasal congestion all affect your airway. A single night\'s Glasgow Index might be 1.2 (green) or 2.8 (amber) depending on circumstances.')}
      ${paragraph('That\'s why trends matter. When you upload multiple nights, AirwayLab tracks how your metrics change over time. You can see:')}
      ${bulletList([
        'Whether a pressure adjustment actually improved your flow limitation',
        'Night-to-night variability in your breathing patterns',
        'First-half vs second-half differences (H1/H2 split)',
        'The overall direction of your therapy',
      ])}
      ${ctaButton('See Your Trends', `${BASE_URL}/analyze?utm_source=email&utm_medium=drip&utm_campaign=post_upload_2`)}
    `, unsubscribeUrl),
  };
}

export function postUploadStep3(unsubscribeUrl: string): { subject: string; html: string } {
  return {
    subject: 'Quick question: how is your therapy going?',
    html: layout(`
      ${heading('Track how you feel, not just the numbers')}
      ${paragraph('AirwayLab measures what your airway does. But symptoms are personal -- two people with the same flow limitation can feel completely different.')}
      ${paragraph('That\'s why we added symptom self-reporting. After each analysis, you can log how you feel on a simple scale. Over time, this builds a picture of your personal sensitivity to flow limitation.')}
      ${paragraph('It takes 5 seconds. And it\'s the data your clinician actually wants to see alongside your metrics.')}
      ${ctaButton('Log Your Sleep Quality', `${BASE_URL}/analyze?utm_source=email&utm_medium=drip&utm_campaign=post_upload_3`)}
    `, unsubscribeUrl),
  };
}

// ── Sequence 2: Dormancy Re-engagement ───────────────────────

export function dormancyStep1(unsubscribeUrl: string): { subject: string; html: string } {
  return {
    subject: 'Your PAP data is waiting -- new features since your last visit',
    html: layout(`
      ${heading('We\'ve been busy')}
      ${paragraph('It\'s been a couple of weeks since your last analysis. Here\'s what\'s new in AirwayLab:')}
      ${bulletList([
        '<strong style="color:#fff;">Improved AI insights</strong> -- deeper, more specific therapy recommendations powered by your flow data',
        '<strong style="color:#fff;">Community benchmarks</strong> -- see how your metrics compare to other PAP users (anonymised, opt-in only)',
        '<strong style="color:#fff;">Better trend views</strong> -- clearer visualisations of how your therapy is evolving',
      ])}
      ${paragraph('Your previous results are still saved in your browser. Upload new data to see how things have changed.')}
      ${ctaButton('Analyse New Data', `${BASE_URL}/analyze?utm_source=email&utm_medium=drip&utm_campaign=dormancy_1`)}
    `, unsubscribeUrl),
  };
}

export function dormancyStep2(unsubscribeUrl: string): { subject: string; html: string } {
  return {
    subject: 'Still tracking your therapy? Your previous results are saved',
    html: layout(`
      ${heading('Pick up where you left off')}
      ${paragraph('Your previous analysis results are still stored in your browser. Upload this month\'s SD card data to compare:')}
      ${bulletList([
        'Has your Glasgow Index improved or worsened?',
        'Is your flow limitation percentage trending in the right direction?',
        'Are RERAs more or less frequent than last time?',
      ])}
      ${paragraph('Even a single new night gives you a comparison point. Your clinician will appreciate the longitudinal data.')}
      ${ctaButton('Compare Your Progress', `${BASE_URL}/analyze?utm_source=email&utm_medium=drip&utm_campaign=dormancy_2`)}
    `, unsubscribeUrl),
  };
}

// ── Sequence 3: Feature Education ────────────────────────────

export function featureEducationStep1(unsubscribeUrl: string): { subject: string; html: string } {
  return {
    subject: 'Did you know? AI insights explain what your numbers mean',
    html: layout(`
      ${heading('Numbers are useful. Explanations are better.')}
      ${paragraph('AirwayLab\'s four engines give you detailed metrics -- Glasgow Index, FL Score, NED, RERA counts. But what do they mean for <em>your</em> therapy?')}
      ${paragraph('AI insights translate your metrics into plain-language explanations:')}
      ${bulletList([
        '"Your Glasgow Index of 2.4 suggests moderate flow limitation, primarily in the second half of the night..."',
        '"Your RERA index of 6.2 is above the normal range, which may explain persistent fatigue despite a low AHI..."',
        '"Consider discussing an EPR reduction with your clinician, as your flow limitation worsens with higher expiratory pressure relief..."',
      ])}
      ${paragraph('Free users get 3 AI analyses per month. Supporters get unlimited.')}
      ${ctaButton('Try AI Insights', `${BASE_URL}/analyze?utm_source=email&utm_medium=drip&utm_campaign=feature_ed_1`)}
    `, unsubscribeUrl),
  };
}

export function featureEducationStep2(unsubscribeUrl: string): { subject: string; html: string } {
  return {
    subject: 'Share your results with your clinician',
    html: layout(`
      ${heading('Objective data for your next appointment')}
      ${paragraph('Most sleep physicians see AHI and call it done. But you now have flow limitation scores, RERA estimates, and breath-by-breath analysis that tells a much deeper story.')}
      ${paragraph('AirwayLab gives you three ways to share:')}
      ${bulletList([
        '<strong style="color:#fff;">PDF report</strong> -- professional format with metric cards, trends, and radar charts. Ready to print or email.',
        '<strong style="color:#fff;">CSV export</strong> -- 67-column dataset for detailed review or import into other tools.',
        '<strong style="color:#fff;">Forum post</strong> -- formatted for ApneaBoard or r/SleepApnea, with traffic-light indicators.',
      ])}
      ${paragraph('The more data you bring, the better the conversation. Your clinician can\'t act on symptoms alone -- they need objective evidence.')}
      ${ctaButton('Export Your Report', `${BASE_URL}/analyze?utm_source=email&utm_medium=drip&utm_campaign=feature_ed_2`)}
    `, unsubscribeUrl),
  };
}

// ── Template registry ────────────────────────────────────────

export type SequenceName = 'post_upload' | 'dormancy' | 'feature_education';

interface SequenceConfig {
  totalSteps: number;
  /** Delay in days from sequence start for each step */
  delays: number[];
  getTemplate: (step: number, unsubscribeUrl: string) => { subject: string; html: string } | null;
}

export const SEQUENCES: Record<SequenceName, SequenceConfig> = {
  post_upload: {
    totalSteps: 3,
    delays: [0, 3, 7], // step 1 sent inline at trigger, steps 2-3 via cron
    getTemplate: (step, url) => {
      if (step === 1) return postUploadStep1(url);
      if (step === 2) return postUploadStep2(url);
      if (step === 3) return postUploadStep3(url);
      return null;
    },
  },
  dormancy: {
    totalSteps: 2,
    delays: [0, 16], // 14 days dormant + 0 = 14 days, + 16 = 30 days
    getTemplate: (step, url) => {
      if (step === 1) return dormancyStep1(url);
      if (step === 2) return dormancyStep2(url);
      return null;
    },
  },
  feature_education: {
    totalSteps: 2,
    delays: [0, 7], // step 1 sent inline at trigger, step 2 via cron
    getTemplate: (step, url) => {
      if (step === 1) return featureEducationStep1(url);
      if (step === 2) return featureEducationStep2(url);
      return null;
    },
  },
};
