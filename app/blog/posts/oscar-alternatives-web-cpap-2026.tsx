import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  Globe,
  Layers,
  Lock,
  Monitor,
  Scale,
  Shield,
} from 'lucide-react';

export default function OSCARAlternativesWebCPAP2026() {
  return (
    <article>
      {/* Medical disclaimer — top */}
      <blockquote className="mb-8 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-muted-foreground">
        <strong className="text-amber-400">Medical disclaimer:</strong> AirwayLab, OSCAR, and
        SleepHQ are data visualisation and analysis tools, not medical devices. The information
        these tools provide is for personal reference only and is not a substitute for professional
        clinical advice. Always discuss your therapy data with your prescribing clinician.
      </blockquote>

      <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
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

      {/* Why people look */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Globe className="h-5 w-5 text-muted-foreground" />
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

      {/* Three tools at a glance */}
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
                <td className="px-4 py-2.5 text-center">Desktop app</td>
                <td className="px-4 py-2.5 text-center">Browser / mobile</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">Browser only</td>
              </tr>
              <tr className="border-b border-border/30">
                <td className="py-2.5 pr-4">Devices supported</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">ResMed, Philips, F&amp;P, others</td>
                <td className="px-4 py-2.5 text-center">ResMed (myAir)</td>
                <td className="px-4 py-2.5 text-center">ResMed SD card</td>
              </tr>
              <tr className="border-b border-border/30">
                <td className="py-2.5 pr-4">Data location</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">Local — your device</td>
                <td className="px-4 py-2.5 text-center">Cloud — SleepHQ servers</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">Your browser only</td>
              </tr>
              <tr className="border-b border-border/30">
                <td className="py-2.5 pr-4">Automated scoring</td>
                <td className="px-4 py-2.5 text-center">Summary stats</td>
                <td className="px-4 py-2.5 text-center">Summary stats</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">Glasgow Index, FL Score, NED, oximetry</td>
              </tr>
              <tr className="border-b border-border/30">
                <td className="py-2.5 pr-4">Open source</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">GPL-2.0</td>
                <td className="px-4 py-2.5 text-center text-muted-foreground/60">Closed source</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">GPL-3.0</td>
              </tr>
              <tr className="border-b border-border/30">
                <td className="py-2.5 pr-4">Cost</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">Free</td>
                <td className="px-4 py-2.5 text-center">Free + paid tiers</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">Free (optional premium)</td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4">Best for</td>
                <td className="px-4 py-2.5 text-center">Waveform review</td>
                <td className="px-4 py-2.5 text-center">Cloud sync, remote access</td>
                <td className="px-4 py-2.5 text-center">Automated pattern analysis</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* OSCAR */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Monitor className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            OSCAR: The Desktop Standard for Waveform Review
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            OSCAR (Open Source CPAP Analysis Reporter) is the most detailed free CPAP analysis tool
            available. It gives you interactive access to your full flow waveform — you can zoom in
            to individual breaths, scroll through the night, and review events one by one.
          </p>
          <p className="font-medium text-foreground">What OSCAR does well:</p>
          <ul className="ml-4 space-y-2">
            {[
              'Interactive waveform viewer at full breath resolution — pan, zoom, and event marking',
              'Wide device support: ResMed, Philips, Fisher & Paykel, and several others',
              'Session overlays to compare nights side by side',
              'Detailed event logs: apneas, hypopnoeas, leak, and flow limitation flags',
              'Large, active community on ApneaBoard with years of tutorials and worked examples',
            ].map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="font-medium text-foreground">Where OSCAR has limitations:</p>
          <ul className="ml-4 space-y-2">
            {[
              'Requires download and local installation — not available on Chromebooks or tablets',
              'No automated composite scoring: OSCAR shows data but does not compute a flow limitation score or breath shape index',
              'Steeper learning curve for users new to PAP data',
            ].map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5shrink-0 rounded-full bg-amber-400" />
                <span>{item}</span>
              </li>
            ))}
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

      {/* SleepHQ */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Globe className="h-5 w-5 text-sky-400" />
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
            {[
              'Automatic sync from myAir — no SD card handling required',
              'Clean, accessible interface that is genuinely easy for new users',
              'Remote access: view your data on any device, share a link with your clinician',
              'Solid summary charts for nightly trends',
            ].map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="font-medium text-foreground">Where SleepHQ has limitations:</p>
          <ul className="ml-4 space-y-2">
            {[
              'Cloud-hosted: your therapy data lives on SleepHQ\'s servers',
              'Primarily supports ResMed; limited coverage for other manufacturers',
              'myAir sync gives you what ResMed\'s app reports, not the full SD card dataset',
              'Some features sit behind a paid subscription',
            ].map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p>
            SleepHQ is the path of least resistance if you&apos;re on ResMed and want the simplest
            possible setup. The automatic sync removes friction for users who don&apos;t want to
            manage SD cards.
          </p>
        </div>
      </section>

      {/* AirwayLab */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Layers className="h-5 w-5 text-emerald-400" />
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
            {[
              'No installation: works on any device with a modern browser, including Chromebooks',
              'Privacy-first: your data never leaves your browser for core analysis',
            ].map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p>Automated composite scoring from four analysis engines:</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { label: 'Glasgow Index', desc: 'Breath shape scored across 9 components (0–8 scale)' },
              { label: 'FL Score', desc: 'Percentage of flow-limited breaths per night' },
              { label: 'NED', desc: 'Per-breath airway narrowing characterisation' },
              { label: 'Oximetry framework', desc: '17-metric SpO₂/HR analysis with compatible Viatom oximeter' },
            ].map(({ label, desc }) => (
              <div key={label} className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                <p className="text-sm font-semibold text-emerald-400">{label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
          <p className="font-medium text-foreground">Where AirwayLab has limitations:</p>
          <ul className="ml-4 space-y-2">
            {[
              'ResMed SD card only — no myAir sync, no Philips or Fisher & Paykel support yet',
              'No interactive waveform viewer — for breath-by-breath review, OSCAR is the right tool',
              'Requires an SD card in the machine (AirSense 11 models without an SD card slot are not supported)',
            ].map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p>
            Many users run AirwayLab and OSCAR side by side: AirwayLab for the automated overnight
            scores, OSCAR when they want to drill into a specific night. See{' '}
            <Link href="/blog/oscar-alternative" className="text-primary hover:text-primary/80">
              how AirwayLab compares to OSCAR in detail
            </Link>
            .
          </p>
          <p className="text-xs text-muted-foreground/70 italic">
            AirwayLab&apos;s core analysis is entirely local. Optional AI-powered insights require
            explicit consent before any data is sent.
          </p>
        </div>
      </section>

      {/* DreamMapper */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Shield className="h-5 w-5 text-amber-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            DreamMapper Users: Your Options After the Shutdown
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            If you were using DreamMapper with a Philips CPAP machine and lost access when the
            platform closed in January 2026, your path forward depends on your device.
          </p>
          <div className="rounded-xl border border-border/50 bg-card/50 p-4">
            <p className="text-sm font-semibold text-foreground">
              For Philips DreamStation and System One users
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
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
          <div className="rounded-xl border border-border/50 bg-card/50 p-4">
            <p className="text-sm font-semibold text-foreground">AirwayLab note</p>
            <p className="mt-2 text-sm text-muted-foreground">
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

      {/* Which tool */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Lock className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold sm:text-2xl">Which Tool Is Right for You?</h2>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
            <p className="text-sm font-semibold text-blue-400">Choose OSCAR if:</p>
            <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
              <li>You want breath-by-breath waveform review</li>
              <li>You use a non-ResMed device (Philips, Fisher &amp; Paykel)</li>
              <li>You need to share specific event data with your sleep physician</li>
              <li>You&apos;re comfortable with a desktop application</li>
            </ul>
          </div>
          <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-4">
            <p className="text-sm font-semibold text-sky-400">Choose SleepHQ if:</p>
            <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
              <li>You use ResMed and want automatic sync without SD cards</li>
              <li>Remote access and easy clinician sharing matter to you</li>
              <li>You&apos;re comfortable with cloud storage of your data</li>
            </ul>
          </div>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <p className="text-sm font-semibold text-emerald-400">Choose AirwayLab if:</p>
            <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
              <li>You want automated scoring without installing anything</li>
              <li>You&apos;re on a Chromebook or tablet</li>
              <li>Data privacy is a priority</li>
              <li>You want Glasgow Index, FL Score, and NED computed automatically</li>
            </ul>
          </div>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          <strong className="text-foreground">Use more than one if</strong> you&apos;re working
          through why your metrics look the way they do. Each tool gives you a different view of the
          same underlying data, and they genuinely complement each other.
        </p>
      </section>

      {/* Medical disclaimer — bottom */}
      <blockquote className="mt-10 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-muted-foreground">
        The information provided by CPAP analysis software — including AirwayLab, OSCAR, and
        SleepHQ — is for personal reference only. It is not a substitute for clinical advice,
        diagnosis, or treatment. Your sleep physician can help you interpret your therapy data in
        the context of your diagnosis and treatment plan.
      </blockquote>

      {/* References */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <BookOpen className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-bold sm:text-2xl">Further Reading</h2>
        </div>
        <div className="mt-4 space-y-2 text-sm text-muted-foreground">
          <p>
            <Link href="/blog/how-to-read-cpap-data" className="text-primary hover:text-primary/80">
              Guide to CPAP data
            </Link>{' '}
            &mdash; understanding what the numbers on your device actually mean.
          </p>
          <p>
            <Link href="/blog/oscar-alternative" className="text-primary hover:text-primary/80">
              How AirwayLab compares to OSCAR in detail
            </Link>{' '}
            &mdash; a deeper feature-by-feature breakdown.
          </p>
          <p>
            <a
              href="https://www.sleepfiles.com/OSCAR/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary/80"
            >
              OSCAR official site
            </a>{' '}
            &mdash; download OSCAR and access its documentation.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="mt-10 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
        <h3 className="text-lg font-bold">Try AirwayLab in your browser</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          No installation, no account, no data upload required.
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
    </article>
  );
}
