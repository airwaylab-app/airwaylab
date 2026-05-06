import Link from 'next/link';
import { AlertTriangle, ArrowRight, BarChart2, Info } from 'lucide-react';

export default function CPAPFlowLimitationScore05Meaning() {
  return (
    <article>
      <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
        If you have opened your CPAP data in OSCAR, you have probably seen an{' '}
        <strong className="text-foreground">FL (flow limitation)</strong> channel that cycles
        between three values: 0, 0.5, and 1.0. These are ResMed&apos;s categorical assessment of
        inspiratory flow limitation, recorded by your machine during therapy.
      </p>

      {/* The three values */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Info className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">What the Three Values Mean</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            ResMed AirSense 10 and AirCurve 10 devices record a flow limitation value
            approximately every two seconds throughout the night. The scale has three levels:
          </p>
          <div className="space-y-3">
            <div className="rounded-xl border border-border/50 p-4">
              <div className="flex items-center gap-2">
                <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-xs font-bold text-emerald-400">0.0</span>
                <p className="text-sm font-semibold text-foreground">No flow limitation detected</p>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                The shape of your inspiratory flow waveform at that moment was normal -- a smooth,
                rounded curve without detectable flattening.
              </p>
            </div>

            <div className="rounded-xl border border-border/50 p-4">
              <div className="flex items-center gap-2">
                <span className="rounded bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-400">0.5</span>
                <p className="text-sm font-semibold text-foreground">Moderate flow limitation</p>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                The device detected partial flattening of the inspiratory waveform. The airway is
                narrowing enough to restrict airflow, but not at maximum severity. This is the
                intermediate state.
              </p>
            </div>

            <div className="rounded-xl border border-border/50 p-4">
              <div className="flex items-center gap-2">
                <span className="rounded bg-rose-500/20 px-2 py-0.5 text-xs font-bold text-rose-400">1.0</span>
                <p className="text-sm font-semibold text-foreground">Severe flow limitation</p>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Significant flattening was detected. The top of the inspiratory curve is flat
                rather than rounded, indicating strong airway narrowing during inhalation.
              </p>
            </div>
          </div>
          <p>
            These three values are assigned by ResMed&apos;s proprietary firmware and stored in
            the FLOW_LIMIT channel of your device&apos;s EDF data file. They are a device-level
            snapshot updated every two seconds, not a per-breath calculation.
          </p>
        </div>
      </section>

      {/* OSCAR vs AirwayLab */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <BarChart2 className="h-5 w-5 text-purple-400" />
          <h2 className="text-xl font-bold sm:text-2xl">What You See in OSCAR vs AirwayLab</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            In <strong className="text-foreground">OSCAR</strong>, the FL channel is plotted as a
            step graph cycling between the three values. The proportion of time spent at 0.5 or
            1.0 gives a rough picture of how often flow limitation was recorded during the night.
          </p>
          <p>
            <strong className="text-foreground">AirwayLab</strong> takes a different approach.
            Instead of using ResMed&apos;s categorical snapshot, AirwayLab&apos;s WAT engine
            calculates its own continuous{' '}
            <strong className="text-foreground">FL Score</strong> (0-100) directly from the raw
            inspiratory waveform, breath by breath. This provides more granular resolution and is
            not dependent on ResMed&apos;s firmware logic.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">ResMed FL channel (OSCAR)</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Three-level snapshot updated every ~2 seconds. Assigned by device firmware.
                Categorical: 0, 0.5, or 1.0.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">AirwayLab FL Score</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Continuous 0-100 score. Calculated per breath from raw EDF waveform. Open-source,
                auditable, independent of firmware.
              </p>
            </div>
          </div>
          <p>
            The two approaches are complementary. The ResMed FL channel is a fast device-level
            check built into the machine. AirwayLab&apos;s FL Score is an independent, open-source
            waveform analysis running in your browser that you can verify yourself.
          </p>
          <p>
            Neither replaces clinical evaluation -- they are two different ways of describing the
            same underlying flow signal.
          </p>
        </div>
      </section>

      {/* What it does NOT tell you */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <AlertTriangle className="h-5 w-5 text-amber-400" />
          <h2 className="text-xl font-bold sm:text-2xl">What the FL Score Does NOT Tell You</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            A high proportion of 0.5 or 1.0 readings -- or a high AirwayLab FL Score -- does not
            automatically indicate a clinical problem or a need for therapy adjustment. Flow
            limitation is present to some degree in many PAP users and its significance depends
            on context only a clinician can assess.
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
        <h3 className="text-lg font-bold">See AirwayLab&apos;s Continuous FL Score</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Upload your ResMed SD card data to see AirwayLab&apos;s continuous FL Score alongside
          your Glasgow Index, NED, and WAT metrics -- all in your browser, nothing uploaded.
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
            <Link href="/blog/what-is-wat-score-cpap" className="text-primary hover:text-primary/80">
              What Is the WAT Score in CPAP Data?
            </Link>{' '}
            -- the FL Score is one of the three WAT metrics.
          </p>
          <p>
            <Link href="/blog/what-is-glasgow-index-cpap" className="text-primary hover:text-primary/80">
              What Is the Glasgow Index in CPAP/BiPAP Data?
            </Link>{' '}
            -- nine-component breath shape analysis.
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
            -- how the FL Score fits into AirwayLab&apos;s broader measurement framework.
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
