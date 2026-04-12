import Link from 'next/link';
import { ArrowRight, Activity, FileText, HardDrive, Monitor } from 'lucide-react';

export default function BiPAPDataAnalysisAirCurve10Post() {
  return (
    <article>
      <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
        Most CPAP analysis guides focus on CPAP and APAP users. If you&apos;re on a BiPAP &mdash;
        like a ResMed AirCurve 10 ST or VAuto &mdash; you&apos;ve probably noticed that tutorials,
        forum posts, and tools often don&apos;t quite apply to your device. The data is there on
        your SD card; it&apos;s just that fewer tools support it.
      </p>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
        AirwayLab supports AirCurve 10 EDF data. Here&apos;s how to use it.
      </p>

      {/* What data does the AirCurve record */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <HardDrive className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            What data does the AirCurve 10 record?
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Like ResMed&apos;s CPAP range, the AirCurve 10 family records detailed session data to
            an SD card in EDF format. That data includes:
          </p>
          <ul className="ml-4 space-y-2">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
              <span>
                <strong className="text-foreground">
                  Inspiratory and expiratory pressure (IPAP/EPAP)
                </strong>{' '}
                &mdash; the two pressure levels your machine delivers
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
              <span>
                <strong className="text-foreground">Pressure support</strong> &mdash; the
                difference between IPAP and EPAP across the session
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
              <span>
                <strong className="text-foreground">Flow rate waveform</strong> &mdash; your
                breathing signal, recorded continuously through the night
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
              <span>
                <strong className="text-foreground">
                  <Link href="/glossary/flow-limitation" className="text-foreground hover:text-primary">
                    Flow limitation
                  </Link>
                </strong>{' '}
                &mdash; a description of partial upper airway narrowing during inspiration
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
              <span>
                <strong className="text-foreground">Respiratory events</strong> &mdash; including
                hypopneas and central events where applicable in your data
              </span>
            </li>
          </ul>
          <p>
            Because BiPAP delivers two pressures, the waveform and pressure data look different
            from a standard CPAP trace &mdash; but the underlying EDF format is the same, and
            AirwayLab parses it.
          </p>
        </div>
      </section>

      {/* How to load */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Monitor className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">How to load your AirCurve 10 data</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <div className="space-y-3">
            {[
              'Power off your AirCurve 10 and remove the SD card.',
              'Insert the card into your computer using an SD card reader or adapter.',
              <span key="s3">
                Go to{' '}
                <Link href="/analyze" className="text-primary hover:text-primary/80">
                  airwaylab.app/analyze
                </Link>
                .
              </span>,
              <span key="s4">
                Drag and drop your SD card folder &mdash; or individual{' '}
                <code className="rounded bg-border/40 px-1.5 py-0.5 text-xs font-mono text-foreground">
                  .edf
                </code>{' '}
                files &mdash; into the drop zone.
              </span>,
              'AirwayLab processes the files entirely in your browser. Nothing is uploaded.',
            ].map((step, i) => (
              <div key={i} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-xs font-bold text-emerald-400">
                  {i + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What you'll see */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Activity className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold sm:text-2xl">What you&apos;ll see</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>Once loaded, AirwayLab displays:</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              {
                label: 'Session overview',
                desc: 'Date, duration, and a top-line AHI summary.',
              },
              {
                label: 'Pressure support',
                desc: 'How inspiratory support varied across the night.',
              },
              {
                label: 'Flow limitation',
                desc: 'Described as a frequency measure across the session.',
              },
              {
                label: 'Flow waveform',
                desc: 'Your full breathing signal, scrollable night-by-night.',
              },
              {
                label: 'RERA patterns',
                desc: 'Respiratory effort-related arousals displayed as a visual timeline.',
              },
            ].map(({ label, desc }) => (
              <div key={label} className="rounded-xl border border-border/50 p-4">
                <p className="text-sm font-semibold text-foreground">{label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
            <p className="text-sm text-muted-foreground">
              Everything shown is informational. AirwayLab describes what&apos;s in your EDF data
              &mdash; it doesn&apos;t interpret whether your BiPAP settings are appropriate for
              your needs, and it doesn&apos;t make therapeutic recommendations. If you see patterns
              that concern you, or want to understand what the numbers mean for your therapy,
              discuss them with your clinician or sleep specialist. They have the clinical context
              that the data alone can&apos;t provide.
            </p>
          </div>
        </div>
      </section>

      {/* Free, open, in your browser */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-bold sm:text-2xl">Free, open, and in your browser</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            AirwayLab is free and always will be. Core analysis runs in your browser with no data
            leaving your device. The source code is open under GPL-3.0, so you can see exactly how
            the parsing and analysis work. No account, no subscription, no cloud upload required.
          </p>
          <p>
            If you&apos;ve been looking for a tool that actually reads BiPAP EDF files rather than
            defaulting to CPAP-only data, give it a try.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="mt-10 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
        <h3 className="text-lg font-bold">Read your AirCurve 10 data free</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Drag in your SD card and see flow limitation, pressure support, and RERA patterns in your
          browser. No download, no account.
        </p>
        <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/analyze"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow transition-colors hover:bg-primary/90"
          >
            Analyze Your Data <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Disclaimer */}
      <p className="mt-8 rounded-xl border border-border/30 bg-muted/20 p-4 text-xs text-muted-foreground">
        <em>
          AirwayLab is informational only. Nothing displayed constitutes a clinical diagnosis or
          therapeutic recommendation. Always discuss your therapy data with your clinician for
          clinical interpretation.
        </em>
      </p>

      {/* Related reading */}
      <section className="mt-8 border-t border-border/30 pt-6">
        <p className="mb-2 text-xs font-semibold text-foreground">Related reading</p>
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>
            <Link
              href="/blog/resmed-sd-card-browser-analysis"
              className="text-primary hover:text-primary/80"
            >
              How to Read Your ResMed SD Card Data in Your Browser
            </Link>{' '}
            &mdash; step-by-step guide to finding and opening EDF files.
          </p>
          <p>
            <Link
              href="/blog/cpap-data-analysis-browser-no-download"
              className="text-primary hover:text-primary/80"
            >
              Analyse CPAP Data in Your Browser — No Download, No Cloud, No Account
            </Link>{' '}
            &mdash; how AirwayLab protects your privacy.
          </p>
          <p>
            <Link
              href="/blog/how-to-read-cpap-data"
              className="text-primary hover:text-primary/80"
            >
              How to Read Your CPAP Data
            </Link>{' '}
            &mdash; full guide to PAP data metrics.
          </p>
        </div>
        <p className="mb-2 mt-4 text-xs font-semibold text-foreground">Glossary</p>
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>
            <Link href="/glossary/flow-limitation" className="text-primary hover:text-primary/80">
              Flow limitation
            </Link>{' '}
            &mdash; what it means and how AirwayLab measures it.
          </p>
          <p>
            <Link href="/glossary/rera" className="text-primary hover:text-primary/80">
              RERA
            </Link>{' '}
            &mdash; respiratory effort-related arousals explained.
          </p>
          <p>
            <Link href="/glossary/ned-mean" className="text-primary hover:text-primary/80">
              NED Mean
            </Link>{' '}
            &mdash; per-breath negative effort dependence metric.
          </p>
        </div>
      </section>
    </article>
  );
}
