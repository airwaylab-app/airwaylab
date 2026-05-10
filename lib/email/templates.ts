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
      <p style="font-size:10px;color:#52525b;line-height:1.5;margin:12px 0 0 0;">
        AirwayLab is not a medical device. This email contains data summaries for informational purposes. Your clinician can help interpret these findings in the context of your care.
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
    subject: '4 engines just decoded your breathing data',
    html: layout(`
      ${heading('Your breathing data has been analysed')}
      ${paragraph('Four research-grade engines just scored your flow limitation, breathing regularity, and airway resistance. Your results are saved in your browser -- no one sees them but you.')}
      ${paragraph('One night is a snapshot. Upload a few more nights and you\'ll start to see how your scores are changing over time -- how your scores compare across nights, which nights are worse, and what your clinician can review.')}
      ${ctaButton('Upload Your Next Night', `${BASE_URL}/analyze?utm_source=email&utm_medium=drip&utm_campaign=post_upload_1`)}
    `, unsubscribeUrl),
  };
}

export function postUploadStep2(unsubscribeUrl: string): { subject: string; html: string } {
  return {
    subject: 'One night is a snapshot -- here\'s why that matters',
    html: layout(`
      ${heading('What changes between nights -- and why it matters')}
      ${paragraph('Sleep breathing varies with body position, alcohol, congestion, and stress. A Glasgow Index of 1.2 one night and 2.8 the next is normal. The question isn\'t "what was my score" -- it\'s "how do my scores compare night to night?"')}
      ${paragraph('Trends answer that. Each upload adds another data point to the picture your clinician needs:')}
      ${bulletList([
        'See how your flow limitation scores changed over time',
        'Track how your scores change over weeks and months',
        'First-half vs second-half differences in your scores',
      ])}
      ${paragraph('Supporters get AI-powered insights that explain deeper analysis of cross-session correlations in your data -- plain language, not just numbers.')}
      ${ctaButton('Upload Your Next Night', `${BASE_URL}/analyze?utm_source=email&utm_medium=drip&utm_campaign=post_upload_2`)}
    `, unsubscribeUrl),
  };
}

export function postUploadStep3(unsubscribeUrl: string): { subject: string; html: string } {
  return {
    subject: 'The metric your clinician actually wants to see',
    html: layout(`
      ${heading('Numbers tell half the story')}
      ${paragraph('Two people with identical flow limitation scores can feel completely different. Your sensitivity to airway resistance, your arousal threshold, your REM patterns -- all of these factor in.')}
      ${paragraph('AirwayLab analyses your flow data. Symptom logging measures you. Together, they give your clinician something no AHI printout can: the full picture.')}
      ${paragraph('After each analysis, you can log how you slept on a simple scale. It takes 5 seconds, and it builds a picture of your personal sensitivity over time.')}
      ${ctaButton('Log How You Slept', `${BASE_URL}/analyze?utm_source=email&utm_medium=drip&utm_campaign=post_upload_3`)}
      ${paragraph('P.S. AI insights can connect your symptoms to your metrics -- highlighting correlations between your symptoms and metrics. Available with a <a href="' + BASE_URL + '/pricing?utm_source=email&utm_medium=drip&utm_campaign=post_upload_3_upgrade" style="color:#5eead4;text-decoration:underline;">Supporter subscription</a>.')}
    `, unsubscribeUrl),
  };
}

// ── Sequence 2: Dormancy Re-engagement ───────────────────────

export function dormancyStep1(unsubscribeUrl: string): { subject: string; html: string } {
  return {
    subject: 'How are your scores looking this month?',
    html: layout(`
      ${heading('One upload, one minute, one more data point')}
      ${paragraph('Sleep therapy is a long game. Night-to-night scores fluctuate -- that\'s normal. But monthly trends reveal how your scores have changed over time, whether they\'re gradually shifting, or if there are patterns that differ between sleep positions or stages.')}
      ${paragraph('Your clinician can\'t act on a single night. They need the trend line. Each upload adds to that picture:')}
      ${bulletList([
        'See how your flow limitation scores changed over time',
        'Track how your scores change over weeks and months',
        'Build an evidence trail for your next clinic visit',
      ])}
      ${ctaButton('Upload This Month\'s Data', `${BASE_URL}/analyze?utm_source=email&utm_medium=drip&utm_campaign=dormancy_1`)}
    `, unsubscribeUrl),
  };
}

