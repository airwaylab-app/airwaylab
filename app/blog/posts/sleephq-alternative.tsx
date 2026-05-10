import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Cloud,
  Globe,
  Lightbulb,
  Lock,
  Scale,
  Smartphone,
  Sparkles,
} from 'lucide-react';

export default function SleepHQAlternativePost() {
  return (
    <article>
      <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
        SleepHQ has built a genuinely useful platform for PAP users — a polished mobile app,
        automatic cloud sync, and an active community that helps users make sense of their
        data. If those features match your workflow, SleepHQ is a solid choice. But if you
        prefer to keep your breathing data off cloud servers entirely, there&apos;s an
        alternative that does the analysis in your browser — no upload required.
      </p>

      {/* What SleepHQ does well */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Smartphone className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">What SleepHQ Does Well</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            SleepHQ earned its community following with a genuinely strong product. Its
            strengths are real:
          </p>
          <ul className="ml-4 space-y-2">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
              <span>
                <strong className="text-foreground">Mobile app</strong> — upload and review
                your data from your phone. A workflow many users prefer over a laptop.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
              <span>
                <strong className="text-foreground">Cloud sync and long-term history</strong>{' '}
                — data stored in SleepHQ&apos;s cloud means you have a persistent record
                accessible across devices without managing local files.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
              <span>
                <strong className="text-foreground">Multi-device support</strong> — ResMed,
                Philips, Fisher &amp; Paykel, and others, including some machines that
                AirwayLab does not yet support.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
              <span>
                <strong className="text-foreground">Clinician sharing</strong> — a shareable
                report link makes it easy to send data to your sleep physician without
                exporting files.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
              <span>
                <strong className="text-foreground">Community</strong> — the SleepHQ user
                base is active, and community-driven features have shaped the product over
                time.
              </span>
            </li>
          </ul>
          <p>
            If mobile access, cloud backup, or multi-machine support is your primary need,
            SleepHQ is worth considering on those merits alone.
          </p>
        </div>
      </section>

      {/* The data handling difference */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Cloud className="h-5 w-5 text-amber-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            Cloud Upload vs. Browser-Only Processing
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            The clearest difference between SleepHQ and AirwayLab is where your data goes.
          </p>
          <p>
            SleepHQ is cloud-first: you upload your SD card or CPAP data file to SleepHQ&apos;s
            servers, where it is stored and processed. This is what enables the mobile app,
            cross-device sync, and long-term history. It also means your nightly breathing data
            lives on a third-party server, subject to SleepHQ&apos;s privacy policy and retention
            practices.
          </p>
          <p>
            AirwayLab works differently. All four analysis engines — Glasgow Index, WAT, NED,
            and the oximetry pipeline — run inside your browser using Web Workers. Your EDF
            files are read locally and never transmitted to a server. Results persist in
            your browser&apos;s localStorage for 30 days. Nothing leaves your device unless
            you explicitly opt in to the AI insights feature, which is fully consent-gated.
          </p>
          <p>
            This architectural difference matters for some users and not at all for others.
            If you&apos;re comfortable with health data in the cloud (your phone already
            knows a lot about you), SleepHQ&apos;s cloud model is a reasonable trade-off
            for the convenience it delivers. If you work in healthcare, have specific privacy
            preferences, or simply want your breathing data staying on your own hardware,
            browser-only processing is the right model.
          </p>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
            <p className="text-xs font-semibold text-amber-400">On verifiability</p>
            <p className="mt-1 text-xs text-muted-foreground">
              AirwayLab is GPL-3.0 open source — the analysis code is public and auditable.
              You can verify what the engines actually compute. This is the kind of trust
              that closed-source platforms cannot offer in the same way.
            </p>
          </div>
        </div>
      </section>

      {/* Analysis depth */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold sm:text-2xl">Analysis Depth</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            SleepHQ surfaces the metrics your PAP machine records — AHI, leak rate, usage
            hours, ResMed&apos;s device-reported flow limitation channel — in a clean,
            readable interface. For many users, that is exactly what they need.
          </p>
          <p>
            AirwayLab runs four additional analysis engines on top of the raw EDF waveform:
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">Glasgow Index</p>
              <p className="mt-1 text-xs text-muted-foreground">
                9-component breath shape score (0–9 scale) that captures inspiratory waveform
                distortion across the full night — patterns that AHI cannot detect.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">WAT — FL Score, Regularity, Periodicity</p>
              <p className="mt-1 text-xs text-muted-foreground">
                A continuous 0–100 flow limitation percentage, sample entropy of minute
                ventilation, and a Fourier-based periodicity index for cyclical breathing
                patterns.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">NED + RERA Estimation</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Per-breath Negative Effort Dependence scoring and heuristic estimation of
                RERA sequences — respiratory events that standard AHI counting misses.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">Oximetry Pipeline</p>
              <p className="mt-1 text-xs text-muted-foreground">
                17-metric SpO₂ and heart rate framework from Viatom/Checkme O2 Max data,
                including ODI-3, ODI-4, HR surges, and coupled desaturation events.
              </p>
            </div>
          </div>
          <p>
            These metrics go beyond what device firmware reports. They are calculated from
            the raw waveform, not inferred from the machine&apos;s event summaries.
          </p>
        </div>
      </section>

      {/* Side-by-side comparison table */}
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
                <th className="px-4 py-3 text-center font-semibold text-foreground">SleepHQ</th>
                <th className="px-4 py-3 text-center font-semibold text-foreground">AirwayLab</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              <tr className="border-b border-border/30">
                <td className="py-2.5 pr-4">Mobile app</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">Yes</td>
                <td className="px-4 py-2.5 text-center text-muted-foreground">Browser (mobile-friendly)</td>
              </tr>
              <tr className="border-b border-border/30">
                <td className="py-2.5 pr-4">Cloud storage</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">Yes</td>
                <td className="px-4 py-2.5 text-center text-muted-foreground">No (browser only)</td>
              </tr>
              <tr className="border-b border-border/30">
                <td className="py-2.5 pr-4">Data leaves your device</td>
                <td className="px-4 py-2.5 text-center text-amber-400">Yes (cloud upload)</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">No (opt-in only)</td>
              </tr>
              <tr className="border-b border-border/30">
                <td className="py-2.5 pr-4">Multi-device support</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">Yes (5+)</td>
                <td className="px-4 py-2.5 text-center text-muted-foreground">ResMed</td>
              </tr>
              <tr className="border-b border-border/30">
                <td className="py-2.5 pr-4">Long-term history</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">Yes</td>
                <td className="px-4 py-2.5 text-center text-muted-foreground">30-day local cache</td>
              </tr>
              <tr className="border-b border-border/30">
                <td className="py-2.5 pr-4">Clinician share link</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">Yes</td>
                <td className="px-4 py-2.5 text-center text-muted-foreground">Exportable PDF/CSV</td>
              </tr>
              <tr className="border-b border-border/30">
                <td className="py-2.5 pr-4">AHI, leak, usage hours</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">Yes</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">Yes</td>
              </tr>
              <tr className="border-b border-border/30">
                <td className="py-2.5 pr-4">Flow limitation scoring</td>
                <td className="px-4 py-2.5 text-center text-muted-foreground">Device-reported channel</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">4 waveform engines</td>
              </tr>
              <tr className="border-b border-border/30">
                <td className="py-2.5 pr-4">RERA estimation</td>
                <td className="px-4 py-2.5 text-center text-muted-foreground">—</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">NED engine</td>
              </tr>
              <tr className="border-b border-border/30">
                <td className="py-2.5 pr-4">Glasgow Index</td>
                <td className="px-4 py-2.5 text-center text-muted-foreground">—</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">Yes</td>
              </tr>
              <tr className="border-b border-border/30">
                <td className="py-2.5 pr-4">Open source</td>
                <td className="px-4 py-2.5 text-center text-muted-foreground">No</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">Yes (GPL-3.0)</td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4">Cost</td>
                <td className="px-4 py-2.5 text-center text-muted-foreground">Free / Premium tiers</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">Free core (always)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Privacy deep-dive */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Lock className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            Who Each Model Is Right For
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
              <p className="text-sm font-semibold text-blue-400">SleepHQ is a good fit if you...</p>
              <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
                <li>Primarily manage your therapy from a phone</li>
                <li>Want data synced across devices without managing files</li>
                <li>Use a non-ResMed device</li>
                <li>Value a shareable link for your sleep physician</li>
                <li>Are comfortable with health data in the cloud</li>
              </ul>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <p className="text-sm font-semibold text-emerald-400">AirwayLab is a good fit if you...</p>
              <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
                <li>Want your breathing data staying on your device</li>
                <li>Use a ResMed machine (AirSense 10/11, AirCurve)</li>
                <li>Want flow limitation analysis beyond device-reported metrics</li>
                <li>Want open-source, verifiable analysis algorithms</li>
                <li>Prefer no-account, no-install access to your data</li>
              </ul>
            </div>
          </div>
          <p>
            These tools solve different parts of the same problem. Some users run both — SleepHQ
            for the mobile interface and long-term record, AirwayLab for deeper flow analysis
            on nights when the metrics look unusual. Read more about{' '}
            <Link href="/blog/pap-data-privacy" className="text-primary hover:text-primary/80">
              who can see your PAP data and your rights
            </Link>.
          </p>
        </div>
      </section>

      {/* The flow limitation gap */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold sm:text-2xl">
            The Flow Limitation Gap
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            If your AHI is low but you still feel tired, standard metrics — AHI, leak, usage
            hours — may not be showing the full picture. Flow limitation is partial airway
            narrowing that produces a characteristic flat-topped inspiratory waveform without
            triggering a scored event. It does not appear in AHI.
          </p>
          <p>
            SleepHQ surfaces the device-reported flow limitation channel, which is ResMed
            firmware&apos;s categorical 0/0.5/1.0 estimate updated every few seconds. This is
            better than nothing, and it shows up clearly in OSCAR too.
          </p>
          <p>
            AirwayLab&apos;s analysis goes further: it runs the Glasgow Index, FL Score, NED, and
            RERA estimation on the raw EDF waveform, independent of what the device firmware
            reported. These are per-breath scores, not categorical snapshots. If flow limitation
            is a factor in your data, the additional depth can surface patterns that the device
            channel alone might not show.
          </p>
          <p>
            Your sleep physician can help interpret these patterns in context. AirwayLab&apos;s
            exportable PDF and forum-formatted export are designed to make that conversation
            easier.
          </p>
        </div>
      </section>

      {/* Learn more */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <BookOpen className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-bold sm:text-2xl">Learn More</h2>
        </div>
        <div className="mt-4 space-y-2 text-sm text-muted-foreground">
          <p>
            <Link
              href="/blog/oscar-alternatives-web-cpap-2026"
              className="text-primary hover:text-primary/80"
            >
              OSCAR Alternatives: Web-Based CPAP Analysis Tools for 2026
            </Link>{' '}
            &mdash; a broader look at the free tools available for PAP data analysis.
          </p>
          <p>
            <Link
              href="/blog/oscar-alternative"
              className="text-primary hover:text-primary/80"
            >
              AirwayLab vs OSCAR: What Each Tool Does Best
            </Link>{' '}
            &mdash; comparing AirwayLab with OSCAR, the long-standing open-source desktop app.
          </p>
          <p>
            <Link
              href="/blog/understanding-flow-limitation"
              className="text-primary hover:text-primary/80"
            >
              Understanding Flow Limitation in Your PAP Data
            </Link>{' '}
            &mdash; what flow limitation is and why AHI misses it.
          </p>
          <p>
            <Link href="/blog/pap-data-privacy" className="text-primary hover:text-primary/80">
              Your PAP Data Belongs to You
            </Link>{' '}
            &mdash; who can access your CPAP data and how to protect it.
          </p>
          <p>
            <Link href="/about" className="text-primary hover:text-primary/80">
              AirwayLab Methodology
            </Link>{' '}
            &mdash; full documentation of all four analysis engines.
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
            AirwayLab is a data visualisation and analytics tool, not a medical device.
            The metrics it computes describe patterns in your breathing data — they are not
            clinical diagnoses. Flow limitation analysis from EDF data is an estimate, not a
            polysomnography-grade measurement. Always discuss your data with your sleep
            physician. The metrics provided are for educational purposes and to support
            clinical conversations.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="mt-10 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
        <h3 className="text-lg font-bold">Analyse your data without uploading it</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          AirwayLab runs four analysis engines entirely in your browser. Your ResMed EDF data
          never leaves your device. No account, no install, no cloud upload. Free and always
          will be.
        </p>
        <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/analyze"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow transition-colors hover:bg-primary/90"
          >
            Try AirwayLab Free <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/blog/oscar-alternatives-web-cpap-2026"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Compare All Tools
            <Globe className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </article>
  );
}
