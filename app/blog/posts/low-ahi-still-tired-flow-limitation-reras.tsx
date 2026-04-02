import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  BookOpen,
  Brain,
  Eye,
  Lightbulb,
  Search,
  Stethoscope,
  Wind,
  Zap,
} from 'lucide-react';

function BreathShapeDiagram() {
  return (
    <div className="mt-6 rounded-xl border border-border/50 bg-card/30 p-4 sm:p-6">
      <p className="mb-4 text-center text-xs font-semibold text-foreground">
        Normal vs Flow-Limited Breath Shapes
      </p>
      <div className="grid gap-6 sm:grid-cols-2">
        {/* Normal breath */}
        <div className="text-center">
          <svg
            viewBox="0 0 200 100"
            className="mx-auto h-24 w-full max-w-[200px]"
            role="img"
            aria-label="Normal breath waveform showing a smooth, rounded inspiratory peak"
          >
            <line x1="0" y1="50" x2="200" y2="50" stroke="currentColor" strokeOpacity="0.2" strokeDasharray="4" />
            <path
              d="M 10,50 Q 30,50 50,15 Q 70,0 100,10 Q 130,20 150,50 Q 160,65 170,80 Q 185,90 190,50"
              fill="none"
              stroke="#22c55e"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
          <p className="mt-2 text-xs font-medium text-emerald-400">Normal breath</p>
          <p className="mt-1 text-[10px] text-muted-foreground">
            Smooth, rounded inspiratory peak. Air flows freely.
          </p>
        </div>
        {/* Flow-limited breath */}
        <div className="text-center">
          <svg
            viewBox="0 0 200 100"
            className="mx-auto h-24 w-full max-w-[200px]"
            role="img"
            aria-label="Flow-limited breath waveform showing a flattened, plateau-shaped inspiratory peak"
          >
            <line x1="0" y1="50" x2="200" y2="50" stroke="currentColor" strokeOpacity="0.2" strokeDasharray="4" />
            <path
              d="M 10,50 Q 25,50 40,30 L 70,30 L 110,30 L 140,30 Q 155,50 165,65 Q 175,80 185,85 Q 192,70 195,50"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
          <p className="mt-2 text-xs font-medium text-amber-400">Flow-limited breath</p>
          <p className="mt-1 text-[10px] text-muted-foreground">
            Flattened plateau. Airway narrows, restricting peak flow.
          </p>
        </div>
      </div>
      <p className="mt-4 text-center text-[10px] text-muted-foreground/60">
        airwaylab.app &mdash; Simplified illustration. Actual waveforms vary by individual.
      </p>
    </div>
  );
}

