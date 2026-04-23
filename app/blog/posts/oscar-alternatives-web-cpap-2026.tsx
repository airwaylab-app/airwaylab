import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Globe,
  Lightbulb,
  Lock,
  Monitor,
  Scale,
  Sparkles,
} from 'lucide-react';

export default function OSCARAlternativesWebCPAP2026() {
  return (
    <article>
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">Medical disclaimer:</strong> AirwayLab, OSCAR, and
          SleepHQ are data visualisation and analysis tools, not medical devices. The information
          these tools provide is for personal reference only and is not a substitute for
          professional clinical advice. Always discuss your therapy data with your prescribing
          clinician.
        </p>
      </div>

      <p className="mt-6 text-base leading-relaxed text-muted-foreground sm:text-lg">
        If you&apos;ve been searching for an OSCAR CPAP alternative in 2026, you&apos;re probably
        in one of two situations. Maybe you&apos;ve heard of OSCAR but want something that
        doesn&apos;t require downloading and installing software. Or maybe you were a DreamMapper
        user — Philips shut the platform down in January 2026, and you need something new.
      </p>

      <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
        Either way, there are now three well-regarded free tools in this space:{' '}
        <strong className="text-foreground">OSCAR</strong>,{' '}
        <strong className="text-foreground">SleepHQ</strong>, and{' '}
        <strong className="text-foreground">AirwayLab</strong>. Each takes a different approach.
        This article explains what each one does, who it&apos;s built for, and how to choose — or
        combine them.
      </p>

      {/* Why People Look for OSCAR Alternatives */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Globe className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Why People Look for OSCAR Alternatives</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            OSCAR has been the gold standard for CPAP data analysis for years. It&apos;s open
            source, detailed, and trusted by the PAP community. But it has real setup friction: you
            download it, install it, connect your SD card, and configure it. For users who are less
            technical, who use a Chromebook, or who just want to check their data without managing a
            desktop installation, that barrier matters.
          </p>
          <p>
            The DreamMapper shutdown in January 2026 pushed a large group of Philips users into the
            market for the first time. Many had never needed a third-party analysis tool before. The
            good news: the free alternatives are now more capable than DreamMapper ever was.
          </p>
        </div>
      </section>

      {/* Three Tools at a Glance — comparison table */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Scale className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">The Three Tools at a Glance</h2>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="py-3 pr-4 text-left font-semibold text-foreground">Feature</th>
                <th className="px-4 py-3 text-center font-semibold text-foreground">OSCAR</th>
                <th className="px-4 py-3 text-center font-semibold text-foreground">SleepHQ</th>
                <th className="px-4 py-3 text-center font-semibold text-foreground">AirwayLab</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              <tr className="border-b border-border/30">
                <td className="py-2.5 pr-4">Installation</td>
                <td className="px-4 py-2.5 text-center">Desktop app (Win/Mac/Linux)</td>
                <td className="px-4 py-2.5 text-center">Browser / mobile app</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">Browser only</td>
              </tr>
              <tr className="border-b border-border/30">
                <td className="py-2.5 pr-4">Devices supported</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">
                  ResMed, Philips, F&amp;P, others
                </td>
                <td className="px-4 py-2.5 text-center">ResMed (via myAir sync)</td>
                <td className="px-4 py-2.5 text-center">ResMed SD card</td>
              </tr>
              <tr className="border-b border-border/30">
                <td className="py-2.5 pr-4">Data location</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">Local — your device</td>
                <td className="px-4 py-2.5 text-center text-amber-400">
                  Cloud — SleepHQ&apos;s servers
                </td>
                <td className="px-4 py-2.5 text-center text-emerald-400">Your browser only</td>
              </tr>
              <tr className="border-b border-border/30">
                <td className="py-2.5 pr-4">Automated scoring</td>
                <td className="px-4 py-2.5 text-center">Summary stats</td>
                <td className="px-4 py-2.5 text-center">Summary stats</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">
                  Glasgow Index, FL Score, NED, oximetry
                </td>
              </tr>
              <tr className="border-b border-border/30">
                <td className="py-2.5 pr-4">Open source</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">GPL-2.0</td>
                <td className="px-4 py-2.5 text-center text-muted-foreground">Closed source</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">GPL-3.0</td>
              </tr>
              <tr className="border-b border-border/30">
                <td className="py-2.5 pr-4">Cost</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">Free</td>
                <td className="px-4 py-2.5 text-center">Free + paid tiers</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">
                  Free (optional premium)
                </td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4">Best for</td>
                <td className="px-4 py-2.5 text-center">Breath-by-breath waveform review</td>
                <td className="px-4 py-2.5 text-center">Cloud sync, remote access</td>
                <td className="px-4 py-2.5 text-center">Automated pattern analysis</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* OSCAR section */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Monitor className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            OSCAR: The Desktop Standard for Waveform Review
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            <a
              href="https://www.sleepfiles.com/OSCAR/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary/80"
            >
              OSCAR
            </a>{' '}
            (Open Source CPAP Analysis Reporter) is the most detailed free CPAP analysis tool
            available. It gives you interactive access to your full flow waveform — you can zoom in
            to individual breaths, scroll through the night, and review events one by one.
          </p>
          <p className="font-medium text-foreground">What OSCAR does well:</p>
          <ul className="ml-4 space-y-2">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
              <span>
                <strong className="text-foreground">Interactive waveform viewer</strong> at full
                breath resolution — pan, zoom, and event marking
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
              <span>
                <strong className="text-foreground">Wide device support:</strong> ResMed, Philips,
                Fisher &amp; Paykel, and several others
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
              <span>
                <strong className="text-foreground">Session overlays</strong> to compare nights side
                by side
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
              <span>
                <strong className="text-foreground">Detailed event logs:</strong> apneas, hypopneas,
                leak, and flow limitation flags
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
              <span>
                <strong className="text-foreground">Large, active community</strong> on ApneaBoard
                with years of tutorials and worked examples
              </span>
            </li>
          </ul>
          <p className="font-medium text-foreground">Where OSCAR has limitations:</p>
          <ul className="ml-4 space-y-2">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
              <span>
                Requires download and local installation — not available on Chromebooks or tablets
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
              <span>
                No automated composite scoring: you see the data, but OSCAR doesn&apos;t compute a
                flow limitation score or breath shape index for you
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
              <span>Steeper learning curve for users new to PAP data</span>
            </li>
          </ul>
          <p>
            OSCAR is the right tool when you want to see exactly what happened breath by breath on a
            specific night. If you&apos;re new to reading PAP data, our{' '}
            <Link href="/blog/how-to-read-cpap-data" className="text-primary hover:text-primary/80">
              guide to CPAP data
            </Link>{' '}
            is a good place to start before opening OSCAR for the first time.
          </p>
        </div>
      </section>

      {/* SleepHQ section */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Sparkles className="h-5 w-5 text-purple-400" />
          <h2 className="text-xl font-bold sm:text-2xl">SleepHQ: Cloud Sync for ResMed Users</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            SleepHQ is a cloud-based platform designed primarily for ResMed users. Its main
            differentiator is convenience: if you use a ResMed machine with myAir enabled, SleepHQ
            can sync your data automatically without you ever touching an SD card.
          </p>
          <p className="font-medium text-foreground">What SleepHQ does well:</p>
          <ul className="ml-4 space-y-2">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-purple-400" />
              <span>
                <strong className="text-foreground">Automatic sync from myAir</strong> — no SD card
                handling required
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-purple-400" />
              <span>
                <strong className="text-foreground">Clean, accessible interface</strong> that&apos;s
                genuinely easy for new users
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-purple-400" />
              <span>
                <strong className="text-foreground">Remote access:</strong> view your data on any
                device, share a link with your clinician
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-purple-400" />
              <span>
                <strong className="text-foreground">Solid summary charts</strong> for nightly trends
              </span>
            </li>
          </ul>
          <p className="font-medium text-foreground">Where SleepHQ has limitations:</p>
          <ul className="ml-4 space-y-2">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
              <span>
                Cloud-hosted: your therapy data lives on SleepHQ&apos;s servers — worth considering
                if privacy matters to you
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
              <span>
                Primarily supports ResMed; limited coverage for other manufacturers
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
              <span>
                myAir sync gives you what ResMed&apos;s app reports, not the full SD card dataset
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
              <span>Some features sit behind a paid subscription</span>
            </li>
          </ul>
          <p>
            SleepHQ is the path of least resistance if you&apos;re on ResMed and want the simplest
            possible setup. The automatic sync genuinely removes friction for users who don&apos;t
            want to manage SD cards.
          </p>
        </div>
      </section>

      {/* AirwayLab section */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Globe className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            AirwayLab: Browser-Based, No Installation Required
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            AirwayLab takes a different approach from both OSCAR and SleepHQ. It runs entirely in
            your browser — no download, no cloud account, no data upload. You drag your ResMed SD
            card files onto the upload page and your analysis runs locally, in your browser, without
            any data leaving your device.
          </p>
          <p className="font-medium text-foreground">What AirwayLab does well:</p>
          <ul className="ml-4 space-y-2">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
              <span>
                <strong className="text-foreground">No installation:</strong> works on any device
                with a modern browser, including Chromebooks
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
              <span>
                <strong className="text-foreground">Privacy-first:</strong> your data never leaves
                your browser for core analysis
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
              <span>
                <strong className="text-foreground">Automated composite scoring</strong> from four
                analysis engines: Glasgow Index (breath shape across 9 components), FL Score
                (percentage of flow-limited breaths), NED (per-breath airway narrowing), and
                oximetry framework (17-metric SpO₂/HR analysis)
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
              <span>
                <strong className="text-foreground">Night-over-night trend tracking</strong> with a
                traffic-light system
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
              <span>
                <strong className="text-foreground">Open source (GPL-3.0)</strong> — the analysis
                code is publicly verifiable
              </span>
            </li>
          </ul>
          <p className="font-medium text-foreground">Where AirwayLab has limitations:</p>
          <ul className="ml-4 space-y-2">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
              <span>
                ResMed SD card only — no myAir sync, no Philips or Fisher &amp; Paykel support yet
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
              <span>
                No interactive waveform viewer — for breath-by-breath review, OSCAR is still the
                right tool
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
              <span>
                Requires an SD card in the machine (AirSense 11 models without an SD card slot
                aren&apos;t supported)
              </span>
            </li>
          </ul>
          <p>
            Many users run AirwayLab and OSCAR side by side: AirwayLab for the automated overnight
            scores, OSCAR when they want to drill into a specific night that caught their attention.
            See{' '}
            <Link href="/blog/oscar-alternative" className="text-primary hover:text-primary/80">
              how AirwayLab compares to OSCAR in detail
            </Link>
            .
          </p>
          <div className="rounded-xl border border-border/50 bg-card/50 p-4">
            <p className="text-xs text-muted-foreground">
              AirwayLab&apos;s core analysis is entirely local. Optional AI-powered insights require
              explicit consent before any data is sent.
            </p>
          </div>
        </div>
      </section>

      {/* DreamMapper section */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <AlertTriangle className="h-5 w-5 text-amber-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            DreamMapper Users: Your Options After the Shutdown
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            If you were using DreamMapper with a Philips CPAP machine and lost access when the
            platform closed in January 2026, your path forward depends on your device.
          </p>
          <div className="rounded-xl border border-border/50 p-4">
            <p className="text-sm font-semibold text-foreground">
              For Philips DreamStation and System One users
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              OSCAR supports DreamStation and System One EDF files. Install OSCAR, insert your SD
              card, and your data should load. OSCAR gives you considerably more detail than
              DreamMapper provided — event-level review, waveform access, and trend history going
              back as far as your SD card holds. Check the{' '}
              <a
                href="https://www.sleepfiles.com/OSCAR/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary/80"
              >
                OSCAR device compatibility list
              </a>{' '}
              before assuming your specific model is supported.
            </p>
          </div>
          <div className="rounded-xl border border-border/50 p-4">
            <p className="text-sm font-semibold text-foreground">AirwayLab note</p>
            <p className="mt-2 text-xs text-muted-foreground">
              AirwayLab currently supports ResMed devices only. If you&apos;re switching to a
              ResMed machine (or already have one), AirwayLab will work with it. If you&apos;re
              staying on Philips, OSCAR is your best free option.
            </p>
          </div>
          <p>
            The DreamMapper shutdown is a reminder of why open-source tools matter. OSCAR&apos;s
            GPL licence and AirwayLab&apos;s GPL-3.0 licence mean neither can be switched off by a
            company decision or sold to a new owner who changes course.
          </p>
        </div>
      </section>

      {/* Which tool is right for you */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Lightbulb className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold sm:text-2xl">Which Tool Is Right for You?</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
              <p className="text-sm font-semibold text-blue-400">Choose OSCAR if…</p>
              <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
                <li>You want breath-by-breath waveform review</li>
                <li>You use a non-ResMed device (Philips, Fisher &amp; Paykel, others)</li>
                <li>You need to share specific event data with your sleep physician</li>
                <li>You&apos;re comfortable with a desktop application</li>
              </ul>
            </div>
            <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4">
              <p className="text-sm font-semibold text-purple-400">Choose SleepHQ if…</p>
              <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
                <li>You use ResMed and want automatic sync without managing SD cards</li>
                <li>Remote access and easy clinician sharing matter to you</li>
                <li>You&apos;re comfortable with cloud storage of your therapy data</li>
              </ul>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <p className="text-sm font-semibold text-emerald-400">Choose AirwayLab if…</p>
              <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
                <li>You want automated scoring without installing anything</li>
                <li>You&apos;re on a Chromebook or tablet</li>
                <li>Data privacy is a priority — analysis stays in your browser</li>
                <li>You want Glasgow Index, FL Score, and NED computed automatically</li>
              </ul>
            </div>
          </div>
          <p>
            <strong className="text-foreground">Use more than one if</strong> you&apos;re working
            through why your metrics look the way they do. Each tool gives you a different view of
            the same underlying data, and they genuinely complement each other.
          </p>
        </div>
      </section>

      {/* Open source and longevity */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Lock className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Open Source and Longevity</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            OSCAR is licensed under GPL-2.0. AirwayLab is licensed under GPL-3.0. Both licences
            require the source code to remain public and prevent the software from being closed down
            or repurposed without community consent. SleepHQ is closed source.
          </p>
          <p>
            For long-term users who rely on their analysis tools year over year, open source
            matters. The DreamMapper shutdown demonstrated what happens when a closed commercial
            platform discontinues — years of data access can disappear overnight. Open-source tools
            can be forked, maintained by the community, and audited independently.
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
            <Link href="/blog/oscar-alternative" className="text-primary hover:text-primary/80">
              AirwayLab vs OSCAR: What Each Tool Does Best
            </Link>{' '}
            &mdash; a detailed comparison of AirwayLab and OSCAR, the long-standing open-source
            desktop app.
          </p>
          <p>
            <Link
              href="/blog/how-to-read-cpap-data"
              className="text-primary hover:text-primary/80"
            >
              How to Read Your CPAP Data
            </Link>{' '}
            &mdash; a beginner-friendly guide to understanding AHI, flow limitation, and the metrics
            that matter.
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
        </div>
      </section>

      {/* Bottom medical disclaimer */}
      <section className="mt-8">
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Medical disclaimer:</strong> The information
            provided by CPAP analysis software — including AirwayLab, OSCAR, and SleepHQ — is for
            personal reference only. It is not a substitute for clinical advice, diagnosis, or
            treatment. Your sleep physician can help you interpret your therapy data in the context
            of your diagnosis and treatment plan. Always discuss any questions about your therapy
            with your clinician.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="mt-10 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
        <h3 className="text-lg font-bold">Try AirwayLab in your browser</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          No installation, no account, no data upload required.
        </p>
        <div className="mt-4 flex justify-center">
          <Link
            href="/analyze"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow transition-colors hover:bg-primary/90"
          >
            Analyse your data free <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </article>
  );
}
