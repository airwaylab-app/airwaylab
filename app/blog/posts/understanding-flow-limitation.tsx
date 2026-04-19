import Link from 'next/link';
import { Wind, AlertTriangle, Waves, Search, BarChart3, BookOpen, ArrowRight } from 'lucide-react';

export default function UnderstandingFlowLimitationPost() {
  return (
    <article>
      <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
        Your PAP machine shows AHI: 0.8. The app gives you a thumbs up. But you still drag
        yourself out of bed feeling like you barely slept. If this sounds familiar, you&apos;re
        not alone &mdash; and the answer might be hiding in something called{' '}
        <strong className="text-foreground">flow limitation</strong>.
      </p>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
        Flow limitation is a partial narrowing of your upper airway that changes the shape of
        each breath without fully blocking airflow. It happens below the thresholds your machine
        uses to score events. That means your data contains evidence of it, but the summary
        screen never shows it.
      </p>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
        This guide explains what cpap flow limitation is, how it differs from the events your
        machine does count, and how tools like AirwayLab can make it visible in your own
        breathing data.
      </p>

      {/* What Is Flow Limitation? */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Wind className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">What Is Flow Limitation?</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            During normal breathing, air flows through your upper airway in a smooth, rounded
            wave &mdash; in and out, symmetrical. When your airway starts to narrow, the shape of
            that waveform changes. Instead of a smooth curve, the top flattens out, as if someone
            pressed down on a garden hose without fully stepping on it.
          </p>
          <p>
            That flattened waveform is <strong className="text-foreground">flow limitation</strong>.
            Air still moves, but it&apos;s restricted. Your body has to work harder to pull the same
            volume of air through a narrower passage.
          </p>
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-5">
            <p className="text-sm font-medium text-blue-400">Think of it like breathing through a straw</p>
            <p className="mt-1 text-sm text-muted-foreground">
              With a normal-sized straw, breathing is easy. Now imagine switching to a cocktail
              straw. Air still flows, but every breath requires more effort. You&apos;d notice it
              quickly while awake. During sleep, your conscious awareness is off &mdash; but your
              nervous system still responds to the extra work, often with micro-arousals that
              fragment your sleep architecture without you ever knowing.
            </p>
          </div>
          <p>
            The clinical literature calls this{' '}
            <strong className="text-foreground">inspiratory flow limitation (IFL)</strong>, and
            it&apos;s the underlying mechanism behind{' '}
            <Link href="/glossary/rera" className="text-primary hover:text-primary/80">
              Respiratory Effort-Related Arousals (RERAs)
            </Link>{' '}
            and Upper Airway Resistance Syndrome (UARS).
          </p>
        </div>
      </section>

      {/* How Flow Limitation Differs */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <AlertTriangle className="h-5 w-5 text-amber-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            How Flow Limitation Differs from Apneas and Hypopneas
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Your PAP machine reports three types of events that make up the Apnea-Hypopnea Index:
          </p>
          <ul className="ml-4 space-y-2">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
              <span>
                <strong className="text-foreground">Apnea:</strong> Complete cessation of airflow
                for at least 10 seconds. The airway fully collapses.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
              <span>
                <strong className="text-foreground">Hypopnea:</strong> Airflow drops by 30% or
                more for at least 10 seconds, typically accompanied by an oxygen desaturation of
                3-4%.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
              <span>
                <strong className="text-foreground">AHI:</strong> The combined count of apneas
                and hypopneas per hour of recorded time.
              </span>
            </li>
          </ul>
          <p>
            Flow limitation is fundamentally different. It&apos;s a{' '}
            <strong className="text-foreground">partial narrowing</strong> that restricts airflow
            without meeting the duration or severity thresholds that define scored events.
          </p>

          {/* Comparison table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="pb-2 pr-4 text-left font-semibold text-foreground" />
                  <th className="pb-2 pr-4 text-left font-semibold text-foreground">Apnea</th>
                  <th className="pb-2 pr-4 text-left font-semibold text-foreground">Hypopnea</th>
                  <th className="pb-2 text-left font-semibold text-foreground">Flow Limitation</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                <tr className="border-b border-border/30">
                  <td className="py-2 pr-4 font-medium text-foreground">Airflow reduction</td>
                  <td className="py-2 pr-4">100% (complete stop)</td>
                  <td className="py-2 pr-4">&ge;30%</td>
                  <td className="py-2">Partial (variable)</td>
                </tr>
                <tr className="border-b border-border/30">
                  <td className="py-2 pr-4 font-medium text-foreground">Minimum duration</td>
                  <td className="py-2 pr-4">10 seconds</td>
                  <td className="py-2 pr-4">10 seconds</td>
                  <td className="py-2">No minimum</td>
                </tr>
                <tr className="border-b border-border/30">
                  <td className="py-2 pr-4 font-medium text-foreground">O&#8322; desaturation</td>
                  <td className="py-2 pr-4">Often present</td>
                  <td className="py-2 pr-4">Usually required (3-4%)</td>
                  <td className="py-2">Typically absent</td>
                </tr>
                <tr className="border-b border-border/30">
                  <td className="py-2 pr-4 font-medium text-foreground">Counted by AHI</td>
                  <td className="py-2 pr-4">Yes</td>
                  <td className="py-2 pr-4">Yes</td>
                  <td className="py-2 font-semibold text-amber-400">No</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium text-foreground">Detection method</td>
                  <td className="py-2 pr-4">Threshold-based</td>
                  <td className="py-2 pr-4">Threshold-based</td>
                  <td className="py-2 font-semibold text-blue-400">Breath shape analysis</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p>
            A person can have hundreds of flow-limited breaths per hour while maintaining an AHI
            of zero. Research from the Sleep Heart Health Study and others has shown that this
            pattern &mdash; low AHI with significant flow limitation &mdash; is associated with
            daytime sleepiness, unrefreshing sleep, and cognitive difficulties that mirror
            untreated sleep apnea.
          </p>
          <p>
            This is why cpap flow limitation matters: your machine&apos;s headline number may tell
            you therapy looks adequate, while the underlying data tells a more nuanced story.
          </p>
        </div>
      </section>

      {/* Why Your Machine Doesn't Report It */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Search className="h-5 w-5 text-rose-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            Why Your Machine Doesn&apos;t Report It
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            PAP machines from ResMed and other manufacturers record detailed breath-by-breath
            flow waveforms on the SD card. This data contains everything needed to detect flow
            limitation patterns. But the machine&apos;s built-in reporting doesn&apos;t surface it.
          </p>
          <p>
            There are practical reasons for this. Flow limitation scoring requires{' '}
            <strong className="text-foreground">breath shape analysis</strong> &mdash; examining
            the contour of each inspiratory waveform for flattening, skewing, and other distortion
            patterns. The AHI algorithm uses simpler threshold logic: did airflow drop by X% for
            Y seconds? Flow limitation is a shape problem, not a threshold problem.
          </p>
          <p>
            Some machines do flag flow limitation events internally, but these flags don&apos;t
            appear in the companion app or on the summary screen you check each morning. They&apos;re
            stored in the detailed EDF data files on the SD card, accessible only through
            third-party analysis software.
          </p>
        </div>
      </section>

      {/* Glasgow Index and NED */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Waves className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            Glasgow Index and NED: Making Flow Limitation Measurable
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Two key approaches have emerged from clinical research for quantifying cpap flow
            limitation from waveform data:
          </p>

          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
              <p className="text-sm font-semibold text-emerald-400">
                <Link href="/glossary/glasgow-index" className="hover:text-emerald-300">
                  Glasgow Index
                </Link>
              </p>
              <div className="mt-2 space-y-2 text-sm text-muted-foreground">
                <p>
                  Developed by researchers at the University of Glasgow, this index examines the
                  shape of each inspiratory breath and scores it across{' '}
                  <strong className="text-foreground">nine components</strong>. Each component
                  captures a different aspect of waveform distortion:
                </p>
                <ul className="ml-4 space-y-1">
                  <li className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                    <span>
                      <strong className="text-foreground">Flatness:</strong> Is the top of the
                      breath waveform flattened, indicating resistance?
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                    <span>
                      <strong className="text-foreground">Skewness:</strong> Is the peak flow
                      shifted earlier in the breath, suggesting increased effort?
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                    <span>
                      <strong className="text-foreground">Multi-peak patterns:</strong> Does the
                      waveform show multiple peaks, a sign of airway instability?
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                    <span>
                      <strong className="text-foreground">Amplitude variability:</strong> How much
                      does breath size vary across sequences of breaths?
                    </span>
                  </li>
                </ul>
                <p>
                  Each component scores between 0 and 1, and the overall Glasgow Index ranges from{' '}
                  <strong className="text-foreground">0 to 9</strong>. Higher scores indicate more
                  breath shape distortion consistent with flow limitation. You can track this across
                  weeks to see whether your breathing patterns are stable, improving, or elevated.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-5">
              <p className="text-sm font-semibold text-blue-400">
                <Link href="/glossary/ned-mean" className="hover:text-blue-300">
                  NED (Negative Effort Dependence)
                </Link>
              </p>
              <div className="mt-2 space-y-2 text-sm text-muted-foreground">
                <p>
                  NED measures something specific: whether increasing breathing effort actually{' '}
                  <strong className="text-foreground">decreases</strong> airflow. In a healthy,
                  open airway, breathing harder produces more airflow. In a flow-limited airway,
                  the relationship reverses &mdash; your airway narrows further under the increased
                  negative pressure of harder inhalation.
                </p>
                <p>
                  This paradoxical response is a hallmark of upper airway narrowing. Elevated NED
                  values in your data indicate breaths where effort and airflow moved in opposite
                  directions &mdash; a direct sign of obstruction that wouldn&apos;t appear in any
                  event count.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border/50 p-5">
              <p className="text-sm font-semibold text-foreground">Estimated RERAs</p>
              <div className="mt-2 space-y-2 text-sm text-muted-foreground">
                <p>
                  By combining flow shape analysis with patterns of breathing effort and waveform
                  recovery, it&apos;s possible to estimate where Respiratory Effort-Related Arousals
                  occurred during the night. These are sequences of flow-limited breaths that end
                  with a sudden return to normal airflow &mdash; suggesting a brief arousal restored
                  airway patency.
                </p>
                <p>
                  RERAs are the link between flow limitation and daytime symptoms. Each RERA is a
                  mini-awakening that fragments sleep without leaving a trace in your AHI. A high
                  estimated RERA count alongside elevated Glasgow and NED values paints a picture of
                  sleep disruption that the AHI completely misses.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How to See Flow Limitation in Your Data */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <BarChart3 className="h-5 w-5 text-violet-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            How to See Flow Limitation in Your Data
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            If you have a ResMed machine with an SD card, the detailed waveform data for flow
            limitation analysis is already being recorded every night. Here&apos;s how to make it
            visible:
          </p>
          <div className="space-y-3">
            <div className="flex gap-3 rounded-xl border border-border/50 p-4">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-xs font-bold text-primary">
                1
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Get your data off the SD card
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Remove the SD card from your machine and connect it to your computer. You&apos;ll
                  find folders containing <code>.edf</code> files &mdash; these are the raw waveform
                  recordings from each session.
                </p>
              </div>
            </div>
            <div className="flex gap-3 rounded-xl border border-border/50 p-4">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-xs font-bold text-primary">
                2
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Use a flow limitation analysis tool
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  AirwayLab reads those EDF files directly in your browser. Drag your SD card folder
                  into the app, and it computes the Glasgow Index, NED, FL Score, and estimated RERA
                  count for each session. Your data stays on your device &mdash; nothing is uploaded
                  to any server.
                </p>
              </div>
            </div>
            <div className="flex gap-3 rounded-xl border border-border/50 p-4">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-xs font-bold text-primary">
                3
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Look at patterns, not single nights
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Everyone has occasional flow-limited breaths. A single night with slightly elevated
                  Glasgow scores isn&apos;t necessarily meaningful. What matters is the trend across
                  weeks and months. Consistently elevated scores across multiple sessions are worth
                  discussing with your clinician.
                </p>
              </div>
            </div>
            <div className="flex gap-3 rounded-xl border border-border/50 p-4">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-xs font-bold text-primary">
                4
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Bring it to your next appointment
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Flow limitation data gives your sleep physician additional information beyond what
                  the machine&apos;s app provides. Many clinicians appreciate having objective
                  breath-shape data when reviewing therapy.
                </p>
              </div>
            </div>
          </div>
          <p>
            If you use OSCAR to view your raw waveform data, AirwayLab complements that workflow
            by adding automated breath shape scoring. OSCAR shows you the waveforms visually.
            AirwayLab quantifies the patterns across entire sessions and nights.
          </p>
        </div>
      </section>

      {/* What Your Flow Limitation Profile Shows */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Wind className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            What Your Flow Limitation Profile Shows
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            When you look at your flow limitation data, you&apos;re looking at a deeper layer of
            what&apos;s happening during sleep. Key patterns to observe:
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">Glasgow Index trend</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Stable, improving, or elevated over time? Consistently elevated values are above the typical range for this metric.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">NED values</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Elevated NED across sessions indicates persistent flow-limited breathing patterns.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">Estimated RERA count</p>
              <p className="mt-1 text-xs text-muted-foreground">
                A high count is above the typical range. This metric is independent of AHI.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">Session-to-session variability</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Large swings in flow limitation scores between nights can indicate variable
                factors worth tracking.
              </p>
            </div>
          </div>
          <p className="text-xs italic text-muted-foreground/80">
            These metrics are informational. They show patterns in your breathing data that help
            you and your clinician understand what&apos;s happening at a deeper level than AHI
            alone. They do not constitute a diagnosis or indicate whether any specific change to
            therapy is needed.
          </p>
        </div>
      </section>

      {/* References */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <BookOpen className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-bold sm:text-2xl">References</h2>
        </div>
        <div className="mt-4 space-y-2 text-sm text-muted-foreground">
          <p>
            Palombini et al. (2013). &quot;Upper airway resistance syndrome: still not
            recognized and not treated.&quot; <em>Sleep Science</em>, 6(1), 19-26.
          </p>
          <p>
            Farr&eacute; et al. (2004). &quot;Noninvasive monitoring of respiratory mechanics
            during sleep.&quot; <em>European Respiratory Journal</em>, 24(6), 1052-1060.
          </p>
          <p>
            Clark et al. (2017). &quot;Automated detection of inspiratory flow limitation from
            CPAP devices.&quot; <em>Journal of Clinical Sleep Medicine</em>, 13(2).
          </p>
          <p>
            Mann et al. (2020). &quot;The relationship between inspiratory flow limitation and
            sleep fragmentation.&quot; <em>Sleep Medicine</em>, 74.
          </p>
          <p>
            Berry et al. (2012). &quot;Rules for Scoring Respiratory Events in Sleep.&quot;{' '}
            <em>Journal of Clinical Sleep Medicine</em>, 8(5), 597-619.
          </p>
          <div className="mt-4 border-t border-border/30 pt-4">
            <p className="mb-2 text-xs font-semibold text-foreground">Related articles</p>
            <p>
              <Link href="/blog/beyond-ahi" className="text-primary hover:text-primary/80">
                Beyond AHI: Why Your Sleep Apnea Score Might Be Misleading You
              </Link>{' '}
              &mdash; the research case against relying on AHI alone.
            </p>
            <p className="mt-1">
              <Link
                href="/blog/ahi-normal-still-tired"
                className="text-primary hover:text-primary/80"
              >
                Your AHI Is Normal But You&apos;re Still Exhausted
              </Link>{' '}
              &mdash; a practical guide to investigating persistent fatigue.
            </p>
            <p className="mt-1">
              <Link
                href="/blog/flow-limitation-and-sleepiness"
                className="text-primary hover:text-primary/80"
              >
                Does Flow Limitation Drive Sleepiness?
              </Link>{' '}
              &mdash; evidence linking flow limitation directly to daytime symptoms.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mt-10 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
        <h3 className="text-lg font-bold">Start Analysing Your Breathing Patterns</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Your PAP machine already records the data. AirwayLab makes it visible &mdash; for free,
          in your browser, with nothing uploaded to any server.
        </p>
        <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/analyze"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow transition-colors hover:bg-primary/90"
          >
            Analyse Your Data <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/glossary/flow-limitation"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Learn More in the Glossary
          </Link>
        </div>
      </section>

      {/* Medical Disclaimer */}
      <p className="mt-8 text-xs italic text-muted-foreground/60">
        AirwayLab is a free, open-source analysis tool. It is not a medical device and does not
        provide medical advice, diagnosis, or treatment recommendations. All analysis is
        informational &mdash; always discuss your breathing data and therapy with a qualified
        sleep specialist. Your data never leaves your browser.
      </p>
    </article>
  );
}
