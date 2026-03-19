import Link from 'next/link';
import { Wind, AlertTriangle, TrendingDown, Waves, ArrowRight, Lightbulb, BookOpen } from 'lucide-react';

export default function UnderstandingFlowLimitationPost() {
  return (
    <article>
      <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
        You check your PAP machine every morning. AHI: 1.2. The app says &quot;Great night!&quot;
        with a smiley face. But you still wake up exhausted, foggy, and reaching for your third
        coffee by 10 AM. Sound familiar? The culprit might be something your machine tracks but
        never tells you about: <strong className="text-foreground">flow limitation</strong>.
      </p>

      {/* What Is Flow Limitation? */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Wind className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">What Is Flow Limitation, Exactly?</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            During normal breathing, air flows freely through your upper airway. The flow signal
            looks like a smooth, rounded wave — air in, air out, nice and symmetrical. But when
            your airway starts to narrow (without fully collapsing), the flow pattern changes.
            Instead of a smooth curve, you get a flattened top — as if someone put a lid on your
            breath.
          </p>
          <p>
            This partial narrowing is flow limitation. Your airway hasn&apos;t collapsed enough to
            count as an apnea (complete blockage) or even a hypopnea (significant reduction with
            oxygen drop). But it&apos;s working harder than it should, and your body notices.
          </p>
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-5">
            <p className="text-sm font-medium text-blue-400">Think of it like a garden hose</p>
            <p className="mt-1 text-sm text-muted-foreground">
              An apnea is when someone steps on the hose completely — no water flows. A hypopnea
              is a partial step — water trickles. Flow limitation? That&apos;s a kink in the hose.
              Water still flows, but the pressure pattern changes. Your sprinkler (or in this case,
              your body) knows something is off.
            </p>
          </div>
        </div>
      </section>

      {/* Why AHI Misses It */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <AlertTriangle className="h-5 w-5 text-amber-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Why Your AHI Says You&apos;re Fine</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            The Apnea-Hypopnea Index only counts events that meet specific criteria: a breathing
            pause of at least 10 seconds (apnea) or a 30%+ airflow reduction accompanied by an
            oxygen desaturation of 3-4% (hypopnea). Flow limitation fits neatly into neither
            category.
          </p>
          <p>
            Research published in the <em>European Respiratory Journal</em> has shown that patients
            can have significant flow limitation throughout the night with a perfectly normal AHI.
            These patients often report symptoms identical to those with untreated sleep apnea:
            daytime sleepiness, unrefreshing sleep, morning headaches, and cognitive fog.
          </p>
          <p>
            The clinical term for these events is{' '}
            <Link href="/glossary#rera" className="text-primary hover:text-primary/80">
              Respiratory Effort-Related Arousals (RERAs)
            </Link>
            . They&apos;re breathing disturbances that cause brief awakenings — enough to fragment
            your sleep architecture — but don&apos;t show up in the AHI. Some sleep physicians use
            the Respiratory Disturbance Index (RDI), which includes RERAs, but your PAP machine
            doesn&apos;t report this.
          </p>
        </div>
      </section>

      {/* How to Detect It */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Waves className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Detecting Flow Limitation in Your Data</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            The good news: your ResMed machine already records the data needed to detect flow
            limitation. It&apos;s stored on your SD card in detailed flow waveforms. The machine
            just doesn&apos;t analyze it for you in a meaningful way.
          </p>
          <p>
            Researchers have developed several approaches to quantify flow limitation from these
            waveforms:
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">
                <Link href="/glossary#glasgow-index" className="hover:text-primary">Glasgow Index</Link>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Developed at the University of Glasgow, this index scores breath shapes on a 0-1
                scale. A score above 0.3 suggests significant flow limitation. It detects flattened
                tops, skewed peaks, and other distortion patterns.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">
                <Link href="/glossary#ned" className="hover:text-primary">NED (Negative Effort Dependence)</Link>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Measures whether increasing breathing effort actually decreases airflow — a
                hallmark of a narrowed airway. Higher NED values indicate more severe limitation.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">Flatness Index</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Compares the peak flow to the mean flow of each breath. A perfectly round breath
                has a specific ratio; flattened breaths deviate from this, signaling obstruction.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">RERA Detection</p>
              <p className="mt-1 text-xs text-muted-foreground">
                By combining flow shape analysis with patterns of breathing effort and arousal
                signatures, it&apos;s possible to estimate RERA events from PAP flow data alone.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What Causes It */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <TrendingDown className="h-5 w-5 text-rose-400" />
          <h2 className="text-xl font-bold sm:text-2xl">What Causes Flow Limitation on PAP?</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            If flow limitation is happening despite PAP therapy, it usually points to one of a few
            issues:
          </p>
          <ul className="ml-4 space-y-2">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
              <span>
                <strong className="text-foreground">Pressure too low:</strong> The most common
                cause. Your prescribed pressure may not be enough to fully splint the airway open,
                especially during REM sleep when muscles relax further.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
              <span>
                <strong className="text-foreground">EPR too high:</strong> Expiratory Pressure
                Relief (EPR) reduces pressure during exhalation for comfort. But if set too high
                (e.g., EPR 3), the lower expiratory pressure may allow airway narrowing.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
              <span>
                <strong className="text-foreground">Positional factors:</strong> Sleeping supine
                (on your back) increases gravitational collapse of the airway. Flow limitation
                often worsens in certain positions.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
              <span>
                <strong className="text-foreground">Mask leak:</strong> Significant mask leak
                reduces effective pressure delivery, which can allow the airway to narrow even
                when the set pressure would otherwise be adequate.
              </span>
            </li>
          </ul>
        </div>
      </section>

      {/* What You Can Do */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Lightbulb className="h-5 w-5 text-amber-400" />
          <h2 className="text-xl font-bold sm:text-2xl">What You Can Do About It</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Understanding your flow limitation profile is the first step. Here&apos;s a practical
            approach:
          </p>
          <div className="space-y-3">
            <div className="flex gap-3 rounded-xl border border-border/50 p-4">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-xs font-bold text-primary">
                1
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">Analyze your actual data</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Tools like AirwayLab can read your SD card and calculate Glasgow Index, NED, and
                  estimated RERA counts — metrics your machine&apos;s app won&apos;t show you.
                </p>
              </div>
            </div>
            <div className="flex gap-3 rounded-xl border border-border/50 p-4">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-xs font-bold text-primary">
                2
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">Look at trends, not single nights</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Everyone has occasional flow-limited breaths. What matters is the pattern across
                  weeks. Consistently high Glasgow scores (&gt;0.3) warrant attention.
                </p>
              </div>
            </div>
            <div className="flex gap-3 rounded-xl border border-border/50 p-4">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-xs font-bold text-primary">
                3
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">Discuss with your sleep physician</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Bring your flow limitation data to your next appointment. Many physicians are
                  receptive to adjusting pressure, EPR, or mode settings when presented with
                  objective evidence.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* References */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <BookOpen className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-bold sm:text-2xl">Further Reading</h2>
        </div>
        <div className="mt-4 space-y-2 text-sm text-muted-foreground">
          <p>
            Palombini et al. (2013). &quot;Upper airway resistance syndrome: still not
            recognized and not treated.&quot; <em>Sleep Science</em>, 6(1), 19-26.
          </p>
          <p>
            Farr&eacute; et al. (2004). &quot;Noninvasive monitoring of respiratory mechanics
            during sleep.&quot; <em>European Respiratory Journal</em>, 24(6), 1052-1060.
          </p>
          <p>
            Clark et al. (2017). &quot;Automated detection of inspiratory flow limitation from
            CPAP devices.&quot; <em>Journal of Clinical Sleep Medicine</em>, 13(2).
          </p>
          <div className="mt-4 border-t border-border/30 pt-4">
            <p className="mb-2 text-xs font-semibold text-foreground">Related articles</p>
            <p>
              <Link href="/blog/beyond-ahi" className="text-primary hover:text-primary/80">
                Beyond AHI: Why Your Sleep Apnea Score Might Be Misleading You
              </Link>{' '}
              -- the research case against relying on AHI alone.
            </p>
            <p className="mt-1">
              <Link href="/blog/ahi-normal-still-tired" className="text-primary hover:text-primary/80">
                Your AHI Is Normal But You&apos;re Still Exhausted
              </Link>{' '}
              -- a practical guide to investigating persistent fatigue.
            </p>
            <p className="mt-1">
              <Link href="/blog/flow-limitation-and-sleepiness" className="text-primary hover:text-primary/80">
                Does Flow Limitation Drive Sleepiness?
              </Link>{' '}
              -- evidence linking flow limitation directly to daytime symptoms.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mt-10 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
        <h3 className="text-lg font-bold">Ready to See Your Flow Limitation Data?</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          AirwayLab analyzes your ResMed SD card data for flow limitation, RERAs, and breathing
          patterns — all in your browser, with nothing uploaded to any server.
        </p>
        <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/analyze"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow transition-colors hover:bg-primary/90"
          >
            Analyze Your Data <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/about/flow-limitation"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Learn About Our Methodology
          </Link>
        </div>
      </section>
    </article>
  );
}
