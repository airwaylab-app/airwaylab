import Link from 'next/link';
import {
  ArrowRight,
  HardDrive,
  BarChart3,
  Activity,
  Lightbulb,
  Monitor,
  MessageSquare,
} from 'lucide-react';

export default function HowToExportAndUnderstandYourCPAPDataPost() {
  return (
    <article>
      <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
        Most CPAP and BiPAP machines record a lot more than whether you wore the mask. Every night,
        your device is quietly logging dozens of data points — breathing patterns, pressure changes,
        mask seal, and more. The trouble is, most of that data never leaves the machine unless you go
        looking for it.
      </p>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
        This guide walks through how to get your data off the machine, what the main numbers actually
        mean, and how to use that information to have a more productive conversation with your sleep
        specialist.
      </p>

      {/* Medical disclaimer callout */}
      <div className="mt-6 rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
        <div className="flex items-center gap-2.5">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          <p className="text-xs font-semibold text-foreground">Note</p>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          This article is for informational purposes only. It does not constitute medical advice,
          diagnosis, or treatment recommendations. Always discuss your therapy data and any changes
          to your treatment with a qualified clinician.
        </p>
      </div>

      {/* What Does Your CPAP Machine Actually Record? */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <HardDrive className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            What Does Your CPAP Machine Actually Record?
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Modern CPAP and BiPAP machines record data at two levels:{' '}
            <strong className="text-foreground">summary statistics</strong> (what most apps show
            you) and{' '}
            <strong className="text-foreground">full night flow data</strong> (what reveals the
            complete picture).
          </p>
        </div>

        <div className="mt-6">
          <h3 className="text-base font-bold text-foreground">
            Summary data — recorded every night:
          </h3>
          <div className="mt-3 space-y-3">
            <div className="rounded-xl border border-border/50 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-400" />
                <p className="text-sm font-semibold text-foreground">Usage hours</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                How long you wore the device.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-400" />
                <p className="text-sm font-semibold text-foreground">
                  AHI (Apnoea-Hypopnoea Index)
                </p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                The number of apnoeas and hypopnoeas per hour.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-400" />
                <p className="text-sm font-semibold text-foreground">Leak rate</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                How much air is escaping around your mask.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-purple-400" />
                <p className="text-sm font-semibold text-foreground">Pressure</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                The pressure your machine delivered (average, 95th percentile, or fixed, depending
                on your device mode).
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-base font-bold text-foreground">
            Full flow data — recorded on SD card or internal memory:
          </h3>
          <div className="mt-3 space-y-3">
            <div className="rounded-xl border border-border/50 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-400" />
                <p className="text-sm font-semibold text-foreground">
                  Breath-by-breath flow waveforms
                </p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                The actual shape of each breath.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-400" />
                <p className="text-sm font-semibold text-foreground">Flow limitation</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                A subtler signal than AHI, showing partial airway narrowing that restricts airflow
                without fully triggering an event.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-red-400" />
                <p className="text-sm font-semibold text-foreground">
                  RERAs (Respiratory Effort-Related Arousals)
                </p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Effort-induced arousals that fragment sleep without meeting the threshold for a
                scored event.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-cyan-400" />
                <p className="text-sm font-semibold text-foreground">Snore index</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Detected snoring, which can co-occur with residual upper-airway resistance.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            The summary AHI on your machine&apos;s screen or companion app is useful, but it&apos;s
            often incomplete. A low AHI doesn&apos;t always mean your therapy is well optimised —
            flow limitation and RERAs can persist even when the headline number looks fine. Full flow
            data is where the detail lives.
          </p>
        </div>
      </section>

      {/* How to Export Your Data */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <HardDrive className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">How to Export Your Data</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            The method varies by manufacturer. In all cases, your data is stored on a standard SD
            card or via USB — no account or cloud service is required to access it.
          </p>
        </div>

        {/* ResMed */}
        <div className="mt-6">
          <h3 className="text-lg font-bold text-foreground">
            ResMed (AirSense 10, AirSense 11, S9 series)
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            ResMed machines store detailed flow data on a{' '}
            <strong className="text-foreground">standard SD card</strong> (older machines) or
            internal memory accessible via SD slot.
          </p>
          <div className="mt-3 space-y-3">
            {[
              'Power off the machine.',
              'Locate the SD card slot — typically on the side panel of AirSense 10/11 models, or under the humidifier chamber on S9 models.',
              'Remove the SD card and insert it into your computer using an SD card reader.',
              <span key="step4">
                The card will contain a folder structure with{' '}
                <code className="rounded bg-border/40 px-1.5 py-0.5 text-xs font-mono text-foreground">
                  .edf
                </code>{' '}
                and other data files holding your full-resolution flow data.
              </span>,
            ].map((step, i) => (
              <div key={i} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-xs font-bold text-blue-400">
                  {i + 1}
                </span>
                <span className="pt-0.5 text-sm text-muted-foreground">{step}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            ResMed&apos;s <strong className="text-foreground">myAir</strong> app shows you a nightly
            summary score, but does not give access to raw flow data. For the full picture, the SD
            card is the route.
          </p>
          <div className="mt-3 rounded-xl border border-border/50 bg-muted/20 p-4">
            <p className="text-xs text-muted-foreground">
              <strong className="text-foreground">Supported by:</strong> OSCAR, AirwayLab, and
              other open tools.
            </p>
          </div>
        </div>

        {/* Philips */}
        <div className="mt-8">
          <h3 className="text-lg font-bold text-foreground">
            Philips Respironics (DreamStation, DreamStation 2, System One)
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Philips machines use an{' '}
            <strong className="text-foreground">SD card</strong> on older DreamStation and System
            One units.
          </p>
          <div className="mt-3 space-y-3">
            {[
              'Power off.',
              'Remove the SD card from the slot on the side of the device.',
              <span key="step3">
                Insert into your computer — the card contains{' '}
                <code className="rounded bg-border/40 px-1.5 py-0.5 text-xs font-mono text-foreground">
                  .001
                </code>{' '}
                Encore data files (System One) or Encore Pro format files (DreamStation).
              </span>,
            ].map((step, i) => (
              <div key={i} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-xs font-bold text-emerald-400">
                  {i + 1}
                </span>
                <span className="pt-0.5 text-sm text-muted-foreground">{step}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
            <p className="text-xs text-muted-foreground">
              <strong className="text-foreground">Note:</strong> The DreamStation 2 stores data
              internally and currently has limited third-party compatibility. Check the OSCAR
              compatibility list for up-to-date support status.
            </p>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            The <strong className="text-foreground">DreamMapper</strong> app provides summary data
            but does not expose raw flow waveforms.
          </p>
        </div>

        {/* Fisher & Paykel */}
        <div className="mt-8">
          <h3 className="text-lg font-bold text-foreground">
            Fisher &amp; Paykel (ICON, SleepStyle, F&amp;P series)
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Fisher &amp; Paykel machines generally use an{' '}
            <strong className="text-foreground">SD card</strong> or{' '}
            <strong className="text-foreground">USB export</strong>.
          </p>
          <div className="mt-3 space-y-3">
            {[
              'On the ICON series, the SD card is accessible under a door on the device front or side.',
              'On SleepStyle units, some models export via a USB connection to the companion app.',
              'Data is stored in proprietary formats; support varies across analysis tools. OSCAR\'s compatibility page is the most current reference.',
            ].map((step, i) => (
              <div key={i} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-500/10 text-xs font-bold text-purple-400">
                  {i + 1}
                </span>
                <span className="pt-0.5 text-sm text-muted-foreground">{step}</span>
              </div>
            ))}
          </div>
        </div>

        {/* General note */}
        <div className="mt-6 rounded-xl border border-border/50 p-4">
          <p className="text-sm font-semibold text-foreground">A general note on data formats</p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Raw CPAP data comes in proprietary formats that differ by manufacturer and device
            generation. Tools like OSCAR and AirwayLab handle the parsing — you just point the tool
            at the folder on your SD card.
          </p>
        </div>
      </section>

      {/* What the Numbers Mean */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <BarChart3 className="h-5 w-5 text-amber-400" />
          <h2 className="text-xl font-bold sm:text-2xl">What the Numbers Mean</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Once you have your data open in an analysis tool, here&apos;s how to read the main
            signals:
          </p>
        </div>

        <div className="mt-4 space-y-4">
          <div className="rounded-xl border border-border/50 p-4">
            <p className="text-sm font-semibold text-foreground">AHI</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Your machine&apos;s headline number. It counts complete airway obstructions (apnoeas)
              and partial obstructions with a drop in airflow (hypopnoeas), expressed per hour of
              sleep. A lower AHI generally indicates fewer scored breathing interruptions. However,
              scoring thresholds and event detection logic vary between devices — so a
              machine-scored AHI and a lab-scored AHI can differ.
            </p>
          </div>
          <div className="rounded-xl border border-border/50 p-4">
            <p className="text-sm font-semibold text-foreground">Leak rate</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Expressed in litres per minute. Most devices have a built-in intentional vent leak to
              allow CO₂ to escape — this is normal. What to watch for is{' '}
              <em>unintentional</em> leak: a sustained elevation above your device&apos;s leak
              baseline. Elevated leak can reduce therapy effectiveness and is often fixable with mask
              fit adjustments.
            </p>
          </div>
          <div className="rounded-xl border border-border/50 p-4">
            <p className="text-sm font-semibold text-foreground">Flow limitation</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Shown as a value between 0 and 1, or as a time-series graph. It represents how
              &ldquo;flattened&rdquo; the top of each breath is. A rounded breath peak indicates
              unobstructed flow; a flat-topped peak suggests partial upper-airway narrowing. This
              signal may help you understand whether residual obstruction is present even when AHI is
              low.
            </p>
          </div>
          <div className="rounded-xl border border-border/50 p-4">
            <p className="text-sm font-semibold text-foreground">RERAs</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Effort-induced arousals — the airway doesn&apos;t completely close, but increased
              respiratory effort causes a brief awakening or lightening of sleep. They contribute to
              sleep fragmentation without necessarily being counted in AHI. Not all machines report
              RERAs directly; it depends on the device and algorithm.
            </p>
          </div>
          <div className="rounded-xl border border-border/50 p-4">
            <p className="text-sm font-semibold text-foreground">Pressure</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              If you&apos;re on APAP (auto-adjusting), your nightly pressure graph shows how the
              machine responded to detected events. Consistent high-pressure clustering at certain
              times of night can suggest positional obstruction or other patterns worth discussing
              with your clinician.
            </p>
          </div>
        </div>
      </section>

      {/* Exploring Your Data with AirwayLab */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Monitor className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold sm:text-2xl">
            Exploring Your Data with AirwayLab
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            AirwayLab is an open-source tool for visualising and exploring PAP therapy data. It runs
            entirely in your browser — your data never leaves your device, which matters when
            you&apos;re dealing with sensitive health information.
          </p>
          <p>Load your SD card data directly and explore:</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              {
                label: 'Nightly trend charts',
                desc: 'AHI, leak, pressure, and usage across nights and weeks.',
              },
              {
                label: 'Full-resolution flow waveforms',
                desc: 'Breath-by-breath waveform view for any night.',
              },
              {
                label: 'Flow limitation and RERA trends',
                desc: 'Track these secondary signals over time.',
              },
              {
                label: 'Side-by-side comparison',
                desc: 'Compare nights and weeks to spot patterns.',
              },
            ].map(({ label, desc }) => (
              <div key={label} className="rounded-xl border border-border/50 p-4">
                <p className="text-sm font-semibold text-foreground">{label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
          <p>
            The source code is published under GPL-3.0, so the analysis is verifiable — you can see
            exactly how events are being scored. AirwayLab is free and always will be for core
            analysis features. A premium tier is available for those who want to support continued
            development.
          </p>
          <p>
            AirwayLab is designed to complement, not replace, tools like OSCAR. Many users use both
            — OSCAR for deep clinical-format reporting, AirwayLab for day-to-day visual exploration.
            They read the same underlying data.
          </p>
        </div>
      </section>

      {/* Having a Better Conversation with Your Clinician */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <MessageSquare className="h-5 w-5 text-cyan-400" />
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
            <p className="text-sm font-semibold text-foreground">
              Export a trend report before your appointment.
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Most analysis tools can export a PDF summary covering the past 30–90 days. Bring this
              to your follow-up — it gives your specialist context faster than relying on device
              remote-monitoring summaries alone.
            </p>
          </div>
          <div className="rounded-xl border border-border/50 p-4">
            <p className="text-sm font-semibold text-foreground">
              Note specific nights that felt different.
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              If you woke up feeling unrefreshed, pull up that night&apos;s data and look at
              pressure and leak graphs. Targeted observations are often more useful than averages.
            </p>
          </div>
          <div className="rounded-xl border border-border/50 p-4">
            <p className="text-sm font-semibold text-foreground">
              Ask about flow limitation and RERAs, not just AHI.
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              If your AHI is &ldquo;controlled&rdquo; but you still feel tired, your clinician may
              want to look at these secondary signals. Having the data makes that conversation
              concrete.
            </p>
          </div>
          <div className="rounded-xl border border-border/50 p-4">
            <p className="text-sm font-semibold text-foreground">
              Be specific about mask issues.
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              If your leak data shows spikes at consistent times, that&apos;s useful clinical
              information — it might indicate movement during the night that breaks the seal.
            </p>
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

      {/* Summary */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Activity className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Summary</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Your CPAP machine is generating detailed data every night. Getting it off the device is
            straightforward — an SD card and a free tool is all it takes. Understanding what AHI,
            leak rate, flow limitation, and RERAs may tell you about your breathing patterns can help
            you engage more meaningfully with your therapy and your care team.
          </p>
          <p>
            Tools like AirwayLab and OSCAR exist to make your data accessible — in your browser, on
            your terms, with open and verifiable analysis.
          </p>
        </div>
      </section>

      {/* Medical disclaimer */}
      <section className="mt-8">
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
          <div className="flex items-center gap-2.5">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            <p className="text-xs font-semibold text-foreground">Medical disclaimer</p>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            AirwayLab is not a medical device. The analysis provided is informational and
            educational. Always discuss your results with your sleep physician or clinician.
            AirwayLab does not diagnose, treat, or provide clinical recommendations.
          </p>
        </div>
      </section>

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
              href="/blog/understanding-flow-limitation"
              className="text-primary hover:text-primary/80"
            >
              Understanding Flow Limitation
            </Link>{' '}
            &mdash; what flow limitation is, how the Glasgow Index scores it, and how to detect it.
          </p>
          <p>
            <Link href="/blog/why-ahi-is-lying" className="text-primary hover:text-primary/80">
              Why Your AHI Is Lying to You
            </Link>{' '}
            &mdash; the evidence that AHI misses the majority of breathing problems.
          </p>
          <p>
            <Link href="/blog/pap-data-privacy" className="text-primary hover:text-primary/80">
              Your PAP Data Belongs to You
            </Link>{' '}
            &mdash; who can see your sleep data and how to keep control of it.
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
        </div>
      </section>

      {/* CTA */}
      <section className="mt-10 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
        <h3 className="text-lg font-bold">
          Explore your data free — load your SD card into AirwayLab
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Drag your SD card folder into AirwayLab and see your breathing patterns scored and
          visualised in seconds. Free, open source, and your data never leaves your browser.
        </p>
        <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/getting-started"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow transition-colors hover:bg-primary/90"
          >
            Get Started <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/analyze"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Analyze Your Data
          </Link>
        </div>
      </section>
    </article>
  );
}
