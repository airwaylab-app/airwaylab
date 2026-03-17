import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Globe,
  Layers,
  Lock,
  Monitor,
  Scale,
} from 'lucide-react';

export default function OSCARAlternativePost() {
  return (
    <article>
      <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
        If you use a CPAP or BiPAP machine and want to understand your therapy data, you&apos;ve
        probably heard of{' '}
        <a
          href="https://www.sleepfiles.com/OSCAR/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:text-primary/80"
        >
          OSCAR
        </a>{' '}
        (Open Source CPAP Analysis Reporter). It&apos;s been the go-to tool for PAP data analysis
        for years, and for good reason. But OSCAR and AirwayLab solve different problems. This
        article explains what each tool does well, where they differ, and why many users benefit
        from using both.
      </p>

      {/* What OSCAR Does Well */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Monitor className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            What OSCAR Does Well
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            OSCAR deserves its reputation. It&apos;s a mature, reliable desktop application with
            features no other free tool matches:
          </p>
          <ul className="ml-4 space-y-2">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
              <span>
                <strong className="text-foreground">Interactive waveform browsing</strong> with
                zoom, pan, and event marking at breath-by-breath resolution
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
              <span>
                <strong className="text-foreground">Multi-device support</strong> including
                ResMed, Philips, F&amp;P, and others
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
              <span>
                <strong className="text-foreground">Historical data</strong> stored locally
                with long-term trend views across months and years
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
              <span>
                <strong className="text-foreground">Detailed event logs</strong> showing
                individual apnea, hypopnea, and leak events on a timeline
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
              <span>
                <strong className="text-foreground">Active community</strong> on ApneaBoard.com
                and other forums, with years of shared knowledge
              </span>
            </li>
          </ul>
          <p>
            For manual waveform inspection and event-by-event review, OSCAR is hard to beat. If
            you need to zoom into a specific 30-second window and examine individual breaths,
            OSCAR is the right tool.
          </p>
        </div>
      </section>

      {/* What OSCAR Doesn't Do */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Layers className="h-5 w-5 text-amber-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            Where OSCAR Stops and AirwayLab Starts
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            OSCAR shows you what happened. AirwayLab tells you what it means. The difference
            is automated analysis:
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <p className="text-sm font-semibold text-amber-400">No Flow Limitation Scoring</p>
              <p className="mt-1 text-xs text-muted-foreground">
                OSCAR displays the raw flow waveform but doesn&apos;t compute flow limitation
                metrics. You have to visually identify flat-topped breaths yourself, which requires
                training and is subjective. AirwayLab runs four algorithms automatically.
              </p>
            </div>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <p className="text-sm font-semibold text-amber-400">No RERA Detection</p>
              <p className="mt-1 text-xs text-muted-foreground">
                OSCAR can&apos;t identify sequences of flow-limited breaths that end in arousals.
                AirwayLab&apos;s NED engine detects these automatically and estimates a RERA index
                and Respiratory Disturbance Index.
              </p>
            </div>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <p className="text-sm font-semibold text-amber-400">No Composite Metrics</p>
              <p className="mt-1 text-xs text-muted-foreground">
                AirwayLab computes the Glasgow Index (9-component breath shape score), FL Score,
                Regularity, Periodicity, and more. These synthesise thousands of breaths into
                actionable numbers you can track over time.
              </p>
            </div>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <p className="text-sm font-semibold text-amber-400">Desktop-Only</p>
              <p className="mt-1 text-xs text-muted-foreground">
                OSCAR requires installation on Windows, macOS, or Linux. AirwayLab runs in your
                browser on any device. Upload your SD card, get results, no installation needed.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Side by side */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Scale className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Side-by-Side Comparison</h2>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="py-3 pr-4 text-left font-semibold text-foreground">Feature</th>
                <th className="px-4 py-3 text-center font-semibold text-foreground">OSCAR</th>
                <th className="px-4 py-3 text-center font-semibold text-foreground">AirwayLab</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              <tr className="border-b border-border/30">
                <td className="py-2.5 pr-4">Interactive waveform zoom</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">Yes</td>
                <td className="px-4 py-2.5 text-center text-muted-foreground/60">Viewer only</td>
              </tr>
              <tr className="border-b border-border/30">
                <td className="py-2.5 pr-4">Multi-device support</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">Yes</td>
                <td className="px-4 py-2.5 text-center text-muted-foreground/60">ResMed only</td>
              </tr>
              <tr className="border-b border-border/30">
                <td className="py-2.5 pr-4">Flow limitation scoring</td>
                <td className="px-4 py-2.5 text-center text-muted-foreground/60">No</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">4 engines</td>
              </tr>
              <tr className="border-b border-border/30">
                <td className="py-2.5 pr-4">RERA detection</td>
                <td className="px-4 py-2.5 text-center text-muted-foreground/60">No</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">Yes (NED)</td>
              </tr>
              <tr className="border-b border-border/30">
                <td className="py-2.5 pr-4">Glasgow Index</td>
                <td className="px-4 py-2.5 text-center text-muted-foreground/60">No</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">Yes</td>
              </tr>
              <tr className="border-b border-border/30">
                <td className="py-2.5 pr-4">Oximetry analysis</td>
                <td className="px-4 py-2.5 text-center text-muted-foreground/60">Basic</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">17 metrics</td>
              </tr>
              <tr className="border-b border-border/30">
                <td className="py-2.5 pr-4">AI-powered insights</td>
                <td className="px-4 py-2.5 text-center text-muted-foreground/60">No</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">Yes (opt-in)</td>
              </tr>
              <tr className="border-b border-border/30">
                <td className="py-2.5 pr-4">Runs in browser</td>
                <td className="px-4 py-2.5 text-center text-muted-foreground/60">No</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">Yes</td>
              </tr>
              <tr className="border-b border-border/30">
                <td className="py-2.5 pr-4">Privacy</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">Local files</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">Browser-only</td>
              </tr>
              <tr className="border-b border-border/30">
                <td className="py-2.5 pr-4">Open source</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">Yes</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">Yes (GPL-3.0)</td>
              </tr>
              <tr className="border-b border-border/30">
                <td className="py-2.5 pr-4">Community data contribution</td>
                <td className="px-4 py-2.5 text-center text-muted-foreground/60">No</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">Yes (opt-in)</td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4">Cost</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">Free</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">Free core</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Privacy */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Lock className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Privacy: Both Tools Get It Right</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Both OSCAR and AirwayLab keep your data under your control. OSCAR stores everything
            locally on your computer. AirwayLab processes everything in your browser using Web
            Workers, and no data leaves your device unless you explicitly opt in to features like
            AI insights or community data contribution.
          </p>
          <p>
            This stands in contrast to manufacturer apps (myAir, DreamMapper) that upload your
            data to corporate servers and may share it with insurance providers. Both open-source
            tools give you the analysis without the privacy trade-off.
          </p>
        </div>
      </section>

      {/* Using Both */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold sm:text-2xl">Using Both Tools Together</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            OSCAR and AirwayLab aren&apos;t competitors; they&apos;re complementary. A practical
            workflow:
          </p>
          <div className="space-y-3">
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">1. Start with AirwayLab for the big picture</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Upload your SD card, get your Glasgow Index, FL Score, RERA estimate, and IFL Risk
                Score. These composite metrics tell you whether flow limitation is a problem and
                how severe it is. The traffic light system makes interpretation straightforward.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">2. Use OSCAR to investigate specifics</p>
              <p className="mt-1 text-xs text-muted-foreground">
                If AirwayLab flags elevated flow limitation in the second half of the night (H2),
                open that session in OSCAR and zoom into the waveforms. Look for the specific
                events and patterns. OSCAR&apos;s interactive zoom is unmatched for this kind of
                detailed inspection.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">3. Track trends in AirwayLab, verify in OSCAR</p>
              <p className="mt-1 text-xs text-muted-foreground">
                After a pressure or EPR change, monitor your AirwayLab metrics across nights.
                If a metric shifts significantly, confirm the change by inspecting representative
                waveforms in OSCAR. This gives you both statistical confidence and visual
                verification.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Who should use what */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Globe className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-bold sm:text-2xl">Which Tool Is Right for You?</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
              <p className="text-sm font-semibold text-blue-400">OSCAR is best if you...</p>
              <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
                <li>Need to browse individual waveforms interactively</li>
                <li>Use a non-ResMed device (Philips, F&amp;P)</li>
                <li>Want years of historical data in one view</li>
                <li>Prefer a desktop application</li>
                <li>Already know how to read flow waveforms</li>
              </ul>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <p className="text-sm font-semibold text-emerald-400">AirwayLab is best if you...</p>
              <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
                <li>Want automated flow limitation analysis</li>
                <li>Need a quick summary of how your therapy is working</li>
                <li>Want metrics that go beyond AHI (Glasgow, NED, RERA)</li>
                <li>Prefer browser-based tools with no installation</li>
                <li>Want AI-powered insights about your patterns</li>
                <li>Need exportable reports for your clinician</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* References */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <BookOpen className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-bold sm:text-2xl">Learn More</h2>
        </div>
        <div className="mt-4 space-y-2 text-sm text-muted-foreground">
          <p>
            <Link href="/blog/beyond-ahi" className="text-primary hover:text-primary/80">
              Beyond AHI: Why Your Sleep Apnea Score Might Be Misleading You
            </Link>{' '}
            &mdash; the research case for metrics beyond AHI.
          </p>
          <p>
            <Link href="/blog/understanding-flow-limitation" className="text-primary hover:text-primary/80">
              Understanding Flow Limitation
            </Link>{' '}
            &mdash; what flow limitation is and how it affects your sleep.
          </p>
          <p>
            <Link href="/about" className="text-primary hover:text-primary/80">
              AirwayLab Methodology
            </Link>{' '}
            &mdash; detailed documentation of all four analysis engines.
          </p>
          <p>
            <a
              href="https://www.sleepfiles.com/OSCAR/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary/80"
            >
              OSCAR Official Site
            </a>{' '}
            &mdash; download and documentation for OSCAR.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="mt-10 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
        <h3 className="text-lg font-bold">Try AirwayLab Free</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Upload your ResMed SD card and get flow limitation analysis in minutes. Four research-grade
          engines, composite metrics, RERA detection, and trend tracking. No installation, no account
          required, 100% private.
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