export function dormancyStep2(unsubscribeUrl: string): { subject: string; html: string } {
  return {
    subject: 'Gaps in your data? That\'s normal.',
    html: layout(`
      ${heading('Every month of data makes the picture clearer')}
      ${paragraph('Tracking therapy isn\'t all-or-nothing. Even uploading once a month gives you and your clinician something to work with. If you\'ve had a break, that\'s fine -- AirwayLab compares whatever data you have, whenever you\'re ready.')}
      ${paragraph('If you\'ve moved on from tracking, no hard feelings. This is the last email in this sequence, and we won\'t send more unless you upload new data.')}
      ${ctaButton('Upload When You\'re Ready', `${BASE_URL}/analyze?utm_source=email&utm_medium=drip&utm_campaign=dormancy_2`)}
    `, unsubscribeUrl),
  };
}

export function dormancyStep3(unsubscribeUrl: string): { subject: string; html: string } {
  return {
    subject: 'Still here if you need us',
    html: layout(`
      ${heading('No pressure, no guilt')}
      ${paragraph('It\'s been a while. You might have settled into therapy, started working with a specialist, or simply moved on -- and that\'s completely fine.')}
      ${paragraph('AirwayLab is still free and private. Your data stays in your browser. Whenever you want a snapshot of how a recent night compared to the last time you tracked, it\'s here.')}
      ${paragraph('This is the last email in this sequence. We won\'t send more re-engagement emails unless you upload new data.')}
      ${ctaButton('Your data is ready when you are', `${BASE_URL}/analyze?utm_source=email&utm_medium=drip&utm_campaign=dormancy_3`)}
      ${paragraph('<em>AirwayLab is not a medical device. This email contains no health data. Your clinician can help interpret your results in the context of your care.</em>')}
    `, unsubscribeUrl),
  };
}

// ── Sequence 3: Feature Education ────────────────────────────

export function featureEducationStep1(unsubscribeUrl: string): { subject: string; html: string } {
  return {
    subject: 'Your metrics, explained in plain language',
    html: layout(`
      ${heading('Numbers are useful. Explanations are better.')}
      ${paragraph('AirwayLab\'s four engines give you detailed metrics -- Glasgow Index, FL Score, NED, RERA counts. But what do these scores look like across <em>your</em> data?')}
      ${paragraph('AI insights translate your metrics into plain-language explanations:')}
      ${bulletList([
        '"Your Glasgow Index of 2.4 -- your clinician can review what this score means in the context of your therapy."',
        '"Your RERA index of 6.2 is above the typical range. Your clinician can help interpret what this means alongside your symptoms."',
        '"Your clinician can help interpret what these patterns look like in your data."',
      ])}
      ${paragraph('Every analysis includes rule-based insights for free. <a href="' + BASE_URL + '/pricing?utm_source=email&utm_medium=drip&utm_campaign=feature_ed_1_upgrade" style="color:#5eead4;text-decoration:underline;">Supporters</a> unlock AI-powered analysis that references your specific pressure settings, compares your patterns to the research literature, and highlights findings to discuss with your clinician. Free users get 3 AI analyses per month to try it.')}
      ${ctaButton('Try AI Insights', `${BASE_URL}/analyze?utm_source=email&utm_medium=drip&utm_campaign=feature_ed_1`)}
    `, unsubscribeUrl),
  };
}

