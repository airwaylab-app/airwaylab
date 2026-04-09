import Link from 'next/link';
import { Activity, AlertTriangle, ArrowRight, BarChart2, Info } from 'lucide-react';

export default function FourMetricsAirwayLabMeasures() {
  return (
    <article>
      <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
        Most of us started our CPAP journey staring at one number: AHI. If it&apos;s below five,
        therapy is working. That&apos;s the conventional wisdom, and it&apos;s a useful starting
        point. But AHI measures one thing — apneas and hypopneas — and your airway does a lot more
        than just collapse and recover.
      </p>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
        There&apos;s a whole layer of breathing data sitting in your CPAP&apos;s recordings that AHI
        doesn&apos;t capture. Flow limitation, effort patterns, sleep continuity, arousal signals —
        these are the patterns that often explain why therapy feels &ldquo;off&rdquo; even when AHI
        looks fine.
      </p>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
        AirwayLab surfaces four of these metrics. Here&apos;s what each one describes.
      </p>

      {/* Flow Limitation Score */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Activity className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Flow Limitation Score</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            The{' '}
            <Link
              href="/blog/cpap-flow-limitation-score-0-5-meaning"
              className="text-primary hover:text-primary/80"
            >
              Flow Limitation Score
            </Link>{' '}
            describes the shape of your breath, not just whether a breathing event occurred. A full,
            round breath gets a score of <strong className="text-foreground">0</strong>. A flattened
            breath — one where the peak airflow is blunted, indicating partial upper airway
            resistance — scores <strong className="text-foreground">0.5</strong>. A severely
            flattened breath scores <strong className="text-foreground">1.0</strong>.
          </p>
          <p>
            Why does shape matter? Because flow limitation can produce respiratory effort and
            micro-arousals without ever triggering a formal apnea or hypopnea. A night with an AHI
            of 2 can still involve significant flow limitation — and the fatigue and fragmented sleep
            that goes with it.
          </p>
          <p>
            AirwayLab calculates this score breath-by-breath across your session and shows you how
            it distributes over the night.
          </p>
        </div>
      </section>

      {/* Glasgow Index */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <BarChart2 className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Glasgow Index</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            The{' '}
            <Link
              href="/blog/what-is-glasgow-index-cpap"
              className="text-primary hover:text-primary/80"
            >
              Glasgow Index
            </Link>{' '}
            measures the cumulative burden of flow limitation across a session, expressed as a
            single number. Rather than describing individual breaths, it shows the overall picture:
            how much of your night involved partial airway obstruction?
          </p>
          <p>
            A lower Glasgow Index indicates fewer flow-limited breaths over the course of the
            session. A higher number indicates more. The metric is used in sleep research as a way
            to quantify upper airway resistance burden in a form that&apos;s comparable across
            nights.
          </p>
          <p>
            In AirwayLab, the Glasgow Index sits alongside your AHI and RDI so you can see whether
            flow limitation is a consistent pattern or an occasional feature of your nights.
          </p>
        </div>
      </section>

      {/* WAT Score */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Activity className="h-5 w-5 text-purple-400" />
          <h2 className="text-xl font-bold sm:text-2xl">WAT Score</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            The{' '}
            <Link
              href="/blog/what-is-wat-score-cpap"
              className="text-primary hover:text-primary/80"
            >
              WAT (Wobble Analysis Tool)
            </Link>{' '}
            bundles three independent metrics that describe breathing stability during PAP therapy.
            FL Score measures inspiratory flatness — how flow-limited each breath is. Regularity
            uses sample entropy to quantify how variable your minute ventilation is over time.
            Periodicity Index uses spectral analysis to detect cyclical breathing patterns in the
            30–100 second range.
          </p>
          <p>
            Together, these three metrics describe breathing &ldquo;wobble&rdquo; — the instability
            that sits below the threshold of formal apneas and hypopneas. A stable night shows low
            FL scores, low entropy, and no periodic pattern. An unstable night shows elevated values
            across one or more of these dimensions.
          </p>
          <p>
            WAT is particularly useful as a cross-session trend: if one or more of these stability
            metrics is consistently elevated, that&apos;s worth discussing with your clinician.
          </p>
        </div>
      </section>

      {/* NED */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Info className="h-5 w-5 text-amber-400" />
          <h2 className="text-xl font-bold sm:text-2xl">
            NED — Negative Effort Dependence
          </h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            <Link
              href="/blog/what-is-ned-sleep-apnea"
              className="text-primary hover:text-primary/80"
            >
              NED (Negative Effort Dependence)
            </Link>{' '}
            describes a specific breathing pattern where increased inspiratory effort produces{' '}
            <em>decreased</em> airflow. It&apos;s a hallmark of upper airway collapsibility: the
            harder you try to breathe in, the more the airway narrows in response.
          </p>
          <p>
            NED analysis shows the relationship between your estimated respiratory effort and your
            airflow. Where that relationship is inverse — more effort, less flow — NED is present.
            It&apos;s one of the indicators researchers use to characterise upper airway anatomy and
            behaviour during sleep.
          </p>
          <p>
            AirwayLab&apos;s NED analysis surfaces this pattern from your flow waveform data and
            shows it as a trend across sessions.
          </p>
        </div>
      </section>

      {/* How These Four Work Together */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <BarChart2 className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-bold sm:text-2xl">How These Four Metrics Work Together</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            AHI tells you how many times your breathing fully stopped or significantly reduced. The
            Flow Limitation Score and Glasgow Index describe what&apos;s happening to your airway{' '}
            <em>between</em> those events. The WAT score shows how stable your breathing is across
            the session — flatness, variability, and cyclical patterns. NED shows whether your
            airway anatomy is contributing to resistance under increased respiratory effort.
          </p>
          <p>
            None of these metrics is a diagnosis. Together, they give you a richer picture of what
            your therapy data contains — and a more informed set of questions to bring to your
            clinician.
          </p>
          <p>All analysis in AirwayLab runs in your browser. Your data never leaves your device.</p>
        </div>
      </section>

      {/* Disclaimer callout */}
      <div className="mt-8 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <p className="text-sm text-amber-400">
            Discuss your data with your clinician for clinical interpretation.
          </p>
        </div>
      </div>

      {/* CTA */}
      <section className="mt-10 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
        <h3 className="text-lg font-bold">See Your Data</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Upload a CPAP recording to see your Flow Limitation Score, Glasgow Index, WAT score, and
          NED analysis. Free and always will be. Discuss your data with your clinician for clinical
          interpretation.
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

      {/* Related reading */}
      <section className="mt-8 border-t border-border/30 pt-6">
        <p className="mb-2 text-xs font-semibold text-foreground">Related reading</p>
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>
            <Link
              href="/blog/cpap-flow-limitation-score-0-5-meaning"
              className="text-primary hover:text-primary/80"
            >
              CPAP Flow Limitation Score: What 0, 0.5, and 1.0 Mean
            </Link>{' '}
            — the three-point scale your ResMed device uses and how AirwayLab extends it.
          </p>
          <p>
            <Link
              href="/blog/what-is-glasgow-index-cpap"
              className="text-primary hover:text-primary/80"
            >
              What Is the Glasgow Index in CPAP Data?
            </Link>{' '}
            — a nine-component breath shape score that captures cumulative flow limitation.
          </p>
          <p>
            <Link
              href="/blog/what-is-wat-score-cpap"
              className="text-primary hover:text-primary/80"
            >
              What Is the WAT Score in CPAP Data?
            </Link>{' '}
            — FL Score, regularity, and periodic breathing in one bundle.
          </p>
          <p>
            <Link
              href="/blog/what-is-ned-sleep-apnea"
              className="text-primary hover:text-primary/80"
            >
              What Is NED (Negative Effort Dependence)?
            </Link>{' '}
            — a breath-by-breath measure of airway resistance during PAP therapy.
          </p>
        </div>
      </section>

      {/* Medical disclaimer */}
      <p className="mt-8 text-xs italic text-muted-foreground/60">
        The metrics shown by AirwayLab are informational and describe patterns in your therapy data.
        They are not clinical assessments, diagnoses, or treatment recommendations. Always discuss
        your therapy data with a qualified clinician.
      </p>
    </article>
  );
}