export default function LowAHIStillTiredFlowLimitationRERAsPost() {
  return (
    <article>
      <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
        Your AHI says 1.5. Your machine app says &quot;great night.&quot; But you woke up
        exhausted, again. If this sounds familiar, you are not alone, and you are not imagining
        it. The number your machine shows you was never designed to capture the full picture of
        what happens in your airway while you sleep. Two events it misses entirely -- flow
        limitation and RERAs -- may explain the gap between your score and how you feel.
      </p>

      {/* What AHI actually counts */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Eye className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            What AHI Counts (and What It Ignores)
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            AHI, the Apnea-Hypopnea Index, counts two types of events per hour: apneas (your
            airway closes completely for 10+ seconds) and hypopneas (airflow drops significantly,
            usually with an oxygen desaturation). An AHI under 5 is considered &quot;normal.&quot;
          </p>
          <p>
            But your airway can narrow substantially -- restricting airflow, increasing breathing
            effort, and fragmenting your sleep -- without ever triggering either of those thresholds.
            These sub-threshold events are invisible to AHI. They have names:{' '}
            <strong className="text-foreground">flow limitation</strong> and{' '}
            <strong className="text-foreground">RERAs</strong>.
          </p>
        </div>
      </section>

      {/* What is flow limitation */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Wind className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            Flow Limitation: The Event AHI Was Not Built to See
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Flow limitation happens when your upper airway narrows during sleep, but not enough
            to count as a hypopnea. Your body works harder to pull air through the narrowed space.
            On a breath-by-breath waveform, the shape changes: instead of a smooth, rounded
            inspiratory peak, you see a flattened plateau.
          </p>

          <BreathShapeDiagram />

          <p>
            The flat-topped shape is the signature of a narrowed airway. Even though air is still
            flowing, your respiratory muscles are working harder to maintain ventilation. Your
            body is compensating, and that effort has consequences.
          </p>
          <p>
            Flow limitation can persist for minutes or hours. A night where 60% of your breaths
            show this flattened pattern means your airway was partially obstructed for most of
            the night, yet your AHI might still read 0.5.
          </p>
        </div>
      </section>

      {/* What are RERAs */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Zap className="h-5 w-5 text-rose-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            RERAs: When Flow Limitation Breaks Your Sleep
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            A RERA -- Respiratory Effort-Related Arousal -- is what happens when a sequence of
            flow-limited breaths ends with your brain briefly waking to restore normal airflow.
            You do not remember the arousal. It lasts seconds. But it fragments your sleep
            architecture, pulling you out of deep sleep or REM.
          </p>
          <div className="rounded-xl border border-rose-500/10 bg-rose-500/5 p-4">
            <p className="text-sm text-foreground">
              <strong>The key distinction:</strong> Apneas and hypopneas involve significant
              airflow reduction or oxygen drops. RERAs involve increased respiratory effort and
              a brief arousal, without meeting those thresholds. AHI counts the first two. It
              does not count RERAs.
            </p>
          </div>
          <p>
            Someone with an AHI of 2 but a RERA index of 15 is experiencing 17 disruptions per
            hour. Their AHI says &quot;mild.&quot; Their actual respiratory disturbance is
            moderate to severe. This pattern is characteristic of{' '}
            <Link href="/glossary#uars" className="text-primary hover:text-primary/80">
              Upper Airway Resistance Syndrome (UARS)
            </Link>.
          </p>
        </div>
      </section>

      {/* Why these events cause symptoms */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Brain className="h-5 w-5 text-purple-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            Why Flow Limitation and RERAs Leave You Exhausted
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Research from Dr. Avram Gold and others has shown that the respiratory effort from
            flow limitation activates your body&apos;s stress response, even without a cortical
            arousal. Your autonomic nervous system reacts to the increased breathing effort:
            heart rate rises, blood pressure spikes, and stress hormones are released.
          </p>
          <div className="space-y-3">
            <div className="rounded-xl border border-border/50 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-purple-400" />
                <p className="text-sm font-semibold text-foreground">Sleep fragmentation</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Each RERA pulls you out of deeper sleep stages. Even without full waking, your
                sleep architecture shifts toward lighter, less restorative stages.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-rose-400" />
                <p className="text-sm font-semibold text-foreground">Autonomic stress</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Prolonged flow limitation activates the{' '}
                <Link href="/blog/arousals-vs-flow-limitation" className="text-primary hover:text-primary/80">
                  limbic stress response
                </Link>{' '}
                throughout the night. Your body stays in a low-grade fight-or-flight state,
                even while you appear to be sleeping normally.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-400" />
                <p className="text-sm font-semibold text-foreground">Cumulative fatigue</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Night after night of undetected flow limitation means night after night of
                non-restorative sleep. The fatigue is real, persistent, and often mistaken for
                other conditions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How to find these in your data */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Search className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            How to Find Flow Limitation and RERAs in Your PAP Data
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Your PAP machine&apos;s SD card contains breath-by-breath flow waveform data that is
            far more detailed than what your machine app shows you. With the right analysis, this
            raw data reveals the flow limitation patterns and RERA-like events that AHI ignores.
          </p>
          <div className="space-y-3">
            <div className="rounded-xl border border-border/50 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-400" />
                <p className="text-sm font-semibold text-foreground">
                  <Link href="/glossary#glasgow-index" className="hover:text-primary">Glasgow Index</Link>
                  {' '}-- Breath Shape Score
                </p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Scores how distorted each breath&apos;s waveform is across 9 shape
                characteristics. A score above 2.0 suggests significant flow limitation is
                present. This is the single best metric for detecting the flattened breath
                shapes shown above.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-400" />
                <p className="text-sm font-semibold text-foreground">
                  <Link href="/glossary#fl-score" className="hover:text-primary">FL Score</Link>
                  {' '}-- Flow Limitation Percentage
                </p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                The percentage of your breaths showing flat-topped inspiratory patterns. An
                FL Score above 50% means more than half your breaths are flow-limited. It is
                a quick way to gauge the overall burden across a night.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-rose-400" />
                <p className="text-sm font-semibold text-foreground">
                  <Link href="/glossary#ned" className="hover:text-primary">NED</Link>
                  {' '}+ Estimated RERA Index
                </p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Negative Effort Dependence detects per-breath airway collapse from the flow
                signal. When combined with arousal-like pattern detection, it produces an
                estimated RERA count. Adding this to your AHI gives something closer to the
                true Respiratory Disturbance Index (RDI).
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What to do with this information */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Activity className="h-5 w-5 text-amber-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            What You Can Do With This Information
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Understanding your flow limitation and RERA burden gives you data to bring to your
            next clinical conversation. Objective metrics make it easier for your sleep physician
            to evaluate whether further investigation is warranted.
          </p>
          <ul className="ml-4 space-y-2">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
              <span>
                <strong className="text-foreground">Track over time.</strong>{' '}
                A single night&apos;s data is a snapshot. Multiple nights reveal patterns.
                Look for consistency in your Glasgow Index and FL Score across a week or more.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
              <span>
                <strong className="text-foreground">Check the H2 split.</strong>{' '}
                Flow limitation often worsens in the second half of the night as muscle tone
                drops during REM sleep. AirwayLab shows first-half vs second-half comparisons
                to help identify this pattern.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
              <span>
                <strong className="text-foreground">Correlate with symptoms.</strong>{' '}
                Nights with higher flow limitation do not always feel worse for everyone.{' '}
                <Link href="/blog/ifl-symptom-sensitivity" className="text-primary hover:text-primary/80">
                  Individual sensitivity varies
                </Link>
                . Tracking both data and how you feel helps identify your personal threshold.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
              <span>
                <strong className="text-foreground">Share with your clinician.</strong>{' '}
                AirwayLab generates exportable reports (PDF, CSV, or formatted forum post)
                that present your flow limitation data clearly. Discuss the findings with your
                sleep physician.
              </span>
            </li>
          </ul>
        </div>
      </section>

      {/* When to see your clinician */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Stethoscope className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            When to Discuss This With Your Sleep Physician
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Data is most useful when it informs a clinical conversation. Consider bringing your
            flow limitation findings to your physician if:
          </p>
          <ul className="ml-4 space-y-2">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
              <span>
                Your Glasgow Index is consistently above 2.0 or your FL Score is above 50%
                despite a low AHI
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
              <span>
                Your estimated RERA count is significantly higher than your AHI, suggesting
                the true respiratory disturbance is higher than what your machine reports
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
              <span>
                You have been compliant with PAP therapy for 3+ months but symptoms have not
                improved
              </span>
            </li>
          </ul>
          <p>
            Your sleep physician can evaluate whether further investigation, such as a pressure
            adjustment trial or an in-lab titration, is appropriate based on your clinical context.
          </p>
        </div>
      </section>

      {/* Further reading */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <BookOpen className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-bold sm:text-2xl">Further Reading</h2>
        </div>
        <div className="mt-4 space-y-2 text-sm text-muted-foreground">
          <p>
            <Link href="/blog/understanding-flow-limitation" className="text-primary hover:text-primary/80">
              Understanding Flow Limitation: What Your PAP Machine Doesn&apos;t Tell You
            </Link>{' '}
            -- a deeper technical look at what flow limitation is and how it is detected.
          </p>
          <p>
            <Link href="/blog/ahi-normal-still-tired" className="text-primary hover:text-primary/80">
              Your AHI Is Normal But You&apos;re Still Exhausted
            </Link>{' '}
            -- the broader picture of what AHI misses beyond flow limitation and RERAs.
          </p>
          <p>
            <Link href="/blog/arousals-vs-flow-limitation" className="text-primary hover:text-primary/80">
              Arousals Don&apos;t Tell the Whole Story
            </Link>{' '}
            -- why the stress response to flow limitation may matter more than cortical arousals.
          </p>
          <p>
            <Link href="/blog/hidden-respiratory-events" className="text-primary hover:text-primary/80">
              The Hidden Respiratory Events Your Flow Data Isn&apos;t Showing You
            </Link>{' '}
            -- brief obstructions that slip under every detection threshold.
          </p>
        </div>
      </section>

      {/* Medical disclaimer */}
      <section className="mt-8">
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
          <div className="flex items-center gap-2.5">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            <p className="text-xs font-semibold text-foreground">A note on self-analysis</p>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            AirwayLab helps you understand your PAP data, but it is not a diagnostic tool. Flow
            limitation and RERA estimates from SD card data are derived from flow signal analysis,
            not polysomnography-grade measurement. Always discuss therapy changes with your sleep
            physician. The metrics and visualisations provided are for educational purposes and to
            inform clinical conversations.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="mt-10 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
        <h3 className="text-lg font-bold">See What AHI Is Hiding in Your Data</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Upload your ResMed SD card to AirwayLab. Four research-grade engines analyse your flow
          data for the flow limitation and RERA patterns AHI ignores. Free, open-source, and
          100% private -- your data never leaves your browser.
        </p>
        <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/analyze"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow transition-colors hover:bg-primary/90"
          >
            Analyze Your Data <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/blog/understanding-flow-limitation"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            What Is Flow Limitation?
          </Link>
        </div>
      </section>
    </article>
  );
}