export function featureEducationStep2(unsubscribeUrl: string): { subject: string; html: string } {
  return {
    subject: 'Share your results with your clinician',
    html: layout(`
      ${heading('Objective data for your next appointment')}
      ${paragraph('Most sleep physicians see AHI and call it done. But you now have flow limitation scores, RERA estimates, and breath-by-breath analysis that provides additional detail beyond standard reports.')}
      ${paragraph('AirwayLab gives you three ways to share:')}
      ${bulletList([
        '<strong style="color:#fff;">PDF report</strong> -- professional format with metric cards, trends, and radar charts. Ready to print or email.',
        '<strong style="color:#fff;">CSV export</strong> -- 67-column dataset for detailed review or import into other tools.',
        '<strong style="color:#fff;">Forum post</strong> -- formatted for ApneaBoard or r/SleepApnea, with traffic-light indicators.',
      ])}
      ${paragraph('The more data you bring, the better the conversation. Objective data can complement your clinician\'s assessment.')}
      ${paragraph('For deeper analysis, <a href="' + BASE_URL + '/pricing?utm_source=email&utm_medium=drip&utm_campaign=feature_ed_2_upgrade" style="color:#5eead4;text-decoration:underline;">Supporters</a> get deeper AI analysis that identifies patterns across your data and settings. It\'s the difference between seeing the numbers and understanding what they show about your data patterns.')}
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
      ${paragraph('Within seconds, you\'ll see scores from four research-grade engines: flow limitation patterns that complement your machine\'s standard reports, breathing regularity, airway resistance, and arousal indicators. These metrics show aspects of your breathing that standard AHI doesn\'t measure.')}
      ${ctaButton('Upload Your SD Card', `${BASE_URL}/analyze?utm_source=email&utm_medium=drip&utm_campaign=activation_1`)}
      ${paragraph('Having trouble? Reply to this email and we\'ll help you get started.')}
    `, unsubscribeUrl),
  };
}

function activationStep2(unsubscribeUrl: string): { subject: string; html: string } {
  return {
    subject: 'What your CPAP data can tell you',
    html: layout(`
      ${heading('Before we talk about how to get your data in, here is what you will actually see when you do')}
      ${paragraph('Your CPAP records a lot more than the single number on the machine display. When you run an analysis, you get:')}
      ${bulletList([
        '<strong style="color:#fff;">Your Glasgow Index</strong> -- a single score that tracks how your therapy sessions compare over time, so you can spot trends without having to interpret raw numbers',
        '<strong style="color:#fff;">Nightly event breakdown</strong> -- AHI, flow limitations, snore events, and leak rates, laid out per session so you can see what changed and when',
        '<strong style="color:#fff;">Leak trend charts</strong> -- so you can see if your mask seal is holding consistently or drifting over time',
        '<strong style="color:#fff;">Pressure and timing data</strong> -- exactly what your device was doing and when',
      ])}
      ${paragraph('None of this is a diagnosis. It is your data, presented in a way that is actually readable -- and useful to bring to a conversation with your clinician.')}
      ${paragraph('Getting your data in is simpler than it sounds. Remove the SD card from your machine, plug it in, and drag the data folder onto the page. Everything runs in your browser. Your data never leaves your device.')}
      ${ctaButton('See what your data shows', `${BASE_URL}/analyze?utm_source=email&utm_medium=drip&utm_campaign=activation_2`)}
    `, unsubscribeUrl),
  };
}

