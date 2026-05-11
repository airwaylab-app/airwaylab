import Link from 'next/link';
import { Activity, AlertCircle, ArrowRight, BookOpen, Info, TrendingUp } from 'lucide-react';

export default function WhatDoesAHIMeanPost() {
  return (
    <article>
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">Medical disclaimer:</strong> AirwayLab is a
          data-visualization tool, not a medical device. The information below describes how AHI is
          calculated and reported — it is not a diagnosis or clinical recommendation. Always discuss
          your therapy data and any concerns with your sleep physician.
        </p>
      </div>

      <p className="mt-6 text-base leading-relaxed text-muted-foreground sm:text-lg">
        If you&apos;ve recently been diagnosed with sleep apnea, or you&apos;ve just started
        reviewing your CPAP data, three letters appear constantly:{' '}
        <strong className="text-foreground">AHI</strong>. It&apos;s on your therapy summary, your
        clinician&apos;s report, and practically every sleep apnea forum you&apos;ll stumble across.
        Here&apos;s what it actually means.
      </p>

      {/* What AHI Measures */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Activity className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">What AHI Measures</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            AHI stands for <strong className="text-foreground">Apnea-Hypopnea Index</strong>. It
            counts the number of apneas (complete breathing pauses) and hypopneas (partial breathing
            reductions) per hour of recorded sleep time.
          </p>
          <p>Both events involve disrupted airflow:</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border/50 bg-card/50 p-4">
              <p className="text-sm font-semibold text-foreground">Apnea</p>
              <p className="mt-1 text-xs text-muted-foreground">
                A pause in airflow lasting at least 10 seconds.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 bg-card/50 p-4">
              <p className="text-sm font-semibold text-foreground">Hypopnea</p>
              <p className="mt-1 text-xs text-muted-foreground">
                A reduction in airflow — typically 30% or more below baseline — also sustained for
                at least 10 seconds, usually accompanied by a drop in blood oxygen or a brief
                arousal.
              </p>
            </div>
          </div>
          <p>
            Your CPAP machine records these events throughout the night. The AHI value is simply:
            total events &divide; total hours recorded.
          </p>
        </div>
      </section>

      {/* Reference Ranges */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Info className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Common AHI Reference Ranges</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Different guidelines use slightly different thresholds. These are the ranges commonly
            cited in published sleep medicine literature:
          </p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="py-2 pr-6 text-left font-semibold text-foreground">AHI Value</th>
                  <th className="py-2 text-left font-semibold text-foreground">
                    Category commonly cited in literature
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                <tr>
                  <td className="py-2.5 pr-6 text-muted-foreground">&lt; 5/hr</td>
                  <td className="py-2.5 text-muted-foreground">
                    Within the typical range for adults
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-6 text-muted-foreground">5–14/hr</td>
                  <td className="py-2.5 text-muted-foreground">Mild range</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-6 text-muted-foreground">15–29/hr</td>
                  <td className="py-2.5 text-muted-foreground">Moderate range</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-6 text-muted-foreground">≥ 30/hr</td>
                  <td className="py-2.5 text-muted-foreground">Severe range</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground/80">
            Keep in mind: these categories describe the raw count, not how you feel, how well your
            therapy is working, or what treatment adjustments (if any) might be appropriate. Your
            sleep clinician interprets these numbers in the context of your full history.
          </p>
        </div>
      </section>

      {/* Residual vs Diagnostic */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <TrendingUp className="h-5 w-5 text-amber-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Residual AHI vs. Diagnostic AHI</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>There are two different AHI values you&apos;ll encounter:</p>
          <div className="space-y-3">
            <div className="rounded-xl border border-border/50 bg-card/50 p-4">
              <p className="text-sm font-semibold text-foreground">Diagnostic AHI</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Measured during a sleep study (polysomnography or home sleep test) before you start
                therapy. This is the number on your original diagnosis.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 bg-card/50 p-4">
              <p className="text-sm font-semibold text-foreground">Residual AHI</p>
              <p className="mt-1 text-xs text-muted-foreground">
                The value your CPAP machine reports <em>while you&apos;re using therapy</em>. This
                is what you see in AirwayLab and tools like OSCAR. Most ResMed devices aim to keep
                residual AHI below 5/hr, but what constitutes a well-managed result is something
                your clinician determines for you specifically.
              </p>
            </div>
          </div>
          <p>
            A residual AHI of 2 on Monday and 6 on Tuesday — night-to-night variation of this
            magnitude is expected. Trends over weeks or months are more meaningful than individual
            nights.
          </p>
        </div>
      </section>

      {/* What AHI Doesn't Tell You */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <AlertCircle className="h-5 w-5 text-rose-400" />
          <h2 className="text-xl font-bold sm:text-2xl">What AHI Doesn&apos;t Tell You</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            AHI is a useful summary number, but it&apos;s one metric among many. It doesn&apos;t
            capture:
          </p>
          <ul className="ml-4 space-y-2">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
              <span>
                <strong className="text-foreground">Flow limitation and upper airway resistance</strong>{' '}
                — partial obstruction that disrupts sleep without meeting the threshold for a
                hypopnea
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
              <span>
                <strong className="text-foreground">Oxygen desaturation depth</strong> — how far
                SpO₂ drops during events
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
              <span>
                <strong className="text-foreground">
                  RERAs (Respiratory Effort-Related Arousals)
                </strong>{' '}
                — effort-related arousals that fragment sleep without qualifying as apneas or
                hypopneas
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
              <span>
                <strong className="text-foreground">Positional patterns</strong> — whether events
                cluster in certain sleep positions
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
              <span>
                <strong className="text-foreground">Leak rate</strong> — whether your mask seal is
                affecting data quality
              </span>
            </li>
          </ul>
          <p>
            This is why tools like AirwayLab layer in additional metrics like the{' '}
            <Link
              href="/blog/what-is-glasgow-index-cpap"
              className="text-primary hover:text-primary/80"
            >
              Glasgow Index
            </Link>{' '}
            (breath shape),{' '}
            <Link
              href="/blog/what-is-flow-limitation-cpap"
              className="text-primary hover:text-primary/80"
            >
              FL Score
            </Link>{' '}
            (flow limitation),{' '}
            <Link
              href="/blog/what-is-ned-sleep-apnea"
              className="text-primary hover:text-primary/80"
            >
              NED
            </Link>{' '}
            (negative effort dependence), and oximetry data — to give you and your clinician a
            fuller picture than AHI alone.
          </p>
        </div>
      </section>

      {/* Reading AHI in CPAP data */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <BookOpen className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Reading AHI in Your CPAP Data</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            On a ResMed AirSense device, the AHI reported in the daily summary is the residual AHI
            for that night&apos;s session. When you load your SD card data into AirwayLab,
            you&apos;ll see:
          </p>
          <ul className="ml-4 space-y-1">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span>Nightly AHI across all sessions</span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span>Trend charts showing how AHI has moved over time</span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span>
                Breakdowns into event subtypes (OA, CA, H, RERA) where your device records them
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span>Context alongside other flow and oximetry metrics</span>
            </li>
          </ul>
          <p>
            A single high-AHI night is worth noting. A persistent upward trend over several weeks is
            worth raising with your sleep physician.
          </p>
        </div>
      </section>

      {/* When to contact clinician */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <AlertCircle className="h-5 w-5 text-amber-400" />
          <h2 className="text-xl font-bold sm:text-2xl">When to Contact Your Clinician</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Data tools give you visibility into your therapy. They don&apos;t replace a clinical
            conversation. Bring your data to your sleep physician if:
          </p>
          <ul className="ml-4 space-y-2">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
              <span>Your AHI has been consistently elevated for several consecutive weeks</span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
              <span>
                You&apos;re sleeping with therapy but still feeling unrefreshed most mornings
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
              <span>You notice a sudden change in your typical pattern</span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
              <span>You have new or worsening symptoms</span>
            </li>
          </ul>
          <p>
            Your clinician can interpret these numbers in context — factoring in your device
            settings, mask fit, weight changes, alcohol use, medications, and dozens of other
            variables that no software can account for.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="mt-10 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
        <h3 className="text-lg font-bold">See Your Own AHI Data</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          AirwayLab reads your ResMed SD card data directly in your browser. No upload, no account
          required. Load your data and see your AHI trend, flow patterns, and oximetry metrics
          alongside each other.
        </p>
        <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/analyze"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow transition-colors hover:bg-primary/90"
          >
            Analyze your CPAP data <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Bottom disclaimer */}
      <div className="mt-8 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">Medical disclaimer:</strong> AirwayLab is a
          data-visualization tool, not a medical device. Nothing on this page constitutes a diagnosis
          or a recommendation to change your therapy. Discuss your data and any concerns with your
          sleep physician or sleep clinic.
        </p>
      </div>
    </article>
  );
}
