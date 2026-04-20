import Link from 'next/link';
import {
  AlertTriangle,
  Activity,
  Wind,
  BarChart3,
  Lightbulb,
  BookOpen,
  ArrowRight,
} from 'lucide-react';

export default function WhatAreRERAsPost() {
  return (
    <article>
      {/* Medical disclaimer */}
      <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
        <p className="text-xs leading-relaxed text-amber-200/80">
          <strong className="text-amber-300">Medical disclaimer:</strong> AirwayLab is not a medical
          device and is not FDA or CE cleared. The metrics described here are research-grade
          estimates, not clinical diagnoses. Always discuss your data and any therapy changes with
          your sleep physician.
        </p>
      </div>

      <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
        Your AHI is 1.4 and your machine says therapy is working. But you wake up exhausted, your
        brain fog never fully lifts, and no one can explain why. If this sounds familiar, the
        answer may be hiding in a class of events your AHI score is designed to ignore:{' '}
        <strong className="text-foreground">
          RERAs — Respiratory Effort-Related Arousals.
        </strong>
      </p>

      <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
        RERAs are real events that disrupt your sleep. They show up in your flow waveform. They
        cause micro-arousals, fragment your sleep architecture, and drive next-day symptoms. And
        they are systematically excluded from the single number your clinician uses to judge whether
        your therapy is successful.
      </p>

      {/* What Is a RERA? */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Wind className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">What Is a RERA?</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            A Respiratory Effort-Related Arousal is a sequence of breaths in which your upper airway
            progressively narrows — increasing respiratory effort breath by breath — until your brain
            wakes you just enough to re-open the airway. You don&apos;t fully wake up. You don&apos;t
            remember it. But the arousal is real, and it costs you a chunk of restorative sleep.
          </p>
          <p>
            The clinical definition requires a sequence of at least 3 breaths showing progressive{' '}
            <Link href="/blog/understanding-flow-limitation" className="text-primary hover:text-primary/80">
              flow limitation
            </Link>{' '}
            followed by an EEG arousal. In PAP therapy data, where EEG is unavailable, the arousal
            is inferred from the characteristic pattern: mounting effort, then an abrupt return to
            normal breathing as the arousal terminates the obstruction.
          </p>
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-5">
            <p className="text-sm font-medium text-blue-400">The RERA signature in flow data</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Look for a &quot;crescendo then reset&quot; pattern: 3–15 consecutive breaths where each
              breath becomes progressively more flow-limited (flatter waveform top), followed by one
              or two large, round, recovery breaths that break the sequence. That reset is the
              arousal — your brain intervening to save your airway.
            </p>
          </div>
        </div>
      </section>

      {/* Why RERAs Don't Appear in AHI */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <AlertTriangle className="h-5 w-5 text-amber-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Why RERAs Don&apos;t Show Up in Your AHI</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            AHI — the Apnea-Hypopnea Index — counts two things: complete breathing stops (apneas)
            lasting at least 10 seconds, and sustained airflow reductions (hypopneas) also lasting
            at least 10 seconds with a required drop in flow or oxygen saturation. RERAs satisfy
            neither criterion.
          </p>
          <p>
            A typical RERA involves partial narrowing — not complete obstruction — and lasts between
            30 seconds and 2 minutes across a sequence of affected breaths. Individual breaths are
            flow-limited but not stopped. Airflow continues throughout. The event doesn&apos;t
            produce a drop in oxygen saturation large enough to meet hypopnea scoring rules.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <p className="text-sm font-semibold text-amber-400">Apneas</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Complete airflow stop, ≥10 seconds. Counted in AHI.
              </p>
            </div>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <p className="text-sm font-semibold text-amber-400">Hypopneas</p>
              <p className="mt-1 text-xs text-muted-foreground">
                ≥30% airflow reduction, ≥10 seconds, with desaturation or arousal. Counted in AHI.
              </p>
            </div>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <p className="text-sm font-semibold text-amber-400">RERAs</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Progressive flow limitation with arousal, no sustained desaturation. Not counted in
                AHI. Reported as RERA Index separately.
              </p>
            </div>
          </div>
          <p>
            The Respiratory Disturbance Index (RDI) is the combined metric that includes apneas,
            hypopneas, and RERAs. When the gap between your RDI and your AHI is large, RERAs are
            likely driving your symptoms even though your headline number looks fine.
          </p>
        </div>
      </section>

      {/* How RERAs Appear in Flow Waveform Data */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Activity className="h-5 w-5 text-rose-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            How RERAs Appear in Your PAP Flow Data
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Every PAP machine records a continuous flow waveform — the shape of each breath from
            start to finish. This waveform contains the fingerprint of a RERA. You don&apos;t need
            EEG electrodes to see it; you need breath-by-breath shape analysis.
          </p>
          <p>
            The hallmark is progressive flow limitation. During normal breathing the inspiratory
            waveform has a smooth, rounded top. As the airway narrows, mid-inspiratory flow drops
            relative to peak flow — the &quot;scooped out&quot; shape that{' '}
            <Link href="/blog/understanding-flow-limitation" className="text-primary hover:text-primary/80">
              Negative Effort Dependence (NED)
            </Link>{' '}
            measures. In a RERA sequence, this scooping gets progressively worse over consecutive
            breaths before abruptly reverting to a round recovery breath.
          </p>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-xs font-bold text-primary">
                1
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">Breath 1–2: onset</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Mild flow limitation begins. The waveform top shows slight flattening. NED value
                  starts to rise above baseline.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-xs font-bold text-primary">
                2
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">Breath 3–10: crescendo</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Each successive breath is more flow-limited. The waveform top flattens further.
                  Respiratory effort is mounting — your body is working harder to pull air through a
                  narrowing passage.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-xs font-bold text-primary">
                3
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Recovery breath: the arousal signature
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  A large, round, high-flow breath breaks the sequence. This is the cortical arousal
                  — your brain briefly surfacing from sleep to restore airway patency. You
                  don&apos;t remember it, but it fragments your sleep architecture.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* UARS Connection */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <BarChart3 className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">RERAs and UARS: The Overlooked Diagnosis</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Upper Airway Resistance Syndrome (UARS) is the condition defined by high RERA burden
            with a normal or near-normal AHI. The sleep medicine community has debated whether it
            is a distinct disorder or simply a mild form of obstructive sleep apnea — but for
            patients, the distinction hardly matters. The symptoms are the same: unrefreshing sleep,
            daytime fatigue, cognitive fog, and sensitivity to even minor sleep disruption.
          </p>
          <p>
            UARS is diagnosed when:
          </p>
          <ul className="ml-4 list-disc space-y-1 text-sm text-muted-foreground">
            <li>AHI is below the clinical threshold for OSA (typically &lt;5/hr or &lt;15/hr depending on guideline)</li>
            <li>RERA Index is elevated (&gt;5/hr is commonly used as a flag)</li>
            <li>Symptoms of sleep-disordered breathing are present despite a &quot;normal&quot; AHI</li>
          </ul>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
            <p className="text-sm font-medium text-emerald-400">Why PAP therapy helps UARS</p>
            <p className="mt-2 text-sm text-muted-foreground">
              CPAP pressure stents the upper airway open, reducing both the apneas/hypopneas that
              define OSA and the partial obstructions that define UARS. Patients with UARS who
              respond poorly to lower CPAP pressures often improve when pressure is titrated to
              eliminate RERA sequences — not just keep AHI below 5. This requires tracking RERA
              Index, not just AHI.
            </p>
          </div>
          <p>
            This is one reason{' '}
            <Link
              href="/blog/hidden-respiratory-events"
              className="text-primary hover:text-primary/80"
            >
              standard flow metrics can miss significant sleep disruption
            </Link>
            : a therapy optimised only for AHI may leave RERA burden untouched.
          </p>
        </div>
      </section>

      {/* What a Good RERA Index Looks Like */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Lightbulb className="h-5 w-5 text-purple-400" />
          <h2 className="text-xl font-bold sm:text-2xl">What RERA Index Numbers Mean</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            RERA Index (RERAI) is the number of RERA events per hour of sleep. There is no
            universally agreed threshold, but some widely cited reference ranges are:
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <p className="text-sm font-semibold text-emerald-400">RERA Index &lt; 5/hr</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Generally considered normal or minimal burden. Unlikely to explain significant
                daytime symptoms on its own.
              </p>
            </div>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <p className="text-sm font-semibold text-amber-400">RERA Index 5–15/hr</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Moderate burden. May explain residual symptoms when AHI is controlled. Worth
                discussing with your sleep physician.
              </p>
            </div>
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
              <p className="text-sm font-semibold text-rose-400">RERA Index &gt; 15/hr</p>
              <p className="mt-1 text-xs text-muted-foreground">
                High burden. Likely contributing significantly to sleep fragmentation regardless of
                AHI. Review therapy settings with your clinician.
              </p>
            </div>
          </div>
          <p>
            These ranges are not clinical thresholds and should not be used for self-diagnosis.
            They are reference points to help you have an informed conversation with your sleep
            physician about whether RERA burden might explain your symptoms.
          </p>
        </div>
      </section>

      {/* How AirwayLab Detects RERAs */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <BookOpen className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">How AirwayLab Detects RERAs</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            AirwayLab analyses your PAP flow waveform breath-by-breath, computing NED (Negative
            Effort Dependence) for every inspiratory cycle. RERA detection looks for runs of 3 or
            more consecutive flow-limited breaths (NED above the flow limitation threshold) followed
            by a recovery breath — the waveform signature of a RERA sequence.
          </p>
          <p>
            Each detected sequence is timestamped, counted, and summarised as a RERA Index
            (events per hour). The Flow Analysis tab shows your RERA Index alongside AHI and the
            Glasgow Index flow limitation score, giving you a complete picture of your airway
            behaviour rather than just the events your machine chose to count.
          </p>
          <p>
            AirwayLab also reports the split between H1 (first half of night) and H2 (second half),
            which can indicate whether RERA burden is positional or REM-related — patterns that are
            often actionable with your sleep physician.
          </p>
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-5">
            <p className="text-sm font-medium text-blue-400">All analysis stays in your browser</p>
            <p className="mt-2 text-sm text-muted-foreground">
              RERA detection runs entirely in your browser using Web Workers. Your flow waveform
              data never leaves your device. No account is required to see your RERA Index.
            </p>
          </div>
        </div>
      </section>

      {/* Related articles */}
      <section className="mt-8 border-t border-border/30 pt-6">
        <p className="mb-2 text-xs font-semibold text-foreground">Related reading</p>
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>
            <Link href="/blog/understanding-flow-limitation" className="text-primary hover:text-primary/80">
              Understanding Flow Limitation
            </Link>{' '}
            &mdash; how the Glasgow Index scores breath shapes and what NED measures.
          </p>
          <p>
            <Link href="/blog/hidden-respiratory-events" className="text-primary hover:text-primary/80">
              Hidden Respiratory Events
            </Link>{' '}
            &mdash; brief obstructions and amplitude-based events that AHI and RERA Index both miss.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="mt-10 rounded-2xl border border-primary/20 bg-primary/5 p-6 text-center sm:p-8">
        <h2 className="text-xl font-bold sm:text-2xl">See Your RERA Index in Minutes</h2>
        <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground">
          Upload your ResMed SD card to AirwayLab and check the Flow Analysis tab. RERA Index,
          AHI, and the Glasgow flow limitation score — all computed in your browser. No software,
          no account, no data upload.
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
            href="/blog/understanding-flow-limitation"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Read: Understanding Flow Limitation
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </section>

      <p className="mt-8 text-[11px] italic text-muted-foreground/60">
        AirwayLab is not a medical device and is not FDA or CE cleared. These metrics are
        research-grade estimates, not clinical diagnoses. Always discuss results with your sleep
        physician before making therapy changes.
      </p>
    </article>
  );
}