function activationStep3(unsubscribeUrl: string): { subject: string; html: string } {
  return {
    subject: 'How one CPAP user gets more from their data',
    html: layout(`
      ${heading('We hear versions of this story often')}
      ${paragraph('Someone starts CPAP therapy, gets the basic numbers from their machine or app, and assumes that is all there is. The AHI looks okay. The machine says things are fine. But something still does not feel quite right, and there is no easy way to dig deeper with the summary they have been given.')}
      ${paragraph('Then they upload their data for the first time.')}
      ${paragraph('One community member described it like this:')}
      ${paragraph('<em style="color:#d4d4d8;">"I had been on CPAP for almost two years and figured I was doing fine. When I ran the analysis and looked at the full breakdown, I could see my leak rates were creeping up on certain nights -- the kind of pattern you would never notice from a single nightly score. I brought the chart to my next appointment and we looked at my mask fit together. It was genuinely useful to have something concrete to point at."</em>')}
      ${paragraph('That is not a medical outcome. It is just what happens when you can actually see your data instead of receiving a summary handed to you by the machine.')}
      ${paragraph('Your CPAP data contains that same level of detail. The analysis takes about 30 seconds. AirwayLab is free and always will be.')}
      ${ctaButton('See your full data breakdown', `${BASE_URL}/analyze?utm_source=email&utm_medium=drip&utm_campaign=activation_3`)}
    `, unsubscribeUrl),
  };
}

function activationStep4(unsubscribeUrl: string): { subject: string; html: string } {
  return {
    subject: 'Glasgow Index, trend charts, and what they show you',
    html: layout(`
      ${heading('A quick look at what you will find when you run your first analysis')}
      ${paragraph('<strong style="color:#fff;">Glasgow Index</strong>')}
      ${paragraph('The Glasgow Index is a single composite score calculated from your nightly CPAP session data. It gives you one number to track over time rather than juggling AHI, leak rate, and event counts separately. If something changes -- a new mask, a pressure adjustment, a different sleep position -- the direction of the trend shows up in the score.')}
      ${paragraph('<strong style="color:#fff;">Nightly trend charts</strong>')}
      ${paragraph('Every session is plotted so you can see patterns across days and weeks. AHI over time, leak rates, event distributions. These patterns are in your raw data already -- the charts make them visible at a glance.')}
      ${paragraph('<strong style="color:#fff;">Event breakdown</strong>')}
      ${paragraph('Per-session tables showing obstructive events, hypopneas, flow limitations, snore indices, and central events where your device records them. Useful context for understanding what your machine has been seeing, or for preparing for a conversation with your clinician.')}
      ${paragraph('<strong style="color:#fff;">AI-assisted pattern detection</strong>')}
      ${paragraph('AirwayLab can flag sessions that look different compared to your baseline -- not as a diagnosis, but as a prompt to look closer. You see the note alongside the raw data and decide whether it is relevant to you.')}
      ${paragraph('Everything runs in your browser. Nothing is stored on our servers.')}
      ${ctaButton('Run your analysis', `${BASE_URL}/analyze?utm_source=email&utm_medium=drip&utm_campaign=activation_4`)}
    `, unsubscribeUrl),
  };
}

function activationStep5(unsubscribeUrl: string): { subject: string; html: string } {
  return {
    subject: 'Your CPAP data is here whenever you are ready',
    html: layout(`
      ${heading('This is the last time we will reach out about getting started')}
      ${paragraph('If the timing has not been right, or this just has not been a priority -- that is completely fine. We are not going anywhere.')}
      ${paragraph('A few things worth knowing for whenever you do circle back:')}
      ${bulletList([
        'AirwayLab is free and always will be',
        'Your data never leaves your browser -- no account needed to run an analysis',
        'You can come back any time, even months from now',
      ])}
      ${paragraph('If you are ever curious about what your CPAP has been recording, the analyze page will be there.')}
      ${ctaButton('Your data is ready when you are', `${BASE_URL}/analyze?utm_source=email&utm_medium=drip&utm_campaign=activation_5`)}
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
      ${paragraph('It references your pressure settings and analyses your data in context with your current settings. Upload a night and see the difference.')}
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
      ${paragraph('The PDF report puts all of this in a format your clinician can read in 2 minutes -- metric cards, trend charts, and plain-language explanations. If your clinician needs more than AHI numbers, this report puts the full picture in front of them — flow limitation scores, RERA estimates, and AI-interpreted patterns to review.')}
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
      ${paragraph('If you have ideas for what features would be most useful to you, reply to this email -- I read everything personally.')}
      ${ctaButton('See the Roadmap', `${BASE_URL}/changelog?utm_source=email&utm_medium=drip&utm_campaign=premium_onboarding_3`)}
      ${paragraph('P.S. Your name is on the <a href="' + BASE_URL + '/supporters" style="color:#5eead4;text-decoration:underline;">supporters page</a> (unless you opted out in settings). Thank you.')}
    `, unsubscribeUrl),
  };
}

