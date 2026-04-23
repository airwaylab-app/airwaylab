import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BookOpen,
  Info,
  Scale,
  Stethoscope,
} from 'lucide-react';

export default function AHIvsRDISleepApnea() {
  return (
    <article>
      <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
        If you&apos;ve had a sleep study, your report probably shows a number called RDI alongside
        — or instead of — AHI. Then you start your CPAP therapy, check the app each morning, and
        see only AHI. The two numbers rarely match, and the difference can be significant.{' '}
        <strong className="text-foreground">
          That gap isn&apos;t a data error. It&apos;s a measurement difference.
        </strong>{' '}
        Understanding it helps you have a much more useful conversation with your clinician about
        what your therapy data actually shows.
      </p>

      <div className="mt-6 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">Medical disclaimer:</strong> This article is for
          informational purposes only. AirwayLab is not a medical device, and nothing here
          constitutes a diagnosis or treatment recommendation. Always discuss your therapy data
          and any concerns about your metrics with a qualified sleep specialist.
        </p>
      </div>

      {/* AHI */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <BarChart3 className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">AHI: What It Actually Counts</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            AHI stands for Apnea-Hypopnea Index. It counts two types of events per hour of sleep:
          </p>
          <div className="space-y-3">
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">Apneas</p>
              <p className="mt-1 text-xs text-muted-foreground">
                A near-complete stop in airflow lasting at least 10 seconds. Obstructive apneas
                happen when the upper airway physically collapses. Central apneas happen when the
                brain temporarily stops sending the breathing signal.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">Hypopneas</p>
              <p className="mt-1 text-xs text-muted-foreground">
                A partial reduction in airflow — typically 30% or more below baseline — lasting at
                least 10 seconds, accompanied by either an oxygen desaturation or a sleep arousal.
                The exact threshold varies depending on which scoring criteria were applied
                (more on that below).
              </p>
            </div>
          </div>
          <p>
            Add those two together, divide by hours of sleep, and you have AHI. It has been the
            primary metric in sleep apnea diagnosis and treatment monitoring since the 1990s —
            and your CPAP or BiPAP machine reports it every morning.
          </p>
          <p>
            For a deeper look at what AHI measures and where it falls short, see{' '}
            <Link href="/blog/why-ahi-is-lying" className="text-primary hover:text-primary/80">
              Why Your AHI Is Lying to You
            </Link>
            .
          </p>
        </div>
      </section>

      {/* RDI */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Scale className="h-5 w-5 text-amber-400" />
          <h2 className="text-xl font-bold sm:text-2xl">RDI: The Bigger Picture</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            RDI stands for Respiratory Disturbance Index. It takes everything AHI counts and adds
            a third category: <strong className="text-foreground">RERAs</strong> — Respiratory
            Effort-Related Arousals.
          </p>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
            <p className="font-mono text-sm font-semibold text-foreground">
              RDI = AHI + RERAs per hour
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Because RDI adds a category rather than replacing one, it is always equal to or
              higher than AHI. The difference between them is exactly the RERA burden.
            </p>
          </div>
          <p>
            A RERA is a run of increasingly effortful, flow-limited breaths that ends in a brief
            arousal — just enough to restore airflow — without meeting the threshold for a full
            apnea or hypopnea. The arousal fragments your sleep. The event is real. But it does
            not appear in your AHI.
          </p>
          <p>
            For a full explanation of what RERAs are and how they look in raw flow data, see{' '}
            <Link
              href="/blog/what-are-reras-sleep-apnea"
              className="text-primary hover:text-primary/80"
            >
              What Are RERAs?
            </Link>
          </p>
        </div>
      </section>

      {/* The gap */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <AlertTriangle className="h-5 w-5 text-rose-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            The Gap That Confuses Everyone
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Here is a scenario that plays out in sleep forums constantly:
          </p>
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-5">
            <p className="text-sm text-muted-foreground">
              Sleep study (polysomnography) report:{' '}
              <strong className="text-foreground">RDI 22</strong>. Moderate sleep-disordered
              breathing. CPAP prescribed. Three months later, CPAP app shows{' '}
              <strong className="text-foreground">AHI 1.8</strong>. Numbers look great. Still
              exhausted.
            </p>
          </div>
          <p>
            Both numbers can be accurate simultaneously. The sleep study RDI of 22 included
            roughly 20 RERAs per hour. The CPAP reduced apneas and hypopneas to near zero — the
            AHI of 1.8 reflects that. But if RERAs are still occurring at a similar rate, the
            actual respiratory disturbance burden is far higher than the AHI suggests.
          </p>
          <p>
            Neither number is wrong. They are measuring different things. The CPAP does not know
            about the RERAs because it was not designed to report them.
          </p>
        </div>
      </section>

      {/* Why CPAP shows only AHI */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Info className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            Why Your CPAP Only Reports AHI
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Confirming a RERA in a clinical setting requires an EEG to verify the arousal. CPAP
            devices do not have EEG sensors — they measure airflow, pressure, and leak. Without
            EEG data, the device cannot confirm that a breathing disturbance ended in an arousal
            that meets the formal scoring criteria for a RERA.
          </p>
          <p>
            So CPAP manufacturers do what the hardware supports: they report AHI. Some devices
            also estimate flow limitation, but the headline metric on every ResMed, Philips, or
            Fisher &amp; Paykel screen is AHI.
          </p>
          <p>
            There is a second wrinkle: hypopnea scoring rules are not universal. The AASM changed
            its recommended criteria between 2007 and 2012. Under the older rules, more events
            counted as hypopneas. Under the newer rules, some of those same events become RERAs.
            If your sleep study used one ruleset and your follow-up data is being compared against
            a different standard, the numbers are not directly comparable even before you account
            for the CPAP&apos;s measurement limitations.
          </p>
          <div className="rounded-xl border border-border/50 p-4">
            <p className="text-sm font-semibold text-foreground">
              Practical consequence
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              If your sleep study was conducted using AASM 2007 rules and your clinic now uses
              AASM 2012 rules, some events that were counted in your baseline AHI would be
              reclassified as RERAs today. The underlying breathing disturbance is the same. The
              numbers are different. Your sleep physician can help interpret these scoring
              differences in the context of your specific data.
            </p>
          </div>
        </div>
      </section>

      {/* When each applies */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Scale className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">When Each Metric Applies</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <div className="space-y-3">
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">AHI is used for</p>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                <li className="flex gap-2">
                  <span className="text-blue-400">—</span>
                  <span>
                    Initial sleep apnea diagnosis (threshold: ≥5 mild, ≥15 moderate, ≥30 severe)
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-400">—</span>
                  <span>Insurance compliance monitoring (typically requires AHI ≥5 to justify CPAP)</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-400">—</span>
                  <span>Ongoing PAP therapy monitoring via device reports</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-400">—</span>
                  <span>Clinical research where standardised scoring is essential</span>
                </li>
              </ul>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">RDI is used for</p>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                <li className="flex gap-2">
                  <span className="text-amber-400">—</span>
                  <span>
                    Diagnosing Upper Airway Resistance Syndrome (UARS), where RDI is elevated but
                    AHI may be low or normal
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-400">—</span>
                  <span>
                    Comprehensive sleep study reporting where EEG-confirmed arousals are available
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-400">—</span>
                  <span>
                    FAA and DOT medical certification assessments, where RDI thresholds apply
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-400">—</span>
                  <span>
                    Clinical contexts where symptom burden (daytime sleepiness, fatigue) does not
                    match a low AHI
                  </span>
                </li>
              </ul>
            </div>
          </div>
          <p>
            Neither metric is &quot;better.&quot; They answer different questions. AHI asks: how
            many scored events per hour? RDI asks: how many total respiratory disturbances —
            including the subtler ones — per hour?
          </p>
        </div>
      </section>

      {/* What AirwayLab shows */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Activity className="h-5 w-5 text-purple-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            What AirwayLab Shows You
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            AirwayLab cannot produce a clinically certified RDI — that requires EEG. What it can
            do is analyse your PAP device&apos;s raw flow waveform data to show you the patterns
            that contribute to the AHI/RDI gap. All analysis runs in your browser; your data
            never leaves your device.
          </p>
          <div className="space-y-3">
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">Estimated RERA count</p>
              <p className="mt-1 text-xs text-muted-foreground">
                AirwayLab&apos;s NED engine analyses runs of flow-limited breaths with progressive
                features — NED slope, recovery breath pattern, sigh detection — to estimate the
                RERA burden in your nightly data. This is an approximation based on flow patterns,
                not EEG-confirmed arousals, but it surfaces the patterns your AHI cannot see.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">Flow limitation percentage</p>
              <p className="mt-1 text-xs text-muted-foreground">
                FL percentage shows what proportion of your night had flow-limited breaths — the
                precursor to RERAs. A night with low AHI but high FL percentage is exactly the
                scenario where the AHI/RDI gap is likely to be large.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">Estimated Arousal Index (EAI)</p>
              <p className="mt-1 text-xs text-muted-foreground">
                The EAI tracks respiratory rate and tidal volume spikes against a rolling baseline,
                identifying breath-pattern shifts consistent with micro-arousals. It complements
                the RERA estimate by approaching the same underlying event from a different
                analytical angle.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">H1/H2 split</p>
              <p className="mt-1 text-xs text-muted-foreground">
                RERA-type patterns often cluster in the second half of the night when REM sleep is
                more concentrated. AirwayLab&apos;s H1/H2 split shows whether your flow limitation
                and RERA estimates are worse in the first or second half of the session — a useful
                data point for discussing sleep architecture with your clinician.
              </p>
            </div>
          </div>
          <p>
            This data gives you and your clinician something specific to look at when a low AHI
            and persistent symptoms do not add up. Your sleep physician can help interpret these
            patterns in context.
          </p>
        </div>
      </section>

      {/* Practical takeaways */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Info className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Practical Takeaways</h2>
        </div>
        <div className="mt-4 space-y-3">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <p className="text-sm font-semibold text-emerald-400">
              AHI and RDI are not interchangeable
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Comparing your CPAP&apos;s nightly AHI to your sleep study&apos;s RDI is comparing
              apples and oranges. The sleep study measured more. That gap is not necessarily a
              therapy failure — it may simply reflect the difference in what each metric counts.
            </p>
          </div>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <p className="text-sm font-semibold text-emerald-400">
              A low AHI does not rule out significant respiratory disturbance
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              If your AHI is low but you have elevated flow limitation, a high estimated RERA
              count, or an elevated Estimated Arousal Index in your AirwayLab data, these patterns
              are worth discussing with your clinician. The data describes what your flow waveforms
              show — clinical interpretation belongs with your care team.
            </p>
          </div>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <p className="text-sm font-semibold text-emerald-400">
              Bring data, not just descriptions
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              &quot;My numbers look great but I still feel terrible&quot; is easy to dismiss.
              A report showing low AHI alongside elevated FL percentage and estimated RERAs gives
              your clinician something concrete to evaluate. AirwayLab&apos;s export function
              lets you share this data in a format designed for clinical review.
            </p>
          </div>
        </div>
      </section>

      {/* References */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <BookOpen className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-bold sm:text-2xl">References</h2>
        </div>
        <div className="mt-4 space-y-2 text-sm text-muted-foreground">
          <p>
            Berry et al. (2012). &quot;Rules for Scoring Respiratory Events in Sleep: Update of the
            2007 AASM Manual for the Scoring of Sleep and Associated Events.&quot;{' '}
            <em>Journal of Clinical Sleep Medicine</em>, 8(5), 597-619.
          </p>
          <p>
            Guilleminault et al. (1993). &quot;A cause of excessive daytime sleepiness: The upper
            airway resistance syndrome.&quot; <em>CHEST Journal</em>, 104(3), 781-787.
          </p>
          <p>
            Ruehland et al. (2009). &quot;The New AASM Criteria for Scoring Hypopneas: Impact on
            the Apnea Hypopnea Index.&quot; <em>Sleep</em>, 32(2), 150-157.
          </p>
          <p>
            Bonsignore et al. (2019). &quot;Obstructive sleep apnoea and comorbidities: a
            dangerous liaison.&quot; <em>Multidisciplinary Respiratory Medicine</em>, 14, 8.
          </p>
          <div className="mt-4 border-t border-border/30 pt-4">
            <p className="mb-2 text-xs font-semibold text-foreground">Related articles</p>
            <p>
              <Link href="/blog/why-ahi-is-lying" className="text-primary hover:text-primary/80">
                Why Your AHI Is Lying to You
              </Link>{' '}
              — the design limitations of AHI as a therapy monitoring metric.
            </p>
            <p className="mt-1">
              <Link
                href="/blog/what-are-reras-sleep-apnea"
                className="text-primary hover:text-primary/80"
              >
                What Are RERAs in Sleep Apnea?
              </Link>{' '}
              — what RERAs are, why they don&apos;t appear in AHI, and how they look in flow data.
            </p>
            <p className="mt-1">
              <Link
                href="/blog/understanding-flow-limitation"
                className="text-primary hover:text-primary/80"
              >
                Understanding Flow Limitation in CPAP Data
              </Link>{' '}
              — the waveform patterns behind RERA-type events.
            </p>
            <p className="mt-1">
              <Link href="/blog/beyond-ahi" className="text-primary hover:text-primary/80">
                Beyond AHI: Why Your Sleep Apnea Score Might Be Misleading You
              </Link>{' '}
              — the research case for multi-dimensional sleep assessment.
            </p>
          </div>
        </div>
      </section>

      {/* Medical disclaimer */}
      <section className="mt-8">
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
          <div className="flex items-center gap-2.5">
            <Stethoscope className="h-4 w-4 text-amber-500" />
            <p className="text-xs font-semibold text-foreground">Medical disclaimer</p>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            AirwayLab is an educational tool, not a medical device. The analysis provided is based
            on published research methodologies applied to your PAP device&apos;s flow data, but it
            is not a substitute for polysomnography or clinical evaluation. Always discuss your
            therapy data with your sleep physician. The metrics described here are for educational
            purposes and to support informed conversations with your clinician.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="mt-10 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
        <h3 className="text-lg font-bold">Explore Your Sleep Data Metrics in AirwayLab</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          AirwayLab analyses your ResMed SD card data in your browser — no upload, no account.
          See your flow limitation percentage, estimated RERA count, and Estimated Arousal Index
          alongside your AHI, free and open-source.
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
    </article>
  );
}
