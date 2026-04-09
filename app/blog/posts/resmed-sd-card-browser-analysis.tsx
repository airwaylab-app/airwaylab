import Link from 'next/link';
import { ArrowRight, FileText, FolderOpen, HardDrive, Monitor, Cpu } from 'lucide-react';

export default function ResMedSDCardBrowserAnalysisPost() {
  return (
    <article>
      <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
        Most ResMed CPAP and APAP machines keep a detailed record of every night&apos;s therapy on
        a small SD card. That card holds EDF (European Data Format) files &mdash; binary logs of
        your breathing patterns, pressure levels, and respiratory events. Until recently, reading
        those files meant installing desktop software. With AirwayLab, you can open them directly
        in your browser, with nothing to install.
      </p>

      {/* What's on the SD card */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <HardDrive className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">What&apos;s on your ResMed SD card?</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>Your ResMed machine stores two types of data on its SD card:</p>
          <ul className="ml-4 space-y-2">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
              <span>
                <strong className="text-foreground">Summary data</strong> &mdash; nightly AHI,
                mask leak, and usage hours, similar to what the device screen shows
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
              <span>
                <strong className="text-foreground">Detailed EDF files</strong> &mdash; continuous
                waveforms of your breathing patterns, flow rate, pressure, and respiratory events
                recorded at higher resolution throughout the night
              </span>
            </li>
          </ul>
          <p>
            The EDF files are where the detail lives. They contain the flow signal that makes it
            possible to look at things like flow limitation and RERA patterns &mdash; aspects of
            your breathing that a headline AHI score doesn&apos;t capture.
          </p>
        </div>
      </section>

      {/* Finding your files */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <FolderOpen className="h-5 w-5 text-amber-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Finding your files</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <div className="space-y-3">
            {[
              'Power off your ResMed machine.',
              'Remove the SD card from the slot on the side or back of the device.',
              'Insert it into your computer using an SD card reader or adapter.',
              <span key="step4">
                Open the card. You&apos;ll find a folder structure like{' '}
                <code className="rounded bg-border/40 px-1.5 py-0.5 text-xs font-mono text-foreground">
                  DATALOG/
                </code>{' '}
                containing{' '}
                <code className="rounded bg-border/40 px-1.5 py-0.5 text-xs font-mono text-foreground">
                  .edf
                </code>{' '}
                files organised by year and month.
              </span>,
              "You don't need to move, rename, or modify anything.",
            ].map((step, i) => (
              <div key={i} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-xs font-bold text-amber-400">
                  {i + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </div>
            ))}
          </div>
          <p>
            Most ResMed AirSense 10 and AirSense 11 machines use this same folder structure. If
            you&apos;re not sure whether your device records detailed data, check that the SD card
            slot is present and the card has been in the machine during recent sessions.
          </p>
        </div>
      </section>

      {/* Opening in AirwayLab */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Monitor className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Opening your data in AirwayLab</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <div className="space-y-3">
            {[
              <span key="s1">
                Go to{' '}
                <Link href="/analyze" className="text-primary hover:text-primary/80">
                  airwaylab.app/analyze
                </Link>
                .
              </span>,
              <span key="s2">
                Drag and drop your SD card folder &mdash; or individual{' '}
                <code className="rounded bg-border/40 px-1.5 py-0.5 text-xs font-mono text-foreground">
                  .edf
                </code>{' '}
                files &mdash; into the drop zone. You can also click to browse.
              </span>,
              'AirwayLab processes the files entirely in your browser using Web Workers. Nothing is uploaded — your data never leaves your device.',
              'Within a few seconds, your sessions appear.',
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
          <FileText className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold sm:text-2xl">What you&apos;ll see</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>Once your data is loaded, AirwayLab displays:</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              {
                label: 'Session list',
                desc: 'Each night as a separate entry with date, total duration, and AHI.',
              },
              {
                label: 'AHI summary',
                desc: 'Broken down by obstructive, central, and hypopnea counts per hour.',
              },
              {
                label: 'Flow limitation index',
                desc: 'Describes the frequency of partial upper airway narrowing across the night.',
              },
              {
                label: 'RERA timeline',
                desc: 'Respiratory effort-related arousals displayed as a visual pattern alongside the flow waveform.',
              },
              {
                label: 'Breathing waveform',
                desc: 'The full flow signal from your EDF file, scrollable night-by-night.',
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
              AirwayLab shows you what&apos;s in your data. It doesn&apos;t tell you what your
              numbers mean clinically, and it doesn&apos;t make recommendations about your therapy.
              For clinical interpretation of what you see, discuss it with your clinician or sleep
              specialist.
            </p>
          </div>
        </div>
      </section>

      {/* Why people use it */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Cpu className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-bold sm:text-2xl">
            Why people use it alongside existing tools
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Tools like OSCAR have long been the go-to for detailed CPAP data analysis on the
            desktop, and rightly so. AirwayLab is useful for a different case: when you want a
            quick browser-based look without setting up a full desktop environment, when you&apos;re
            on a machine where you can&apos;t install software, or when you want to share a link to
            your session data easily. There&apos;s no competition here &mdash; they complement each
            other.
          </p>
          <p>
            Read more in{' '}
            <Link
              href="/blog/oscar-alternative"
              className="text-primary hover:text-primary/80"
            >
              AirwayLab vs OSCAR: How They Complement Each Other
            </Link>
            .
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="mt-10 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
        <h3 className="text-lg font-bold">Read your ResMed data now</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Drag in your SD card files and see your AHI, flow limitation, and RERA data in seconds.
          No download. No account. 100% private.
        </p>
        <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/analyze"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow transition-colors hover:bg-primary/90"
          >
            Analyze Your Data <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="https://github.com/airwaylab/airwaylab"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            View Source on GitHub
          </a>
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
              href="/blog/how-to-read-cpap-data"
              className="text-primary hover:text-primary/80"
            >
              How to Read Your CPAP Data
            </Link>{' '}
            &mdash; a full guide to CPAP metrics beyond AHI.
          </p>
          <p>
            <Link
              href="/blog/oscar-alternative"
              className="text-primary hover:text-primary/80"
            >
              AirwayLab vs OSCAR
            </Link>{' '}
            &mdash; how AirwayLab and OSCAR complement each other.
          </p>
          <p>
            <Link
              href="/blog/cpap-data-analysis-browser-no-download"
              className="text-primary hover:text-primary/80"
            >
              Analyse CPAP Data in Your Browser
            </Link>{' '}
            &mdash; no download, no cloud, no account.
          </p>
        </div>
      </section>
    </article>
  );
}
