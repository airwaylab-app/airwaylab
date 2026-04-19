import Link from 'next/link';
import { ArrowRight, BarChart3, HardDrive, Lightbulb, TrendingUp, Wind } from 'lucide-react';

export default function HowToAnalyzeCPAPDataAtHome() {
  return (
    <article>
      <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
        Most people on CPAP therapy get a summary from their sleep clinic every six to twelve
        months. That summary usually looks something like: &ldquo;Your AHI is 3.2. Therapy is
        effective.&rdquo; And if that&apos;s all you hear, you nod along and go home.
      </p>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
        The problem? A lot can happen between visits. Your weight changes. You switch sleep
        positions. Your mask degrades or your pressures drift. That time between clinic check-ins
        is where understanding your own CPAP data becomes genuinely useful &mdash; not to diagnose
        yourself, but to have a better conversation with your care team when you do see them.
      </p>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
        Learning how to analyze your CPAP data at home puts you in a position to be a more
        informed participant in your own care.
      </p>

      {/* Medical disclaimer */}
      <blockquote className="mt-6 rounded-xl border border-amber-500/20 bg-amber-500/5 px-5 py-4">
        <p className="text-sm leading-relaxed text-muted-foreground">
          <strong className="text-foreground">Medical disclaimer:</strong> This article is for
          informational purposes only. AirwayLab is a data exploration tool, not a clinical
          decision support system. Nothing in this article constitutes medical advice. Your
          healthcare provider can interpret your data in the context of your individual health
          situation.
        </p>
      </blockquote>

      {/* What Analyzing Actually Means */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <BarChart3 className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            What &ldquo;Analyzing Your CPAP Data&rdquo; Actually Means
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Analyzing your CPAP data means exploring patterns in the numbers your machine records
            every night: how often breathing events occur, how much air is leaking from your mask,
            whether your pressure is staying within expected ranges, and whether there are signs of
            flow limitation or respiratory effort-related arousals (RERAs).
          </p>
          <p>
            What it doesn&apos;t mean is drawing clinical conclusions on your own. The data tells
            you <em>what</em> your machine recorded. It can&apos;t tell you whether therapy is
            appropriate for your specific health situation, whether your pressure settings are
            suited to you, or whether any changes you notice are medically significant. That
            interpretation belongs to your care team.
          </p>
          <p>With that framing in place, here are the metrics worth paying attention to.</p>

          {/* Metric cards */}
          <div className="space-y-3">
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">
                AHI (Apnea-Hypopnea Index)
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                AHI is the average number of apneas and hypopneas per hour. What&apos;s more
                useful than any single reading is trend over time &mdash; is your AHI stable, or
                is it gradually drifting? Your clinician can place these patterns in clinical
                context.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">Leak Rate</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                CPAP machines need a sealed mask to deliver effective therapy. Some leak is normal
                (particularly with intentional exhaust vents), but large or unintentional leaks
                may mean your device is not delivering the full set pressure. Your machine records
                this, and it&apos;s worth knowing your baseline.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">Flow Limitation</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Flow limitation describes partial airway obstruction &mdash; your airway isn&apos;t
                fully collapsed (which would be a scored apnea), but it&apos;s not fully open
                either. Flow limitation doesn&apos;t always trigger a scored event, which is why it
                can go unnoticed in a headline AHI figure despite potentially contributing to
                disrupted sleep. Looking at flow limitation patterns is one area where home
                analysis adds context beyond a single nightly number.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">
                RERAs (Respiratory Effort-Related Arousals)
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                RERAs are brief arousals caused by increased respiratory effort, often associated
                with upper airway resistance. They don&apos;t necessarily appear in standard AHI
                calculations depending on how your machine scores them. Some devices and analysis
                tools surface these separately &mdash; if you&apos;re waking frequently but your
                AHI looks unremarkable, your clinician may consider RERAs alongside AHI when
                reviewing your data.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How AirwayLab Works */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Wind className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold sm:text-2xl">
            How AirwayLab Analyzes Your CPAP Data
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            AirwayLab is a client-side data exploration tool. That means when you load your SD
            card data, it is processed entirely within your browser &mdash; your data never leaves
            your device, never touches a server, and never gets stored anywhere outside your own
            machine.
          </p>
          <p>
            This isn&apos;t just a privacy stance (though it is that). It&apos;s also a
            transparency stance: AirwayLab is open-source under GPL-3.0, which means you &mdash;
            or anyone you trust &mdash; can read the exact code that runs on your data. Verifiable,
            not just claimed.
          </p>
          <p>
            The tool is designed to complement tools like OSCAR, not to replace them. If
            you&apos;re already using OSCAR and want a second perspective on your data, or
            you&apos;re new to reviewing your therapy data and want somewhere accessible to start,
            AirwayLab is built to be usable without a technical background.
          </p>
          <p>
            The free tier is complete. Core analysis features are free and always will be.
          </p>
        </div>
      </section>

      {/* Walkthrough */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <HardDrive className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            How to Analyze Your CPAP Data with AirwayLab: A Walkthrough
          </h2>
        </div>
        <div className="mt-4 space-y-6 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <div className="rounded-xl border border-border/50 p-4">
            <p className="text-sm font-semibold text-foreground">
              Step 1 &mdash; Export your data from your CPAP device
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Most modern CPAP and BiPAP devices (ResMed AirSense, Philips DreamStation, and
              others) record detailed session data to an SD card. You&apos;ll need to remove the
              SD card from your device and read it with your computer, or use a USB card reader.
              If you&apos;ve never exported your data before, our{' '}
              <Link
                href="/blog/how-to-export-cpap-data"
                className="text-primary hover:text-primary/80"
              >
                How to Export CPAP Data
              </Link>{' '}
              guide walks through the process device by device.
            </p>
          </div>
          <div className="rounded-xl border border-border/50 p-4">
            <p className="text-sm font-semibold text-foreground">
              Step 2 &mdash; Load your data into AirwayLab
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Go to{' '}
              <Link href="/analyze" className="text-primary hover:text-primary/80">
                AirwayLab&apos;s analysis page
              </Link>{' '}
              and use the file picker to select your SD card data folder. The tool reads the raw
              machine data directly in your browser. Nothing is uploaded &mdash; all processing is
              local.
            </p>
          </div>
          <div className="rounded-xl border border-border/50 p-4">
            <p className="text-sm font-semibold text-foreground">
              Step 3 &mdash; Explore the dashboard
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Once your data is loaded, you&apos;ll see a summary of recent sessions. From there
              you can browse AHI trends across days, weeks, and months; inspect nightly leak rate
              patterns; look at flow limitation signals; and view pressure data for APAP or BiPAP
              users.
            </p>
          </div>
          <div className="rounded-xl border border-border/50 p-4">
            <p className="text-sm font-semibold text-foreground">
              Step 4 &mdash; Focus on trends, not individual nights
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              One night of elevated AHI isn&apos;t necessarily meaningful &mdash; disrupted sleep,
              a new position, a loose mask. Patterns across time are what matter. Use the date
              range selectors to compare weeks or months, and look for consistent changes rather
              than one-off readings. The{' '}
              <Link
                href="/blog/how-to-read-cpap-data"
                className="text-primary hover:text-primary/80"
              >
                How to Read CPAP Data
              </Link>{' '}
              article is a useful companion for understanding what the numbers mean.
            </p>
          </div>
        </div>
      </section>

      {/* Mask Fit and Leaks */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <TrendingUp className="h-5 w-5 text-cyan-400" />
          <h2 className="text-xl font-bold sm:text-2xl">A Note on Mask Fit and Leaks</h2>
        </div>
        <div className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            If your leak rate is consistently elevated, it&apos;s worth doing a mask fit check
            before assuming a pressure or therapy issue. Try adjusting your headgear, check for
            cushion wear, and make sure you&apos;re fitting the mask on your face correctly. Our{' '}
            <Link
              href="/blog/cpap-leak-rate-guide"
              className="text-primary hover:text-primary/80"
            >
              CPAP Leak Rate Guide
            </Link>{' '}
            covers what&apos;s typical, what&apos;s not, and what to check first.
          </p>
        </div>
      </section>

      {/* Medical disclaimer at bottom */}
      <section className="mt-8">
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
          <div className="flex items-center gap-2.5">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            <p className="text-xs font-semibold text-foreground">Medical disclaimer</p>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            This article is for informational purposes only. AirwayLab is a data exploration tool,
            not a clinical decision support system. Nothing in this article constitutes medical
            advice. Your healthcare provider can interpret your data in the context of your
            individual health situation.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="mt-10">
        <h2 className="text-xl font-bold sm:text-2xl">Frequently Asked Questions</h2>
        <div className="mt-4 space-y-4">
          <div className="rounded-xl border border-border/50 p-4">
            <p className="text-sm font-semibold text-foreground">
              Is exploring my own CPAP data safe?
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Exploring your therapy data is informational &mdash; it is not a substitute for
              clinical review. Use what you find to prepare better questions for your care team,
              not to make independent therapy decisions.
            </p>
          </div>
          <div className="rounded-xl border border-border/50 p-4">
            <p className="text-sm font-semibold text-foreground">
              Do I need a specific CPAP device to use AirwayLab?
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              AirwayLab supports data from most common CPAP and BiPAP devices that record detailed
              data to SD card, including ResMed and some Philips models. Check the supported
              devices page for the current list.
            </p>
          </div>
          <div className="rounded-xl border border-border/50 p-4">
            <p className="text-sm font-semibold text-foreground">
              Does my data get uploaded anywhere?
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              No. AirwayLab processes your data entirely in your browser. Nothing is transmitted,
              stored, or shared. Your data stays on your device.
            </p>
          </div>
          <div className="rounded-xl border border-border/50 p-4">
            <p className="text-sm font-semibold text-foreground">
              What&apos;s the difference between AHI and RERA index?
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              AHI counts apneas and hypopneas per hour. The RERA index counts respiratory
              effort-related arousals separately. Some devices score these differently, and your
              clinician may consider both when evaluating therapy patterns.
            </p>
          </div>
          <div className="rounded-xl border border-border/50 p-4">
            <p className="text-sm font-semibold text-foreground">
              I&apos;m already using OSCAR &mdash; why would I also use AirwayLab?
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              OSCAR is excellent and AirwayLab is not trying to replace it. Some users find
              AirwayLab&apos;s interface easier to start with, or use it alongside OSCAR for a
              different view of the same data. Both are free, both are open-source.
            </p>
          </div>
          <div className="rounded-xl border border-border/50 p-4">
            <p className="text-sm font-semibold text-foreground">
              Should I change my settings based on what I find?
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Pressure settings are managed by your healthcare provider based on your clinical
              needs. Your clinician can interpret these patterns in clinical context.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mt-10 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
        <h3 className="text-lg font-bold">Analyse Your CPAP Data with AirwayLab</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Browser-based, free, and open-source. Your data never leaves your device.
        </p>
        <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/analyze"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow transition-colors hover:bg-primary/90"
          >
            Analyse Your Data <ArrowRight className="h-4 w-4" />
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
