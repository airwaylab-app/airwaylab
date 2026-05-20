import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle,
  HelpCircle,
  Info,
  TrendingUp,
} from 'lucide-react';

export default function GoodAHIOnCPAP() {
  return (
    <article>
      <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
        If you&apos;ve just loaded your CPAP data and you&apos;re staring at your AHI number,
        you&apos;re probably asking the same question thousands of other CPAP users ask every week:
        is this good? Should it be lower? Why isn&apos;t it lower?
      </p>

      <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
        &quot;What is a good AHI on CPAP?&quot; is one of the most-searched questions in CPAP
        communities — and for good reason. AHI is the number your machine tracks most prominently,
        and it&apos;s the closest thing to a score that summarises your therapy data at a glance.
        But interpreting it requires context, and that context is what this article covers.
      </p>

      <div className="mt-6 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">Medical disclaimer:</strong> AirwayLab is a
          data-visualization tool, not a medical device. Nothing in this article constitutes medical
          advice, diagnosis, or treatment. Always discuss your therapy data and any concerns with
          your sleep physician or qualified clinician.
        </p>
      </div>

      {/* What is AHI */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Info className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">What is AHI?</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            AHI stands for <strong className="text-foreground">Apnea-Hypopnea Index</strong> — the
            count of apneas (complete breathing pauses) and hypopneas (partial obstructions) per
            hour of sleep.
          </p>
          <p>
            Your AHI before treatment — from your diagnostic sleep study — is what led to your CPAP
            prescription. Your <strong className="text-foreground">residual AHI</strong>, sometimes
            called treatment AHI, is the figure recorded by your CPAP machine while you&apos;re on
            therapy. It reflects how many qualifying events occur per hour even with the machine
            running.
          </p>
          <p>
            Most CPAP and APAP devices record this automatically. With data from your SD card,
            tools like AirwayLab display your residual AHI night by night so you can review trends
            over weeks and months.
          </p>
        </div>
      </section>

      {/* What AHI is normal */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <BarChart3 className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            What AHI is considered &quot;normal&quot; on CPAP therapy?
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            There is no single universally mandated target — your clinician sets the goal
            appropriate to your situation. That said, the sleep medicine field uses established
            thresholds:
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="py-2 pr-4 text-left font-semibold text-foreground">
                    AHI (events/hour)
                  </th>
                  <th className="py-2 text-left font-semibold text-foreground">
                    Common classification
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                <tr>
                  <td className="py-2 pr-4 text-foreground">&lt; 5</td>
                  <td className="py-2 text-muted-foreground">Within normal range</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 text-foreground">5–14</td>
                  <td className="py-2 text-muted-foreground">Mild</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 text-foreground">15–29</td>
                  <td className="py-2 text-muted-foreground">Moderate</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 text-foreground">≥ 30</td>
                  <td className="py-2 text-muted-foreground">Severe</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p>
            These classifications come from American Academy of Sleep Medicine (AASM) guidance and
            are most commonly applied in diagnostic contexts. For therapy monitoring,{' '}
            <strong className="text-foreground">
              many sleep specialists consider a residual AHI below 5 a reasonable treatment
              benchmark.
            </strong>{' '}
            Some clinicians aim for below 2 — particularly where certain conditions are present —
            but your sleep physician is best placed to establish a specific target for you.
          </p>
          <p>
            On therapy, residual AHI is generally expected to be substantially lower than the AHI
            recorded during your diagnostic sleep study. What constitutes adequate reduction depends
            on individual clinical context.
          </p>

          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
            <p className="text-sm text-muted-foreground">
              AirwayLab shows you your residual AHI data as recorded by your device. What that
              number means for your specific health situation is a question for your sleep physician.
            </p>
          </div>
        </div>
      </section>

      {/* Why residual AHI might still be high */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <AlertTriangle className="h-5 w-5 text-amber-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            Why might residual AHI still be high on CPAP?
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            A residual AHI above the typical threshold doesn&apos;t always mean nothing can be
            done. Several common factors can contribute — and all are worth raising with your
            clinician.
          </p>

          <div className="space-y-3">
            <div className="rounded-xl border border-border/50 p-5">
              <p className="font-semibold text-foreground">Mask fit and seal</p>
              <p className="mt-2 text-sm text-muted-foreground">
                A mask that leaks air can reduce the effectiveness of delivered pressure. Most CPAP
                machines log total leak rate alongside AHI. If your leak data shows elevated or
                variable leak on the same nights your AHI is high, that&apos;s a useful data point
                to bring to your next appointment.
              </p>
            </div>

            <div className="rounded-xl border border-border/50 p-5">
              <p className="font-semibold text-foreground">Pressure delivery</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Fixed-pressure CPAP delivers the same pressure all night. Auto-titrating CPAP
                (APAP) adjusts within a clinician-set range. If the pressure range isn&apos;t
                matched to your nightly needs — which can vary with sleep position, nasal
                congestion, alcohol, or weight changes — some events may not be prevented.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Whether any pressure adjustment is appropriate is a clinical decision. Your sleep
                physician or respiratory therapist can review your full therapy data and advise
                accordingly. AirwayLab does not recommend or suggest pressure changes.
              </p>
            </div>

            <div className="rounded-xl border border-border/50 p-5">
              <p className="font-semibold text-foreground">Sleep position</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Back-sleeping (supine position) is associated with increased airway narrowing in
                many people. If you notice higher AHI on specific nights, and your machine records
                positional data, this is worth discussing with your clinician.
              </p>
            </div>

            <div className="rounded-xl border border-border/50 p-5">
              <p className="font-semibold text-foreground">Mask interface type</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Different mask styles (nasal pillow, nasal, full-face) interact differently with
                airway mechanics and leak patterns. If your data shows a consistent pattern across
                nights, a different mask type may be something to discuss with your provider.
              </p>
            </div>

            <div className="rounded-xl border border-border/50 p-5">
              <p className="font-semibold text-foreground">Central versus obstructive events</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Not all events counted in your AHI have the same origin. Some residual events may
                be central in nature — originating in the respiratory control system rather than
                upper airway obstruction — and respond differently to CPAP therapy. Identifying the
                nature of events requires clinical assessment.
              </p>
            </div>

            <div className="rounded-xl border border-border/50 p-5">
              <p className="font-semibold text-foreground">Alcohol, sedatives, and congestion</p>
              <p className="mt-2 text-sm text-muted-foreground">
                These factors can temporarily increase airway collapsibility. If your data shows
                isolated spikes, lifestyle context may be relevant to note when you discuss the
                data with your clinician.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Flow limitations and RERAs */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <TrendingUp className="h-5 w-5 text-purple-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            AHI doesn&apos;t tell the whole story: flow limitations and RERAs
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            AHI counts complete apneas and hypopneas, but it doesn&apos;t capture everything that
            can affect sleep quality.{' '}
            <strong className="text-foreground">Flow limitations</strong> — partial reductions in
            airflow that don&apos;t meet the threshold for a hypopnea — and{' '}
            <strong className="text-foreground">RERAs</strong> (Respiratory Effort-Related
            Arousals) can disrupt sleep continuity even when AHI appears low.
          </p>
          <p>
            Some CPAP devices, particularly certain ResMed models, record detailed flow waveform
            data. AirwayLab can visualise flow limitation patterns alongside AHI where your device
            supports it, giving you additional data to bring to clinical appointments.
          </p>
          <p>
            A night with an AHI of 2 and frequent flow limitation events may warrant a different
            conversation than a night with an AHI of 2 and clean waveforms. Your sleep physician
            can help you interpret what these patterns mean in your case.
          </p>
          <div className="flex gap-3 rounded-xl border border-purple-500/20 bg-purple-500/5 p-4">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-purple-400" />
            <p className="text-sm text-muted-foreground">
              Learn more:{' '}
              <Link href="/blog/low-ahi-still-tired-flow-limitation-reras" className="text-primary hover:text-primary/80">
                Low AHI but still tired? Flow limitation and RERAs may be why.
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* When to contact your sleep physician */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <CheckCircle className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            When to contact your sleep physician
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Bring your therapy data to your clinician if any of the following apply:
          </p>
          <ul className="ml-4 list-disc space-y-2 text-sm text-muted-foreground sm:text-base">
            <li>
              Your residual AHI consistently reads above 5 across multiple weeks of data
            </li>
            <li>
              You&apos;re still experiencing symptoms — fatigue, unrefreshing sleep, morning
              headaches — despite apparently normal AHI readings
            </li>
            <li>Your data shows high leak on most nights</li>
            <li>
              You notice a sudden change in your AHI trend without an obvious explanation
            </li>
            <li>
              Your AHI was previously stable and has risen over recent weeks or months
            </li>
          </ul>
          <p>
            This list isn&apos;t exhaustive. If something in your data concerns you, that&apos;s
            reason enough to raise it. Your sleep physician or respiratory therapist is the right
            person to review your therapy in full clinical context.
          </p>
        </div>
      </section>

      {/* How AirwayLab helps */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Activity className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold sm:text-2xl">How AirwayLab helps you track AHI over time</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            A single night&apos;s AHI is a data point. Tracked across weeks and months, it becomes
            a pattern — and patterns are what help you and your clinician have informed
            conversations.
          </p>
          <p>
            AirwayLab reads your CPAP machine&apos;s SD card data directly in your browser. Your
            data never leaves your device. It renders your AHI, leak rate, pressure, and flow
            waveforms as an interactive timeline so you can:
          </p>
          <div className="space-y-3">
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">Night-by-night AHI trends</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Review AHI with trend lines across any date range. Patterns across weeks are easier
                to spot in a chart than in your device&apos;s rolling 7-day average.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">Leak and AHI correlation</p>
              <p className="mt-2 text-sm text-muted-foreground">
                See which nights had elevated leak alongside elevated AHI — a useful data point
                when discussing mask fit with your provider.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">Pressure data for APAP users</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Review session-level pressure ranges and percentile data across your nights.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">Flow limitation visualisation</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Where your device supports it, AirwayLab visualises flow limitation patterns
                alongside AHI — additional data to bring to clinical appointments.
              </p>
            </div>
          </div>
          <p>
            This is the data your clinician may ask you to bring to appointments. Having it
            organised in one place — without uploading it to a cloud server — makes those
            conversations easier.
          </p>
          <p>
            AirwayLab is free and always will be. The source code is GPL-3.0 licensed and publicly
            auditable. If you&apos;re also using OSCAR, AirwayLab works alongside it — the two
            tools serve different viewing needs and neither replaces the other.
          </p>
        </div>
      </section>

      {/* Inline CTA */}
      <section className="mt-10 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
        <h3 className="text-lg font-bold">Track Your Nightly AHI from Your CPAP SD Card</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          AirwayLab tracks your nightly AHI automatically from your CPAP SD card — see your trends
          over weeks and months. Free, browser-based, and your data never leaves your device.
        </p>
        <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/analyze"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow transition-colors hover:bg-primary/90"
          >
            Analyse Your CPAP Data <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/blog/what-does-cpap-ahi-mean"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Read: What Does My AHI Number Mean?
          </Link>
        </div>
      </section>

      {/* Summary */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <CheckCircle className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Summary</h2>
        </div>
        <ul className="mt-4 ml-4 list-disc space-y-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <li>
            Many sleep specialists consider a residual AHI below 5 a common treatment benchmark,
            but your clinician determines what&apos;s appropriate for your situation
          </li>
          <li>
            Factors that can contribute to elevated residual AHI include mask fit, pressure
            delivery, sleep position, and event type — all worth discussing with your provider
          </li>
          <li>
            AHI alone doesn&apos;t capture flow limitations and RERAs, which are also relevant to
            overall sleep quality
          </li>
          <li>
            If your AHI stays consistently elevated or you remain symptomatic, contact your sleep
            physician
          </li>
          <li>
            AirwayLab lets you track your nightly AHI trends privately from your SD card, with no
            cloud upload required
          </li>
        </ul>
      </section>

      {/* FAQ */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <HelpCircle className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Frequently Asked Questions</h2>
        </div>
        <div className="mt-4 space-y-4">
          {[
            {
              q: 'What AHI is considered good on CPAP?',
              a: 'Many sleep specialists use a residual AHI below 5 as a common benchmark for CPAP therapy. The right target for you depends on your individual situation — your sleep physician can advise.',
            },
            {
              q: 'Why is my AHI still high on CPAP?',
              a: 'Common contributing factors include mask leak, pressure settings, sleep position, and the type of events occurring. A clinician can review your full therapy data and advise on next steps.',
            },
            {
              q: 'Is an AHI of 2 good on CPAP?',
              a: 'An AHI below 5 falls within the range many clinicians consider typical on therapy. Whether it\'s optimal for your specific situation is something your sleep physician can assess in context.',
            },
            {
              q: 'What is residual AHI?',
              a: 'Residual AHI is the Apnea-Hypopnea Index recorded by your CPAP device while you\'re on therapy — as distinct from your diagnostic AHI measured during your pre-treatment sleep study.',
            },
            {
              q: 'Can CPAP make AHI worse?',
              a: 'In some cases, pressure settings that don\'t match your needs may result in certain event types. Your sleep physician or respiratory therapist can review your data and determine whether any clinical adjustments are warranted.',
            },
          ].map(({ q, a }) => (
            <div key={q} className="rounded-xl border border-border/50 p-5">
              <p className="text-sm font-semibold text-foreground">{q}</p>
              <p className="mt-2 text-sm text-muted-foreground">{a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Related reading */}
      <section className="mt-8 border-t border-border/30 pt-6">
        <p className="mb-2 text-xs font-semibold text-foreground">Related reading</p>
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>
            <Link href="/blog/what-does-cpap-ahi-mean" className="text-primary hover:text-primary/80">
              What Does My CPAP AHI Number Mean?
            </Link>{' '}
            — a plain-language guide to the metric at the centre of your report.
          </p>
          <p>
            <Link href="/blog/low-ahi-still-tired-flow-limitation-reras" className="text-primary hover:text-primary/80">
              Low AHI but Still Tired?
            </Link>{' '}
            — why flow limitations and RERAs can matter even when AHI looks normal.
          </p>
          <p>
            <Link href="/blog/what-are-reras-sleep-apnea" className="text-primary hover:text-primary/80">
              What Are RERAs?
            </Link>{' '}
            — the breathing events your compliance report doesn&apos;t count.
          </p>
          <p>
            <Link href="/blog/ahi-vs-rdi-sleep-apnea" className="text-primary hover:text-primary/80">
              AHI vs RDI: What&apos;s the Difference?
            </Link>{' '}
            — understanding how the two indices are calculated and what each captures.
          </p>
        </div>
      </section>

      {/* Bottom disclaimer */}
      <p className="mt-8 text-xs italic text-muted-foreground/60">
        AirwayLab is a data-visualization tool, not a medical device. The metrics described in this
        article are data recorded by your CPAP device. Nothing on this page constitutes medical
        advice, diagnosis, or treatment — always discuss your therapy data and any concerns with
        your sleep physician or qualified clinician.
      </p>
    </article>
  );
}
