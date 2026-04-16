import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  HardDrive,
  Lightbulb,
  Monitor,
  Stethoscope,
  TrendingUp,
  Wind,
} from 'lucide-react';

export default function HowToReadCPAPDataPost() {
  return (
    <article>
      <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
        You&apos;ve started CPAP therapy. Your machine has been collecting data every night
        &mdash; pressure, events, leak rate, flow &mdash; and at some point someone told you to
        check it. So you downloaded an app, opened a file, and stared at a wall of numbers and
        coloured graphs that made very little sense.
      </p>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
        This happens to almost everyone. The data your machine records is genuinely useful, but
        the tools that display it were often designed by engineers, for engineers. Nobody hands
        you a glossary when you pick up your mask.
      </p>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
        This article is that glossary. We&apos;ll walk through what your CPAP machine actually
        records, what the key metrics mean, and how to start reading your data in a way that&apos;s
        useful &mdash; whether you&apos;re reviewing it yourself or preparing for a conversation
        with your equipment provider or sleep clinician.
      </p>

      {/* Medical disclaimer at top */}
      <blockquote className="mt-6 rounded-xl border border-amber-500/20 bg-amber-500/5 px-5 py-4">
        <p className="text-sm leading-relaxed text-muted-foreground">
          <strong className="text-foreground">Medical disclaimer:</strong> The information in this
          article is educational only. Nothing here constitutes medical advice, a diagnosis, or a
          treatment recommendation. CPAP data is informational &mdash; please discuss any
          observations or concerns with your clinician or equipment provider.
        </p>
      </blockquote>

      {/* What Your CPAP Machine Actually Records */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <HardDrive className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            What Your CPAP Machine Actually Records
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>Your machine is running a quiet sensor session every night. Here&apos;s what it&apos;s capturing:</p>
          <div className="space-y-3">
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">Usage hours</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                How long the machine was running. This is the most basic metric and the one your
                provider usually checks first.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">
                AHI (Apnoea-Hypopnoea Index)
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                The number of apnoeas (complete pauses in breathing) and hypopnoeas (partial
                reductions in airflow) per hour of therapy. Your machine counts events it detects
                while running; this is not the same as a diagnostic AHI from a sleep study, which
                measures untreated events. A therapy AHI is what your machine reports during
                treated sleep.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">Leak rate</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                The total air escaping from the system, measured in litres per minute (L/min). This
                includes the intentional vent flow built into every mask (which flushes exhaled CO&#x2082;)
                as well as any unintentional mask leak around the seal. The unintentional component
                is the one to watch.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">Pressure</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                The pressure your machine is delivering, measured in cmH&#x2082;O. Fixed-pressure (CPAP)
                machines hold one level all night. Auto-adjusting (APAP/CPAP) machines titrate
                within a set range based on detected events.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">Flow limitation</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                How much your breathing is being squeezed or flattened, even without a full apnoea
                or hypopnoea being scored. Flow limitation is often how upper airway resistance and
                RERAs (Respiratory Effort Related Arousals) show up in the data. It&apos;s a
                subtler signal that some providers find clinically meaningful alongside AHI.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">Events breakdown</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Most machines split the AHI total into component event types: obstructive apnoeas,
                central apnoeas, hypopnoeas, and sometimes RERAs (if your machine scores them
                separately). The breakdown matters because different event types can point to
                different causes.
              </p>
            </div>
          </div>
          <p>
            Not every machine records all of these &mdash; older devices or basic models may only
            report AHI and usage. And not all data is equally accessible depending on your machine
            and what SD card or app access you have.
          </p>
        </div>
      </section>

      {/* Where to Find Your Data */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Monitor className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Where to Find Your Data</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>Your machine stores data in one of a few ways:</p>
          <div className="space-y-3">
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">SD card</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Most ResMed and Philips/Respironics machines use a standard SD card. You can remove
                it, insert it into your computer, and view the raw data files. Dedicated software
                reads these files and presents the data visually.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">
                Machine app or cloud dashboard
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                ResMed&apos;s myAir and Philips&apos; DreamMapper/SleepMapper sync summary data to
                a phone app or web portal. These are convenient but often only show you a simplified
                view &mdash; AHI, usage hours, leak summary &mdash; without the full waveform detail
                available from the SD card.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">OSCAR</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                OSCAR (Open Source CPAP Analysis Reporter) is the community standard for reading SD
                card data in detail. It&apos;s free, open source, and runs on Windows, macOS, and
                Linux. OSCAR shows you full waveform data: every breath, every pressure change,
                every event flagged across the night. It&apos;s the tool most CPAP community members
                use for serious data review and is widely recommended in the PAP community.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">AirwayLab</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                AirwayLab is a browser-based analysis tool that imports your CPAP data from OSCAR
                exports or direct upload. It&apos;s designed to make patterns easier to spot,
                particularly across multiple nights. Your data never leaves your browser &mdash; all
                processing is local. The source code is GPL-3.0 licensed, so what it does is
                verifiable, not just claimed. AirwayLab complements OSCAR rather than replacing it.
              </p>
            </div>
          </div>
          <p>
            For most users, the path looks like this: SD card &rarr; OSCAR (full detail view) &rarr;
            AirwayLab (multi-night pattern view, easy visual summaries).
          </p>
        </div>
      </section>

      {/* What the Key Metrics Mean */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <BarChart3 className="h-5 w-5 text-purple-400" />
          <h2 className="text-xl font-bold sm:text-2xl">What the Key Metrics Mean</h2>
        </div>
        <div className="mt-4 space-y-6 text-sm leading-relaxed text-muted-foreground sm:text-base">

          {/* AHI */}
          <div>
            <h3 className="text-lg font-bold text-foreground">AHI</h3>
            <div className="mt-3 space-y-3">
              <p>
                Your therapy AHI is the central number most people focus on first. A lower number
                means fewer breathing events are being scored by the machine during the night &mdash;
                but AHI alone doesn&apos;t tell the whole story. An AHI of 2 on a night where your
                leak was 60 L/min means the AHI figure may be unreliable, because high leak can
                prevent the machine from accurately detecting events.
              </p>
              <p>
                AHI is a count, not a complete picture of sleep quality. Some people have residual
                flow limitation and RERAs that don&apos;t show up in AHI but may still affect how
                they feel. This is one reason why looking at more than just AHI is worthwhile.
              </p>
              <p>
                What counts as a &ldquo;good&rdquo; therapy AHI is something to discuss with your
                clinician, not something to benchmark from an article. Context matters &mdash; your
                pre-treatment AHI, your symptoms, and how you feel are all part of the picture.
              </p>
            </div>
          </div>

          {/* Leak Rate */}
          <div>
            <h3 className="text-lg font-bold text-foreground">Leak Rate</h3>
            <div className="mt-3 space-y-3">
              <p>
                Your leak rate combines two things: the intentional vent flow your mask needs to
                flush CO&#x2082; (typically 20&ndash;40 L/min depending on mask type and pressure),
                and any unintentional leak escaping around the seal. The second number is what you
                want to minimise.
              </p>
              <p>
                Some machines and software (including OSCAR) separate these and show &ldquo;mask
                leak&rdquo; directly. Others only report total leak.{' '}
                <Link
                  href="/blog/cpap-leak-rate-explained"
                  className="text-primary hover:text-primary/80"
                >
                  Understanding your leak rate
                </Link>{' '}
                in detail can help you identify whether high-leak nights are a mask fit issue, a
                positional issue, or a mouth-breathing issue &mdash; all of which have different
                solutions.
              </p>
            </div>
          </div>

          {/* Pressure */}
          <div>
            <h3 className="text-lg font-bold text-foreground">Pressure</h3>
            <div className="mt-3">
              <p>
                If you&apos;re on a fixed-pressure CPAP, your pressure is set and doesn&apos;t
                change. If you&apos;re on APAP, your machine is adjusting throughout the night.
                Reviewing your pressure data tells you how actively your machine is working. An APAP
                machine frequently at the top of its pressure range is a pattern visible in your
                data.
              </p>
            </div>
          </div>

          {/* Flow Limitation and RERAs */}
          <div>
            <h3 className="text-lg font-bold text-foreground">Flow Limitation and RERAs</h3>
            <div className="mt-3 space-y-3">
              <p>
                Flow limitation is visible in your waveform data as a flattening of the normal
                breathing curve. RERAs (Respiratory Effort Related Arousals) are events where
                increased breathing effort triggers an arousal, even without a scored apnoea or
                hypopnoea. Not all machines score RERAs &mdash; some higher-end devices do, and
                OSCAR can display the flow limitation waveform even when RERAs aren&apos;t scored
                directly.
              </p>
              <p>
                If you feel you&apos;re sleeping the expected number of hours but still waking up
                unrefreshed, flow limitation and RERAs are worth reviewing in the context of your
                data. Bring observations to your clinician rather than drawing conclusions from
                them.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How to Spot Patterns Over Multiple Nights */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <TrendingUp className="h-5 w-5 text-cyan-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            How to Spot Patterns Over Multiple Nights
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Single-night data is noisy. A bad night might be explained by a cold, a late meal,
            position, or stress. What matters in CPAP data is trends.
          </p>
          <p>Things worth watching across multiple nights:</p>
          <div className="space-y-3">
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">AHI variability</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Is your AHI consistently low, or does it spike on certain nights? Spikes on nights
                when your pressure also went high, or when your leak was elevated, may suggest a
                pattern worth noting.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">Leak consistency</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Is high leak a regular occurrence at a particular time of night (e.g., always after
                3am)? That&apos;s more useful information than a single average figure.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">Pressure trends</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                On APAP, is your machine consistently comfortable in the middle of its range, or is
                it frequently at its ceiling? Sustained high-pressure activity is a pattern worth
                discussing.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">Event type distribution</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                If your events are predominantly central rather than obstructive, or if the ratio is
                changing over time, that&apos;s the kind of observation to bring to a sleep
                clinician.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How AirwayLab Visualises Your Therapy Data */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Wind className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold sm:text-2xl">
            How AirwayLab Visualises Your Therapy Data
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            AirwayLab is built specifically to make multi-night pattern review easier. After you
            import your CPAP data (from an OSCAR export or direct SD card upload), it shows your
            key metrics plotted over time so patterns become visible at a glance.
          </p>
          <p>
            You can overlay AHI, leak rate, flow limitation, and pressure on a shared timeline and
            compare nights side by side. The goal is to help you notice &mdash; not to interpret
            for you.
          </p>
          <p>
            Everything runs in your browser. Your breathing data never leaves your device &mdash;
            there&apos;s no cloud upload, no account required to get started. The analysis is free
            and always will be. If you want to verify that for yourself, the source code is
            published under GPL-3.0.
          </p>
          <div className="mt-4">
            <Link
              href="/analyze"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80"
            >
              Analyse your CPAP data with AirwayLab <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* What to Bring to Your Provider */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Stethoscope className="h-5 w-5 text-amber-400" />
          <h2 className="text-xl font-bold sm:text-2xl">What to Bring to Your Provider</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Your data doesn&apos;t interpret itself &mdash; and it shouldn&apos;t. The observations
            you make from reviewing your CPAP data are most useful as conversation material with
            your equipment provider or sleep clinician, not as a basis for self-adjusting therapy.
          </p>
          <p>Useful things to bring to an appointment:</p>
          <div className="space-y-3">
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">Screenshots of patterns</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Not just averages. &ldquo;My AHI was 4.2 last month&rdquo; is less useful than
                &ldquo;my AHI spikes to 8&ndash;12 every Thursday night and I can&apos;t figure
                out why.&rdquo;
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">
                Leak patterns if leak is elevated
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Along with what you&apos;ve already tried (mask brand, cushion age, whether
                you&apos;ve noticed mouth breathing).
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">
                Pressure graphs if you&apos;re on APAP
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Particularly if you&apos;re frequently hitting the top of your range.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">Event type breakdowns</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                If you have a high proportion of centrals or an unusual distribution.
              </p>
            </div>
          </div>
          <p>
            Your equipment provider can adjust pressure ranges and mask recommendations. Your sleep
            clinician can review your data in full clinical context.
          </p>
        </div>
      </section>

      {/* A Few Things Worth Knowing */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <BookOpen className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-bold sm:text-2xl">A Few Things Worth Knowing</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Your CPAP machine is not a medical device in the sense that its data is diagnostic
            &mdash; it&apos;s a therapeutic device whose monitoring data gives you and your care
            team visibility into how therapy is going. The numbers it reports are useful reference
            points, not verdicts.
          </p>
          <p>
            The CPAP community is genuinely helpful for new users learning to read data. Forums,
            subreddits, and OSCAR documentation have collectively built a large body of practical
            knowledge. Tools like OSCAR and AirwayLab exist because the community wanted better
            visibility into their own therapy.
          </p>
          <p>
            Learning to read your data doesn&apos;t mean managing your therapy alone. It means
            having more informed conversations with the people who are helping you get there.
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
            The information in this article is for educational purposes only and does not
            constitute medical advice. AirwayLab does not diagnose, treat, or provide clinical
            recommendations. Always discuss CPAP therapy and data observations with your clinician
            or equipment provider.
          </p>
        </div>
      </section>

      {/* Related reading */}
      <section className="mt-8 border-t border-border/30 pt-6">
        <p className="mb-2 text-xs font-semibold text-foreground">Related reading</p>
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>
            <Link
              href="/blog/cpap-leak-rate-explained"
              className="text-primary hover:text-primary/80"
            >
              CPAP Leak Rate Explained
            </Link>{' '}
            &mdash; what the numbers mean and how to reduce unintentional mask leak.
          </p>
          <p>
            <Link
              href="/blog/understanding-flow-limitation"
              className="text-primary hover:text-primary/80"
            >
              Understanding Flow Limitation
            </Link>{' '}
            &mdash; what flow limitation is, how it affects your sleep, and how it shows in your
            data.
          </p>
          <p>
            <Link href="/blog/pap-data-privacy" className="text-primary hover:text-primary/80">
              Your PAP Data Belongs to You
            </Link>{' '}
            &mdash; who can see your sleep data and how to keep control of it.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="mt-10 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
        <h3 className="text-lg font-bold">Analyse Your CPAP Data with AirwayLab</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Upload your CPAP data and see your key metrics plotted over time. Free, open source, and
          your data never leaves your browser.
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
