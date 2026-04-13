import Link from 'next/link';
import { Activity, AlertTriangle, ArrowRight, Info } from 'lucide-react';

export default function WhatIsNEDSleepApnea() {
  return (
    <article>
      <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
        NED stands for <strong className="text-foreground">Negative Effort Dependence</strong> --
        a specific breathing characteristic where increasing respiratory effort produces{' '}
        <em>less</em> inspiratory airflow rather than more.
      </p>

      {/* What Is NED */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Info className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">What Is Negative Effort Dependence?</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            In a normal breath, effort and airflow move together: breathe harder, get more air. In
            a breath with NED, that relationship inverts. The harder the respiratory muscles work,
            the more the airway resists, and the less air flows through. The &quot;negative&quot;
            in NED refers to this inverted relationship between effort and output.
          </p>
          <p>
            NED is a property of individual breaths, calculated per breath from the shape of the
            inspiratory flow waveform.
          </p>
        </div>
      </section>

      {/* What AirwayLab measures */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Activity className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">What AirwayLab&apos;s NED Engine Measures</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <div className="space-y-4">
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">NED Score</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Calculated as: <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">(peak flow - mid-inspiration flow) / peak flow x 100</code>. A higher
                percentage means a larger drop in flow during the mid-inspiratory phase -- the
                waveform signature of effort-dependent restriction.
              </p>
            </div>

            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">Flatness Index (FI)</p>
              <p className="mt-2 text-sm text-muted-foreground">
                The ratio of mean inspiratory flow to peak flow. Lower values indicate a more
                flattened waveform overall.
              </p>
            </div>

            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">Tpeak/Ti ratio</p>
              <p className="mt-2 text-sm text-muted-foreground">
                How early the peak flow occurs within the total inspiration time, expressed as a
                fraction. An early peak followed by declining flow is characteristic of
                flow-limited breathing.
              </p>
            </div>

            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">M-shape detection</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Identifies breaths where the flow curve shows a double-dip pattern during
                mid-inspiration -- a valley that drops below 80% of peak flow in the central
                portion of the breath. This waveform shape is associated with flow limitation.
              </p>
            </div>

            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">RERA detection</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Sequences of 3-15 consecutive breaths showing progressive flow limitation features,
                followed by a recovery breath, are flagged as potential Respiratory Effort-Related
                Arousals (RERAs). AirwayLab uses NED slope, recovery breath shape, and sigh
                detection to identify these sequences.
              </p>
            </div>

            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">Estimated Arousal Index (EAI)</p>
              <p className="mt-2 text-sm text-muted-foreground">
                A derived metric based on spikes in respiratory rate and tidal volume relative to a
                rolling two-minute baseline. It is a proxy measure for breathing-related sleep
                fragmentation, not a clinical arousal count.
              </p>
            </div>

            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">Night summary (H1/H2 split)</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Results are split into H1 and H2 (first and second halves of the night) to show
                whether flow limitation patterns shift across the session.
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
            NED metrics appear in the <strong className="text-foreground">Flow tab</strong>{' '}
            alongside the WAT metrics. The night summary includes H1/H2 split and the combined
            flow limitation percentage across all scored breaths.
          </p>
        </div>
      </section>

      {/* What it does NOT tell you */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <AlertTriangle className="h-5 w-5 text-amber-400" />
          <h2 className="text-xl font-bold sm:text-2xl">What NED Does NOT Tell You</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            NED describes the shape of your inspiratory waveforms. It is not a diagnostic
            instrument and does not confirm whether a specific airway condition is present. RERA
            detection in AirwayLab is based on flow signal heuristics from EDF data -- it is not
            equivalent to polysomnography-based RERA scoring by a sleep clinician.
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
        <h3 className="text-lg font-bold">See Your NED Analysis</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Upload your ResMed SD card data for full NED analysis in your browser -- NED score,
          flatness index, RERA detection, and H1/H2 split. No data uploaded.
        </p>
        <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/analyze"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow transition-colors hover:bg-primary/90"
          >
            Analyze Your Data <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/blog/what-is-wat-score-cpap"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Read: What Is the WAT Score?
          </Link>
        </div>
      </section>

      {/* Related reading */}
      <section className="mt-8 border-t border-border/30 pt-6">
        <p className="mb-2 text-xs font-semibold text-foreground">Related reading</p>
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>
            <Link href="/blog/what-is-glasgow-index-cpap" className="text-primary hover:text-primary/80">
              What Is the Glasgow Index in CPAP/BiPAP Data?
            </Link>{' '}
            -- nine-component breath shape scoring.
          </p>
          <p>
            <Link href="/blog/what-is-wat-score-cpap" className="text-primary hover:text-primary/80">
              What Is the WAT Score in CPAP Data?
            </Link>{' '}
            -- FL Score, regularity, and periodicity bundle.
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
            -- how NED fits alongside the other metrics AirwayLab measures beyond AHI.
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
