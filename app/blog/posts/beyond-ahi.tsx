import Link from 'next/link';
import {
  BarChart3,
  AlertTriangle,
  Brain,
  Lightbulb,
  BookOpen,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

export default function BeyondAHIPost() {
  return (
    <article>
      <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
        If you&apos;ve been diagnosed with sleep apnea, you probably know your AHI number by heart.
        Maybe your sleep physician told you anything under 5 is &quot;normal.&quot; Maybe your PAP
        app shows you a score of 2.3 and gives you a thumbs up. But here&apos;s the uncomfortable
        truth that sleep medicine is slowly coming to terms with: <strong className="text-foreground">
        AHI is a deeply flawed metric</strong>, and relying on it alone may be leaving your sleep
        problems undertreated.
      </p>

      {/* What AHI Actually Measures */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <BarChart3 className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">What AHI Actually Measures (and Doesn&apos;t)</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            The Apnea-Hypopnea Index counts two types of events per hour of sleep: apneas (complete
            breathing cessation for at least 10 seconds) and hypopneas (partial airflow reduction
            with accompanying oxygen desaturation). It&apos;s simple, standardized, and has been the
            cornerstone of sleep apnea diagnosis and treatment monitoring since the 1990s.
          </p>
          <p>
            But simplicity comes at a cost. Here&apos;s what AHI doesn&apos;t capture:
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <p className="text-sm font-semibold text-amber-400">Event Duration</p>
              <p className="mt-1 text-xs text-muted-foreground">
                A 10-second apnea and a 60-second apnea count exactly the same. Yet the
                physiological impact — oxygen drop, cardiac stress, arousal intensity — is vastly
                different.
              </p>
            </div>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <p className="text-sm font-semibold text-amber-400">Oxygen Severity</p>
              <p className="mt-1 text-xs text-muted-foreground">
                An event causing a 3% desaturation and one causing a 15% desaturation are both
                just &quot;one event.&quot; The latter is far more dangerous to cardiovascular health.
              </p>
            </div>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <p className="text-sm font-semibold text-amber-400">Flow Limitation</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Partial airway narrowing that causes arousals without meeting hypopnea criteria
                (called RERAs) is completely invisible to AHI. Entire syndromes exist around this.
              </p>
            </div>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <p className="text-sm font-semibold text-amber-400">Event Clustering</p>
              <p className="mt-1 text-xs text-muted-foreground">
                30 events evenly spread across the night vs. 30 events packed into 2 hours of REM
                sleep produce the same AHI but very different clinical outcomes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* The Research Problem */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <AlertTriangle className="h-5 w-5 text-rose-400" />
          <h2 className="text-xl font-bold sm:text-2xl">The Evidence Against AHI-Only Treatment</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            The limitations of AHI aren&apos;t just theoretical. A growing body of research has
            demonstrated real clinical consequences:
          </p>
          <p>
            A landmark 2016 study in <em>CHEST Journal</em> analyzed over 6,000 patients and found
            that AHI alone was a poor predictor of cardiovascular outcomes. Metrics like hypoxic
            burden (total oxygen desaturation load) and arousal frequency were significantly better
            at predicting heart disease risk.
          </p>
          <p>
            The SAVE trial — one of the largest randomized controlled trials of PAP therapy —
            showed no reduction in cardiovascular events despite successful AHI reduction. Many
            researchers believe this is because AHI reduction alone doesn&apos;t address the full
            spectrum of breathing disturbances.
          </p>
          <p>
            Meanwhile, studies on{' '}
            <Link href="/glossary#uars" className="text-primary hover:text-primary/80">
              Upper Airway Resistance Syndrome (UARS)
            </Link>{' '}
            have shown that patients with normal AHI but significant{' '}
            <Link href="/glossary#flow-limitation" className="text-primary hover:text-primary/80">
              flow limitation
            </Link>{' '}
            can experience the same degree of daytime sleepiness and cognitive impairment as
            patients with moderate obstructive sleep apnea.
          </p>
        </div>
      </section>

      {/* What Should We Track Instead */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <TrendingUp className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Metrics That Actually Matter</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Sleep medicine is gradually moving toward a more nuanced set of metrics. Here are the
            most promising ones — several of which you can already derive from your PAP SD card
            data:
          </p>
          <div className="space-y-3">
            <div className="rounded-xl border border-border/50 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-400" />
                <p className="text-sm font-semibold text-foreground">
                  <Link href="/glossary#glasgow-index" className="hover:text-primary">Glasgow Index</Link> (Flow Shape Score)
                </p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Quantifies the overall distortion of your breathing waveform on a 0-1 scale. Unlike
                AHI, it captures the <em>continuous spectrum</em> of airway narrowing — from subtle
                flattening to severe obstruction. A score below 0.15 generally indicates well-treated
                therapy; above 0.3 suggests significant residual flow limitation.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-400" />
                <p className="text-sm font-semibold text-foreground">Estimated RERA Index</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                By analyzing patterns of progressive flow limitation followed by sudden flow
                restoration (suggesting arousal), it&apos;s possible to estimate RERA events from
                PAP data. Combined with AHI, this approximates the more comprehensive RDI.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-rose-400" />
                <p className="text-sm font-semibold text-foreground">Hypoxic Burden</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Rather than just counting desaturation events, hypoxic burden measures the total
                area under the oxygen desaturation curve. This captures both the depth and duration
                of oxygen drops, providing a far better marker of cardiovascular risk.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-400" />
                <p className="text-sm font-semibold text-foreground">Breath-to-Breath Variability</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Healthy breathing during sleep is rhythmic and stable. High variability in breath
                amplitude, timing, or shape can indicate periodic breathing patterns, unstable
                airway control, or treatment inadequacy — none of which AHI captures.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* The Symptomatic AHI=2 Patient */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Brain className="h-5 w-5 text-purple-400" />
          <h2 className="text-xl font-bold sm:text-2xl">The &quot;AHI 2 But Still Tired&quot; Patient</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            If this is you, you&apos;re not imagining things and you&apos;re not alone. The sleep
            medicine community has a name for your situation: residual excessive daytime sleepiness
            (REDS) on PAP therapy. It&apos;s estimated to affect 15-30% of treated patients.
          </p>
          <p>
            Common causes that AHI won&apos;t reveal:
          </p>
          <ul className="ml-4 space-y-2">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-purple-400" />
              <span>
                <strong className="text-foreground">Subclinical flow limitation</strong> — enough
                to fragment sleep without triggering scored events
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-purple-400" />
              <span>
                <strong className="text-foreground">Periodic breathing patterns</strong> — cyclical
                variations in breath amplitude that suggest ventilatory instability
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-purple-400" />
              <span>
                <strong className="text-foreground">REM-clustered events</strong> — most of your
                events happening during dream sleep, which is critical for memory and mood
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-purple-400" />
              <span>
                <strong className="text-foreground">Mask-related arousals</strong> — brief
                awakenings from leak or pressure discomfort that don&apos;t register as respiratory
                events
              </span>
            </li>
          </ul>
        </div>
      </section>

      {/* What To Do */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Lightbulb className="h-5 w-5 text-amber-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Taking a Deeper Look at Your Therapy</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            The gap between what your PAP machine reports and what&apos;s actually happening during
            your sleep is significant. But you have more data than you think. Your ResMed SD card
            contains breath-by-breath flow waveforms from every night — far more detailed than the
            summary statistics shown in the myAir app.
          </p>
          <p>
            With the right analysis tools, this data can reveal:
          </p>
          <ul className="ml-4 space-y-1">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span>Whether flow limitation is present despite a low AHI</span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span>How your breathing patterns change across the night</span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span>Whether pressure or EPR adjustments might help</span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span>Objective data to bring to your next sleep clinic visit</span>
            </li>
          </ul>
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
            Azarbarzin et al. (2019). &quot;The Hypoxic Burden of Sleep Apnoea Predicts
            Cardiovascular Disease-Related Mortality.&quot; <em>European Heart Journal</em>,
            40(14), 1149-1157.
          </p>
          <p>
            McEvoy et al. (2016). &quot;CPAP for Prevention of Cardiovascular Events in
            Obstructive Sleep Apnea (SAVE Trial).&quot; <em>New England Journal of Medicine</em>,
            375(10), 919-931.
          </p>
          <p>
            Guilleminault et al. (2006). &quot;Upper Airway Resistance Syndrome: A Long-Term
            Outcome Study.&quot; <em>Journal of Psychiatric Research</em>, 40(3), 273-279.
          </p>
          <p>
            Punjabi et al. (2008). &quot;Sleep-disordered breathing and mortality: A prospective
            cohort study.&quot; <em>PLoS Medicine</em>, 5(8), e173.
          </p>
          <div className="mt-4 border-t border-border/30 pt-4">
            <p className="mb-2 text-xs font-semibold text-foreground">Related articles</p>
            <p>
              <Link href="/blog/ahi-normal-still-tired" className="text-primary hover:text-primary/80">
                Your AHI Is Normal But You&apos;re Still Exhausted
              </Link>{' '}
              -- a practical guide when AHI looks fine but symptoms persist.
            </p>
            <p className="mt-1">
              <Link href="/blog/arousals-vs-flow-limitation" className="text-primary hover:text-primary/80">
                Arousals Don&apos;t Tell the Whole Story
              </Link>{' '}
              -- why flow limitation may matter more than cortical arousals.
            </p>
            <p className="mt-1">
              <Link href="/blog/four-metrics-airwaylab-measures" className="text-primary hover:text-primary/80">
                four metrics AirwayLab tracks instead of AHI
              </Link>{' '}
              -- a deeper look at what AirwayLab measures beyond the AHI number.
            </p>
          </div>
        </div>
      </section>

      {/* Medical disclaimer */}
      <section className="mt-8">
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <p className="text-xs font-semibold text-foreground">Medical disclaimer</p>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            This article is for informational purposes only and does not constitute medical advice.
            AirwayLab does not diagnose, treat, or provide clinical recommendations. Always discuss
            your therapy data and any concerns with your clinician.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="mt-10 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
        <h3 className="text-lg font-bold">Go Beyond AHI with AirwayLab</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Upload your ResMed SD card to see Glasgow Index, flow limitation scores, RERA estimates,
          and trends your machine&apos;s app won&apos;t show you. Free, open-source, and 100%
          private.
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
            Read: Understanding Flow Limitation
          </Link>
        </div>
      </section>
    </article>
  );
}
