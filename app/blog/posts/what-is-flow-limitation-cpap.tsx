import Link from 'next/link';
import { Wind, AlertTriangle, Waves, Search, BarChart3, ArrowRight } from 'lucide-react';

export default function WhatIsFlowLimitationCPAPPost() {
  return (
    <article>
      <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
        If you have ever opened OSCAR or AirwayLab and spotted &quot;flow limitation&quot; flagged
        in your data, you are not alone in wondering what it actually means. It sits in the same
        corner of the chart as apneas and hypopneas, yet it is distinctly different &mdash; and it
        can show up even on nights when your AHI looks textbook perfect.
      </p>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
        This post walks through what flow limitation is, how it differs from the more familiar
        apnea and hypopnea events, and what patterns are worth noting for your next appointment
        with your clinician.
      </p>

      {/* What Is Flow Limitation? */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Wind className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">What Is Flow Limitation?</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            A normal breath looks like a rounded arch on a flow-rate chart: air flows in smoothly,
            reaches a peak, and tapers off. Flow limitation appears when that arch flattens. Instead
            of a rounded top, the inspiratory curve develops a plateau &mdash; a telltale sign that
            airflow has hit a ceiling despite your breathing effort continuing.
          </p>
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-5">
            <p className="text-sm font-medium text-blue-400">Think of breathing through a straw</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Under normal conditions, you can pull air freely. If you pinch the straw slightly
              &mdash; partially narrowing it &mdash; you still get air, but your effort stops
              producing more flow. The straw is limiting you. That is the mechanical picture of flow
              limitation: a partial narrowing of the upper airway that constrains how much air can
              move in, without shutting the airway down completely.
            </p>
          </div>
          <p>
            Flow limitation is not a complete obstruction. Your airway stays open, air keeps moving,
            and your machine does not necessarily count an event. But the narrowing is real, and the
            body has to work harder to move the same volume of air.
          </p>
        </div>
      </section>

      {/* Flow Limitation vs. Apnea vs. Hypopnea */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <AlertTriangle className="h-5 w-5 text-amber-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            Flow Limitation vs. Apnea vs. Hypopnea
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            These three terms describe different points on the same spectrum of upper airway
            behaviour.
          </p>
          <ul className="ml-4 space-y-3">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
              <span>
                <strong className="text-foreground">Obstructive apnea</strong> &mdash; the airway
                collapses completely. Airflow stops. Your effort continues (often increasing) until
                the obstruction clears. This is what most people picture when they think of sleep
                apnoea.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
              <span>
                <strong className="text-foreground">Hypopnea</strong> &mdash; a partial reduction
                in airflow, typically defined as a 30&ndash;50% drop, usually accompanied by an
                oxygen desaturation or an arousal. The airway is partially obstructed but not shut.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
              <span>
                <strong className="text-foreground">Flow limitation</strong> &mdash; a flattening
                of the inspiratory curve without necessarily meeting the threshold criteria for a
                scored hypopnea. The airway is narrowing enough to cap airflow, but may not trigger
                a formal event count.
              </span>
            </li>
          </ul>
          <p>
            Flow limitation events are not scored in the standard AHI (Apnea-Hypopnea Index), which
            is why your AHI can look fine while flow limitation events are frequent. AHI counts
            apneas and qualifying hypopneas &mdash; flow limitation sits below that scoring
            threshold.
          </p>
        </div>
      </section>

      {/* Why It Matters Even When AHI Is Low */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Search className="h-5 w-5 text-rose-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            Why Flow Limitation Matters Even When AHI Is Low
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            AHI is a useful summary, but it is not the whole story.
          </p>
          <p>
            Upper airway resistance can be elevated &mdash; and sleep quality can be disrupted
            &mdash; without the airway collapsing enough to produce a scored event. This is
            sometimes described in research literature as upper airway resistance syndrome (UARS), a
            pattern where respiratory effort and flow limitation cause arousals and fragmented sleep
            even though formal apneas are infrequent.
          </p>
          <p>
            The practical consequence: some PAP users continue to feel unrested even after AHI drops
            to a &quot;normal&quot; range on therapy. Frequent flow limitation events are one pattern
            that is sometimes discussed with clinicians in these situations. That said, the
            interpretation of flow limitation data is a clinical conversation &mdash; what matters is
            whether the pattern is meaningful for your specific situation, and that is something only
            your care team can assess in context.
          </p>
          <div className="rounded-xl border border-border/50 bg-card/50 p-5">
            <p className="text-sm font-semibold text-foreground">RERAs and flow limitation</p>
            <p className="mt-1 text-sm text-muted-foreground">
              RERAs (Respiratory Effort-Related Arousals) are related: they capture the arousals
              caused by respiratory effort, including the kind of effort that builds when the airway
              is flow-limited. Some machines and analysis tools report RERAs separately. Flow
              limitation is the upstream waveform signal; RERAs can be the downstream consequence.
            </p>
          </div>
        </div>
      </section>

      {/* What Flow Limitation Looks Like in Your Data */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Waves className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            What Flow Limitation Looks Like in Your Data
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            In OSCAR, flow limitation is visible in the Flow Rate waveform. Look for breaths where
            the top of the inspiratory curve appears flattened or truncated rather than smoothly
            rounded. When many consecutive breaths show this plateau shape, that is a run of flow
            limitation.
          </p>
          <p>
            AirwayLab surfaces flow limitation in the same waveform panel. The analysis runs
            entirely in your browser &mdash; your data never leaves your device. You can zoom into
            individual breaths and compare the inspiratory curve shape across different time windows.
            A night with frequent flow limitation will show up as a stretch of flattened inspiratory
            peaks, often clustered in certain sleep positions or pressure ranges.
          </p>
          <p>Some things to notice when exploring your data:</p>
          <div className="space-y-3">
            <div className="flex gap-3 rounded-xl border border-border/50 p-4">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 font-mono text-xs font-bold text-emerald-400">
                1
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">Positional clusters</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Does flow limitation occur more in certain body positions? Some machines log
                  position data that can be cross-referenced with waveform events.
                </p>
              </div>
            </div>
            <div className="flex gap-3 rounded-xl border border-border/50 p-4">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 font-mono text-xs font-bold text-emerald-400">
                2
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">Pressure context</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Does the pattern appear at pressure ranges your machine frequently uses, or is it
                  more concentrated at lower pressures?
                </p>
              </div>
            </div>
            <div className="flex gap-3 rounded-xl border border-border/50 p-4">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 font-mono text-xs font-bold text-emerald-400">
                3
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">Event neighbours</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Does flow limitation precede or follow other flagged events, or does it appear in
                  isolation?
                </p>
              </div>
            </div>
          </div>
          <p className="text-xs italic text-muted-foreground/80">
            These are patterns you can bring to your clinician as data observations &mdash; not
            conclusions. The visualisation is informational; clinical interpretation requires a
            professional who knows your full history.
          </p>
        </div>
      </section>

      {/* What to Bring to Your Clinician */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <BarChart3 className="h-5 w-5 text-violet-400" />
          <h2 className="text-xl font-bold sm:text-2xl">What to Bring to Your Clinician</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            If you are seeing consistent flow limitation in your data, particularly if it correlates
            with feeling unrested, a few specific things are worth noting before your appointment:
          </p>
          <ul className="ml-4 space-y-2">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />
              <span>
                A time-stamped export or screenshot showing a representative run of flow limitation
                events
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />
              <span>
                Whether the pattern clusters at particular times of night or appears to be positional
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />
              <span>
                Your current pressure settings and whether your machine uses APAP or fixed CPAP
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />
              <span>
                Any recent changes in weight, medications, or sleep position habits
              </span>
            </li>
          </ul>
          <p>
            Your clinician can interpret these data points in the context of your full clinical
            picture &mdash; including whether a pressure adjustment, positional therapy, or
            additional investigation is appropriate. That judgement belongs with them; the data is
            yours to bring.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="mt-10 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
        <h3 className="text-lg font-bold">Explore Your Flow Waveforms</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          AirwayLab is a free, open-source (GPL-3.0) browser-based tool for visualising and
          exploring PAP therapy data. It reads your SD card data locally &mdash; nothing is
          uploaded, everything runs in your browser. Flow limitation waveform analysis is part of
          the free tier, and always will be.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          If you use OSCAR, AirwayLab complements it rather than replacing it. Some users prefer the
          waveform detail in one tool and the summary charts in the other. Both read the same source
          data.
        </p>
        <div className="mt-4">
          <Link
            href="/analyze"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow transition-colors hover:bg-primary/90"
          >
            Upload your SD card data and explore your flow waveforms{' '}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Medical Disclaimer */}
      <p className="mt-8 text-xs italic text-muted-foreground/60">
        AirwayLab is a data visualisation and analysis tool, not a medical device. The information
        in this post is for educational purposes only and does not constitute medical advice,
        diagnosis, or treatment. Always discuss your therapy data and sleep health concerns with a
        qualified clinician. Do not adjust your prescribed therapy settings without consulting your
        care team.
      </p>
    </article>
  );
}
