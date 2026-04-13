import Link from 'next/link';
import { Activity, AlertTriangle, ArrowRight, Info } from 'lucide-react';

export default function WhatIsWATScoreCPAP() {
  return (
    <article>
      <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
        Most CPAP analysis stops at AHI: total respiratory events per hour. WAT looks at what is
        happening in the intervals between flagged events -- moments when your machine counts
        everything as fine, but your breathing patterns may be showing subtle instability.
      </p>

      {/* What Is WAT */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Info className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">What Is the WAT Score?</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            WAT stands for <strong className="text-foreground">Wobble Analysis Tool</strong> -- a
            bundle of three independent metrics that AirwayLab calculates from your inspiratory
            flow data. Each metric measures a different aspect of breathing stability during PAP
            therapy.
          </p>
        </div>
      </section>

      {/* The three metrics */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Activity className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">The Three WAT Metrics</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <div className="space-y-4">
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">FL Score (Flow Limitation Score)</p>
              <p className="mt-2 text-sm text-muted-foreground">
                A percentage from 0 to 100 measuring how much of your inspiratory waveform shows
                flattening compared to a normal rounded profile. Higher means more flow limitation
                was present across the night. A score of 0 means no detectable waveform flattening.
                A score of 100 means fully flattened waveforms throughout.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                This is AirwayLab&apos;s own continuous score, calculated breath by breath from
                the raw EDF data. It is independent of ResMed&apos;s firmware and gives more
                granular resolution than the categorical 0/0.5/1.0 FL channel you may have seen
                in OSCAR.
              </p>
            </div>

            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">Regularity (Sample Entropy)</p>
              <p className="mt-2 text-sm text-muted-foreground">
                A statistical measure of how irregular your minute ventilation is from breath to
                breath. Higher entropy means more variable, inconsistent breathing patterns. Lower
                values indicate stable, regular ventilation. Sample Entropy is borrowed from
                nonlinear dynamics -- it quantifies unpredictability in the breathing signal.
              </p>
            </div>

            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">Periodicity Index</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Uses Fourier analysis to detect cyclical breathing patterns that repeat on a 30-100
                second cycle. A higher Periodicity Index suggests your breathing is oscillating in
                a regular pattern rather than staying stable throughout the night. This frequency
                band is associated with periodic breathing patterns.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Where to find it */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Activity className="h-5 w-5 text-purple-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Where to Find It in AirwayLab</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            WAT metrics appear in the <strong className="text-foreground">Flow tab</strong> of the
            AirwayLab dashboard. All three numbers are shown alongside the NED metrics for the
            selected night.
          </p>
        </div>
      </section>

      {/* What it does NOT tell you */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <AlertTriangle className="h-5 w-5 text-amber-400" />
          <h2 className="text-xl font-bold sm:text-2xl">What WAT Does NOT Tell You</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            WAT metrics describe characteristics of your breathing waveforms from a single night
            of data. They are not diagnostic and do not indicate whether therapy adjustment is
            needed. A high FL Score is one data point among many -- it describes a pattern, not a
            cause or a solution.
          </p>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
            <p className="text-sm font-medium text-amber-400">
              Discuss your data with your clinician for clinical interpretation.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mt-10 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
        <h3 className="text-lg font-bold">See Your WAT Score</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Upload your ResMed SD card data to see your FL Score, Regularity, and Periodicity Index.
          Everything runs in your browser -- nothing uploaded.
        </p>
        <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/analyze"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow transition-colors hover:bg-primary/90"
          >
            Analyze Your Data <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/blog/what-is-ned-sleep-apnea"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Read: What Is NED?
          </Link>
        </div>
      </section>

      {/* Related reading */}
      <section className="mt-8 border-t border-border/30 pt-6">
        <p className="mb-2 text-xs font-semibold text-foreground">Related reading</p>
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>
            <Link href="/blog/cpap-flow-limitation-score-0-5-meaning" className="text-primary hover:text-primary/80">
              CPAP Flow Limitation Score: What 0, 0.5, and 1.0 Mean
            </Link>{' '}
            -- how ResMed&apos;s categorical FL channel relates to AirwayLab&apos;s continuous score.
          </p>
          <p>
            <Link href="/blog/what-is-ned-sleep-apnea" className="text-primary hover:text-primary/80">
              What Is NED (Negative Effort Dependence)?
            </Link>{' '}
            -- a companion metric calculated in the same Flow tab.
          </p>
          <p>
            <Link href="/glossary" className="text-primary hover:text-primary/80">
              AirwayLab Glossary
            </Link>{' '}
            -- definitions of all metrics used in AirwayLab.
          </p>
          <p>
            <Link href="/blog/four-metrics-airwaylab-measures" className="text-primary hover:text-primary/80">
              see all four metrics AirwayLab tracks
            </Link>{' '}
            -- how WAT fits alongside the other metrics AirwayLab measures beyond AHI.
          </p>
        </div>
      </section>

      {/* Medical disclaimer */}
      <p className="mt-8 text-xs italic text-muted-foreground/60">
        AirwayLab is a free, open-source tool for analysing PAP flow data. Your data never leaves
        your browser. Nothing on this page constitutes medical advice -- always discuss your results
        with a qualified sleep specialist.
      </p>
    </article>
  );
}
