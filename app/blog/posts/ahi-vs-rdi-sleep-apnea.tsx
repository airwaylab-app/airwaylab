import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  HelpCircle,
  Layers,
  Scale,
  TrendingUp,
} from 'lucide-react';

export default function AHIVsRDISleepApnea() {
  return (
    <article>
      {/* Medical disclaimer — top */}
      <blockquote className="mb-8 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-muted-foreground">
        <strong className="text-amber-400">Medical disclaimer:</strong> AirwayLab is a data
        visualisation and analysis tool, not a medical device. The information it provides is for
        personal reference only and is not a substitute for professional clinical advice. Always
        discuss your sleep study results and therapy data with your prescribing clinician.
      </blockquote>

      <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
        Your sleep study report shows an RDI of 22. Your CPAP screen shows an AHI of 1.8. The two
        numbers look completely different — but both are accurate. They are counting different things.
      </p>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
        This article explains what AHI and RDI each measure, why the numbers differ, and when each
        metric is relevant.
      </p>

      {/* AHI */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <TrendingUp className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">AHI: What It Actually Counts</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            AHI stands for Apnea-Hypopnea Index. It counts two types of breathing events per hour:
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
              <p className="text-sm font-semibold text-blue-400">Apneas</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Complete or near-complete airflow stoppages lasting ≥10 seconds. Obstructive apneas
                involve airway collapse; central apneas involve reduced breathing drive.
              </p>
            </div>
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
              <p className="text-sm font-semibold text-blue-400">Hypopneas</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Partial airflow reductions (≥30% for ≥10 seconds) associated with oxygen
                desaturation or an arousal, depending on the scoring criteria used.
              </p>
            </div>
          </div>
          <p>
            AHI = (total apneas + hypopneas) ÷ hours of sleep. Your CPAP machine computes this
            from its internal flow sensor — no EEG or sleep technician required. For a deeper look
            at what AHI does and does not capture, see{' '}
            <Link href="/blog/why-ahi-is-lying" className="text-primary hover:text-primary/80">
              Why AHI Is Lying to You
            </Link>
            .
          </p>
        </div>
      </section>

      {/* RDI */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Layers className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">RDI: The Bigger Picture</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            RDI stands for Respiratory Disturbance Index. It counts everything in AHI, plus
            additional respiratory events that do not meet the full criteria for an apnea or
            hypopnea.
          </p>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <p className="text-sm font-semibold text-emerald-400">RDI = AHI + additional events</p>
            <p className="mt-2 text-xs text-muted-foreground">
              The difference between them is the count of RERA-type events included in RDI but not
              in AHI. RERAs (Respiratory Effort-Related Arousals) are sequences of flow-limited
              breaths that end in an arousal without a full apnea or hypopnea occurring. Learn more
              in{' '}
              <Link
                href="/blog/what-are-reras-sleep-apnea"
                className="text-primary hover:text-primary/80"
              >
                What Are RERAs?
              </Link>
            </p>
          </div>
          <p>
            RDI is always ≥ AHI. When the two numbers are close, there are few RERA-type events.
            When they differ substantially, RERA-type events make up a significant portion of your
            respiratory disturbances.
          </p>
        </div>
      </section>

      {/* The gap */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <HelpCircle className="h-5 w-5 text-amber-400" />
          <h2 className="text-xl font-bold sm:text-2xl">The Gap That Confuses Everyone</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>Consider a concrete scenario:</p>
          <div className="rounded-xl border border-border/50 bg-card/50 p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/60">
                  Sleep study (PSG)
                </p>
                <p className="mt-1 text-2xl font-bold text-foreground">RDI 22</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Includes apneas, hypopneas, and RERA-type events scored by a sleep technician
                  with EEG data
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/60">
                  CPAP data (nightly)
                </p>
                <p className="mt-1 text-2xl font-bold text-foreground">AHI 1.8</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Counts apneas and hypopneas only — no EEG, no arousal detection, no RERA scoring
                </p>
              </div>
            </div>
          </div>
          <p>
            Both numbers are correct. The sleep study measured more event types. The CPAP reports
            only what its flow sensor can detect without EEG data.
          </p>
        </div>
      </section>

      {/* Why CPAP only reports AHI */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <HelpCircle className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-bold sm:text-2xl">Why Your CPAP Only Reports AHI</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>Two reasons home CPAP machines do not report RDI:</p>
          <ul className="ml-4 space-y-3">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
              <span>
                <strong className="text-foreground">No EEG signal.</strong> Detecting arousals
                requires EEG data — brain activity monitoring. Home CPAP machines have only a flow
                sensor and a pressure sensor. They can detect breathing events but cannot directly
                detect arousals.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
              <span>
                <strong className="text-foreground">Scoring rule variation.</strong> The AASM 2007
                and 2012 hypopnea scoring rules differ in their arousal criteria, which affects what
                counts as a hypopnea vs a sub-threshold event. Your sleep study and your CPAP
                machine may apply different versions.
              </span>
            </li>
          </ul>
        </div>
      </section>

      {/* Side-by-side */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Scale className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold sm:text-2xl">When Each Metric Applies</h2>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="py-3 pr-4 text-left font-semibold text-foreground">Context</th>
                <th className="px-4 py-3 text-center font-semibold text-foreground">AHI</th>
                <th className="px-4 py-3 text-center font-semibold text-foreground">RDI</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              <tr className="border-b border-border/30">
                <td className="py-2.5 pr-4">Sleep apnea diagnosis (PSG)</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">Yes</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">Yes</td>
              </tr>
              <tr className="border-b border-border/30">
                <td className="py-2.5 pr-4">CPAP compliance reporting</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">Yes</td>
                <td className="px-4 py-2.5 text-center text-muted-foreground/60">Not available</td>
              </tr>
              <tr className="border-b border-border/30">
                <td className="py-2.5 pr-4">Ongoing nightly monitoring</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">Yes</td>
                <td className="px-4 py-2.5 text-center text-muted-foreground/60">Not available</td>
              </tr>
              <tr className="border-b border-border/30">
                <td className="py-2.5 pr-4">Evaluating UARS (symptoms disproportionate to AHI)</td>
                <td className="px-4 py-2.5 text-center text-muted-foreground/60">Incomplete</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">More informative</td>
              </tr>
              <tr className="border-b border-border/30">
                <td className="py-2.5 pr-4">FAA / DOT medical certification</td>
                <td className="px-4 py-2.5 text-center">Varies</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">Often required</td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4">PSG report from sleep lab</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">Reported</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">Often reported</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground/70">
          Sleep physicians often look at RDI alongside AHI when symptoms are disproportionate to
          AHI alone. Your clinician can review both metrics together in the context of your clinical
          picture.
        </p>
      </section>

      {/* What AirwayLab shows */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <TrendingUp className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">What AirwayLab Shows You</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            AirwayLab does not compute a clinical RDI — that requires EEG data that home devices
            do not have. What it does compute are several metrics related to the RERA-type patterns
            that drive the RDI-AHI gap:
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              {
                label: 'NED (Negative Effort Dependence)',
                desc: 'Estimates RERA-type patterns per hour using breath-shape analysis. Not equivalent to a clinical RERA count, but reflects the same flow-limited arousal patterns.',
                color: 'emerald',
              },
              {
                label: 'FL Score',
                desc: 'Percentage of flow-limited breaths per night. Elevated flow limitation is the airway mechanism underlying most RERA-type events.',
                color: 'emerald',
              },
              {
                label: 'Glasgow Index',
                desc: 'A composite 9-component breath shape score (0–8). Captures overall airway quality across the night, not just event counts.',
                color: 'emerald',
              },
              {
                label: 'H1/H2 split',
                desc: 'Compares metrics between the first and second halves of the night. Positional or REM-related patterns show up here.',
                color: 'emerald',
              },
            ].map(({ label, desc }) => (
              <div
                key={label}
                className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4"
              >
                <p className="text-sm font-semibold text-emerald-400">{label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
          <p>
            These metrics are patterns to discuss with your clinician — not a substitute for a
            sleep study or a clinical RDI calculation. See{' '}
            <Link
              href="/blog/understanding-flow-limitation"
              className="text-primary hover:text-primary/80"
            >
              Understanding Flow Limitation
            </Link>{' '}
            for more on how these metrics relate to what happens in your airway.
          </p>
        </div>
      </section>

      {/* Practical takeaways */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <BookOpen className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-bold sm:text-2xl">Practical Takeaways</h2>
        </div>
        <div className="mt-4 space-y-3">
          <div className="rounded-xl border border-border/50 p-4">
            <p className="text-sm font-semibold text-foreground">AHI ≠ RDI</p>
            <p className="mt-1 text-xs text-muted-foreground">
              If your sleep study shows RDI and your CPAP shows AHI, the two numbers are not
              measuring the same thing. A low nightly AHI does not necessarily mean your CPAP data
              would match your sleep study RDI.
            </p>
          </div>
          <div className="rounded-xl border border-border/50 p-4">
            <p className="text-sm font-semibold text-foreground">
              Low AHI does not rule out sleep disturbance
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              If you have persistent symptoms with a low AHI, elevated RERA-type pattern estimates
              (NED, FL Score) in your AirwayLab data may be worth discussing with your clinician
              alongside your full sleep history. See{' '}
              <Link href="/blog/beyond-ahi" className="text-primary hover:text-primary/80">
                Beyond AHI
              </Link>{' '}
              for the research context.
            </p>
          </div>
          <div className="rounded-xl border border-border/50 p-4">
            <p className="text-sm font-semibold text-foreground">
              Bring data, not descriptions, to your appointment
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              If your FL Score and elevated FL percentage and RERA-type pattern estimates look
              consistently elevated, export a summary and bring it to your next appointment. Your
              clinician can review it alongside your sleep study results and prescription history.
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
        <div className="mt-4 space-y-1 text-xs text-muted-foreground">
          <p>
            Berry RB et al. Rules for Scoring Respiratory Events in Sleep. J Clin Sleep Med.
            2012;8(5):597-619.
          </p>
          <p>
            Guilleminault C et al. Upper airway sleep-disordered breathing in women. Ann Intern
            Med. 1995;122(7):493-501.
          </p>
          <p>
            Ruehland WR et al. The new AASM criteria for scoring hypopneas: impact on the apnea
            hypopnea index. Sleep. 2009;32(2):150-157.
          </p>
          <p>
            Bonsignore MR et al. Obstructive sleep apnoea and comorbidities: a dangerous liaison.
            Multidiscip Respir Med. 2019;14:8.
          </p>
        </div>
      </section>

      {/* Medical disclaimer — bottom */}
      <blockquote className="mt-10 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-muted-foreground italic">
        The information on this page is for personal reference only. AHI and RDI are clinical
        metrics that should be interpreted by a qualified clinician in the context of your
        diagnosis, prescription, and symptoms. AirwayLab&apos;s pattern estimates are not
        equivalent to a clinical RDI calculation.
      </blockquote>

      {/* CTA */}
      <section className="mt-10 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
        <h3 className="text-lg font-bold">Explore your sleep data metrics in AirwayLab</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Upload your ResMed SD card and see FL Score, NED, Glasgow Index, and RERA-type pattern
          estimates. No installation, no account, no data upload required.
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
