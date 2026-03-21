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
    subject: "Your first analysis is saved -- here's what to do next",
    html: layout(`
      ${heading('Your breathing data has been analysed')}
      ${paragraph('Four research-grade engines just scored your flow limitation, breathing regularity, and airway resistance. Your results are saved in your browser -- no one sees them but you.')}
      ${paragraph('One night is a snapshot. Upload a few more nights and you\'ll start to see how your therapy is actually trending -- whether pressure changes helped, which nights are worse, and what your clinician should know.')}
      ${ctaButton('Upload Your Next Night', `${BASE_URL}/analyze?utm_source=email&utm_medium=drip&utm_campaign=post_upload_1`)}
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
      ${ctaButton('Upload Your Next Night', `${BASE_URL}/analyze?utm_source=email&utm_medium=drip&utm_campaign=post_upload_2`)}
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
    subject: 'Your therapy data is still here',
    html: layout(`
      ${heading('Ready when you are')}
      ${paragraph('Your previous analysis results are saved. When you upload new SD card data, AirwayLab compares it against your earlier nights so you can see what\'s changed.')}
      ${paragraph('Even one new night gives you:')}
      ${bulletList([
        'A before-and-after comparison of your flow limitation scores',
        'Whether your breathing patterns are improving or drifting',
        'Updated trend data to bring to your next clinic visit',
      ])}
      ${ctaButton('Upload This Month\'s Data', `${BASE_URL}/analyze?utm_source=email&utm_medium=drip&utm_campaign=dormancy_1`)}
    `, unsubscribeUrl),
  };
}

export function dormancyStep2(unsubscribeUrl: string): { subject: string; html: string } {
  return {
    subject: 'Last check-in: are you still tracking your therapy?',
    html: layout(`
      ${heading('No pressure -- just checking in')}
      ${paragraph('We send occasional emails to help you get the most out of AirwayLab. If you\'re no longer tracking your PAP therapy, no worries -- this is the last email we\'ll send unless you upload new data.')}
      ${paragraph('If you are still on therapy, your previous results are waiting. Upload your latest SD card data and see how your metrics compare.')}
      ${ctaButton('Upload New Data', `${BASE_URL}/analyze?utm_source=email&utm_medium=drip&utm_campaign=dormancy_2`)}
      ${paragraph('If you\'d rather not hear from us, <a href="${unsubscribeUrl}" style="color:#5eead4;text-decoration:underline;">unsubscribe here</a>. One click, no questions.')}
    `, unsubscribeUrl),
  };
}

// ── Sequence 3: Feature Education ────────────────────────────

export function featureEducationStep1(unsubscribeUrl: string): { subject: string; html: string } {
  return {
    subject: 'Your metrics, explained in plain language',
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

// ── Sequence 4: Activation (signed up, never uploaded) ───────

function activationStep1(unsubscribeUrl: string): { subject: string; html: string } {
  return {
    subject: 'Need help uploading your SD card data?',
    html: layout(`
      ${heading('Getting started takes 60 seconds')}
      ${paragraph('You created an AirwayLab account but haven\'t uploaded any data yet. Here\'s what you need:')}
      ${bulletList([
        '<strong style="color:#fff;">A ResMed SD card</strong> -- remove it from your CPAP/BiPAP machine (AirSense 10, AirSense 11, AirCurve, or similar)',
        '<strong style="color:#fff;">An SD card reader</strong> -- plug it into your computer',
        '<strong style="color:#fff;">Select the DATALOG folder</strong> -- AirwayLab will find and parse all the EDF files automatically',
      ])}
      ${paragraph('Everything runs in your browser. Your data never leaves your device unless you choose to share it.')}
      ${ctaButton('Upload Your SD Card', `${BASE_URL}/analyze?utm_source=email&utm_medium=drip&utm_campaign=activation_1`)}
      ${paragraph('Having trouble? Reply to this email and we\'ll help you get started.')}
    `, unsubscribeUrl),
  };
}

function activationStep2(unsubscribeUrl: string): { subject: string; html: string } {
  return {
    subject: 'Your CPAP data has insights waiting to be found',
    html: layout(`
      ${heading('What one upload reveals')}
      ${paragraph('AirwayLab users who upload a week of SD card data typically discover patterns their AHI never showed -- subtle flow limitation, periodic breathing, and arousal patterns that explain why they still feel tired despite "normal" numbers.')}
      ${paragraph('Your machine has been recording detailed flow waveforms every night. AirwayLab\'s four engines analyse those waveforms at the breath level -- something OSCAR and your machine\'s built-in reports can\'t do.')}
      ${ctaButton('Start Your First Analysis', `${BASE_URL}/analyze?utm_source=email&utm_medium=drip&utm_campaign=activation_2`)}
      ${paragraph('This is the last activation email we\'ll send. If you\'re not ready yet, your account will be here when you are.')}
    `, unsubscribeUrl),
  };
}

// ── Sequence 5: Premium Onboarding (after subscription) ──────

function premiumOnboardingStep1(unsubscribeUrl: string): { subject: string; html: string } {
  return {
    subject: "Here's what's different now",
    html: layout(`
      ${heading('Your analysis just got smarter')}
      ${paragraph('Every time you upload now, you\'ll get AI-powered insights alongside the standard engine scores. The AI reads your Glasgow Index, FL Score, NED, and oximetry results together -- connecting patterns across engines that the individual scores can\'t show.')}
      ${paragraph('It references your pressure settings and suggests specific adjustments to discuss with your clinician. Upload a night and see the difference.')}
      ${ctaButton('Upload and Try AI Insights', `${BASE_URL}/analyze?utm_source=email&utm_medium=drip&utm_campaign=premium_onboarding_1`)}
    `, unsubscribeUrl),
  };
}

function premiumOnboardingStep2(unsubscribeUrl: string): { subject: string; html: string } {
  return {
    subject: 'The report your clinician wants to see',
    html: layout(`
      ${heading('Objective data for your next appointment')}
      ${paragraph('Most sleep physicians see AHI and compliance hours. You now have flow limitation scores, RERA estimates, breath-by-breath NED analysis, and AI-powered interpretation.')}
      ${paragraph('The PDF report puts all of this in a format your clinician can read in 2 minutes -- metric cards, trend charts, and plain-language explanations. If you\'ve been struggling to explain why you still feel tired despite "normal" AHI, this report does it for you.')}
      ${ctaButton('Generate Your PDF Report', `${BASE_URL}/analyze?utm_source=email&utm_medium=drip&utm_campaign=premium_onboarding_2`)}
    `, unsubscribeUrl),
  };
}

function premiumOnboardingStep3(unsubscribeUrl: string): { subject: string; html: string } {
  return {
    subject: 'What your support makes possible',
    html: layout(`
      ${heading("You're funding better sleep analysis for everyone")}
      ${paragraph('AirwayLab is open-source and GPL-licensed. Your subscription funds development of analysis engines that anyone can use, verify, and build on.')}
      ${paragraph('If you have ideas for what would help your therapy most, reply to this email -- I read everything personally.')}
      ${ctaButton('See the Roadmap', `${BASE_URL}/changelog?utm_source=email&utm_medium=drip&utm_campaign=premium_onboarding_3`)}
      ${paragraph('P.S. Your name is on the <a href="' + BASE_URL + '/supporters" style="color:#5eead4;text-decoration:underline;">supporters page</a> (unless you opted out in settings). Thank you.')}
    `, unsubscribeUrl),
  };
}

// ── Template registry ────────────────────────────────────────

export type SequenceName = 'post_upload' | 'dormancy' | 'feature_education' | 'activation' | 'premium_onboarding';

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
    delays: [0, 7], // step 1 at trigger (3d or 7d via AB test), step 2 at t+7
    getTemplate: (step, url) => {
      if (step === 1) return dormancyStep1(url);
      if (step === 2) return dormancyStep2(url);
      return null;
    },
  },
  feature_education: {
    totalSteps: 2,
    delays: [10, 17], // starts 10 days after first upload (after post_upload finishes)
    getTemplate: (step, url) => {
      if (step === 1) return featureEducationStep1(url);
      if (step === 2) return featureEducationStep2(url);
      return null;
    },
  },
  activation: {
    totalSteps: 2,
    delays: [0, 3], // step 1 at trigger (48h after signup), step 2 at t+3
    getTemplate: (step, url) => {
      if (step === 1) return activationStep1(url);
      if (step === 2) return activationStep2(url);
      return null;
    },
  },
  premium_onboarding: {
    totalSteps: 3,
    delays: [0, 3, 7], // step 1 at subscription, steps 2-3 via cron
    getTemplate: (step, url) => {
      if (step === 1) return premiumOnboardingStep1(url);
      if (step === 2) return premiumOnboardingStep2(url);
      if (step === 3) return premiumOnboardingStep3(url);
      return null;
    },
  },
};
