import Link from 'next/link';
import {
  Eye,
  AlertTriangle,
  Activity,
  BarChart3,
  Lightbulb,
  BookOpen,
  ArrowRight,
} from 'lucide-react';

export default function HiddenRespiratoryEventsPost() {
  return (
    <article>
      <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
        Your AHI is 2. Your RERA index is under 5. Your NED analysis shows normal breath shapes.
        By every standard metric, your PAP therapy is working. But your oximetry tells a different
        story: ODI of 10, heart rate surges all night, coupled desaturation events every few minutes.{' '}
        <strong className="text-foreground">
          Something is disrupting your sleep that none of the standard metrics can see.
        </strong>
      </p>

      <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
        This is the clinical gap that has frustrated PAP users and clinicians alike. Your breathing
        data says everything is fine. Your body says it isn&apos;t. The disconnect often comes down to
        a class of events that are too brief, too subtle, and too fast for conventional analysis:
        brief airway obstructions.
      </p>

      {/* What Standard Analysis Misses */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Eye className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">What Standard Flow Analysis Actually Measures</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            To understand what&apos;s being missed, it helps to understand what current tools detect.
            AHI counts complete breathing stops (apneas) and sustained airflow reductions (hypopneas)
            that last at least 10 seconds. RERA detection looks for sequences of 3-15 breaths where
            effort progressively increases. NED (Negative Effort Dependence) measures the shape of each
            breath to detect mid-inspiratory flow drops.
          </p>
          <p>
            These are all shape-based analyses. They look at <em>how</em> each breath looks. But there&apos;s
            a whole category of events that changes breath <em>amplitude</em> without changing breath
            shape. The airway briefly narrows or collapses for just 1-2 breaths, flow drops by 40% or
            more, then immediately recovers. The breath shape during the event can look perfectly normal &mdash;
            it&apos;s just smaller.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
              <p className="text-sm font-semibold text-blue-400">AHI</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Requires &ge;10 seconds duration. A 1-2 breath event lasting 3-6 seconds is invisible.
              </p>
            </div>
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
              <p className="text-sm font-semibold text-blue-400">RERA Detection</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Requires 3-15 consecutive flow-limited breaths. A single-breath collapse doesn&apos;t qualify.
              </p>
            </div>
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
              <p className="text-sm font-semibold text-blue-400">NED Shape Analysis</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Measures mid-inspiratory flow relative to peak. If the breath shape is normal but small,
                NED reads as normal.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Brief Obstructions */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <AlertTriangle className="h-5 w-5 text-amber-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Brief Obstructions: The Events Between the Cracks</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            A brief obstruction is exactly what it sounds like: a momentary narrowing or collapse of
            the upper airway that lasts just 1-2 breaths. Flow amplitude drops by more than 40% from
            the rolling baseline, then recovers immediately. The entire event is over in 3-6 seconds &mdash;
            well below the 10-second threshold required for standard hypopnea scoring.
          </p>
          <p>
            These events are individually minor. But when they happen 5-9 times per hour, they create
            a cumulative burden that explains the gap between your flow metrics and your oximetry data.
            Each brief collapse can trigger a micro-arousal, an oxygen dip, a heart rate surge &mdash; all
            the physiological responses that fragment sleep and drive next-day symptoms.
          </p>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
            <p className="text-sm font-medium text-amber-400">The maths of the gap</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Consider a night with RERA index of 6-8/hr and brief obstruction rate of 5-9/hr.
              Combined, that&apos;s a total respiratory event burden of 11-17 events per hour &mdash;
              which closely matches the 14-16/hr arousal rate suggested by oximetry (ODI + HR surges).
              Without counting brief obstructions, the RERA index alone couldn&apos;t explain the
              oximetry findings.
            </p>
          </div>
        </div>
      </section>

      {/* Why NED Misses Them */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Activity className="h-5 w-5 text-rose-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Why Shape Analysis Misses Amplitude Events</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            NED measures Negative Effort Dependence: the ratio of peak inspiratory flow to flow at the
            midpoint of inspiration. When the airway is progressively narrowing during a breath, mid-inspiratory
            flow drops relative to peak flow, producing a high NED value. This is the classic &quot;scooped
            out&quot; flow shape that indicates flow limitation.
          </p>
          <p>
            But brief obstructions work differently. The airway doesn&apos;t gradually narrow during
            inspiration &mdash; it snaps partially closed for the entire breath, reducing overall amplitude
            while maintaining a normal waveform shape. Peak and mid-inspiratory flow both drop
            proportionally. NED stays normal. The Flatness Index stays normal. The Glasgow Index components
            stay normal. By every shape metric, the breath looks fine. It&apos;s just 40-60% smaller
            than it should be.
          </p>
          <p>
            This is why we call these events <strong className="text-foreground">&quot;NED-invisible&quot;</strong>
            &mdash; they represent real airway compromise that shape-based flow analysis cannot detect.
            In our analysis, the majority of brief obstructions have NED values well below the 34%
            flow limitation threshold.
          </p>
        </div>
      </section>

      {/* Amplitude Stability */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <BarChart3 className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Amplitude Stability: The Bigger Picture</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Brief obstructions are individual events, but there&apos;s also value in looking at how
            stable your breathing amplitude is across the entire night. Normal tidal breathing has
            natural variability &mdash; your breaths aren&apos;t all exactly the same size. But that
            variability typically falls within a predictable range (coefficient of variation around
            15-20%).
          </p>
          <p>
            When the airway is intermittently compromising, breath amplitude becomes erratic. Some breaths
            are normal, some are reduced, some are recovery breaths that overshoot. The coefficient of
            variation climbs. By dividing the night into 5-minute epochs and measuring amplitude variability
            within each epoch, you can see <em>when</em> and <em>how often</em> the airway is behaving
            unstably &mdash; even if individual breath shapes look fine.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <p className="text-sm font-semibold text-emerald-400">Amplitude CV &lt; 20%</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Normal physiological variability. Breath amplitude is consistent and the airway
                appears stable.
              </p>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <p className="text-sm font-semibold text-emerald-400">Amplitude CV &gt; 30%</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Erratic amplitude suggests intermittent airway compromise. Worth discussing with your
                clinician even if shape metrics look normal.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What You Can Do */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Lightbulb className="h-5 w-5 text-purple-400" />
          <h2 className="text-xl font-bold sm:text-2xl">What This Means for Your Therapy</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            If your standard flow metrics look good but you&apos;re still symptomatic, brief obstructions
            and amplitude instability are worth investigating. Here&apos;s what to look for and discuss
            with your sleep physician:
          </p>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-xs font-bold text-primary">
                1
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">Compare Brief Obstruction Index with your RERA index</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  If brief obstructions are contributing significantly to your total event burden,
                  the combined rate may explain symptoms that RERA alone doesn&apos;t.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-xs font-bold text-primary">
                2
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">Check the H1/H2 pattern</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  If brief obstructions increase in the second half of the night, this is consistent
                  with REM-related airway laxity. Positional therapy or pressure adjustments targeting
                  REM may help.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-xs font-bold text-primary">
                3
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">Look at NED-invisible percentage</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  A high percentage of NED-invisible events suggests the airway is collapsing rather
                  than progressively narrowing. This is a different mechanism that may respond to
                  different pressure strategies.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-xs font-bold text-primary">
                4
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">Cross-reference with oximetry</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  If you have pulse oximetry data, compare your Brief Obstruction Index with ODI and
                  coupled HR events. A close match validates that these brief events are causing real
                  physiological responses.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How AirwayLab Detects This */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <BookOpen className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">How AirwayLab Detects Brief Obstructions</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            AirwayLab v1.2 introduces amplitude-based detection alongside the existing shape-based
            analysis. The detector tracks peak inspiratory flow (Qpeak) against a rolling 30-breath
            median baseline. When a breath&apos;s Qpeak drops more than 40% below that baseline, it&apos;s
            flagged as a brief obstruction.
          </p>
          <p>
            Each detected event is also checked for NED visibility &mdash; whether the NED shape analysis
            would have caught it independently. Events where NED is below 34% during the amplitude drop
            are flagged as NED-invisible, giving you a clear picture of what standard shape analysis is
            missing.
          </p>
          <p>
            For sustained flow reductions (&ge;30% drop lasting &ge;10 seconds), AirwayLab reports a
            Hypopnea Index. When your ResMed machine provides its own hypopnea count via EVE.edf,
            AirwayLab uses the machine&apos;s number &mdash; it has access to internal pressure and flow
            algorithms that external analysis can&apos;t replicate. When EVE data isn&apos;t available,
            AirwayLab falls back to its own amplitude-based detection. Either way, you see a single unified
            number.
          </p>
          <p>
            The new Airway Stability section in the Flow Analysis tab shows Brief Obstruction Index,
            Hypopnea Index, and Amplitude CV with traffic light indicators, trend arrows, and
            first-half/second-half comparisons &mdash; the same analysis patterns you&apos;re used to
            from the existing NED and Glasgow sections.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="mt-10 rounded-2xl border border-primary/20 bg-primary/5 p-6 text-center sm:p-8">
        <h2 className="text-xl font-bold sm:text-2xl">See What Your Flow Metrics Are Missing</h2>
        <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground">
          Upload your ResMed SD card to AirwayLab and check the Airway Stability section in your
          Flow Analysis tab. All analysis runs in your browser &mdash; your data never leaves your device.
        </p>
        <div className="mt-5 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/analyze"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Upload Your SD Card
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/blog/beyond-ahi"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Read: Beyond AHI
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </section>

      <p className="mt-8 text-[11px] italic text-muted-foreground/60">
        AirwayLab is not a medical device and is not FDA or CE cleared. These metrics are research-grade
        estimates, not clinical diagnoses. Always discuss results with your sleep physician before making
        therapy changes.
      </p>
    </article>
  );
}
