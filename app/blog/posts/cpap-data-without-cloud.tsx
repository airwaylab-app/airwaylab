import Link from 'next/link';
import {
  Activity,
  Cloud,
  ShieldCheck,
  Laptop,
  HelpCircle,
  BookOpen,
  ArrowRight,
  ServerOff,
  Lock,
  Shield,
} from 'lucide-react';

export default function CpapDataWithoutCloudPost() {
  return (
    <article>
      <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
        If you&apos;ve been thinking about how to keep your CPAP data without cloud storage,
        you&apos;re asking the right question. Your PAP machine records a detailed physiological log
        every night — and by default, that data travels further than most users realise. This guide
        explains what&apos;s being collected, where it goes, and what tools let you analyse it
        entirely on your own device.
      </p>

      <blockquote className="mt-6 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-muted-foreground">
        <strong className="text-amber-400">Medical disclaimer:</strong> This article is for
        informational purposes only. Nothing here constitutes medical advice. Always discuss your
        therapy with your prescribing clinician before making any changes.
      </blockquote>

      {/* What Your CPAP Machine Records */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Activity className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">What Your CPAP Machine Records</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Modern PAP devices are capable data loggers. Depending on your machine and its
            configuration, the SD card or internal memory typically stores:
          </p>
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-5">
            <p className="text-sm font-medium text-blue-400">Recorded each night</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                <span>
                  <strong className="text-foreground">AHI (apnoea-hypopnoea index)</strong> — the
                  headline event count per hour that most compliance dashboards show
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                <span>
                  <strong className="text-foreground">Flow limitation data</strong> — a detailed
                  trace of each breath, captured even when no discrete event is formally scored
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                <span>
                  <strong className="text-foreground">
                    RERAs (respiratory effort-related arousals)
                  </strong>{' '}
                  — disturbance events below the threshold for a scored apnoea, but disruptive
                  enough to affect sleep quality
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                <span>
                  <strong className="text-foreground">Leak rate</strong> — how well your mask seals
                  across the night
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                <span>
                  <strong className="text-foreground">Pressure history</strong> — what pressure (or
                  pressure range, for APAP/BiPAP) the machine applied moment to moment
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                <span>
                  <strong className="text-foreground">Snore flagging</strong> — the device&apos;s
                  own estimate of snoring episodes
                </span>
              </li>
            </ul>
          </div>
          <p>
            That&apos;s a detailed record of every night on therapy. It&apos;s also why a growing
            number of users reasonably ask: who else can access this?
          </p>
        </div>
      </section>

      {/* Where Your Data Goes by Default */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Cloud className="h-5 w-5 text-amber-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Where Your Data Goes by Default</h2>
        </div>
        <div className="mt-4 space-y-6 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <div>
            <h3 className="mb-2 text-base font-semibold text-foreground">ResMed myAir</h3>
            <p>
              ResMed AirSense and AirMini devices transmit nightly data via built-in cellular or
              Wi-Fi to the myAir platform by default. Unless you actively disable that connection,
              your data leaves your device every morning.
            </p>
            <p className="mt-3">
              myAir uses this data to generate your compliance score, send sleep coaching
              notifications, and share summary data with your prescribing provider or DME (durable
              medical equipment) supplier if you&apos;re enrolled in remote monitoring. In many
              markets, CPAP compliance monitoring is tied directly to insurance reimbursement —
              which gives many users little practical choice but to remain enrolled even if
              they&apos;d prefer not to.
            </p>
            <p className="mt-3">
              ResMed&apos;s privacy policy permits sharing anonymised aggregate data for research and
              product improvement. Data can also be accessed by &quot;authorised service
              partners.&quot; Like most health apps, the full scope of what&apos;s shared is buried
              in terms most users never read.
            </p>
          </div>

          <div>
            <h3 className="mb-2 text-base font-semibold text-foreground">
              Philips Respironics
            </h3>
            <p>
              After the recall, Philips&apos;s DreamMapper platform has been discontinued for
              affected devices. For non-recalled devices, the data story is similar: cloud sync,
              provider access, and opaque sharing terms.
            </p>
          </div>

          <div>
            <h3 className="mb-2 text-base font-semibold text-foreground">
              Your Provider and Insurer
            </h3>
            <p>
              If you&apos;re enrolled in a remotely monitored programme, your prescribing clinician
              and often your DME supplier can view your nightly compliance data and basic therapy
              statistics. Insurers funding your equipment may require minimum compliance thresholds.
              Your private sleep behaviour can have direct financial consequences — which is a
              legitimate reason to think carefully about where your data lives.
            </p>
          </div>
        </div>
      </section>

      {/* The Case for Local Analysis */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">The Case for Local Analysis</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Users who prefer to analyse their CPAP data without cloud sync tend to give consistent
            reasons:
          </p>
          <div className="space-y-3">
            <div className="flex gap-3 rounded-xl border border-border/50 p-4">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 font-mono text-xs font-bold text-emerald-400">
                1
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">Insurance concerns</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  In markets without strong health data protections, detailed sleep records could
                  theoretically inform underwriting for life or disability insurance.
                </p>
              </div>
            </div>
            <div className="flex gap-3 rounded-xl border border-border/50 p-4">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 font-mono text-xs font-bold text-emerald-400">
                2
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">Employment situations</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Professional drivers, pilots, and others in safety-critical roles sometimes have
                  concerns about what a cloud-linked sleep disorder record implies for their
                  certification.
                </p>
              </div>
            </div>
            <div className="flex gap-3 rounded-xl border border-border/50 p-4">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 font-mono text-xs font-bold text-emerald-400">
                3
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">Personal preference</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Health data is personal. Some people simply don&apos;t want a corporation holding
                  a nightly record of their physiology.
                </p>
              </div>
            </div>
            <div className="flex gap-3 rounded-xl border border-border/50 p-4">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 font-mono text-xs font-bold text-emerald-400">
                4
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">Richer analysis</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Manufacturer apps are optimised for compliance scores and headline averages. If
                  you want to examine flow limitation patterns, correlate RERAs with pressure
                  settings, or understand your breathing patterns in detail, you need the full
                  data — and tools built to surface it.
                </p>
              </div>
            </div>
          </div>
          <p>None of these reasons require justification. Keeping your health data local is a legitimate choice.</p>
        </div>
      </section>

      {/* Tools for CPAP Analysis Without Uploading */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Laptop className="h-5 w-5 text-purple-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            Tools for CPAP Analysis Without Uploading to the Cloud
          </h2>
        </div>
        <div className="mt-4 space-y-6 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <div>
            <h3 className="mb-2 text-base font-semibold text-foreground">OSCAR</h3>
            <p>
              OSCAR (Open Source CPAP Analysis Reporter) is the established standard for local PAP
              analysis. It&apos;s a desktop application — available for Windows, macOS, and Linux —
              that reads directly from your SD card. No account required, no upload, no internet
              connection needed.
            </p>
            <p className="mt-3">
              OSCAR gives you the most comprehensive view of your CPAP data available outside a
              sleep lab: detailed graphs of flow rate, pressure, events, leaks, RERAs, and more. It
              supports most ResMed and Philips devices, plus a growing list of others.
            </p>
            <p className="mt-3">
              If you want to engage seriously with your therapy data, OSCAR is a strong starting
              point. The CPAP Talk community has extensive experience interpreting OSCAR output —
              though, as always, anything actionable should be discussed with your clinician.
            </p>
          </div>

          <div>
            <h3 className="mb-2 text-base font-semibold text-foreground">AirwayLab</h3>
            <div className="grid gap-3 sm:grid-cols-3 mb-4">
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-center">
                <ServerOff className="mx-auto h-6 w-6 text-emerald-400" />
                <p className="mt-2 text-sm font-semibold text-foreground">No Upload</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Data stays in your browser. Nothing is sent to any server.
                </p>
              </div>
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-center">
                <Lock className="mx-auto h-6 w-6 text-emerald-400" />
                <p className="mt-2 text-sm font-semibold text-foreground">You Control It</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Close the tab and the data is gone. No accounts, no tracking.
                </p>
              </div>
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-center">
                <Shield className="mx-auto h-6 w-6 text-emerald-400" />
                <p className="mt-2 text-sm font-semibold text-foreground">Open Source</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  GPL-3.0. Anyone can verify what happens with your data.
                </p>
              </div>
            </div>
            <p>
              AirwayLab is browser-based, which means your data never leaves your device at all.
              There&apos;s no installation, no account required for the free tier, and no server-side
              processing. You open the site, load your CPAP data file, and analysis runs entirely
              inside your browser.
            </p>
            <p className="mt-3">
              AirwayLab is designed to complement OSCAR, not compete with it. OSCAR&apos;s desktop
              depth is unmatched for fine-grained flow waveform analysis. AirwayLab&apos;s
              browser-based approach suits users who want access without a software install, or who
              move between devices. For more on how browser-based analysis works, see{' '}
              <Link
                href="/blog/cpap-data-analysis-browser-no-download"
                className="text-primary hover:text-primary/80"
              >
                CPAP Data Analysis in Your Browser Without Downloading Software
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <HelpCircle className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-bold sm:text-2xl">Frequently Asked Questions</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed">
          <div className="rounded-xl border border-border/50 p-5">
            <p className="font-semibold text-foreground">
              Can I turn off myAir cloud sync and still record data locally?
            </p>
            <p className="mt-2 text-muted-foreground">
              Yes. Your ResMed machine continues to function and record to the SD card regardless of
              whether cloud sync is active. The SD card data is what OSCAR and AirwayLab read.
              Disabling cloud sync simply stops the automatic overnight transmission to ResMed&apos;s
              servers. If you&apos;re enrolled in a provider-monitored compliance programme,
              disabling sync may affect compliance reporting — worth discussing with your care team
              before making the change.
            </p>
          </div>
          <div className="rounded-xl border border-border/50 p-5">
            <p className="font-semibold text-foreground">
              Is CPAP data covered by HIPAA in the US?
            </p>
            <p className="mt-2 text-muted-foreground">
              HIPAA covers health data held by covered entities — typically healthcare providers and
              insurers. Data you sync directly to a device manufacturer&apos;s app may or may not
              fall under HIPAA protections depending on the specifics of your arrangement. Tools
              like AirwayLab and OSCAR sidestep this question entirely: if your data never leaves
              your device, there&apos;s no cloud record to regulate.
            </p>
          </div>
          <div className="rounded-xl border border-border/50 p-5">
            <p className="font-semibold text-foreground">Does AirwayLab work offline?</p>
            <p className="mt-2 text-muted-foreground">
              The initial page load requires an internet connection. Once loaded, analysis runs
              locally — your CPAP file is processed by your own device&apos;s CPU, not a remote
              server. An offline-capable version is on the roadmap.
            </p>
          </div>
          <div className="rounded-xl border border-border/50 p-5">
            <p className="font-semibold text-foreground">
              Will using local tools affect my insurance compliance reporting?
            </p>
            <p className="mt-2 text-muted-foreground">
              Not necessarily. Many providers who require compliance reporting accept manually
              exported summaries, or allow you to remain enrolled in cloud monitoring while also
              analysing locally with separate tools. Some users do both: cloud sync for their
              provider, SD card data in OSCAR or AirwayLab for personal review. The approaches are
              not mutually exclusive.
            </p>
          </div>
          <div className="rounded-xl border border-border/50 p-5">
            <p className="font-semibold text-foreground">
              How can I verify AirwayLab isn&apos;t uploading my data?
            </p>
            <p className="mt-2 text-muted-foreground">
              The source code is public under GPL-3.0. You can read it, or ask a technically
              inclined friend to. For additional assurance, your browser&apos;s developer tools will
              show every network request the page makes — you can confirm directly that no data is
              transmitted when you load a file.
            </p>
          </div>
        </div>
      </section>

      {/* Further Reading */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <BookOpen className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-bold sm:text-2xl">Further Reading</h2>
        </div>
        <div className="mt-4 space-y-2 text-sm text-muted-foreground">
          <div className="mt-4 border-t border-border/30 pt-4">
            <p className="mb-2 text-xs font-semibold text-foreground">Related articles</p>
            <p>
              <Link href="/blog/pap-data-privacy" className="text-primary hover:text-primary/80">
                Your PAP Data and Privacy: What You Should Know
              </Link>{' '}
              — who sees your data and what your rights are.
            </p>
            <p className="mt-1">
              <Link href="/blog/oscar-alternative" className="text-primary hover:text-primary/80">
                AirwayLab and OSCAR: Using Both Together
              </Link>{' '}
              — comparing the two privacy-respecting PAP analysis tools.
            </p>
            <p className="mt-1">
              <Link
                href="/blog/cpap-data-analysis-browser-no-download"
                className="text-primary hover:text-primary/80"
              >
                CPAP Data Analysis in Your Browser Without Downloading Software
              </Link>{' '}
              — how browser-based analysis works and why your data stays private.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mt-10 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
        <h3 className="text-lg font-bold">Load Your SD Card Data</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          AirwayLab processes your CPAP data entirely in your browser. No accounts, no uploads, no
          cloud — just you and your data.
        </p>
        <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/analyze"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow transition-colors hover:bg-primary/90"
          >
            Load Your SD Card Data <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <p className="mt-8 text-xs text-muted-foreground/60">
        This article is for informational purposes only and does not constitute medical advice.
        Discuss any changes to your therapy with your prescribing clinician.
      </p>
    </article>
  );
}
