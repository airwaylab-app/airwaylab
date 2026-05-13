import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  BarChart2,
  Clock,
  HelpCircle,
  Info,
  List,
  Wind,
  Zap,
} from 'lucide-react';

export default function HowToReadCPAPTherapyReport() {
  return (
    <article>
      <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
        Whether you&apos;re reading a printout from your sleep clinic, checking the myAir app, or
        loading your SD card into AirwayLab or OSCAR, the same set of numbers keeps appearing.
        Here&apos;s what each field actually represents.
      </p>

      {/* Medical disclaimer */}
      <blockquote className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
        <div className="flex gap-2.5">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <p className="text-sm text-muted-foreground">
            <strong className="text-amber-400">Medical disclaimer:</strong> AirwayLab is a
            data-visualization tool, not a medical device. This article describes CPAP data fields —
            it does not constitute a diagnosis or a recommendation to change your therapy. Discuss
            your data with your sleep physician.
          </p>
        </div>
      </blockquote>

      {/* AHI */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <BarChart2 className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">AHI — Apnea-Hypopnea Index</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            AHI is the count of apneas and hypopneas per hour of recorded time. An apnea is a pause
            in airflow lasting 10 seconds or more; a hypopnea is a partial reduction sustained for
            the same duration, typically accompanied by an arousal or an oxygen drop.
          </p>
          <p>
            On CPAP therapy, the AHI your device reports is the <strong className="text-foreground">residual AHI</strong>{' '}
            — events that occurred despite therapy being active. Most guidelines cite below 5/hr as
            the typical target range, though your sleep physician determines what&apos;s appropriate
            for your situation.
          </p>
          <p>
            Night-to-night variation is expected. A single elevated night doesn&apos;t necessarily
            indicate a problem; a sustained multi-week trend in one direction is more meaningful
            data to bring to your clinician.
          </p>
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
            <p className="text-xs font-semibold text-blue-400">Further reading</p>
            <p className="mt-1 text-xs text-muted-foreground">
              For a deeper look at what AHI measures and what it misses, see{' '}
              <Link href="/blog/why-ahi-is-lying" className="text-primary hover:text-primary/80">
                Why AHI Is Lying to You
              </Link>{' '}
              and{' '}
              <Link href="/blog/ahi-vs-rdi-sleep-apnea" className="text-primary hover:text-primary/80">
                AHI vs RDI
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      {/* Event breakdown */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <List className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Event Breakdown: OA, CA, H, RERA</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Many ResMed devices record not just total AHI but the component event types:
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border/50 bg-card/50 p-4">
              <p className="text-sm font-semibold text-foreground">OA — Obstructive Apnea</p>
              <p className="mt-1 text-xs text-muted-foreground">
                The airway closes completely. Typically the predominant event type in obstructive
                sleep apnea.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 bg-card/50 p-4">
              <p className="text-sm font-semibold text-foreground">CA — Central Apnea</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Breathing pauses without an obstructive cause; the respiratory drive itself is
                temporarily absent. Some central events are normal during therapy. A high central
                count relative to obstructive is worth discussing with your clinician.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 bg-card/50 p-4">
              <p className="text-sm font-semibold text-foreground">H — Hypopnea</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Partial airflow reduction meeting the duration and arousal/desaturation criteria.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 bg-card/50 p-4">
              <p className="text-sm font-semibold text-foreground">RERA — Respiratory Effort-Related Arousal</p>
              <p className="mt-1 text-xs text-muted-foreground">
                A run of increasingly restricted breaths that end in an arousal, without fully
                meeting the hypopnea threshold. ResMed devices report these separately. They
                contribute to sleep fragmentation even when AHI looks low.
              </p>
            </div>
          </div>
          <p>
            For more on the distinction between detected apneas and estimated respiratory
            disturbances, see{' '}
            <Link href="/blog/what-are-reras-sleep-apnea" className="text-primary hover:text-primary/80">
              What Are RERAs?
            </Link>
          </p>
        </div>
      </section>

      {/* Mask Leak Rate */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Wind className="h-5 w-5 text-purple-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Mask Leak Rate</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Leak rate reflects how much air is escaping around your mask seal, reported in litres
            per minute. All CPAP masks have some intentional venting (required for CO₂ clearance)
            — your machine knows this &quot;intentional leak&quot; baseline and reports{' '}
            <strong className="text-foreground">unintentional leak</strong> (sometimes called
            &quot;large leak&quot;) separately.
          </p>
          <p>Common reference ranges in ResMed documentation:</p>
          <ul className="ml-4 space-y-2">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
              <span>
                <strong className="text-foreground">&lt; 24 L/min</strong> — typically within the
                acceptable range for most mask types
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
              <span>
                <strong className="text-foreground">&gt; 24 L/min</strong> — elevated; may affect
                therapy delivery and event detection accuracy
              </span>
            </li>
          </ul>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
            <p className="text-sm text-muted-foreground">
              <strong className="text-amber-400">Data quality note:</strong> High leak rates can
              inflate or distort AHI values. If you&apos;re seeing unexpectedly high AHI on nights
              with high leak, the two are often connected. Mask fit, cushion condition, and sleep
              position all affect leak. Your clinician can interpret recurring leak patterns in
              context.
            </p>
          </div>
          <p>
            For a detailed look at how leak is calculated and displayed,{' '}
            <Link href="/blog/cpap-leak-rate-meaning" className="text-primary hover:text-primary/80">
              see the CPAP Leak Rate guide
            </Link>
            .
          </p>
        </div>
      </section>

      {/* Pressure */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Zap className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Pressure</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            CPAP therapy delivers a continuous positive pressure to keep the airway open during
            sleep. What your report shows depends on your device type:
          </p>
          <div className="space-y-3">
            <div className="rounded-xl border border-border/50 bg-card/50 p-4">
              <p className="text-sm font-semibold text-foreground">Fixed CPAP</p>
              <p className="mt-1 text-xs text-muted-foreground">
                A single pressure value set by your prescriber. Your report confirms the pressure
                was delivered at the prescribed level.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 bg-card/50 p-4">
              <p className="text-sm font-semibold text-foreground">APAP (Auto-Adjusting)</p>
              <p className="mt-1 text-xs text-muted-foreground">
                The device adjusts pressure breath-by-breath based on detected events and flow
                signals. Your report typically shows minimum pressure, maximum pressure, and a 90th
                or 95th percentile pressure (the level the device was at or below for 90–95% of the
                night). A rising 95th-percentile pressure over time is worth noting for your
                clinician.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 bg-card/50 p-4">
              <p className="text-sm font-semibold text-foreground">BiPAP</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Delivers separate inspiratory (IPAP) and expiratory (EPAP) pressures. Reports show
                both values.
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
            <p className="text-sm text-muted-foreground">
              <strong className="text-rose-400">Important:</strong> Do not adjust your own pressure
              settings without direction from your sleep clinician. Pressure changes affect therapy
              delivery in ways that require clinical judgment to evaluate.
            </p>
          </div>
        </div>
      </section>

      {/* Usage Hours */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Clock className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Usage Hours</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Simple and important: how long the mask was on your face during the recording. Many
            insurance and compliance programs define &quot;compliant use&quot; as 4+ hours per night
            on 70% of nights. Your usage hours tell you and your care team whether you&apos;re
            meeting therapeutic exposure targets.
          </p>
          <p>
            Short sessions — under 4 hours — are worth noting because event data from very short
            recordings is less statistically reliable than from a full night.
          </p>
        </div>
      </section>

      {/* What a Typical Report Looks Like */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <BarChart2 className="h-5 w-5 text-purple-400" />
          <h2 className="text-xl font-bold sm:text-2xl">What a Typical Therapy Report Looks Like</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>A therapy report from a ResMed APAP device might show:</p>
          <div className="rounded-xl border border-border/50 bg-card/50 p-5">
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                { label: 'AHI', value: '1.2 /hr' },
                { label: 'OA', value: '0.4 /hr' },
                { label: 'CA', value: '0.3 /hr' },
                { label: 'H', value: '0.5 /hr' },
                { label: 'RERA', value: '2.1 /hr' },
                { label: 'Leak (95th %ile)', value: '8 L/min' },
                { label: 'Pressure (95th %ile)', value: '9.4 cmH₂O' },
                { label: 'Usage', value: '7h 14min' },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between rounded-lg border border-border/30 bg-background/50 px-3 py-2 text-xs">
                  <span className="font-medium text-muted-foreground">{label}</span>
                  <span className="font-semibold text-foreground">{value}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              The AHI is below 5/hr. Leak is low. The RERA count is higher than AHI — this is
              common and not inherently concerning, though it can contribute to daytime sleepiness
              if consistently high. These numbers give a clinician context for a follow-up
              conversation.
            </p>
          </div>
        </div>
      </section>

      {/* What these numbers don't tell you */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <AlertTriangle className="h-5 w-5 text-amber-400" />
          <h2 className="text-xl font-bold sm:text-2xl">What These Numbers Don&apos;t Tell You</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>Standard CPAP reports don&apos;t capture:</p>
          <ul className="ml-4 space-y-2">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
              <span>
                <strong className="text-foreground">Breath shape patterns</strong> — flow limitation
                signatures that occur below the RERA threshold
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
              <span>
                <strong className="text-foreground">Oxygen saturation</strong> — SpO2 trends require
                a separate pulse oximeter
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
              <span>
                <strong className="text-foreground">Positional data</strong> — whether events
                cluster when you&apos;re on your back
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
              <span>
                <strong className="text-foreground">HRV and cardiac metrics</strong> — these require
                additional monitoring
              </span>
            </li>
          </ul>
          <p>
            Tools like AirwayLab layer in breath-shape scoring (Glasgow Index), flow limitation
            analysis (FL Score, NED), and oximetry metrics alongside standard CPAP data — giving you
            and your clinician a more complete picture. See{' '}
            <Link href="/blog/beyond-ahi" className="text-primary hover:text-primary/80">
              Beyond AHI
            </Link>{' '}
            for more on what the standard report leaves out.
          </p>
        </div>
      </section>

      {/* What to bring to clinician */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <HelpCircle className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">What to Bring to Your Clinician Appointment</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Rather than describing your numbers verbally, consider:
          </p>
          <ol className="ml-4 space-y-3">
            <li className="flex gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                1
              </span>
              <span>
                <strong className="text-foreground">An SD card export or report printout</strong>{' '}
                covering the past 30–90 nights
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                2
              </span>
              <span>
                <strong className="text-foreground">A note on any symptom changes</strong> — new
                snoring reports from a partner, increased daytime sleepiness, morning headaches
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                3
              </span>
              <span>
                <strong className="text-foreground">Questions about any metrics</strong> that look
                different from your baseline
              </span>
            </li>
          </ol>
          <p>
            Your sleep physician interprets these numbers in context. The data tools give you the
            information; the clinical conversation is where it gets acted on.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <HelpCircle className="h-5 w-5 text-amber-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Frequently Asked Questions</h2>
        </div>
        <div className="mt-4 space-y-4">
          <div className="rounded-xl border border-border/50 bg-card/50 p-4">
            <h3 className="text-sm font-semibold text-foreground">
              What is residual AHI on CPAP?
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Residual AHI is the apnea-hypopnea index recorded while CPAP therapy is active — it
              counts events that occurred despite the pressure support. It differs from the AHI
              measured in your diagnostic sleep study, which was recorded without therapy. A residual
              AHI below 5/hr is a common reference point, but your sleep physician determines
              what&apos;s appropriate for your individual situation.
            </p>
          </div>
          <div className="rounded-xl border border-border/50 bg-card/50 p-4">
            <h3 className="text-sm font-semibold text-foreground">
              What does RERA mean in a CPAP report?
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              RERA stands for Respiratory Effort-Related Arousal. It describes a sequence of
              increasingly restricted breaths that end in an arousal before meeting the full
              criteria for a hypopnea. ResMed machines record these separately in the therapy data.
              RERAs contribute to sleep fragmentation and daytime symptoms even when AHI is low.
            </p>
          </div>
          <div className="rounded-xl border border-border/50 bg-card/50 p-4">
            <h3 className="text-sm font-semibold text-foreground">
              What is a good leak rate on CPAP?
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              ResMed documentation typically cites unintentional leak below 24 L/min as within the
              acceptable range. The exact threshold varies by mask type. What matters most is whether
              your leak rate is consistent and whether it correlates with nights where your AHI looks
              different from baseline. Your clinician can interpret recurring high-leak patterns in
              your therapy context.
            </p>
          </div>
          <div className="rounded-xl border border-border/50 bg-card/50 p-4">
            <h3 className="text-sm font-semibold text-foreground">
              What does 95th percentile pressure mean on APAP?
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              The 95th percentile pressure is the level your APAP device was at or below for 95% of
              the night. It gives a cleaner picture of typical operating pressure than the maximum,
              which can be driven by brief isolated events. A rising 95th-percentile pressure over
              multiple weeks is a data point worth discussing with your sleep clinician.
            </p>
          </div>
          <div className="rounded-xl border border-border/50 bg-card/50 p-4">
            <h3 className="text-sm font-semibold text-foreground">
              How can I see my full CPAP therapy report in AirwayLab?
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Load the SD card from your ResMed device at{' '}
              <Link href="/analyze" className="text-primary hover:text-primary/80">
                airwaylab.app/analyze
              </Link>
              . AirwayLab reads your EDF files directly in the browser — your data never leaves your
              device. The overview tab shows AHI, event type breakdown, leak, pressure, and usage
              hours. Additional tabs cover breath-shape scoring, flow limitation analysis, and
              nightly trends across all loaded sessions.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mt-10 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
        <h3 className="text-lg font-bold">See Your Full Therapy Picture</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Load your ResMed SD card into AirwayLab and see AHI, event types, leak, pressure,
          breath-shape scores, and oximetry data together in one view — entirely in your browser,
          no upload required.
        </p>
        <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/analyze"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow transition-colors hover:bg-primary/90"
          >
            Analyze Your CPAP Data <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/blog/beyond-ahi"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Read: Beyond AHI
          </Link>
        </div>
      </section>

      {/* Bottom disclaimer */}
      <blockquote className="mt-8 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-muted-foreground">
        <strong className="text-amber-400">Medical disclaimer:</strong> AirwayLab is a
        data-visualization tool, not a medical device. Nothing on this page constitutes a diagnosis
        or a recommendation to change your therapy. Discuss your therapy data and any concerns with
        your sleep physician.
      </blockquote>
    </article>
  );
}