// ── Sequence 6: CPAP Tips (Days 3/7/12/18/25 post-signup) ────

export function cpapTipsStep1(unsubscribeUrl: string): { subject: string; html: string } {
  return {
    subject: 'Your first week on CPAP -- what\'s normal, what isn\'t',
    html: layout(`
      ${heading('Your first week on CPAP')}
      ${paragraph('If you\'re a few days into CPAP therapy, you might be staring at your numbers wondering if something is wrong.')}
      ${paragraph('Here\'s the honest answer: probably not. The first week is noisy. Your body is adjusting to sleeping with a mask, your mouth might be drying out, your AHI might look higher than you expected. The first 2--4 weeks are an adjustment period, and single-night numbers during this phase don\'t tell you much on their own.')}
      ${bulletList([
        '<strong style="color:#fff;">Mask leak</strong> -- common until you find the right fit and pressure. A small amount of leak is expected (intentional vent leak).',
        '<strong style="color:#fff;">Mouth breathing</strong> -- if your mouth falls open at night, you\'ll lose pressure and your AHI may spike.',
        '<strong style="color:#fff;">Aerophagia</strong> -- that bloated, gassy feeling from swallowing air. More common at higher pressures.',
        '<strong style="color:#fff;">Pressure discomfort</strong> -- feeling like you\'re fighting the machine to exhale.',
        '<strong style="color:#fff;">AHI fluctuating night to night</strong> -- common early on. Look for trends over a week or more.',
      ])}
      ${paragraph('Once you upload your SD card to AirwayLab, you\'ll see a session summary with AHI, leak rate, and usage hours. Even if your first few sessions look rough, that data is valuable.')}
      ${ctaButton('Upload Your First Session', `${BASE_URL}/analyze?utm_source=email&utm_medium=drip&utm_campaign=cpap_tips_1`)}
      ${paragraph('<em>This content is informational only. It is not medical advice. Discuss any concerns with your prescribing clinician or sleep specialist.</em>')}
    `, unsubscribeUrl),
  };
}

export function cpapTipsStep2(unsubscribeUrl: string): { subject: string; html: string } {
  return {
    subject: 'AHI, leak rate, usage hours -- what your CPAP data actually means',
    html: layout(`
      ${heading('What your CPAP data actually means')}
      ${paragraph('By now you\'ve got a week of sessions (hopefully). Let\'s talk about what you\'re actually looking at.')}
      ${paragraph('Most CPAP data apps give you three headline numbers: AHI, leak rate, and usage hours.')}
      ${bulletList([
        '<strong style="color:#fff;">AHI</strong> -- Apnea-Hypopnea Index. The number of breathing disruption events per hour of sleep. A lower AHI generally means fewer disruptions.',
        '<strong style="color:#fff;">Leak rate</strong> -- your mask has intentional vents that release CO2. High <em>unintentional</em> leak means your device can\'t maintain the pressure it needs.',
        '<strong style="color:#fff;">Usage hours</strong> -- how long you wore the mask. Consistency across the week matters as much as any single night.',
      ])}
      ${paragraph('In AirwayLab, you can see your leak rate alongside your AHI for a fuller picture of each night.')}
      ${ctaButton('Open Your Session Dashboard', `${BASE_URL}/analyze?utm_source=email&utm_medium=drip&utm_campaign=cpap_tips_2`)}
      ${paragraph('<em>This content is informational only. It is not medical advice. Discuss any concerns with your prescribing clinician or sleep specialist.</em>')}
    `, unsubscribeUrl),
  };
}

