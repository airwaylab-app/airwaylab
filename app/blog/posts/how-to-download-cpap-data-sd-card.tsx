import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  CreditCard,
  FolderOpen,
  Lightbulb,
  Monitor,
  Upload,
} from 'lucide-react';

export function HowToDownloadCPAPDataSdCard() {
  return (
    <article>
      {/* Medical disclaimer (top) */}
      <div className="mb-8 rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
        <div className="flex items-center gap-2.5">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          <p className="text-xs font-semibold text-foreground">Medical disclaimer</p>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          AirwayLab is a data-visualization tool, not a medical device. The metrics and charts it
          displays are for informational purposes only and do not constitute medical advice,
          diagnosis, or treatment. Always discuss your therapy data and any questions about your
          therapy with your prescribing clinician or sleep physician.
        </p>
      </div>

      {/* Intro */}
      <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
        Your CPAP machine runs quietly every night, logging detailed records of every session: hours
        of use, AHI, flow limitation events, mask leak, and pressure. Most of that detail never
        appears on the device display or inside a manufacturer app — it lives on a small SD card
        tucked into the side of the machine.
      </p>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
        Once you know how to download your CPAP data from an SD card, you have access to a complete
        night-by-night record of your breathing patterns. This guide walks you through the whole
        process: removing the card, reading it on your computer, and getting those records into
        AirwayLab.
      </p>

      {/* Which machines use SD cards */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <CreditCard className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Which CPAP Machines Use SD Cards?</h2>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          Most modern PAP devices record detailed session data to a removable SD card. The most
          common machines you are likely to encounter:
        </p>
        <div className="mt-4 overflow-x-auto rounded-xl border border-border/50">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-muted/30">
                <th className="px-4 py-3 text-left font-semibold text-foreground">Machine</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Card format</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Slot location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30 text-muted-foreground">
              <tr>
                <td className="px-4 py-3">ResMed AirSense 10</td>
                <td className="px-4 py-3">Standard SD</td>
                <td className="px-4 py-3">Side door, left panel</td>
              </tr>
              <tr>
                <td className="px-4 py-3">ResMed AirSense 11</td>
                <td className="px-4 py-3">Standard SD</td>
                <td className="px-4 py-3">Side door, left panel</td>
              </tr>
              <tr>
                <td className="px-4 py-3">Philips DreamStation (Gen 1)</td>
                <td className="px-4 py-3">Standard SD</td>
                <td className="px-4 py-3">Rear, behind a door</td>
              </tr>
              <tr>
                <td className="px-4 py-3">Philips DreamStation 2</td>
                <td className="px-4 py-3">microSD</td>
                <td className="px-4 py-3">Internal slot (see note)</td>
              </tr>
              <tr>
                <td className="px-4 py-3">Fisher &amp; Paykel SleepStyle</td>
                <td className="px-4 py-3">microSD</td>
                <td className="px-4 py-3">Side panel</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="mt-4 space-y-3">
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
            <p className="text-xs font-semibold text-foreground">DreamStation 2 note</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Philips moved to an internal microSD slot in the DreamStation 2. Some units allow user
              access; others are not designed for routine card removal. Check your machine&apos;s
              user manual before attempting.
            </p>
          </div>
          <div className="rounded-xl border border-border/50 p-4">
            <p className="text-xs font-semibold text-foreground">Older machines</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              ResMed S9 devices also used a standard SD card in the same left-panel slot as the
              AirSense 10. If your machine is not listed, check the user manual or the
              manufacturer&apos;s support pages.
            </p>
          </div>
        </div>
      </section>

      {/* Step 1: Remove the SD card */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <CreditCard className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Step 1: Remove the SD Card Safely</h2>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          Always power off and unplug your machine before removing the card. The machine can still
          be writing session data for a short time after a session ends, and pulling an active card
          can corrupt the filesystem.
        </p>

        <div className="mt-6 space-y-6">
          {/* ResMed AirSense 10 and 11 */}
          <div>
            <h3 className="text-base font-semibold text-foreground sm:text-lg">
              ResMed AirSense 10 and 11
            </h3>
            <div className="mt-3 space-y-2">
              {[
                'Turn the machine off and unplug it.',
                'Open the small door on the left side of the device — it snaps open with a fingernail.',
                'Press the SD card inward gently; it will spring-eject.',
                'Slide the card out.',
              ].map((step, i) => (
                <div key={i} className="flex gap-3 rounded-xl border border-border/50 p-4">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {i + 1}
                  </span>
                  <p className="text-sm leading-relaxed text-muted-foreground">{step}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Philips DreamStation Gen 1 */}
          <div>
            <h3 className="text-base font-semibold text-foreground sm:text-lg">
              Philips DreamStation (Gen 1)
            </h3>
            <div className="mt-3 space-y-2">
              {[
                'Power off the machine.',
                'Open the rear door (it pivots upward).',
                'Press and release the SD card to eject.',
                'Remove the card.',
              ].map((step, i) => (
                <div key={i} className="flex gap-3 rounded-xl border border-border/50 p-4">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {i + 1}
                  </span>
                  <p className="text-sm leading-relaxed text-muted-foreground">{step}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Fisher & Paykel */}
          <div>
            <h3 className="text-base font-semibold text-foreground sm:text-lg">
              Fisher &amp; Paykel SleepStyle
            </h3>
            <div className="mt-3 space-y-2">
              {[
                'Power off the machine.',
                'Locate the microSD slot on the side panel.',
                'Press gently to eject, then remove.',
              ].map((step, i) => (
                <div key={i} className="flex gap-3 rounded-xl border border-border/50 p-4">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {i + 1}
                  </span>
                  <p className="text-sm leading-relaxed text-muted-foreground">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
          <p className="text-xs font-semibold text-foreground">microSD adapter</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            If you have a microSD card, you will need a microSD-to-SD adapter (often included in
            the card&apos;s packaging) or a USB microSD reader to connect it to your computer.
          </p>
        </div>
      </section>

      {/* Step 2: Read the card on your computer */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Monitor className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Step 2: Read the Card on Your Computer</h2>
        </div>

        <div className="mt-4 space-y-6">
          {/* Windows */}
          <div>
            <h3 className="text-base font-semibold text-foreground sm:text-lg">Windows</h3>
            <div className="mt-3 space-y-2">
              {[
                "Insert the SD card into your PC's built-in card reader, or use a USB SD card adapter.",
                'Open File Explorer — the card appears as a removable drive.',
                'Open the drive. You will see a folder named DATALOG (ResMed) or a similar data folder (Philips, Fisher & Paykel).',
                'Do not rename, move, or delete any files.',
              ].map((step, i) => (
                <div key={i} className="flex gap-3 rounded-xl border border-border/50 p-4">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {i + 1}
                  </span>
                  <p className="text-sm leading-relaxed text-muted-foreground">{step}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Mac */}
          <div>
            <h3 className="text-base font-semibold text-foreground sm:text-lg">Mac</h3>
            <div className="mt-3 space-y-2">
              {[
                "Insert the SD card into your Mac's built-in card reader, or use a USB-C SD card adapter.",
                'The card appears on the Desktop and in the Finder sidebar as a removable volume.',
                'Click to open it — the data folders are visible inside.',
                'Leave the folder structure exactly as it is.',
              ].map((step, i) => (
                <div key={i} className="flex gap-3 rounded-xl border border-border/50 p-4">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {i + 1}
                  </span>
                  <p className="text-sm leading-relaxed text-muted-foreground">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <p className="text-xs font-semibold text-foreground">Card not visible?</p>
          <ul className="mt-1 space-y-1 text-xs leading-relaxed text-muted-foreground">
            <li>
              <strong className="text-foreground">Mac:</strong> Go to Finder → Settings → General
              and make sure &ldquo;External disks&rdquo; is checked.
            </li>
            <li>
              <strong className="text-foreground">Windows:</strong> In File Explorer, go to View →
              Show → Hidden items.
            </li>
          </ul>
        </div>
      </section>

      {/* Step 3: What's on the card */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <FolderOpen className="h-5 w-5 text-purple-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Step 3: What Is on the Card?</h2>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          The SD card holds your therapy records — nightly session files in a proprietary binary
          format. You will not be able to open them in a text editor, but the file dates correspond
          to session dates, so you can confirm the card contains the nights you are looking for.
        </p>
        <div className="mt-4 space-y-3">
          <div className="rounded-xl border border-border/50 p-4">
            <p className="text-sm font-semibold text-foreground">ResMed cards typically contain</p>
            <ul className="mt-2 space-y-1 text-xs leading-relaxed text-muted-foreground">
              <li>
                <code className="rounded bg-muted/50 px-1 py-0.5 text-[11px]">DATALOG/</code> —
                individual session files, one per night
              </li>
              <li>
                <code className="rounded bg-muted/50 px-1 py-0.5 text-[11px]">STR.edf</code> — a
                summary EDF file covering multiple sessions
              </li>
            </ul>
          </div>
          <div className="rounded-xl border border-border/50 p-4">
            <p className="text-sm font-semibold text-foreground">
              Philips DreamStation cards
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Use a different folder structure but follow the same principle: one or more binary
              session files per night.
            </p>
          </div>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          The data includes metrics like AHI, mask leak, pressure records, and — on ResMed machines
          with detailed recording enabled — high-resolution flow waveforms. Exact metrics vary by
          machine model and firmware version.
        </p>
        <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <p className="text-xs font-semibold text-foreground">No files on the card?</p>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Detailed data recording may be disabled in your machine&apos;s clinical settings. A
            sleep technician or your prescribing clinic can check and enable it.
          </p>
        </div>
      </section>

      {/* Step 4: Upload to AirwayLab */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Upload className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Step 4: Upload Your Data to AirwayLab</h2>
        </div>
        <div className="mt-4 space-y-2">
          {[
            <>
              Go to{' '}
              <Link href="/analyze" className="text-primary hover:text-primary/80">
                AirwayLab /analyze
              </Link>
              .
            </>,
            <>
              Click <strong className="text-foreground">&ldquo;Upload SD card data&rdquo;</strong>{' '}
              and select either the full SD card or just its data folder.
            </>,
            'AirwayLab processes the files entirely in your browser — your data never leaves your device.',
            'Your sessions appear as a timeline. Select any night to see AHI, flow limitation events, leak rate, pressure records, RERAs, and more.',
          ].map((step, i) => (
            <div key={i} className="flex gap-3 rounded-xl border border-border/50 p-4">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {i + 1}
              </span>
              <p className="text-sm leading-relaxed text-muted-foreground">{step}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-3">
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
            <p className="text-xs font-semibold text-foreground">Format support</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              AirwayLab supports ResMed EDF and CPAP data formats and Philips DreamStation data
              natively. If you already use OSCAR, you can also import from an OSCAR data directory.
            </p>
          </div>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <p className="text-xs font-semibold text-foreground">Free and open source</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              AirwayLab is free and always will be. The source code is GPL-3.0 licensed and
              publicly verifiable. Premium features support ongoing development, but the full
              analysis is available without creating an account.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mt-10">
        <h2 className="text-xl font-bold sm:text-2xl">Frequently Asked Questions</h2>
        <div className="mt-4 space-y-4">
          <div className="rounded-xl border border-border/50 p-5">
            <p className="text-sm font-semibold text-foreground">
              Can I damage my CPAP machine by removing the SD card?
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Not if you power it off first. The card records during a session and data is written
              at session end. Powering down before removal is the one step not to skip.
            </p>
          </div>
          <div className="rounded-xl border border-border/50 p-5">
            <p className="text-sm font-semibold text-foreground">
              How often should I download my data?
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              SD cards on most machines hold at least a year of sessions. Many users download every
              month or two, or when they want to look at a specific period. There is no technical
              reason to download more frequently.
            </p>
          </div>
          <div className="rounded-xl border border-border/50 p-5">
            <p className="text-sm font-semibold text-foreground">
              My ResMed AirSense 11 does not seem to have an SD card — am I missing something?
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              The AirSense 11 has both an SD card slot (same location as the 10) and myAir cloud
              connectivity. The SD card is present and records the same detailed data as the AirSense
              10; it is just less prominently documented in the consumer-facing materials.
            </p>
          </div>
          <div className="rounded-xl border border-border/50 p-5">
            <p className="text-sm font-semibold text-foreground">
              Can I upload my CPAP data without removing the SD card?
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              On some machines with cloud sync enabled, data uploads automatically to the
              manufacturer&apos;s platform. AirwayLab currently reads from SD card upload or OSCAR
              import; direct cloud sync is on the roadmap.
            </p>
          </div>
          <div className="rounded-xl border border-border/50 p-5">
            <p className="text-sm font-semibold text-foreground">What is AHI?</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              AHI stands for Apnea-Hypopnea Index — the number of apnea and hypopnea events
              recorded per hour of sleep. Your machine logs this metric each session. Your sleep
              physician can help you interpret what your recorded AHI values mean in the context of
              your therapy.
            </p>
          </div>
        </div>
      </section>

      {/* Medical disclaimer (bottom) */}
      <section className="mt-8">
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
          <div className="flex items-center gap-2.5">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            <p className="text-xs font-semibold text-foreground">Medical disclaimer</p>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            AirwayLab is a data-visualization and analytics tool, not a medical device. Nothing on
            this page or in the AirwayLab application constitutes medical advice, a clinical
            diagnosis, or a treatment recommendation. Your SD card data is a record of what your
            machine logged — it describes usage and recorded metrics, not a clinical assessment of
            your health. Always discuss your data and any therapy questions with your prescribing
            clinician or sleep physician.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="mt-10 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
        <h3 className="text-lg font-bold">Ready to See Your Data?</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Upload your SD card to AirwayLab and see your therapy sessions as a night-by-night
          timeline. Free, browser-based, and your data never leaves your device.
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
