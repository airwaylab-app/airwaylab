import Link from 'next/link';
import { Activity, AlertTriangle, ArrowRight, BookOpen, Info } from 'lucide-react';

export default function WhatIsGlasgowIndexCPAP() {
  return (
    <article>
      <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
        Most PAP analysis focuses on events: apneas, hypopneas, AHI. The Glasgow Index looks at
        what happens between events -- in breaths that your machine never flagged.
      </p>

      {/* What Is It */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Info className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">What Is the Glasgow Index?</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            The Glasgow Index measures the <em>shape</em> of your inspiratory flow curve -- the
            pattern your breath traces during inhalation while you sleep. It characterises whether
            each breath has a normal, rounded inspiratory waveform or shows features associated
            with upper airway narrowing: flattening, irregular peaks, unusual timing, variable
            amplitude.
          </p>
        </div>
      </section>

      {/* How It Is Calculated */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Activity className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">How the Score Is Calculated</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            AirwayLab analyses each inspiratory breath in your session and scores it on nine
            independent features:
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              { name: 'Skew', desc: 'Whether peak flow occurs early or late in the breath' },
              { name: 'Spike', desc: 'Sharp, narrow peaks in the flow trace' },
              { name: 'Flat top', desc: 'Flattening of the waveform crest rather than a smooth curve' },
              { name: 'Top heavy', desc: 'Flow concentrated in the first portion of inhalation' },
              { name: 'Multi-peak', desc: 'More than one peak rather than a single rounded arc' },
              { name: 'No pause', desc: 'Absence of a natural inspiratory pause' },
              { name: 'Inspiration rate', desc: 'Abnormally fast or slow inhalation' },
              { name: 'Multi-breath', desc: 'Irregular cycles spanning more than one breath' },
              { name: 'Variable amplitude', desc: 'Significant variation in breath height across the night' },
            ].map((item) => (
              <div key={item.name} className="rounded-xl border border-border/50 p-3">
                <p className="text-sm font-semibold text-foreground">{item.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
          <p>
            Each component scores 0 (feature absent) or 1 (feature present). The overall Glasgow
            Index for the night is the sum, averaged across all scored breaths. A higher score
            means more breath shape irregularities were detected.
          </p>
          <p>
            AirwayLab&apos;s implementation is an open-source port of the DaveSkvn/Glasgow-Index
            algorithm (GPL-3.0). The code is publicly auditable -- you can verify exactly what it
            calculates.
          </p>
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
            Open the <strong className="text-foreground">Glasgow tab</strong> after loading your
            ResMed SD card data. You will see your overall nightly score, a component-level
            breakdown showing which features were elevated, and a trend view across multiple nights
            if your SD card contains more than one session.
          </p>
        </div>
      </section>

      {/* What it does NOT tell you */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <AlertTriangle className="h-5 w-5 text-amber-400" />
          <h2 className="text-xl font-bold sm:text-2xl">What the Glasgow Index Does NOT Tell You</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            The Glasgow Index is a data description of your breathing waveform shapes. It is not a
            clinical finding, a diagnosis, or a trigger for therapy changes. A high score does not
            confirm any specific condition. Flow shape scoring is one dimension among many in PAP
            data -- your clinician sees the full picture.
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
        <h3 className="text-lg font-bold">See Your Glasgow Index</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Upload your ResMed SD card data to see your Glasgow Index score, component breakdown, and
          trend across nights. Free, open-source, and 100% private -- nothing leaves your browser.
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

      {/* Related reading */}
      <section className="mt-8 border-t border-border/30 pt-6">
        <p className="mb-2 text-xs font-semibold text-foreground">Related reading</p>
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>
            <Link href="/blog/what-is-ned-sleep-apnea" className="text-primary hover:text-primary/80">
              What Is NED (Negative Effort Dependence)?
            </Link>{' '}
            -- a breath-by-breath measure of airway resistance during PAP therapy.
          </p>
          <p>
            <Link href="/blog/what-is-wat-score-cpap" className="text-primary hover:text-primary/80">
              What Is the WAT Score in CPAP Data?
            </Link>{' '}
            -- FL Score, regularity, and periodic breathing in one bundle.
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
            -- how the Glasgow Index fits alongside the other metrics AirwayLab measures.
          </p>
        </div>
      </section>

      {/* References */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <BookOpen className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-bold sm:text-2xl">Source</h2>
        </div>
        <div className="mt-4 text-sm text-muted-foreground">
          <p>
            AirwayLab implements an open-source port of the{' '}
            <strong className="text-foreground">DaveSkvn/Glasgow-Index</strong> algorithm
            (GPL-3.0). The algorithm was developed to score nine features of the inspiratory flow
            waveform. Code is publicly auditable on GitHub.
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