export function cpapTipsStep3(unsubscribeUrl: string): { subject: string; html: string } {
  return {
    subject: 'Low AHI and still tired? Here\'s what your data might be showing',
    html: layout(`
      ${heading('Low AHI and still tired?')}
      ${paragraph('Something a lot of CPAP users run into: AHI looks fine -- under 5, sometimes under 2 -- but they\'re still waking up exhausted.')}
      ${paragraph('If that\'s you, your data might be showing something that standard AHI doesn\'t capture.')}
      ${bulletList([
        '<strong style="color:#fff;">Flow limitation</strong> -- a pattern in the flow waveform that the standard AHI count does not include.',
        '<strong style="color:#fff;">RERAs</strong> (Respiratory Effort-Related Arousals) -- a type of breathing event that standard AHI does not count.',
      ])}
      ${paragraph('Alongside your AHI, AirwayLab surfaces a flow limitation score derived from your flow waveform data. You can see whether individual breaths show elevated flow limitation scores, even on nights when your AHI looks clean.')}
      ${paragraph('This isn\'t a diagnosis. It\'s a pattern in your data. Your clinician can help interpret these findings in context.')}
      ${ctaButton('Check Your Flow Limitation Score', `${BASE_URL}/analyze?utm_source=email&utm_medium=drip&utm_campaign=cpap_tips_3`)}
      ${paragraph('<em>This content is informational only. It is not medical advice. Discuss any concerns with your prescribing clinician or sleep specialist.</em>')}
    `, unsubscribeUrl),
  };
}

export function cpapTipsStep4(unsubscribeUrl: string): { subject: string; html: string } {
  return {
    subject: 'Five things you can do in AirwayLab right now',
    html: layout(`
      ${heading('Five things worth trying in AirwayLab')}
      ${paragraph('You\'ve been using AirwayLab for a few weeks. Here are five things that are worth trying if you haven\'t already.')}
      ${bulletList([
        '<strong style="color:#fff;">Compare two sessions side by side</strong> -- pick any two nights and compare AHI, leak, flow limitation, and breath shape in a single screen.',
        '<strong style="color:#fff;">Look at your trend charts</strong> -- the trend view shows your AHI, leak rate, and usage hours over 30 or 90 days. Trends are where the signal is.',
        '<strong style="color:#fff;">Explore the breath shape visualisation</strong> -- see the actual shape of individual breaths from your flow waveform data.',
        '<strong style="color:#fff;">Export a summary for your clinician</strong> -- generate a session summary with your key metrics and trends before your next appointment.',
        '<strong style="color:#fff;">Everything above is free, and always will be</strong> -- all features run entirely in your browser. Your data stays on your device.',
      ])}
      ${ctaButton('Try Session Comparison', `${BASE_URL}/analyze?utm_source=email&utm_medium=drip&utm_campaign=cpap_tips_4`)}
      ${paragraph('<em>This content is informational only. It is not medical advice. Discuss any concerns with your prescribing clinician or sleep specialist.</em>')}
    `, unsubscribeUrl),
  };
}

export function cpapTipsStep5(unsubscribeUrl: string): { subject: string; html: string } {
  return {
    subject: 'Three weeks in -- how to make the most of your sleep clinic visit',
    html: layout(`
      ${heading('Three weeks of data for your clinician')}
      ${paragraph('Three weeks of data is genuinely useful. If you have a sleep clinic visit coming up -- or if you\'re due to schedule one -- here\'s how to make the most of it.')}
      ${paragraph('By now you can see trends rather than noise: whether your AHI has been stable, decreasing, or increasing; whether your leak rate has been consistently low or intermittently high.')}
      ${paragraph('Before your appointment, spend five minutes with the trend view in AirwayLab. Any patterns you notice are worth mentioning. You don\'t need to interpret them -- that\'s your clinician\'s job. You just need to be able to show the data.')}
      ${paragraph('AirwayLab can export a session summary with your key metrics and trends. It\'s designed to be readable by a sleep specialist, not just a CPAP enthusiast.')}
      ${paragraph('We\'re a tool for informed conversations -- not a substitute for clinical review. That\'s what we\'re here for.')}
      ${ctaButton('Generate a Session Summary', `${BASE_URL}/analyze?utm_source=email&utm_medium=drip&utm_campaign=cpap_tips_5`)}
      ${paragraph('<em>This content is informational only. It is not medical advice. Discuss any concerns with your prescribing clinician or sleep specialist.</em>')}
    `, unsubscribeUrl),
  };
}


