import Link from 'next/link';
import {
  ArrowRight,
  Database,
  FileText,
  HardDrive,
  HelpCircle,
  Lightbulb,
  MessageSquare,
  Stethoscope,
  Wind,
} from 'lucide-react';

export default function HowToExportUnderstandCPAPData() {
  return (
    <article>
      <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
        Most CPAP and BiPAP machines record a lot more than whether you wore the mask. Every night,
        your device is quietly logging dozens of data points &mdash; breathing patterns, pressure
        changes, mask seal, and more. The trouble is, most of that data never leaves the machine
        unless you go looking for it.
      </p>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
        This guide walks through how to get your data off the machine, what the main numbers
        actually mean, and how to use that information to have a more productive conversation with
        your sleep specialist.
      </p>

      <div className="mt-6 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
        <p className="text-xs font-semibold text-amber-400">Note</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          This article is for informational purposes only. It does not constitute medical advice,
          diagnosis, or treatment recommendations. Always discuss your therapy data and any changes
          to your treatment with a qualified clinician.
        </p>
      </div>

      {/* What Does Your CPAP Machine Record? */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Database className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            What Does Your CPAP Machine Actually Record?
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Modern CPAP and BiPAP machines record data at two levels:{' '}
            <strong className="text-foreground">summary statistics</strong> (what most apps show
            you) and <strong className="text-foreground">full night flow data</strong> (what reveals
            the complete picture).
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
              <p className="text-sm font-semibold text-blue-400">
                Summary data &mdash; recorded every night
              </p>
              <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
                <li>
                  <strong className="text-foreground">Usage hours</strong> &mdash; how long you wore
                  the device
                </li>
                <li>
                  <strong className="text-foreground">AHI</strong> &mdash; apnoeas and hypopnoeas
                  per hour
                </li>
                <li>
                  <strong className="text-foreground">Leak rate</strong> &mdash; how much air is
                  escaping around your mask
                </li>
                <li>
                  <strong className="text-foreground">Pressure</strong> &mdash; the pressure your
                  machine delivered
                </li>
              </ul>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <p className="text-sm font-semibold text-emerald-400">
                Full flow data &mdash; recorded on SD card
              </p>
              <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
                <li>
                  <strong className="text-foreground">Breath-by-breath flow waveforms</strong>{' '}
                  &mdash; the actual shape of each breath
                </li>
                <li>
                  <strong className="text-foreground">Flow limitation</strong> &mdash; partial
                  airway narrowing that restricts airflow
                </li>
                <li>
                  <strong className="text-foreground">RERAs</strong> &mdash; effort-induced arousals
                  that fragment sleep
                </li>
                <li>
                  <strong className="text-foreground">Snore index</strong> &mdash; detected snoring
                  events
                </li>
              </ul>
            </div>
          </div>

          <p>
            The summary AHI on your machine&apos;s screen or companion app is useful, but it&apos;s
            often incomplete. A low AHI doesn&apos;t always mean your therapy is well optimised
            &mdash;{' '}
            <Link
              href="/blog/understanding-flow-limitation"
              className="text-primary hover:text-primary/80"
            >
              flow limitation
            </Link>{' '}
            and RERAs can persist even when the headline number looks fine. Full flow data is where
            the detail lives.
          </p>
        </div>
      </section>

      {/* How to Export Your Data */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <HardDrive className="h-5 w-5 text-purple-400" />
          <h2 className="text-xl font-bold sm:text-2xl">How to Export Your Data</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            The method varies by manufacturer. In all cases, your data is stored on a standard SD
            card or via USB &mdash; no account or cloud service is required to access it.
          </p>
        </div>

        {/* ResMed */}
        <div className="mt-6 rounded-xl border border-border/50 p-5">
          <h3 className="text-base font-bold text-foreground sm:text-lg">
            ResMed (AirSense 10, AirSense 11, S9 series)
          </h3>
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              ResMed machines store detailed flow data on a standard SD card (older machines) or
              internal memory accessible via SD slot.
            </p>
            <ol className="ml-4 list-decimal space-y-2">
              <li>Power off the machine.</li>
              <li>
                Locate the SD card slot &mdash; typically on the side panel of AirSense 10/11
                models, or under the humidifier chamber on S9 models.
              </li>
              <li>
                Remove the SD card and insert it into your computer using an SD card reader.
              </li>
              <li>
                The card will contain a folder structure with <code>.edf</code> and other data files
                holding your full-resolution flow data.
              </li>
            </ol>
            <p>
              ResMed&apos;s myAir app shows you a nightly summary score, but does not give access to
              raw flow data. For the full picture, the SD card is the route.
            </p>
            <p className="text-xs text-muted-foreground/70">
              Supported by: OSCAR, AirwayLab, and other open tools.
            </p>
          </div>
        </div>

        {/* Philips */}
        <div className="mt-4 rounded-xl border border-border/50 p-5">
          <h3 className="text-base font-bold text-foreground sm:text-lg">
            Philips Respironics (DreamStation, DreamStation 2, System One)
          </h3>
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              Philips machines use an SD card on older DreamStation and System One units.
            </p>
            <ol className="ml-4 list-decimal space-y-2">
              <li>Power off.</li>
              <li>Remove the SD card from the slot on the side of the device.</li>
              <li>
                Insert into your computer &mdash; the card contains <code>.001</code> Encore data
                files (System One) or Encore Pro format files (DreamStation).
              </li>
            </ol>
            <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
              <p className="text-xs text-muted-foreground">
                <strong className="text-amber-400">Note:</strong> The DreamStation 2 stores data
                internally and currently has limited third-party compatibility. Check the OSCAR
                compatibility list for up-to-date support status.
              </p>
            </div>
            <p>
              The DreamMapper app provides summary data but does not expose raw flow waveforms.
            </p>
          </div>
        </div>

        {/* Fisher & Paykel */}
        <div className="mt-4 rounded-xl border border-border/50 p-5">
          <h3 className="text-base font-bold text-foreground sm:text-lg">
            Fisher &amp; Paykel (ICON, SleepStyle)
          </h3>
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>Fisher &amp; Paykel machines generally use an SD card or USB export.</p>
            <ol className="ml-4 list-decimal space-y-2">
              <li>
                On the ICON series, the SD card is accessible under a door on the device front or
                side.
              </li>
              <li>
                On SleepStyle units, some models export via a USB connection to the companion app.
              </li>
              <li>
                Data is stored in proprietary formats; support varies across analysis tools.
                OSCAR&apos;s compatibility page is the most current reference.
              </li>
            </ol>
          </div>
        </div>

        <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Raw CPAP data comes in proprietary formats that differ by manufacturer and device
            generation. Tools like OSCAR and AirwayLab handle the parsing &mdash; you just point the
            tool at the folder on your SD card.
          </p>
        </div>
      </section>

      {/* What the Numbers Mean */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <FileText className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">What the Numbers Mean</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Once you have your data open in an analysis tool, here&apos;s how to read the main
            signals. For a deeper dive, see our{' '}
            <Link
              href="/blog/how-to-read-cpap-data"
              className="text-primary hover:text-primary/80"
            >
              full guide on how to read your CPAP data
            </Link>
            .
          </p>
        </div>

        <div className="mt-4 space-y-4">
          <div className="rounded-xl border border-border/50 p-4">
            <p className="text-sm font-semibold text-foreground">AHI (Apnoea-Hypopnoea Index)</p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Your machine&apos;s headline number. It counts complete airway obstructions (apnoeas)
              and partial obstructions with a drop in airflow (hypopnoeas), expressed per hour of
              sleep. A lower AHI generally indicates fewer scored breathing interruptions. However,
              scoring thresholds and event detection logic vary between devices &mdash; so a
              machine-scored AHI and a lab-scored AHI can differ.
            </p>
          </div>

          <div className="rounded-xl border border-border/50 p-4">
            <p className="text-sm font-semibold text-foreground">Leak Rate</p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Expressed in litres per minute. Most devices have a built-in intentional vent leak to
              allow CO&#8322; to escape &mdash; this is normal. What to watch for is unintentional
              leak: a sustained elevation above your device&apos;s leak baseline. Elevated leak can
              affect air delivery and is often addressable with mask fit adjustments.
            </p>
          </div>

          <div className="rounded-xl border border-border/50 p-4">
            <p className="text-sm font-semibold text-foreground">Flow Limitation</p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Shown as a value between 0 and 1, or as a time-series graph. It represents how
              &ldquo;flattened&rdquo; the top of each breath is. A rounded breath peak indicates
              unobstructed flow; a flat-topped peak is associated with partial airway narrowing. This
              signal may help you understand whether residual obstruction is present even when AHI is
              low.
            </p>
          </div>

          <div className="rounded-xl border border-border/50 p-4">
            <p className="text-sm font-semibold text-foreground">
              RERAs (Respiratory Effort-Related Arousals)
            </p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Effort-induced arousals &mdash; the airway doesn&apos;t completely close, but
              increased respiratory effort causes a brief awakening or lightening of sleep. They
              contribute to sleep fragmentation without necessarily being counted in AHI. Not all
              machines report RERAs directly; it depends on the device and algorithm.
            </p>
          </div>

          <div className="rounded-xl border border-border/50 p-4">
            <p className="text-sm font-semibold text-foreground">Pressure</p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              If you&apos;re on APAP (auto-adjusting), your nightly pressure graph shows how the
              machine responded to detected events. Consistent high-pressure clustering at certain
              times of night can suggest positional patterns worth discussing with your clinician.
            </p>
          </div>
        </div>
      </section>

      {/* Exploring Your Data with AirwayLab */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Wind className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold sm:text-2xl">Exploring Your Data with AirwayLab</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            AirwayLab is an open-source tool for visualising and exploring PAP therapy data. It runs
            entirely in your browser &mdash; your data never leaves your device, which matters when
            you&apos;re dealing with sensitive health information.
          </p>
          <p>
            Load your SD card data directly and explore:
          </p>
          <ul className="ml-4 list-disc space-y-1.5">
            <li>Nightly trend charts for AHI, leak, pressure, and usage</li>
            <li>Full-resolution flow waveforms for any night</li>
            <li>Flow limitation and RERA trends over time</li>
            <li>Side-by-side comparison across nights and weeks</li>
          </ul>
          <p>
            The source code is published under GPL-3.0, so the analysis is verifiable &mdash; you
            can see exactly how events are being scored. AirwayLab is free and always will be for
            core analysis features. A premium tier is available for those who want to support
            continued development.
          </p>
          <p>
            AirwayLab is designed to complement, not replace, tools like OSCAR. Many users use both
            &mdash; OSCAR for deep clinical-format reporting, AirwayLab for day-to-day visual
            exploration. They read the same underlying data.
          </p>
        </div>
      </section>

      {/* Having a Better Conversation with Your Clinician */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Stethoscope className="h-5 w-5 text-amber-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            Having a Better Conversation with Your Clinician
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Your data is most useful when you bring it into a clinical conversation. A few practical
            approaches:
          </p>
        </div>

        <div className="mt-4 space-y-4">
          <div className="rounded-xl border border-border/50 p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                1
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Export a trend report before your appointment
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Most analysis tools can export a PDF summary covering the past 30&ndash;90 days.
                  Bring this to your follow-up &mdash; it gives your specialist context faster than
                  relying on device remote-monitoring summaries alone.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border/50 p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                2
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Note specific nights that felt different
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  If you woke up feeling unrefreshed, pull up that night&apos;s data and look at
                  pressure and leak graphs. Targeted observations are often more useful than
                  averages.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border/50 p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                3
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Ask about flow limitation and RERAs, not just AHI
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  If your AHI is controlled but you still feel tired, your clinician may want to
                  look at these secondary signals. Having the data makes that conversation concrete.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border/50 p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                4
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Be specific about mask issues
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  If your leak data shows spikes at consistent times, that&apos;s useful clinical
                  information &mdash; it might indicate movement during the night that breaks the
                  seal.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Always frame observations from home analysis tools as things to discuss, not conclusions.
            Your clinician has your full history and clinical context that a visualisation tool
            doesn&apos;t replicate.
          </p>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <HelpCircle className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-bold sm:text-2xl">Frequently Asked Questions</h2>
        </div>
        <div className="mt-4 space-y-4">
          <div className="rounded-xl border border-border/50 p-4">
            <p className="text-sm font-semibold text-foreground">
              How do I get data off my CPAP machine?
            </p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Most machines use a standard SD card. Power off, remove the card, and insert it into
              your computer. Tools like OSCAR and AirwayLab can then read the data files directly.
            </p>
          </div>
          <div className="rounded-xl border border-border/50 p-4">
            <p className="text-sm font-semibold text-foreground">
              What is the difference between AHI and flow limitation?
            </p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              AHI counts discrete breathing events (apnoeas and hypopnoeas) per hour. Flow
              limitation measures partial airway narrowing that may not meet the threshold for a
              scored event. Both are visible in full flow data from your SD card.
            </p>
          </div>
          <div className="rounded-xl border border-border/50 p-4">
            <p className="text-sm font-semibold text-foreground">
              Can I analyse my CPAP data without installing software?
            </p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Yes. AirwayLab runs entirely in your browser &mdash; no download or install needed.
              Open the upload page, drag in your SD card files, and your data loads immediately.
            </p>
          </div>
          <div className="rounded-xl border border-border/50 p-4">
            <p className="text-sm font-semibold text-foreground">
              Does my CPAP data leave my device when using AirwayLab?
            </p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              No. AirwayLab processes all data locally in your browser. Nothing is uploaded to a
              server. Optional features like AI insights require explicit consent before any data is
              sent.
            </p>
          </div>
          <div className="rounded-xl border border-border/50 p-4">
            <p className="text-sm font-semibold text-foreground">
              Which CPAP machines does AirwayLab support?
            </p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              AirwayLab currently supports ResMed AirSense 10, AirSense 11, and AirCurve devices
              via SD card. Support for additional manufacturers is planned.
            </p>
          </div>
        </div>
      </section>

      {/* Summary */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <MessageSquare className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Summary</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Your CPAP machine is generating detailed data every night. Getting it off the device is
            straightforward &mdash; an SD card and a free tool is all it takes. Understanding what
            AHI, leak rate, flow limitation, and RERAs may tell you about your breathing patterns
            can help you engage more meaningfully with your therapy and your care team.
          </p>
          <p>
            Tools like AirwayLab and OSCAR exist to make your data accessible &mdash; in your
            browser, on your terms, with open and verifiable analysis.
          </p>
        </div>
      </section>

      {/* Medical Disclaimer */}
      <section className="mt-8">
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
          <div className="flex items-center gap-2.5">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            <p className="text-xs font-semibold text-foreground">Medical disclaimer</p>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            AirwayLab is an open-core software tool for reviewing PAP therapy data. It is not a
            medical device and does not provide medical advice, diagnosis, or treatment
            recommendations. All analysis is informational &mdash; always discuss your breathing data
            and therapy with a qualified sleep specialist.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="mt-10 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
        <h3 className="text-lg font-bold">Explore Your Data Free &mdash; No Install Needed</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Load your SD card into AirwayLab and see your AHI, flow limitation, RERAs, and breathing
          patterns in minutes. No installation, no account required, 100% private.
        </p>
        <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/analyze"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow transition-colors hover:bg-primary/90"
          >
            Try AirwayLab in Your Browser <ArrowRight className="h-4 w-4" />
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
