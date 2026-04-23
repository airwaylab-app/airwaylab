import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart2,
  BookOpen,
  Info,
  Layers,
  Stethoscope,
  Waves,
} from 'lucide-react';

export default function HypopneaVsApneaCPAPData() {
  return (
    <article>
      <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
        If you look at a CPAP summary report — whether from ResMed&apos;s MyAir app, OSCAR, or
        your machine&apos;s own display — you will usually see your AHI broken into components:
        obstructive apneas, central apneas, and hypopneas. The totals are combined into one
        number, but the individual categories tell different stories.{' '}
        <strong className="text-foreground">
          The difference between a hypopnea and an apnea is not just about severity.
        </strong>{' '}
        The two event types have distinct definitions, involve different airway mechanics, and
        appear differently in your flow waveform data. Understanding what you are looking at helps
        you have a more specific conversation with your clinician about what your data shows.
      </p>

      <div className="mt-6 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">Medical disclaimer:</strong> This article is for
          informational purposes only. AirwayLab is not a medical device, and nothing here
          constitutes a diagnosis or treatment recommendation. Always discuss your therapy data
          and any concerns about your metrics with a qualified sleep specialist.
        </p>
      </div>

      {/* What Is an Apnea */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <AlertTriangle className="h-5 w-5 text-rose-400" />
          <h2 className="text-xl font-bold sm:text-2xl">What Is an Apnea?</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            An apnea is a near-complete stop in airflow lasting at least 10 seconds. There are
            two main types:
          </p>
          <div className="space-y-3">
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">Obstructive apnea (OA)</p>
              <p className="mt-1 text-xs text-muted-foreground">
                The airway physically collapses during sleep. Airflow stops because the upper
                airway — typically the soft palate, tongue base, or pharyngeal walls — closes
                completely. Breathing effort continues; the problem is mechanical, not
                neurological. In your flow data, this appears as a flat line: airflow drops to
                near zero.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">Central apnea (CA)</p>
              <p className="mt-1 text-xs text-muted-foreground">
                The brain temporarily stops sending the signal to breathe. Unlike obstructive
                apneas, there is no mechanical obstruction — the airway is open. Airflow stops
                because the drive to breathe pauses. In CPAP flow data, central apneas also
                appear as near-zero airflow, but breathing typically resumes gradually rather
                than abruptly.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">Mixed apneas</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Some people have mixed apneas — events that begin without respiratory effort and
                become obstructive as the effort-free period progresses. ResMed devices count
                and report these separately.
              </p>
            </div>
          </div>
          <p>
            Your CPAP device counts and categorises these events automatically and reports them
            in your nightly summary.
          </p>
        </div>
      </section>

      {/* What Is a Hypopnea */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Waves className="h-5 w-5 text-amber-400" />
          <h2 className="text-xl font-bold sm:text-2xl">What Is a Hypopnea?</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            A hypopnea is a partial reduction in airflow — not a complete stop, but a significant
            dip — lasting at least 10 seconds, accompanied by either an oxygen desaturation or an
            arousal from sleep.
          </p>
          <div className="rounded-xl border border-border/50 p-4">
            <p className="text-sm font-semibold text-foreground">Key scoring thresholds</p>
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              <li className="flex gap-2">
                <span className="text-amber-400">—</span>
                <span>
                  <strong className="text-foreground">Airflow reduction:</strong> typically 30%
                  or more below baseline
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-amber-400">—</span>
                <span>
                  <strong className="text-foreground">Duration:</strong> at least 10 seconds
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-amber-400">—</span>
                <span>
                  <strong className="text-foreground">Associated marker:</strong> either a 3–4%
                  oxygen desaturation or an EEG-verified arousal
                </span>
              </li>
            </ul>
          </div>
          <p>
            Hypopneas are, by definition, less complete in terms of airflow reduction than apneas
            — but they can still fragment sleep and affect oxygen levels depending on their
            frequency and depth.
          </p>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
            <p className="text-sm font-semibold text-foreground">The scoring rules have changed</p>
            <p className="mt-1 text-xs text-muted-foreground">
              The AASM (American Academy of Sleep Medicine) revised its hypopnea scoring criteria
              between 2007 and 2012. Under the older rules (AASM 2007), events with a 3%
              desaturation <em>or</em> an arousal counted as hypopneas. Under the newer rules
              (AASM 2012), only events with a 4% desaturation counted. Events that qualified as
              hypopneas under the 2007 rules but don&apos;t reach the 4% desaturation threshold
              under the 2012 rules are instead classified as RERAs — events that don&apos;t appear
              in your AHI at all. If your initial sleep study was scored under different criteria
              than your current follow-up data, the numbers may not be directly comparable even
              if nothing in your breathing has changed. Your sleep physician can help interpret
              these differences in context.
            </p>
          </div>
        </div>
      </section>

      {/* How They Combine Into AHI */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <BarChart2 className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">How They Combine Into AHI</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            The Apnea-Hypopnea Index is the sum of all apneas (obstructive + central + mixed)
            and all hypopneas, divided by hours of sleep:
          </p>
          <div className="rounded-xl border border-border/50 bg-muted/30 p-4">
            <p className="font-mono text-sm font-semibold text-foreground">
              AHI = (Obstructive Apneas + Central Apneas + Mixed Apneas + Hypopneas) ÷ Hours of
              sleep
            </p>
          </div>
          <p>The severity thresholds most commonly used:</p>
          <div className="overflow-x-auto rounded-xl border border-border/50">
            <table className="w-full text-xs text-muted-foreground">
              <thead>
                <tr className="border-b border-border/50 text-left">
                  <th className="px-4 py-3 font-semibold text-foreground">AHI range</th>
                  <th className="px-4 py-3 font-semibold text-foreground">Category</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                <tr>
                  <td className="px-4 py-2.5">0–4</td>
                  <td className="px-4 py-2.5">Typical range</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5">5–14</td>
                  <td className="px-4 py-2.5">Mild</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5">15–29</td>
                  <td className="px-4 py-2.5">Moderate</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5">≥30</td>
                  <td className="px-4 py-2.5">Severe</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            These thresholds were established for diagnostic use in polysomnography. For a closer
            look at what AHI misses and why it can be misleading as a standalone metric, see{' '}
            <Link href="/blog/why-ahi-is-lying" className="text-primary hover:text-primary/80">
              Why Your AHI Is Lying to You
            </Link>
            .
          </p>
        </div>
      </section>

      {/* Why the Split Matters */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Layers className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Why the Apnea vs Hypopnea Split Matters</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            The AHI headline number collapses all event types into one. But the split between
            apneas and hypopneas — and between obstructive and central apneas — contains
            information that the single number doesn&apos;t.
          </p>
          <p>
            A night with AHI 8 composed of 7 hypopneas and 1 obstructive apnea looks very
            different in the flow data from a night with AHI 8 composed of 6 central apneas and
            2 obstructive apneas. The event types, the waveform signatures, and the patterns in
            the data are distinct.
          </p>
          <div className="rounded-xl border border-border/50 p-4">
            <p className="text-sm font-semibold text-foreground">
              The obstructive vs central distinction in particular
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Obstructive events are the primary target of CPAP therapy — pressure splints the
              airway open. Central events are driven by respiratory control rather than airway
              anatomy, and the clinical picture is different. Your sleep physician can help
              interpret the balance between obstructive and central events in the context of your
              specific data.
            </p>
          </div>
          <p>The same AHI, different picture:</p>
          <div className="overflow-x-auto rounded-xl border border-border/50">
            <table className="w-full text-xs text-muted-foreground">
              <thead>
                <tr className="border-b border-border/50 text-left">
                  <th className="px-4 py-3 font-semibold text-foreground">Metric</th>
                  <th className="px-4 py-3 font-semibold text-foreground">Person A</th>
                  <th className="px-4 py-3 font-semibold text-foreground">Person B</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                <tr>
                  <td className="px-4 py-2.5">AHI</td>
                  <td className="px-4 py-2.5">12</td>
                  <td className="px-4 py-2.5">12</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5">Obstructive apneas/hour</td>
                  <td className="px-4 py-2.5">10</td>
                  <td className="px-4 py-2.5">1</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5">Central apneas/hour</td>
                  <td className="px-4 py-2.5">0</td>
                  <td className="px-4 py-2.5">8</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5">Hypopneas/hour</td>
                  <td className="px-4 py-2.5">2</td>
                  <td className="px-4 py-2.5">3</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            The headline number is identical. The flow data looks completely different. The
            breakdown — not just the total — gives a more complete picture of what the data shows.
          </p>
        </div>
      </section>

      {/* How They Look in the Flow Waveform */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Waves className="h-5 w-5 text-purple-400" />
          <h2 className="text-xl font-bold sm:text-2xl">How They Look in the Flow Waveform</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            If you look at your raw CPAP flow data — in OSCAR, AirwayLab, or any tool that reads
            SD card data — the two event types look different:
          </p>
          <div className="space-y-3">
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">Apnea signature</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Near-flat airflow for at least 10 seconds. The signal may hover near zero or
                drift slightly. The resumption of breathing is often abrupt (obstructive) or
                gradual (central).
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">Hypopnea signature</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Airflow drops significantly but doesn&apos;t reach zero. Breath shapes are reduced
                in amplitude. You may see flat-topped waveforms (flow limitation) or reduced but
                still-present airflow. This is where the line between a hypopnea and a{' '}
                <Link
                  href="/blog/what-are-reras-sleep-apnea"
                  className="text-primary hover:text-primary/80"
                >
                  RERA
                </Link>{' '}
                can be difficult to see without knowing the exact scoring thresholds applied.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">The grey zone</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Events that don&apos;t quite reach the hypopnea threshold — not enough airflow
                drop, no sufficient desaturation, no EEG-confirmed arousal — may still appear in
                the flow waveform as notable patterns. These are the events most likely to be
                RERAs, and they are explored in{' '}
                <Link
                  href="/blog/what-are-reras-sleep-apnea"
                  className="text-primary hover:text-primary/80"
                >
                  What Are RERAs?
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What AirwayLab Shows You */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Activity className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">What AirwayLab Shows You</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            AirwayLab reads your ResMed SD card data directly in your browser. Your data never
            leaves your device. All analysis runs locally.
          </p>
          <div className="space-y-3">
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">Event breakdown in context</p>
              <p className="mt-1 text-xs text-muted-foreground">
                The overview dashboard shows your AHI alongside the event breakdown from your
                device — obstructive apneas, central apneas, and hypopneas per night. Trending
                across multiple nights lets you see whether the composition shifts over time.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">Flow waveform analysis</p>
              <p className="mt-1 text-xs text-muted-foreground">
                The waveform tab gives you access to the breath-by-breath flow data, where you
                can see the actual signatures of events: the flat-line apneas, the
                reduced-amplitude hypopneas, and the flow-limited breaths that sit between scored
                events and normal breathing.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">NED engine (per-breath analysis)</p>
              <p className="mt-1 text-xs text-muted-foreground">
                AirwayLab&apos;s NED engine scores each breath for negative effort dependence — a
                per-breath measure of inspiratory effort patterns in the flow signal. This gives
                you a measure of how many breaths showed flow-limited patterns, independent of
                whether those breaths were scored as formal apneas or hypopneas by your device.
                A night with low AHI but high NED percentage shows a different picture than a
                night with the same AHI and low NED.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">Glasgow Index (breath shape scoring)</p>
              <p className="mt-1 text-xs text-muted-foreground">
                The Glasgow engine scores the shape of each inspiratory waveform on 9 components:
                flatness, skew, multi-peak patterns, and more. These shape scores give you a
                quantitative way to look at what the waveforms in your data look like, beyond the
                binary scored/not-scored classification your device applies.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">H1/H2 split</p>
              <p className="mt-1 text-xs text-muted-foreground">
                AirwayLab splits your night into first-half and second-half to show whether event
                patterns shift across the session. Obstructive events often cluster in specific
                sleep stages; seeing whether your apneas and hypopneas are concentrated in the
                first or second half of the night is a useful data point for discussing sleep
                architecture with your clinician.
              </p>
            </div>
          </div>
          <p>
            This data is for informational purposes. Your sleep physician can help interpret these
            patterns in the context of your full clinical picture.
          </p>
        </div>
      </section>

      {/* Practical Takeaways */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Info className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Practical Takeaways</h2>
        </div>
        <div className="mt-4 space-y-3">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <p className="text-sm font-semibold text-emerald-400">
              Apnea = near-complete airflow stop (≥10 seconds)
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Obstructive means the airway is blocked. Central means the breathing drive paused.
            </p>
          </div>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <p className="text-sm font-semibold text-emerald-400">
              Hypopnea = partial reduction (≥30%) for ≥10 seconds
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              With either desaturation or arousal. A scored event, but not as complete an airflow
              stop as an apnea.
            </p>
          </div>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <p className="text-sm font-semibold text-emerald-400">Both count in AHI</p>
            <p className="mt-1 text-xs text-muted-foreground">
              The single headline number combines obstructive apneas, central apneas, mixed
              apneas, and hypopneas.
            </p>
          </div>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <p className="text-sm font-semibold text-emerald-400">
              The split between types contains information the total doesn&apos;t
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              A high central apnea percentage in your data is a different clinical picture from a
              high obstructive apnea percentage. Your clinician can help interpret which pattern
              your data shows.
            </p>
          </div>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <p className="text-sm font-semibold text-emerald-400">Scoring rules matter</p>
            <p className="mt-1 text-xs text-muted-foreground">
              If your sleep study and your current CPAP data were scored under different AASM
              criteria, some events may have moved between the hypopnea and RERA categories.
            </p>
          </div>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <p className="text-sm font-semibold text-emerald-400">
              Hypopneas shade into RERAs at the margin
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Events that nearly meet the hypopnea threshold may still appear as notable patterns
              in your flow data. These are explored in detail in{' '}
              <Link
                href="/blog/what-are-reras-sleep-apnea"
                className="text-primary hover:text-primary/80"
              >
                What Are RERAs?
              </Link>
            </p>
          </div>
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
            Berry et al. (2012). &quot;Rules for Scoring Respiratory Events in Sleep: Update of
            the 2007 AASM Manual.&quot; <em>Journal of Clinical Sleep Medicine</em>, 8(5),
            597–619.
          </p>
          <p>
            Ruehland et al. (2009). &quot;The New AASM Criteria for Scoring Hypopneas: Impact on
            the Apnea Hypopnea Index.&quot; <em>Sleep</em>, 32(2), 150–157.
          </p>
          <p>
            Morgenthaler et al. (2006). &quot;Complex Sleep Apnea Syndrome: Is It a Unique
            Clinical Syndrome?&quot; <em>Sleep</em>, 29(9), 1203–1209.
          </p>
          <p>AASM Manual for the Scoring of Sleep and Associated Events (2017). Version 2.4.</p>
          <div className="mt-4 border-t border-border/30 pt-4">
            <p className="mb-2 text-xs font-semibold text-foreground">Related articles</p>
            <p>
              <Link href="/blog/why-ahi-is-lying" className="text-primary hover:text-primary/80">
                Why Your AHI Is Lying to You
              </Link>{' '}
              — the design limitations of AHI as a monitoring metric.
            </p>
            <p className="mt-1">
              <Link
                href="/blog/what-are-reras-sleep-apnea"
                className="text-primary hover:text-primary/80"
              >
                What Are RERAs in Sleep Apnea?
              </Link>{' '}
              — the events between hypopneas and normal breathing.
            </p>
            <p className="mt-1">
              <Link
                href="/blog/ahi-vs-rdi-sleep-apnea"
                className="text-primary hover:text-primary/80"
              >
                AHI vs RDI: What&apos;s the Difference?
              </Link>{' '}
              — why these two numbers don&apos;t match on your reports.
            </p>
            <p className="mt-1">
              <Link
                href="/blog/understanding-flow-limitation"
                className="text-primary hover:text-primary/80"
              >
                Understanding Flow Limitation in CPAP Data
              </Link>{' '}
              — the waveform patterns behind scored and unscored events.
            </p>
            <p className="mt-1">
              <Link href="/blog/beyond-ahi" className="text-primary hover:text-primary/80">
                Beyond AHI: Why Your Sleep Apnea Score Might Be Misleading You
              </Link>{' '}
              — the research case for multi-dimensional sleep assessment.
            </p>
          </div>
        </div>
      </section>

      {/* Medical disclaimer */}
      <section className="mt-8">
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
          <div className="flex items-center gap-2.5">
            <Stethoscope className="h-4 w-4 text-amber-500" />
            <p className="text-xs font-semibold text-foreground">Medical disclaimer</p>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            AirwayLab is an educational tool, not a medical device. The analysis provided is
            based on published research methodologies applied to your PAP device&apos;s flow data.
            It is not a substitute for polysomnography or clinical evaluation. Always discuss your
            therapy data with your sleep physician. The metrics described here are for educational
            purposes and to support informed conversations with your clinician.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="mt-10 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
        <h3 className="text-lg font-bold">See Your Apnea and Hypopnea Breakdown in AirwayLab</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          AirwayLab analyses your ResMed SD card data in your browser — no upload, no account.
          See your event breakdown, flow waveforms, and NED per-breath analysis alongside your
          AHI, free and open-source.
        </p>
        <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/analyze"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow transition-colors hover:bg-primary/90"
          >
            Analyse Your CPAP Data <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/blog/what-are-reras-sleep-apnea"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Read: What Are RERAs?
          </Link>
        </div>
      </section>
    </article>
  );
}
