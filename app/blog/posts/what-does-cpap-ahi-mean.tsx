import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BookOpen,
  Info,
  TrendingUp,
} from 'lucide-react';

export default function WhatDoesCpapAhiMean() {
  return (
    <article>
      <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
        If you use a CPAP or BiPAP machine, the number you probably check most is your AHI —
        Apnea-Hypopnea Index. Most users know lower is better. But what does your CPAP AHI
        actually count, what do the different values represent, and — importantly — what does it
        miss? This guide covers the metric your nightly summary is built on, and the picture it
        leaves out.
      </p>

      <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
        If you have ever searched for <strong className="text-foreground">what is AHI CPAP</strong>{' '}
        and wanted a plain-language answer rather than a clinical textbook, this is it.
      </p>

      <div className="mt-6 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">Medical disclaimer:</strong> This article is for
          informational and educational purposes only. AirwayLab is not a medical device, and nothing
          here constitutes a diagnosis, therapy recommendation, or medical opinion. Always discuss
          your therapy data and any concerns with your sleep physician or qualified clinician.
        </p>
      </div>

      {/* What Is AHI */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Info className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">What Is AHI?</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            <strong className="text-foreground">AHI — Apnea-Hypopnea Index</strong> — is the number of
            apneas and hypopneas recorded per hour of sleep. It is the primary metric used in clinical
            sleep medicine to describe sleep-disordered breathing frequency, and it is the headline
            number your CPAP or BiPAP machine reports each morning.
          </p>
          <p>The index combines two types of breathing events:</p>
          <div className="space-y-3">
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">Apneas</p>
              <p className="mt-2 text-sm text-muted-foreground">
                A near-complete stop in airflow lasting at least 10 seconds. There are two subtypes:
                obstructive apneas (the airway physically collapses) and central apneas (the brain
                temporarily pauses the breathing signal). Both are counted in AHI.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">Hypopneas</p>
              <p className="mt-2 text-sm text-muted-foreground">
                A partial reduction in airflow — typically 30% or more below baseline — lasting at
                least 10 seconds, accompanied by either an oxygen desaturation of 3–4% or a brief
                arousal from sleep. Hypopneas are the more commonly scored event on PAP therapy.
              </p>
            </div>
          </div>
          <p>
            The formula is straightforward:{' '}
            <strong className="text-foreground">
              total scored events ÷ total hours of sleep
            </strong>
            . A machine that recorded 15 events during 6 hours of sleep reports an AHI of 2.5.
          </p>
        </div>
      </section>

      {/* What the Numbers Represent */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <BarChart3 className="h-5 w-5 text-purple-400" />
          <h2 className="text-xl font-bold sm:text-2xl">What the Numbers Represent</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Clinical sleep guidelines — primarily from the American Academy of Sleep Medicine (AASM) —
            define AHI ranges as shorthand for describing breathing event frequency during sleep.
            These ranges are used in diagnostic sleep studies and inform discussions between clinicians
            and their patients about therapy goals.
          </p>
          <div className="overflow-hidden rounded-xl border border-border/50">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-muted/30">
                  <th className="px-4 py-3 text-left font-semibold text-foreground">AHI range</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">AASM classification</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">On-therapy context</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                <tr>
                  <td className="px-4 py-3 font-medium text-emerald-400">Below 5</td>
                  <td className="px-4 py-3 text-muted-foreground">Below the diagnostic threshold</td>
                  <td className="px-4 py-3 text-muted-foreground">Typical target range on PAP therapy</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-amber-400">5–15</td>
                  <td className="px-4 py-3 text-muted-foreground">Mild range</td>
                  <td className="px-4 py-3 text-muted-foreground">Worth raising with your clinician</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-amber-500">15–30</td>
                  <td className="px-4 py-3 text-muted-foreground">Moderate range</td>
                  <td className="px-4 py-3 text-muted-foreground">Clinician review recommended</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-red-400">Above 30</td>
                  <td className="px-4 py-3 text-muted-foreground">Severe range</td>
                  <td className="px-4 py-3 text-muted-foreground">Clinician review important</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            These thresholds apply in diagnostic contexts. On PAP therapy, the goal is typically to
            bring residual AHI below 5 — but your clinician sets the specific target for your
            situation. A single elevated night is worth noting; a persistent trend is what your
            clinician needs to see to make informed care decisions.
          </p>
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">On-therapy vs diagnostic AHI:</strong> The AHI your
              CPAP reports is your <em>residual AHI</em> — events recorded while the machine was
              running. This is typically lower than your untreated AHI from a sleep study. They are
              related but not the same number, and your sleep physician can explain what each means
              for your treatment plan.
            </p>
          </div>
        </div>
      </section>

      {/* Low AHI Still Tired */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <AlertTriangle className="h-5 w-5 text-amber-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            Low AHI, Still Tired? What AHI Doesn&apos;t Count
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            This is one of the most common questions in CPAP communities. Your machine reports a
            low AHI — say, 1.5 — yet you still feel unrested. You are not imagining it.
          </p>
          <p>
            AHI has a fundamental limitation: it only counts events that meet its strict scoring
            thresholds. Several types of breathing disruption remain invisible to it:
          </p>
          <div className="space-y-3">
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">Flow limitation</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Airflow that is reduced but does not meet the hypopnea threshold. When your airway
                narrows, the inspiratory flow waveform flattens — the typical rounded arch of a
                healthy breath becomes a plateau. These flow-limited breaths can persist for
                significant portions of the night without generating an AHI event.{' '}
                <Link
                  href="/blog/understanding-flow-limitation"
                  className="text-primary hover:text-primary/80"
                >
                  Understanding flow limitation
                </Link>{' '}
                covers this in depth.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">
                RERAs — Respiratory Effort-Related Arousals
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Periods where increasing respiratory effort ends in a brief arousal from sleep,
                without meeting the threshold for a scored hypopnea. RERAs fragment sleep
                architecture without appearing in your AHI.{' '}
                <Link
                  href="/blog/what-are-reras-sleep-apnea"
                  className="text-primary hover:text-primary/80"
                >
                  What are RERAs?
                </Link>{' '}
                covers these in detail.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">Scoring variability</p>
              <p className="mt-2 text-sm text-muted-foreground">
                AASM hypopnea scoring rules have changed over time, and different labs apply
                different criteria. Two people with identical breathing patterns can receive
                different AHI values depending on which scoring rule was applied. Your device uses
                its own internal algorithm, which may differ from your sleep lab&apos;s criteria.
              </p>
            </div>
          </div>
          <p>
            AHI is a useful count of how many qualifying events occurred. It is not a complete
            picture of airway behaviour during sleep. If your data shows a low AHI but you remain
            symptomatic, your clinician can look beyond the headline number — and tools like
            AirwayLab give you the underlying data to bring to that conversation.
          </p>
          <p>
            For a longer read on this topic, see{' '}
            <Link href="/blog/why-ahi-is-lying" className="text-primary hover:text-primary/80">
              Why Your AHI Might Not Tell the Whole Story
            </Link>{' '}
            and{' '}
            <Link href="/blog/ahi-normal-still-tired" className="text-primary hover:text-primary/80">
              AHI Normal But Still Tired
            </Link>
            .
          </p>
        </div>
      </section>

      {/* AHI vs RDI */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <BookOpen className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">AHI vs RDI: What&apos;s the Difference?</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Some sleep study reports include an{' '}
            <strong className="text-foreground">RDI (Respiratory Disturbance Index)</strong>{' '}
            alongside AHI. RDI typically adds RERAs to the apnea and hypopnea count, so it is
            always equal to or higher than AHI. A person with an AHI of 3 but an RDI of 12 has
            significant respiratory disturbances that AHI alone does not capture.
          </p>
          <p>
            Most CPAP machines report AHI only — not RDI. The RERA-type events that contribute to
            RDI remain invisible in your nightly summary, even though they may be present in your
            raw flow waveform data.
          </p>
          <p>
            A detailed comparison of what each metric covers — and when RDI matters more than AHI —
            is coming in our article <em>AHI vs RDI: What Sleep Apnea Metrics Actually Tell You</em>.
          </p>
        </div>
      </section>

      {/* Tracking AHI Trends */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <TrendingUp className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Tracking AHI Trends in AirwayLab</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            A single night&apos;s AHI is a snapshot. Trends across multiple nights are what matter
            most for understanding whether your therapy data is staying consistent — and for giving
            your clinician a meaningful picture of your nights.
          </p>
          <p>
            AirwayLab reads your SD card data directly in your browser. No upload, no account
            required. It surfaces your AHI alongside the metrics that AHI misses: flow limitation
            scores, RERA-related breathing patterns, breath-by-breath NED analysis, and
            first-half vs second-half comparisons within each night.
          </p>
          <div className="space-y-3">
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">Nightly AHI trend</p>
              <p className="mt-2 text-sm text-muted-foreground">
                AirwayLab plots your AHI across all sessions on the SD card. Persistent elevated
                values are easier to spot in a chart than in your device&apos;s rolling 7-day
                average.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">Event type breakdown</p>
              <p className="mt-2 text-sm text-muted-foreground">
                AirwayLab separates obstructive and central events. Knowing how that ratio changes
                over time is useful context to bring to a clinician review — your sleep physician
                can interpret what the breakdown means for your specific situation.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">Beyond the headline number</p>
              <p className="mt-2 text-sm text-muted-foreground">
                The four AirwayLab analysis engines run on your raw flow waveform — not just the
                device-reported events. This gives you access to flow limitation scores, breathing
                regularity analysis, and pattern detection that are invisible in AHI alone. All of
                it runs entirely in your browser; your data never leaves your device.
              </p>
            </div>
          </div>
          <p>
            AirwayLab is free and always will be. The code is open source (GPL-3.0) and publicly
            auditable — you can verify exactly what it does with your data.
          </p>
        </div>
      </section>

      {/* What to Bring to Your Clinician */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Activity className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-bold sm:text-2xl">What to Bring to Your Clinician</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Your AHI trend is a good starting point for a clinical conversation, but it is rarely
            the whole story. The most useful data to bring to a follow-up appointment:
          </p>
          <ul className="ml-4 list-disc space-y-2">
            <li>AHI trend over the past 30–90 days, not just the latest night&apos;s value</li>
            <li>Whether elevated-AHI nights cluster at specific times or appear randomly</li>
            <li>
              The breakdown between obstructive and central events, if your machine reports it
            </li>
            <li>Any nights with elevated flow limitation or RERA-related patterns</li>
            <li>
              Persistent symptoms: daytime fatigue, morning headaches, unrefreshing sleep
            </li>
          </ul>
          <p>
            AirwayLab&apos;s export tools let you generate a formatted data summary from your SD card.
            Your sleep physician or respiratory therapist can help interpret what the patterns in
            your data mean for your care.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="mt-10">
        <h2 className="text-xl font-bold sm:text-2xl">Frequently Asked Questions</h2>
        <div className="mt-4 space-y-4">
          {[
            {
              q: 'What is a good AHI number for CPAP therapy?',
              a: 'Most clinical guidelines use an AHI below 5 as the target range on PAP therapy. Your clinician sets the specific goal for your situation — some individuals need different targets based on their clinical history. A persistent AHI above 5 on therapy is worth discussing at your next appointment.',
            },
            {
              q: 'What does a high AHI on CPAP mean?',
              a: 'A high residual AHI on therapy means your machine is recording more scored breathing events than the typical target range. This can happen for several reasons — pressure settings, mask fit, body position, or changes in your upper airway. Your clinician can review your data and advise on next steps.',
            },
            {
              q: 'Why does my AHI vary so much night to night?',
              a: 'Night-to-night AHI variability is normal. Factors like sleep position, alcohol, sedatives, nasal congestion, and sleep stage distribution can all affect how your airway behaves. A single high night is not necessarily cause for concern; a consistent upward trend is worth discussing with your clinician.',
            },
            {
              q: 'Can I have a low AHI and still feel tired?',
              a: 'Yes. AHI only counts events that meet specific scoring thresholds. Flow-limited breaths and RERAs can disrupt sleep without appearing in your AHI. Other factors — sleep stage distribution, periodic limb movements, circadian issues — also affect how rested you feel. Your clinician can help evaluate what is contributing.',
            },
            {
              q: 'What is the difference between AHI on a sleep study and AHI on CPAP?',
              a: 'Your diagnostic AHI from a sleep study reflects your untreated breathing during a supervised study. Your CPAP residual AHI reflects events recorded while the machine is running. They use related but not always identical scoring algorithms and represent different clinical contexts. Your sleep physician can explain what each means for your treatment plan.',
            },
            {
              q: 'Does AirwayLab show my AHI?',
              a: "Yes. AirwayLab reads the AHI and event data from your ResMed SD card and displays it alongside additional metrics — flow limitation scores, RERA-related breathing patterns, and breath-by-breath waveform analysis — that do not appear in your device's nightly summary. Everything runs in your browser; no data is uploaded.",
            },
            {
              q: 'What does RDI mean and how is it different from AHI?',
              a: 'RDI (Respiratory Disturbance Index) typically adds RERAs — Respiratory Effort-Related Arousals — to the apnea and hypopnea count used in AHI. RDI is therefore always equal to or higher than AHI for the same night. Most CPAP machines report AHI only. A full comparison of AHI vs RDI is coming in the next article in this series.',
            },
          ].map(({ q, a }) => (
            <div key={q} className="rounded-xl border border-border/50 p-5">
              <p className="text-sm font-semibold text-foreground">{q}</p>
              <p className="mt-2 text-sm text-muted-foreground">{a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mt-10 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
        <h3 className="text-lg font-bold">See Your AHI Trends Over Time</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Upload your SD card data and explore your AHI trends, event breakdowns, and the
          flow-limitation patterns your nightly summary doesn&apos;t show.
        </p>
        <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/analyze"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow transition-colors hover:bg-primary/90"
          >
            Analyse Your CPAP Data <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/blog/what-are-reras-sleep-apnea"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Read: What Are RERAs?
          </Link>
        </div>
      </section>

      {/* Related reading */}
      <section className="mt-8 border-t border-border/30 pt-6">
        <p className="mb-2 text-xs font-semibold text-foreground">Related reading</p>
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>
            <Link href="/blog/what-are-reras-sleep-apnea" className="text-primary hover:text-primary/80">
              What Are RERAs?
            </Link>{' '}
            — the breathing events your AHI does not count.
          </p>
          <p>
            <Link href="/blog/understanding-flow-limitation" className="text-primary hover:text-primary/80">
              Understanding Flow Limitation in CPAP Data
            </Link>{' '}
            — what happens when your airway narrows without triggering an event.
          </p>
          <p>
            <Link href="/blog/why-ahi-is-lying" className="text-primary hover:text-primary/80">
              Why Your AHI Might Not Tell the Whole Story
            </Link>{' '}
            — a deeper look at AHI&apos;s limits as a sleep quality metric.
          </p>
          <p>
            <Link href="/blog/ahi-normal-still-tired" className="text-primary hover:text-primary/80">
              AHI Normal But Still Tired
            </Link>{' '}
            — common reasons for persistent fatigue despite low AHI.
          </p>
        </div>
      </section>

      {/* Bottom disclaimer */}
      <p className="mt-8 text-xs italic text-muted-foreground/60">
        AirwayLab is a free, open-source tool for analysing PAP flow data. Your data never leaves
        your browser. Nothing on this page constitutes medical advice — always discuss your results
        with a qualified sleep specialist before making any changes to your therapy.
      </p>
    </article>
  );
}