/**
 * Extended layout for re-engagement emails that includes a physical address
 * footer to satisfy CAN-SPAM Act requirements (16 CFR Part 316).
 */
function reEngagementLayout(content: string, unsubscribeUrl: string): string {
  const physicalAddress = process.env.SENDER_PHYSICAL_ADDRESS ?? 'AirwayLab';
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
      <p style="font-size:10px;color:#52525b;line-height:1.5;margin:12px 0 0 0;">
        AirwayLab is not a medical device. This email contains data summaries for informational purposes. Your clinician can help interpret these findings in the context of your care.
      </p>
      <p style="font-size:10px;color:#52525b;line-height:1.5;margin:8px 0 0 0;">
        AirwayLab &middot; ${physicalAddress}
      </p>
    </div>
  </div>
</body>
</html>`;
}

export function reEngagementStep1(
  unsubscribeUrl: string,
  firstName?: string | null,
  lastUploadDate?: string | null,
): { subject: string; html: string } {
  const greeting = firstName ? `${paragraph(`Hey ${firstName},`)}` : '';
  const uploadDate = lastUploadDate ?? '';
  const subject = uploadDate
    ? `Your CPAP data from ${uploadDate} is still here`
    : 'Your CPAP data is still here';
  return {
    subject,
    html: reEngagementLayout(`
      ${greeting}
      ${paragraph('Pick up where you left off -- one more upload starts to show how your numbers change over time.')}
      ${paragraph(`Your CPAP data from ${uploadDate} is still in your dashboard, ready to be part of something more useful.`)}
      ${paragraph('One upload gives you a snapshot. Two uploads start to show how your numbers change over time.')}
      ${paragraph('If your therapy settings have changed, or you have had a week that felt different, your data can help you describe exactly what happened -- in numbers you can actually bring up with your clinician.')}
      ${paragraph('Your browser does the analysis. Your data never leaves your device. And it is free and always will be.')}
      ${paragraph('Ready to see how things have moved?')}
      ${ctaButton('Upload your latest data', `${BASE_URL}/analyze?utm_source=email&utm_medium=drip&utm_campaign=re_engagement_1`)}
    `, unsubscribeUrl),
  };
}

export function reEngagementStep2(
  unsubscribeUrl: string,
  firstName?: string | null,
  lastUploadDate?: string | null,
): { subject: string; html: string } {
  const greeting = firstName ? `${paragraph(`Hey ${firstName},`)}` : '';
  const uploadDate = lastUploadDate ?? '';
  return {
    subject: 'What consistent CPAP tracking looks like (from people doing it)',
    html: reEngagementLayout(`
      ${greeting}
      ${paragraph('A lot of AirwayLab users start with one upload -- just to see what their data looks like. The ones who keep coming back tend to say the same thing: the second and third uploads are where it gets interesting.')}
      ${paragraph('Not because anything dramatic happens, but because you start to see your own baseline. You notice how one week compares to another. You have something concrete to bring to your next appointment.')}
      ${paragraph('None of that requires a premium account. Just your data, your browser, and a few minutes every couple of weeks.')}
      ${paragraph(`Your analysis from ${uploadDate} is already there. It is waiting for something to compare against.`)}
      ${ctaButton('Upload your latest data', `${BASE_URL}/analyze?utm_source=email&utm_medium=drip&utm_campaign=re_engagement_2`)}
    `, unsubscribeUrl),
  };
}

export function reEngagementStep3(
  unsubscribeUrl: string,
  firstName?: string | null,
  lastUploadDate?: string | null,
): { subject: string; html: string } {
  const greeting = firstName ? `${paragraph(`Hey ${firstName},`)}` : '';
  // lastUploadDate unused in step 3 body but kept for signature consistency
  void lastUploadDate;
  return {
    subject: `One last note${firstName ? ', ' + firstName : ''}`,
    html: reEngagementLayout(`
      ${greeting}
      ${paragraph('This is the last time we will reach out about your sleep data.')}
      ${paragraph('You uploaded once, so you already know what AirwayLab does. If it did not click for you, that is completely fine.')}
      ${paragraph('If life just got in the way, we will be here. Your previous analysis is still saved. Uploading a new file takes about 30 seconds, your data stays in your browser, and it is free and always will be.')}
      ${paragraph('If you want to pick it up again:')}
      ${ctaButton('Head to your dashboard', `${BASE_URL}/analyze?utm_source=email&utm_medium=drip&utm_campaign=re_engagement_3`)}
      ${paragraph('After this, we will stop nudging you about uploads. You can always come back on your own terms -- AirwayLab is not going anywhere.')}
    `, unsubscribeUrl),
  };
}

// ── Template registry ────────────────────────────────────────

export type SequenceName = 'post_upload' | 'dormancy' | 'feature_education' | 'activation' | 'premium_onboarding' | 'cpap_tips' | 're_engagement';

interface SequenceConfig {
  totalSteps: number;
  /** Delay in days from sequence start for each step */
  delays: number[];
  getTemplate: (step: number, unsubscribeUrl: string, data?: Record<string, string>) => { subject: string; html: string } | null;
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
    totalSteps: 3,
    delays: [0, 14, 31],
    getTemplate: (step, url) => {
      if (step === 1) return dormancyStep1(url);
      if (step === 2) return dormancyStep2(url);
      if (step === 3) return dormancyStep3(url);
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
    totalSteps: 5,
    // delays are from sequence start (sequence is scheduled ~48h after signup)
    // Email 1: day 2, Email 2: day 5, Email 3: day 8, Email 4: day 12, Email 5: day 16
    delays: [0, 3, 6, 10, 14],
    getTemplate: (step, url) => {
      if (step === 1) return activationStep1(url);
      if (step === 2) return activationStep2(url);
      if (step === 3) return activationStep3(url);
      if (step === 4) return activationStep4(url);
      if (step === 5) return activationStep5(url);
      return null;
    },
  },
  premium_onboarding: {
    totalSteps: 3,
    delays: [0, 3, 7],
    getTemplate: (step, url) => {
      if (step === 1) return premiumOnboardingStep1(url);
      if (step === 2) return premiumOnboardingStep2(url);
      if (step === 3) return premiumOnboardingStep3(url);
      return null;
    },
  },
  cpap_tips: {
    totalSteps: 5,
    delays: [3, 7, 12, 18, 25], // days after welcome sequence completes (~days 10/14/19/25/32 from signup)
    getTemplate: (step, url) => {
      if (step === 1) return cpapTipsStep1(url);
      if (step === 2) return cpapTipsStep2(url);
      if (step === 3) return cpapTipsStep3(url);
      if (step === 4) return cpapTipsStep4(url);
      if (step === 5) return cpapTipsStep5(url);
      return null;
    },
  },

  re_engagement: {
    totalSteps: 3,
    delays: [0, 7, 16], // from sequence schedule point (which is at day 14 post-upload)
    getTemplate: (step, url, data) => {
      const firstName = data?.first_name ?? null;
      const lastUploadDate = data?.last_upload_date ?? null;
      if (step === 1) return reEngagementStep1(url, firstName, lastUploadDate);
      if (step === 2) return reEngagementStep2(url, firstName, lastUploadDate);
      if (step === 3) return reEngagementStep3(url, firstName, lastUploadDate);
      return null;
    },
  },
};
