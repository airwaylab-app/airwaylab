import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  Battery,
  BookOpen,
  Brain,
  Lightbulb,
  Stethoscope,
  TrendingUp,
} from 'lucide-react';

export default function AHINormalStillTiredPost() {
  return (
    <article>
      <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
        Your AHI is under 5. Your sleep app says you&apos;re doing great. So why are you still
        dragging yourself through the day, reaching for caffeine by noon, and wondering whether
        your PAP machine is actually doing anything? <strong className="text-foreground">You&apos;re
        not imagining it</strong>, and you&apos;re not alone. An estimated 15-30% of treated
        sleep apnea patients report persistent fatigue despite &quot;normal&quot; AHI numbers.
      </p>

      {/* The AHI blind spot */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <AlertTriangle className="h-5 w-5 text-amber-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            Why a Normal AHI Doesn&apos;t Mean Normal Sleep
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            The Apnea-Hypopnea Index counts apneas (complete breathing stops) and hypopneas
            (partial reductions with oxygen drops). If your AHI is 2, it means your airway fully
            or mostly collapsed about twice per hour. That sounds fine.
          </p>
          <p>
            But AHI has a major blind spot:{' '}
            <Link href="/blog/understanding-flow-limitation" className="text-primary hover:text-primary/80">
              flow limitation
            </Link>. This is partial airway narrowing that restricts airflow without triggering a
            scored event. Your airway narrows enough to flatten your breathing waveform, increase
            respiratory effort, and fragment your sleep, but not enough for AHI to notice.
          </p>
          <p>
            Think of it this way: AHI counts when the pipe is almost fully blocked. Flow limitation
            is when the pipe is half-squeezed all night long. The pipe never fully closes, so AHI
            stays low, but the effort to breathe through a constricted airway is exhausting your
            nervous system.
          </p>
        </div>
      </section>

      {/* What's actually happening */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Brain className="h-5 w-5 text-purple-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            What&apos;s Actually Happening While You Sleep
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Research from Dr. Avram Gold and others has identified several mechanisms that disrupt
            sleep quality without showing up in AHI:
          </p>
          <div className="space-y-3">
            <div className="rounded-xl border border-border/50 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-purple-400" />
                <p className="text-sm font-semibold text-foreground">RERAs (Respiratory Effort-Related Arousals)</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Sequences of flow-limited breaths that end in a micro-arousal. Your brain briefly
                wakes to restore airflow, then falls back asleep. You don&apos;t remember it, but
                your sleep architecture is fragmented. RERAs are{' '}
                <Link href="/blog/beyond-ahi" className="text-primary hover:text-primary/80">
                  not counted in AHI
                </Link>.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-rose-400" />
                <p className="text-sm font-semibold text-foreground">Autonomic Stress Response</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Flow limitation can activate your body&apos;s fight-or-flight response via the
                limbic system, even without a cortical arousal. Your heart rate spikes, blood
                pressure rises, and stress hormones are released, all while you appear to be
                sleeping normally.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-400" />
                <p className="text-sm font-semibold text-foreground">Sleep Architecture Disruption</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Even without full arousals, flow limitation can shift your sleep between stages,
                reducing the deep and REM sleep your body needs for restoration. The result is
                hours of &quot;sleep&quot; that leaves you unrefreshed.
              </p>
            </div>
          </div>
          <p>
            This cluster of symptoms has a clinical name:{' '}
            <Link href="/glossary#uars" className="text-primary hover:text-primary/80">
              Upper Airway Resistance Syndrome (UARS)
            </Link>. It&apos;s characterised by significant flow limitation and symptoms despite
            a normal AHI.
          </p>
        </div>
      </section>

      {/* Signs your AHI is lying */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Battery className="h-5 w-5 text-amber-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            Signs Your AHI Might Be Missing the Problem
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>If several of these resonate, flow limitation may be worth investigating:</p>
          <ul className="ml-4 space-y-2">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
              <span>Your AHI is consistently low (under 5), but you never feel rested</span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
              <span>You feel worse in the second half of the night or wake up feeling like you barely slept</span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
              <span>Morning headaches, jaw tension, or a dry mouth that your current settings haven&apos;t resolved</span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
              <span>
                Your{' '}
                <Link href="/blog/epworth-sleepiness-scale" className="text-primary hover:text-primary/80">
                  Epworth Sleepiness Scale
                </Link>{' '}
                score is normal, but your fatigue is real (ESS measures sleepiness, not fatigue)
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
              <span>Your sleep physician says &quot;your numbers look great&quot; but you don&apos;t feel great</span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
              <span>Brain fog, difficulty concentrating, or cognitive symptoms that PAP hasn&apos;t fixed</span>
            </li>
          </ul>
        </div>
      </section>

      {/* What you can do */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <TrendingUp className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            How to See What AHI Is Hiding
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Your PAP machine&apos;s SD card contains breath-by-breath flow waveform data from
            every night. It records far more than what the myAir or DreamMapper app shows you.
            With the right analysis, this raw data reveals the flow limitation patterns AHI ignores.
          </p>
          <p>Here&apos;s what to look for:</p>
          <div className="space-y-3">
            <div className="rounded-xl border border-border/50 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-400" />
                <p className="text-sm font-semibold text-foreground">
                  <Link href="/glossary#glasgow-index" className="hover:text-primary">Glasgow Index</Link>
                  {' '}(Breath Shape)
                </p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Scores how distorted your breathing waveform is across 9 shape characteristics.
                A score above 2.0 suggests significant residual flow limitation, even with a
                low AHI. This is the single most informative metric for detecting undertreated
                airway resistance.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-400" />
                <p className="text-sm font-semibold text-foreground">
                  <Link href="/glossary#fl-score" className="hover:text-primary">FL Score</Link>
                  {' '}(Flow Limitation Percentage)
                </p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Measures what percentage of your breaths show flat-topped inspiratory patterns,
                the hallmark of a narrowed airway. Above 50% means more than half your breaths
                are flow-limited.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-rose-400" />
                <p className="text-sm font-semibold text-foreground">
                  <Link href="/glossary#ned" className="hover:text-primary">NED</Link>
                  {' '}+ RERA Estimate
                </p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Detects per-breath flow limitation and identifies RERA-like events, the arousal
                sequences AHI misses entirely. The estimated RERA Index combined with AHI gives
                you something closer to the true Respiratory Disturbance Index (RDI).
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Talk to your doctor */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Stethoscope className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            When to Bring This to Your Clinician
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Data is most useful when it informs a conversation with your sleep physician.
            Consider requesting a review if:
          </p>
          <ul className="ml-4 space-y-2">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
              <span>
                Your flow limitation metrics are consistently elevated (Glasgow above 2.0,
                FL Score above 50%, or high RERA count) despite low AHI
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
              <span>
                You notice a pattern of worsening metrics in the second half of the night
                (the H2 split), which often correlates with REM-related airway narrowing
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
              <span>
                Your symptoms persist after 3+ months of compliant PAP use with no improvement
              </span>
            </li>
          </ul>
          <p>
            AirwayLab provides detailed reports you can export as PDF, CSV, or a formatted forum
            post. Objective data makes it easier for your clinician to evaluate whether a pressure
            adjustment, mode change (e.g. BiPAP), or further investigation is warranted.
          </p>
        </div>
      </section>

      {/* References */}
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
            &mdash; a deeper look at what flow limitation is and why it matters.
          </p>
          <p>
            <Link href="/blog/beyond-ahi" className="text-primary hover:text-primary/80">
              Beyond AHI: Why Your Sleep Apnea Score Might Be Misleading You
            </Link>{' '}
            &mdash; the research case against relying on AHI alone.
          </p>
          <p>
            <Link href="/blog/arousals-vs-flow-limitation" className="text-primary hover:text-primary/80">
              Arousals Don&apos;t Tell the Whole Story
            </Link>{' '}
            &mdash; why flow limitation may matter more than cortical arousals.
          </p>
          <p>
            <Link href="/blog/flow-limitation-and-sleepiness" className="text-primary hover:text-primary/80">
              Does Flow Limitation Drive Sleepiness?
            </Link>{' '}
            &mdash; evidence linking flow limitation directly to daytime symptoms.
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
            limitation analysis from SD card data is an estimate, not a polysomnography-grade
            measurement. Always discuss therapy changes with your sleep physician. The metrics
            provided are for educational purposes and to inform clinical conversations.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="mt-10 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
        <h3 className="text-lg font-bold">See What Your AHI Is Missing</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Upload your ResMed SD card to AirwayLab. Four research-grade engines analyse your flow
          data for the patterns AHI ignores. Free, open-source, and 100% private — your data
          never leaves your browser.
        </p>
        <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/analyze"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow transition-colors hover:bg-primary/90"
          >
            Analyze Your Data <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/getting-started"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Getting Started Guide
          </Link>
        </div>
      </section>
    </article>
  );
}
